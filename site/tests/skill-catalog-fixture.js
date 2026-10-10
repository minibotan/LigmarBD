import fs from 'node:fs';
import {normalizeSkillCatalog} from '../dist/skill-catalog.js';
export function readSkillCatalog(){const manifest=JSON.parse(fs.readFileSync(new URL('../dist/data/skills-manifest.json',import.meta.url)));return normalizeSkillCatalog(Object.values(manifest.files).flatMap(file=>JSON.parse(fs.readFileSync(new URL('../dist/data/'+file,import.meta.url)))));}
