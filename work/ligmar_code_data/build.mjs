import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: node build.mjs input.txt");
const outputPath = new URL("../../outputs/ligmar_code_data/ligmar_player_data_v0.40.509.xlsx", import.meta.url).pathname;
const previewDir = new URL("./previews", import.meta.url).pathname;

const source = await fs.readFile(sourcePath, "utf8");
const routeBlock = source.slice(source.indexOf("var wE$1 ="), source.indexOf(")(wE$1 || {})"));
const routeRx = /e\.([A-Za-z0-9_]+)\s*=\s*"([^"]*)"/g;
const parsedRoutes = [];
for (const match of routeBlock.matchAll(routeRx)) parsedRoutes.push({ key: match[1], path: match[2] || "/" });

const notableRoutes = new Map([
  ["LiveOpsEventConditions", "Отдельный экран условий события"],
  ["LiveOpsEventQuests", "Отдельный экран заданий события"],
  ["LiveOpsEventStore", "Отдельный магазин события"],
  ["SeasonBlacksmith", "Сезонная кузница"],
  ["SeasonAnnouncement", "Экран анонса сезона"],
  ["SeasonLeveling", "Отдельное сезонное повышение уровня"],
  ["TownDungeonLive", "Live-экран подземелья"],
  ["GuildDungeonLive", "Live-экран гильдейского подземелья"],
  ["BattleStats", "Статистика конкретного боя и истории"],
  ["TownLaboratoryEssence", "Лаборатория: эссенции"],
  ["TownLaboratoryExtraction", "Лаборатория: извлечение"],
  ["TownLaboratoryFusion", "Лаборатория: слияние"],
  ["GuildLeaderboardContribution", "Рейтинг вклада в гильдию"],
  ["AuctionStock", "Склад аукциона"],
  ["AuctionHistory", "История аукциона"],
  ["TownWardrobeCollection", "Коллекция гардероба"],
  ["TownStableCollection", "Коллекция конюшни"],
]);

function routeCategory(path) {
  if (path.startsWith("auth") || path === "deep-link") return "Авторизация";
  if (path.startsWith("season") || path.startsWith("live-ops") || path.startsWith("bonuses") || path.startsWith("activity-board")) return "События и сезон";
  if (path.startsWith("town")) return "Город";
  if (path.startsWith("character") || path.startsWith("create-character") || path.startsWith("player")) return "Персонаж";
  if (path.startsWith("guild")) return "Гильдия";
  if (path.startsWith("leaderboard")) return "Рейтинги";
  if (path.startsWith("shop") || path.startsWith("trading-post") || path.startsWith("vip")) return "Торговля и VIP";
  if (path.startsWith("battle") || path.startsWith("location") || path.startsWith("party")) return "Бои и группы";
  if (path.startsWith("journal")) return "Журнал";
  return "Общее";
}

const featureRows = [
  ["Every New Level",1,false],["Promocodes",1,false],["Change Name",1,false],["Transfer",1,false],
  ["Stats",2,false],["Backpack",2,false],["Stock",2,false],["Shrine",2,false],["Chests",2,false],["Market Stall",2,false],["Community",2,false],
  ["Skills",3,false],["Skills Level Up",3,false],["Character",4,false],["Invitation",4,false],["Main House",5,false],["Hall of Heroes",5,true],
  ["Double Tap",7,false],["Chat",7,false],["Bonuses",9,true],["Long Tap",9,false],["Skills User Status",10,false],["Guild",10,false],
  ["Wardrobe",12,false],["Leaderboards",15,false],["Dungeons",16,false],["Goblin",16,false],["Stash",17,true],
  ["Laboratory",20,false],["Craft",20,false],["Territorial Wars",20,false],["Library",20,false],["Workshop",20,false],["Stable",20,false],
  ["Lost Cargo",21,false],["Mini Map",21,false],["Trading Post",25,true],["Hike",25,true],["Activity Board",25,true],["Temple of Darkness",25,false],["Craft (Forging)",25,true],
  ["Town Portal",30,true],["Auction",30,true],["Party Dungeon",30,false],["Armory",30,false],["Craft (Jewelry)",30,false],["Craft (Furnace)",30,false],["Craft (Melting)",30,true],["Contracts",30,false],
  ["PvP — Level Up",31,false],["Fountain",35,false],
];

const socketRows = [
  [1,25,50,5,10,15,50],[2,50,100,10,20,30,100],[3,100,200,10,25,75,200],
  [4,150,300,25,50,100,300],[5,175,350,25,50,125,350],[6,200,400,30,75,125,400],
  [7,225,450,30,75,150,450],[8,250,500,50,100,150,500],[9,300,600,50,100,200,600],
  [10,400,800,75,150,250,800],[11,500,1000,100,200,300,1000],[12,1000,2000,200,400,600,2000],
];

const enhancementRows = [
  ["Максимальный уровень",12,"Фиксированный предел",""],
  ["Обычный кристалл: оружие",2,"Количество на одну попытку",""],
  ["Обычный кристалл: прочее",1,"Количество на одну попытку",""],
  ["Обычный кристалл","world.enhancement.crystal","Шанс не задан",""],
  ["Fortitude","world.enhancement.fortitude","Шанс не задан",""],
  ["Harmony","world.enhancement.harmony","Шанс не задан",""],
  ["Risk","world.enhancement.risk","Шанс не задан",""],
  ["Эссенция",100,"Шанс 100%; допустимый уровень зависит от эссенции",""],
  ["Результат попытки","выше / без изменения / ниже","Успех, нейтральный результат или потеря уровня",""],
];

const formulaRows = [
  ["Эффективный тир легендарного предмета","baseTier + 2","Формула",""],
  ["Gear Score","floor(tier³ × (qualityMultiplier + magicPower/10000 + socketTierSum×0.1) × (enhancement+1))","Формула",""],
  ["Базовая цена экипировки","2000 × effectiveTier × priceQualityMultiplier","Формула",""],
  ["Цена продажи","basePrice / 10","Формула",""],
  ["Стат от заточки","floor(templateEnhancement × serverMultiplier)","Требуется множитель",""],
  ["Снижение требований","ceil(baseRequirement × (1 − reduction/100))","Формула",""],
  ["Слоты сокетов","оружие 2; броня 4; прочее 0","Формула",""],
  ["Максимум магических свойств","rare 2; epic 3; legendary 3; common 0","Формула",""],
  ["Финальный урон/попадание/защита","Формула не установлена","Не установлено",""],
];

const orbRows = [
  ["Дроп",75,0],["Опыт",150,0],["Материалы",50,0],["Серебро",300,0],["Ярость",20,2],
];
const orbMultiplierRows = [
  ["≤ 0.5 часа",1],["> 0.5 часа",1.1],["> 2.5 часа",1.5],["> 5 часов",2],["> 7.5 часа",2.5],["> 10 часов",3],
];

const wb = Workbook.create();
const overview = wb.worksheets.add("Обзор");
const items = wb.worksheets.add("Предметы");
const enhance = wb.worksheets.add("Заточка и сокеты");
const progress = wb.worksheets.add("Прогресс");
const routes = wb.worksheets.add("Маршруты");

const font = "Arial";
const colors = { navy:"#172033", blue:"#2D5D8A", blueLight:"#DCEAF5", purple:"#6E4E9B", purpleLight:"#EEE7F6", green:"#2E7D62", greenLight:"#E1F1EB", amber:"#D99A2B", amberLight:"#FFF1CC", red:"#B54B4B", redLight:"#F8E2E2", gray:"#EEF1F4", text:"#1F2937", muted:"#667085", white:"#FFFFFF" };

function baseSheet(sheet, usedRange) {
  sheet.showGridLines = false;
  const r = sheet.getRange(usedRange);
  r.format.font = { name: font, size: 10, color: colors.text };
  r.format.verticalAlignment = "center";
}
function title(sheet, range, text) {
  sheet.getRange(range.split(":")[0]).values = [[text]];
  sheet.getRange(range).format.font = { name: font, size: 15, bold: true, color: colors.navy };
}
function rule(sheet, range) { sheet.getRange(range).format.fill = colors.blue; }
function header(sheet, range, fill=colors.navy) {
  sheet.getRange(range).format = { fill, font:{name:font,size:10,bold:true,color:colors.white}, horizontalAlignment:"center", verticalAlignment:"center", wrapText:true };
}
function section(sheet, range, fill=colors.blueLight, color=colors.navy) {
  sheet.getRange(range).format = { fill, font:{name:font,size:11,bold:true,color}, borders:{preset:"outside",style:"thin",color:fill} };
}
function sourceStyle(sheet, range) { sheet.getRange(range).format.font = { name:font, size:9, italic:true, color:colors.muted }; }
function inputStyle(sheet, range) { sheet.getRange(range).format.fill = colors.amberLight; sheet.getRange(range).format.font = {name:font,size:10,bold:true,color:colors.text}; }
function calcStyle(sheet, range) { sheet.getRange(range).format.fill = colors.blueLight; sheet.getRange(range).format.font = {name:font,size:10,bold:true,color:colors.navy}; }

// Overview
baseSheet(overview,"A1:H32");
overview.getRange("A1:H1").format.rowHeight = 8;
title(overview,"A2:H2","Ligmar: правила v0.40.509");
rule(overview,"A3:H3");
overview.getRange("A5:B5").values = [["Показатель","Значение"]]; header(overview,"A5:B5");
overview.getRange("A6:A10").values = [["Формул и правил в каталоге"],["Уровней заточки"],["Функций в таблице открытия"],["Маршрутов"],["Финальная боевая математика"]];
overview.getRange("B6:B10").formulas = [["=COUNTA('Предметы'!A27:A35)"],["=12"],["=COUNTA('Прогресс'!A26:A76)"],["=COUNTA('Маршруты'!A7:A250)"],["=\"Не установлена\""]];
calcStyle(overview,"B6:B10");
overview.getRange("D5:H5").values = [["Главные находки","Что известно","Где смотреть","Статус","Примечание"]]; header(overview,"D5:H5");
overview.getRange("D6:H12").values = [
  ["Gear Score","Формула полностью присутствует","Предметы","Подтверждено","Использует power маг. свойств, тиры сокетов и заточку"],
  ["Заточка","Максимум +12; тип шанса зависит от кристалла","Заточка и сокеты","Частично","Таблица процентов не задана"],
  ["Сокеты","Полная таблица стоимости T1–T12","Заточка и сокеты","Подтверждено","Раздельно для оружия и брони"],
  ["Переплавка","Формула шанса и бонусы","Прогресс","Подтверждено","Бонус мастера зависит от таблицы множителей"],
  ["Открытие функций","Уровни 1–35 и сезонные ограничения","Прогресс","Подтверждено","Элемент виден за 5 уровней до открытия"],
  ["Неочевидные экраны","LiveOps, battle stats, live dungeon, сезонные экраны","Маршруты","Подтверждено","Наличие маршрута не гарантирует доступ"],
  ["Урон и попадание","Формулы отсутствуют","Предметы","Не установлено","Порядок вычисления не установлен"],
];
overview.getRange("D14:H14").values = [["Ограничения анализа","Описание","Версия","","Дата"]]; header(overview,"D14:H14",colors.purple);
overview.getRange("D15:H18").values = [
  ["Статический снимок","Значения могут измениться после обновления игры","v0.40.509","","2026-09-21"],
  ["Дополнительные таблицы","world.enhancement, VIP и часть мастерской загружаются при входе","Динамически","","2026-09-21"],
  ["Маршруты","Маршрут может быть закрыт уровнем, сезоном, авторизацией или сервером","v0.40.509","","2026-09-21"],
  ["Формулы боя","Расчёт итогового удара не установлен","v0.40.509","","2026-09-21"],
];
overview.getRange("A22").values = [["Как читать файл"]]; section(overview,"A22:H22");
overview.getRange("A23:H26").values = [
  ["Жёлтые ячейки — редактируемые входы калькуляторов."],
  ["Голубые ячейки — вычисляемые результаты."],
  ["Неполные правила обозначены отдельно."],
  ["Актуальность формул для новых версий требует проверки."],
];
overview.getRange("A23:H26").merge(true); overview.getRange("A23:H26").format.wrapText = true;
overview.getRange("A:A").format.columnWidth = 33; overview.getRange("B:B").format.columnWidth = 20;
overview.getRange("C:C").format.columnWidth = 3; overview.getRange("D:D").format.columnWidth = 25; overview.getRange("E:E").format.columnWidth = 34;
overview.getRange("F:F").format.columnWidth = 22; overview.getRange("G:G").format.columnWidth = 16; overview.getRange("H:H").format.columnWidth = 42;
overview.tabColor = colors.navy;

// Items
baseSheet(items,"A1:J38"); title(items,"A2:J2","Предметы и формулы"); rule(items,"A3:J3");
items.getRange("A5:B5").values = [["Калькулятор предмета","Значение"]]; header(items,"A5:B5");
items.getRange("A6:A12").values = [["Базовый тир"],["Качество"],["Сумма power маг. свойств"],["Сумма тиров установленных камней"],["Текущая заточка"],["Базовый стат заточки из шаблона"],["Множитель уровня заточки"]];
items.getRange("B6:B12").values = [[8],["legendary"],[1500],[12],[8],[90],[2.4]]; inputStyle(items,"B6:B12");
items.getRange("B6").dataValidation = {rule:{type:"whole",operator:"between",formula1:1,formula2:12}};
items.getRange("B7").dataValidation = {rule:{type:"list",values:["common","rare","epic","legendary"]}};
items.getRange("B10").dataValidation = {rule:{type:"whole",operator:"between",formula1:0,formula2:12}};
items.getRange("A14:A21").values = [["Эффективный тир"],["Множитель индексных статов"],["Множитель цены/Gear Score"],["Множитель зелья"],["Gear Score"],["Базовая цена"],["Цена продажи"],["Стат от заточки"]];
items.getRange("B14:B21").formulas = [
  ["=IF(B7=\"legendary\",B6+2,B6)"],["=VLOOKUP(B7,$H$6:$K$9,2,FALSE)"],["=VLOOKUP(B7,$H$6:$K$9,3,FALSE)"],["=VLOOKUP(B7,$H$6:$K$9,4,FALSE)"],
  ["=INT(B14^3*(B16+B8/10000+B9*0.1)*(B10+1))"],["=2000*B14*B16"],["=B19/10"],["=INT(B11*B12)"],
];
calcStyle(items,"B14:B21"); items.getRange("B18:B21").format.numberFormat = "#,##0";
items.getRange("D5:F5").values = [["Параметр","Формула/правило",""]]; header(items,"D5:F5",colors.purple);
items.getRange("D6:F12").values = [
  ["Тир legendary","baseTier + 2",""],
  ["Индексные статы","common 1; rare 1.1; epic 1.2; legendary 1.3",""],
  ["Цена/Gear Score quality","common 1; rare 2; epic 3; legendary 4",""],
  ["Зелья","common 1; rare 1.2; epic 1.5; legendary 2",""],
  ["Сокеты","оружие 2; броня 4; прочее 0",""],
  ["Магические свойства","rare 2; epic/legendary 3; common 0",""],
  ["Продажа","10% базовой цены",""],
]; sourceStyle(items,"F6:F12");
items.getRange("H5:K5").values = [["Качество","Индексные статы","Цена / Gear Score","Зелья"]]; header(items,"H5:K5",colors.green);
items.getRange("H6:K9").values = [["common",1,1,1],["rare",1.1,2,1.2],["epic",1.2,3,1.5],["legendary",1.3,4,2]];
items.getRange("A25:D25").values = [["Каталог формул","Выражение","Статус",""]]; header(items,"A25:D25");
items.getRange("A26:D34").values = formulaRows;
sourceStyle(items,"D26:D34"); items.getRange("B26:B34").format.wrapText = true;
items.getRange("A36:D36").values = [["Важно","Формулы конечного урона, попадания, уклонения и снижения урона в этой таблице не определены.","Не установлено",""]];
items.getRange("A36:D36").format.fill = colors.redLight; items.getRange("A36:D36").format.font = {name:font,size:10,bold:true,color:colors.red};
items.getRange("A:A").format.columnWidth=34; items.getRange("B:B").format.columnWidth=63; items.getRange("C:C").format.columnWidth=25; items.getRange("D:D").format.columnWidth=24;
items.getRange("E:E").format.columnWidth=46; items.getRange("F:F").format.columnWidth=24; items.getRange("G:G").format.columnWidth=3; items.getRange("H:K").format.columnWidth=18;
items.freezePanes.freezeRows(3); items.tabColor = colors.blue;

// Enhancement and sockets
baseSheet(enhance,"A1:H42"); title(enhance,"A2:H2","Заточка, сокеты и сферы"); rule(enhance,"A3:H3");
enhance.getRange("A5:D5").values = [["Заточка","Значение / поле","Комментарий",""]]; header(enhance,"A5:D5",colors.purple);
enhance.getRange("A6:D14").values = enhancementRows; sourceStyle(enhance,"D6:D14");
enhance.getRange("A16:G16").values = [["Тир","Оружие: 1-й","Оружие: 2-й","Броня: 1-й","Броня: 2-й","Броня: 3-й","Броня: 4-й"]]; header(enhance,"A16:G16");
enhance.getRange("A17:G28").values = socketRows; enhance.getRange("B17:G28").format.numberFormat = "#,##0";
enhance.getRange("A30:C30").values = [["Сфера","Основной базовый бонус, %","Дополнительный бонус"]]; header(enhance,"A30:C30",colors.green);
enhance.getRange("A31:C35").values = orbRows;
enhance.getRange("E30:F30").values = [["Длительность","Множитель"]]; header(enhance,"E30:F30",colors.green);
enhance.getRange("E31:F36").values = orbMultiplierRows;
enhance.getRange("A38:F38").values = [["Правило","Итог","","","",""]]; header(enhance,"A38:F38",colors.purple);
enhance.getRange("A39:C40").values = [
  ["Бонус сферы","baseBonus × durationMultiplier",""],
  ["Шанс заточки","Зависит от типа усиления; таблица процентов не задана",""],
]; sourceStyle(enhance,"C39:C40");
enhance.getRange("A:A").format.columnWidth=29; enhance.getRange("B:B").format.columnWidth=30; enhance.getRange("C:C").format.columnWidth=57; enhance.getRange("D:D").format.columnWidth=27;
enhance.getRange("E:G").format.columnWidth=20; enhance.freezePanes.freezeRows(3); enhance.tabColor = colors.purple;

// Progress
baseSheet(progress,"A1:J82"); title(progress,"A2:J2","Прогресс, переплавка и уровни открытия"); rule(progress,"A3:J3");
progress.getRange("A5:B5").values = [["Калькулятор переплавки","Значение"]]; header(progress,"A5:B5");
progress.getRange("A6:A10").values = [["Уровень коллекции (1–5)"],["Уровень чертежа (1–4)"],["magicPropBonus мастера"],["Уровень свойства (1–3)"],["Количество прошлых плавлений"]];
progress.getRange("B6:B10").values = [[3],[3],[2],[2],[5]]; inputStyle(progress,"B6:B10");
progress.getRange("B6").dataValidation={rule:{type:"whole",operator:"between",formula1:1,formula2:5}}; progress.getRange("B7").dataValidation={rule:{type:"whole",operator:"between",formula1:1,formula2:4}}; progress.getRange("B9").dataValidation={rule:{type:"whole",operator:"between",formula1:1,formula2:3}};
progress.getRange("A12:A16").values = [["Бонус коллекции, internal"],["Бонус чертежа, internal"],["Бонус мастера, internal"],["Бонус свойства, internal"],["Итоговый шанс"]];
progress.getRange("B12:B16").formulas = [["=VLOOKUP(B6,$H$6:$I$10,2,FALSE)"],["=VLOOKUP(B7,$H$13:$I$16,2,FALSE)"],["=ROUND(B8*100,0)"],["=VLOOKUP(B9,$H$19:$I$21,2,FALSE)"],["=MIN((B12+B13+B14+B15)/100+1+B10,1000)/10"]];
calcStyle(progress,"B12:B16"); progress.getRange("B16").format.numberFormat='0.0"%"';
progress.getRange("D5:F5").values = [["Формула","Расшифровка",""]]; header(progress,"D5:F5",colors.purple);
progress.getRange("D6:F10").values = [
  ["min((collection+blueprint+master+prop)/100 + 1 + melts, 1000) / 10","Результат хранится как число процентов 0–100",""],
  ["Базовый шанс","0.1 процентного пункта",""],
  ["Одно предыдущее плавление","+0.1 процентного пункта",""],
  ["Бонус мастера","round(magicPropBonus × 100)",""],
  ["Ограничение","Не более 100%",""],
]; sourceStyle(progress,"F6:F10"); progress.getRange("E6:E10").format.wrapText=true;
progress.getRange("H5:I5").values = [["Коллекция","Internal bonus"]]; header(progress,"H5:I5",colors.green);
progress.getRange("H6:I10").values = [[1,0],[2,100],[3,300],[4,500],[5,1000]];
progress.getRange("H12:I12").values = [["Чертёж","Internal bonus"]]; header(progress,"H12:I12",colors.green);
progress.getRange("H13:I16").values = [[1,0],[2,100],[3,300],[4,1000]];
progress.getRange("H18:I18").values = [["Свойство","Internal bonus"]]; header(progress,"H18:I18",colors.green);
progress.getRange("H19:I21").values = [[1,0],[2,200],[3,500]];
progress.getRange("A19:B19").values = [["Бонус опыта основному персонажу","Значение"]]; header(progress,"A19:B19",colors.green);
progress.getRange("A20:A22").values = [["Сумма уровней остальных персонажей"],["Уровень Зала героев"],["Бонус опыта, %"]];
progress.getRange("B20:B21").values = [[120],[5]]; inputStyle(progress,"B20:B21");
progress.getRange("B22").formulas = [["=B20*(5+B21)/10"]]; calcStyle(progress,"B22"); progress.getRange("B22").format.numberFormat='0.0"%"';
progress.getRange("D19:F19").values = [["Дополнительные правила","Формула",""]]; header(progress,"D19:F19",colors.green);
progress.getRange("D20:F23").values = [
  ["Бонус опыта лидеру","sum(otherCharacterLevels) × (5 + hallLevel) / 10",""],
  ["Партийный бонус дропа","floor(sum(VIP bonusDropRate) / 10)",""],
  ["Партийный бонус опыта","floor(sum(VIP bonusExperience) / 10)",""],
  ["Партийный бонус серебра","floor(sum(VIP bonusSilver) / 10)",""],
]; sourceStyle(progress,"F20:F23");
progress.getRange("A25:E25").values = [["Функция","Уровень открытия","Видна с уровня","Недоступна в сезоне",""]]; header(progress,"A25:E25");
progress.getRange(`A26:E${25+featureRows.length}`).values = featureRows.map(([name,level,season])=>[name,level,Math.max(1,level-5),season?"Да":"Нет",""]);
progress.getRange(`D26:D${25+featureRows.length}`).conditionalFormats.add("containsText",{text:"Да",format:{fill:colors.redLight,font:{bold:true,color:colors.red}}});
sourceStyle(progress,`E26:E${25+featureRows.length}`); progress.freezePanes.freezeRows(25);
progress.getRange("A:A").format.columnWidth=37; progress.getRange("B:B").format.columnWidth=20; progress.getRange("C:C").format.columnWidth=20; progress.getRange("D:D").format.columnWidth=30; progress.getRange("E:E").format.columnWidth=25; progress.getRange("F:F").format.columnWidth=25; progress.getRange("G:G").format.columnWidth=3; progress.getRange("H:I").format.columnWidth=18;
progress.tabColor = colors.green;

// Routes
const routeRows = parsedRoutes.map(r => [r.key,r.path,routeCategory(r.path),notableRoutes.has(r.key)?"Неочевидный / служебный":"Обычный маршрут",notableRoutes.get(r.key)??"", ""]);
routeRows.push(["Arena","(маршрут отсутствует)","Бои","Отключено / заглушка","В списке вкладок боёв route = null",""]);
baseSheet(routes,`A1:F${routeRows.length+6}`); title(routes,"A2:F2","Маршруты и неочевидные экраны"); rule(routes,"A3:F3");
routes.getRange("A4:F4").values = [["Наличие маршрута не означает, что экран доступен: действуют проверки уровня, сезона, авторизации и сервера.","","","","",""]]; routes.getRange("A4:F4").merge(); routes.getRange("A4:F4").format = {fill:colors.amberLight,font:{name:font,size:10,bold:true,color:colors.text},wrapText:true};
routes.getRange("A6:F6").values = [["Ключ","Путь","Категория","Статус","Почему интересно",""]]; header(routes,"A6:F6");
routes.getRange(`A7:F${6+routeRows.length}`).values = routeRows;
routes.getRange(`D7:D${6+routeRows.length}`).conditionalFormats.add("containsText",{text:"Неочевидный",format:{fill:colors.purpleLight,font:{bold:true,color:colors.purple}}});
routes.getRange(`D7:D${6+routeRows.length}`).conditionalFormats.add("containsText",{text:"Отключено",format:{fill:colors.redLight,font:{bold:true,color:colors.red}}});
sourceStyle(routes,`F7:F${6+routeRows.length}`); routes.freezePanes.freezeRows(6); routes.getRange("A:A").format.columnWidth=34; routes.getRange("B:B").format.columnWidth=48; routes.getRange("C:C").format.columnWidth=23; routes.getRange("D:D").format.columnWidth=27; routes.getRange("E:E").format.columnWidth=48; routes.getRange("F:F").format.columnWidth=24; routes.tabColor = colors.amber;

for (const s of [overview,items,enhance,progress,routes]) {
  const used = s.getUsedRange();
  used.format.verticalAlignment = "center";
  used.format.autofitRows();
}

wb.recalculate();

const overviewCheck = await wb.inspect({kind:"table",range:"Обзор!A1:H26",include:"values,formulas",tableMaxRows:30,tableMaxCols:10});
console.log(overviewCheck.ndjson);
const itemCheck = await wb.inspect({kind:"table",range:"Предметы!A5:K21",include:"values,formulas",tableMaxRows:25,tableMaxCols:12});
console.log(itemCheck.ndjson);
const meltCheck = await wb.inspect({kind:"table",range:"Прогресс!A5:I23",include:"values,formulas",tableMaxRows:25,tableMaxCols:12});
console.log(meltCheck.ndjson);
const errors = await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",options:{useRegex:true,maxResults:300},summary:"final formula error scan"});
console.log(errors.ndjson);

await fs.mkdir(previewDir,{recursive:true});
for (const sheetName of ["Обзор","Предметы","Заточка и сокеты","Прогресс","Маршруты"]) {
  const image = await wb.render({sheetName,autoCrop:"all",scale:1,format:"png"});
  await fs.writeFile(`${previewDir}/${sheetName.replaceAll(" ","_")}.png`,new Uint8Array(await image.arrayBuffer()));
}

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(outputPath);
console.log(JSON.stringify({outputPath,routeCount:routeRows.length,featureCount:featureRows.length}));
