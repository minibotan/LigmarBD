"""Build class skill tables from an input JSON document."""
import argparse
import collections
import html
import json
import re
from pathlib import Path

CLASSES = {'mage': 'маг', 'priest': 'жрец', 'assassin': 'убийца',
           'archer': 'лучник', 'warrior': 'воин', 'guardian': 'страж'}

def plain(value):
    if value is None:
        return None
    value = re.sub(r'<br\s*/?>', '\n', value, flags=re.I)
    return html.unescape(re.sub(r'<[^>]*>', '', value)).strip()

def extract(source, output):
    raw = source.read_bytes()
    input_data = json.loads(raw)
    rows = {owner: [] for owner in CLASSES}
    missing_names = []
    mismatches = []
    excluded = collections.Counter()
    for ei, entry in enumerate(input_data['log']['entries']):
        for mi, message in enumerate(entry.get('_webSocketMessages', [])):
            try:
                packet = json.loads(message.get('data', ''))
            except (ValueError, TypeError):
                continue
            if not isinstance(packet, list) or len(packet) < 2 or packet[0] != 'state':
                continue
            state = packet[1]
            translations = state.get('world', {}).get('translations', {}).get('skills', {})
            sources = []
            for ci, character in enumerate(state.get('user', {}).get('characters', [])):
                sources.append((character.get('skills', []), f'/user/characters/{ci}/skills', 'account_character', character.get('class'), character.get('level')))
            character = state.get('character') or {}
            sources.append((character.get('skills', []), '/character/skills', 'active_character', character.get('class'), character.get('level')))
            season_character = (state.get('user', {}).get('game', {}).get('season') or {}).get('character') or {}
            sources.append((season_character.get('skills', []), '/user/game/season/character/skills', 'season_character', season_character.get('class'), season_character.get('level')))
            sources.append((state.get('user', {}).get('library', {}).get('skills', []), '/user/library/skills', 'account_library', None, None))
            for skills, path, context, char_class, char_level in sources:
                for si, wrapper in enumerate(skills):
                    definitions = [(kind, wrapper.get(kind)) for kind in ('effective', 'next') if wrapper.get(kind) is not None]
                    if not definitions:
                        definitions = [('metadata_only', None)]
                    for kind, definition in definitions:
                        definition = definition or {}
                        owner = definition.get('owner') or char_class
                        if owner not in CLASSES:
                            excluded[str(owner)] += 1
                            continue
                        sid = wrapper['id']
                        names = translations.get(sid, {})
                        if not names.get('ru'):
                            missing_names.append({'owner': owner, 'skill_id': sid})
                        activation = definition.get('activation') or {}
                        desc = definition.get('description') or {}
                        row = {
                            'skill_id': sid, 'name_ru': names.get('ru'), 'name_en': names.get('en'),
                            'variant': kind, 'skill_level': definition.get('level'),
                            'learned_level': wrapper.get('level'), 'max_level': wrapper.get('max_level'),
                            'unlock_character_level': wrapper.get('required_character_level'),
                            'unlock_status_level': wrapper.get('required_status_level'),
                            'type': definition.get('type'), 'targets': definition.get('objects'),
                            'range': definition.get('range'), 'weapons': activation.get('weapon'),
                            'activation_time_ms': activation.get('time'), 'cooldown_ms': activation.get('cooldown'),
                            'mana_cost': activation.get('mana_cost'), 'consumables': activation.get('consumables'),
                            'rank_requirements': definition.get('requirements'),
                            'description_ru': plain(desc.get('ru')), 'description_en': plain(desc.get('en')),
                            'context': context, 'context_character_level': char_level,
                            'raw_definition': definition or None,
                            'raw_wrapper_metadata': {k: v for k, v in wrapper.items() if k not in ('effective', 'next')},
                        }
                        rows[owner].append(row)
                        if kind == 'effective' and row['skill_level'] != row['learned_level']:
                            mismatches.append({k: row[k] for k in ('skill_id', 'name_ru', 'skill_level', 'learned_level', 'context', 'context_character_level')})
    output.mkdir(parents=True, exist_ok=True)
    summary = {}
    for owner, values in rows.items():
        values.sort(key=lambda r: (r['unlock_character_level'] or 0, r['skill_id'], r['skill_level'] if r['skill_level'] is not None else -1, r['context'], r['variant']))
        ids = {r['skill_id'] for r in values}
        ranks = {(r['skill_id'], r['skill_level']) for r in values if r['skill_level'] is not None}
        summary[owner] = {'skills': len(ids), 'observations': len(values), 'skill_rank_pairs': len(ranks)}
        document = {
            'schema_version': 1, 'class_id': owner, 'class_name_ru': CLASSES[owner],
            'coverage': 'observed effective/next ranks, not a complete all-ranks catalog',
            'summary': summary[owner], 'rows': values,
        }
        (output / (CLASSES[owner] + '.json')).write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return {'classes': summary, 'level_mismatches': mismatches, 'missing_names': missing_names, 'excluded_nonclass_observations': dict(excluded)}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('input_data', type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    print(json.dumps(extract(args.input_data, args.output), ensure_ascii=False, indent=2))
