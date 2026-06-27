export const FallbackMonsterNames = {
    // Forest
    1001: "Forest Guy",
    1002: "Moss Golem",
    1003: "Thorn",
    1004: "Barkwraith",
    1005: "Moozey",
    1006: "Jack",
    1007: "Spiney",
    1008: "Tuskar",
    // Mine
    1101: "Little Rocky",
    1102: "Jiggy",
    1103: "Steel-Back Lizard",
    1104: "Gemstone Golem",
    1105: "Cave Spider",
    1106: "Cave Bat",
    1107: "Moe",
    1108: "Stingar",
    // Sea
    1201: "Fisher Boy",
    1202: "Bongo",
    1203: "Bongo Sr.",
    1204: "Serpia",
    1205: "Jelly",
    1206: "Crappy",
    1207: "Hammer Head",
    1208: "Walrus",
    // Field
    1301: "Sproutling",
    1302: "Rootmuncher",
    1303: "Herbwarden",
    1304: "Harley",
    1305: "Worm",
    1306: "Barkley",
    1307: "Eagle",
    1308: "Bernard",
    // Temple
    1401: "Bob",
    1402: "Skeleton Monk",
    1403: "Sigil Guardian",
    1404: "Angela",
    1405: "Temple Mouse",
    1406: "The Goat",
    1407: "Babu",
    1408: "Whisper",
    // Market
    1501: "Shardling",
    1502: "Steve",
    1503: "Amet",
    1505: "Infernal Dragon",
    1506: "Frat the Rat",
    1507: "Raco",
    1508: "Viper",
    1509: "Mammoth",
};
export const getMonsterName = (monsterOrId) => {
    if (!monsterOrId)
        return "Unknown";
    const id = typeof monsterOrId === "object" ? monsterOrId.id : Number(monsterOrId);
    if (typeof window.getMonsterInfo === "function") {
        const t = window.i18n && typeof window.i18n.t === "function" ? window.i18n.t : undefined;
        const info = window.getMonsterInfo(id, t);
        if (info && info.name)
            return info.name;
    }
    const fallback = typeof monsterOrId === "object" ? monsterOrId.name : undefined;
    return FallbackMonsterNames[id] || fallback || `Monster ${id}`;
};
