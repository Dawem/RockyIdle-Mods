import type { SlayerMasterIds } from "@game/data/AllTypes/SlayerTypes";
import type { SlayerCategoriesIds } from "@game/data/MonsterData/MonsterTypes";
import type { MonsterIds } from "@game/data/MonsterData/MonsterIds";
import { getMonsterName } from "./monster";

export const FallbackCategoryNames: Record<number, string> = {
  1001: "Minions",
  1002: "Giants",
  1003: "Undead",
  1004: "Birds",
  1005: "Pest",
  1006: "Snake",
  1100: "Forest",
  1101: "Mine",
  1102: "Sea",
  1103: "Field",
  1104: "Market",
  1105: "Temple",
  2000: "Bosses",
};

export const SlayerMasters = {
  EASY: 1001 as SlayerMasterIds,
  MEDIUM: 1002 as SlayerMasterIds,
  HARD: 1003 as SlayerMasterIds,
  EXPERT: 1004 as SlayerMasterIds,
} as const;

const CategoryEnumNames: Record<number, string> = {
  1001: "MINIONS",
  1002: "GIANTS",
  1003: "UNDEAD",
  1004: "BIRDS",
  1005: "PEST",
  1006: "SNAKE",
  1100: "FOREST",
  1101: "MINE",
  1102: "SEA",
  1103: "FIELD",
  1104: "MARKET",
  1105: "TEMPLE",
  2000: "BOSS",
};

export const getCategoryName = (categoryId: SlayerCategoriesIds): string => {
  const defaultNames = FallbackCategoryNames;

  if (window.i18n && typeof window.i18n.t === "function") {
    const enumSource = window.SlayerCategoriesIds || CategoryEnumNames;
    const enumName = enumSource[categoryId];
    if (enumName) {
      const diaryKey = `diary.${enumName}`;
      const translatedDiary = window.i18n.t(diaryKey);
      if (translatedDiary && translatedDiary !== diaryKey) {
        return translatedDiary;
      }
      const categoryKey = `slayer.category.${enumName}`;
      const translatedCat = window.i18n.t(categoryKey);
      if (translatedCat && translatedCat !== categoryKey) {
        return translatedCat;
      }
    }
  }

  return defaultNames[categoryId] || `Category ${categoryId}`;
};

// Helper to find monsters belonging to a slayer category and select based on strategy
export const getMonsterForCategory = (categoryId: SlayerCategoriesIds, slayerMasterId: SlayerMasterIds) => {
  if (!window.AllMonsters) return null;
  const monsters = Object.values(window.AllMonsters);

  const matchingMonsters = monsters.filter((monster) => {
    const isCategoryMatch =
      monster.slayer && Array.isArray(monster.slayer.category) && monster.slayer.category.includes(Number(categoryId));
    if (!isCategoryMatch) return false;

    if (window.autoSlayerIgnoreCost && monster.itemCost && monster.itemCost.length > 0) {
      return false;
    }
    return true;
  });

  if (matchingMonsters.length === 0) return null;

  const strategy = window.autoSlayerStrategy;

  if (strategy === "manual") {
    const savedMonsterId = window.autoSlayerManualSelection[slayerMasterId]?.[categoryId];
    if (savedMonsterId !== undefined) {
      const target = matchingMonsters.find((m) => m.id === savedMonsterId);
      if (target) return target;
      console.warn(
        `[Mod] Manually selected monster ID ${savedMonsterId} is costly or unavailable. Falling back to Lowest Health.`,
      );
    }
  }

  if (strategy === "highest") {
    matchingMonsters.sort((a, b) => {
      const hpA = a.stats && a.stats.hitpoints !== undefined ? a.stats.hitpoints : -1;
      const hpB = b.stats && b.stats.hitpoints !== undefined ? b.stats.hitpoints : -1;
      return hpB - hpA;
    });
  } else {
    // default 'lowest' or manual fallback
    matchingMonsters.sort((a, b) => {
      const hpA = a.stats && a.stats.hitpoints !== undefined ? a.stats.hitpoints : 999999;
      const hpB = b.stats && b.stats.hitpoints !== undefined ? b.stats.hitpoints : 999999;
      return hpA - hpB;
    });
  }

  return matchingMonsters[0];
};

// Global helper to programmatically start attacking a monster by ID
export const startMonsterAttack = (store: any, monsterId: MonsterIds) => {
  if (!store) {
    console.error("[Mod] Player store not ready yet.");
    return;
  }
  const state = store.getState();

  // Auto switch equipment set to match monster weakness if option is enabled
  if (window.autoSlayerWeakness && window.getMonsterInfo && window.getWeakestAttackStyleSkillId) {
    try {
      const monsterInfo = window.getMonsterInfo(monsterId);
      if (monsterInfo && monsterInfo.stats) {
        const weakestSkillId = window.getWeakestAttackStyleSkillId(monsterInfo.stats);
        if (weakestSkillId !== null) {
          let bestStyle = "";
          if (weakestSkillId === 1002) bestStyle = "Melee";
          else if (weakestSkillId === 1009) bestStyle = "Ranged";
          else if (weakestSkillId === 1015) bestStyle = "Magic";

          if (bestStyle) {
            const sets = state.state.equippedItems.sets;
            const currentSetIndex = state.state.equippedItems.currentSet;

            const getStyleForStance = (stanceId: number): string => {
              if (stanceId === 1005 || stanceId === 1006) return "Magic";
              if (stanceId === 1008 || stanceId === 1009) return "Ranged";
              return "Melee";
            };

            const currentStyle = getStyleForStance(sets[currentSetIndex]?.currentWeaponStyle);
            if (currentStyle !== bestStyle) {
              let targetSetIndex = -1;
              for (const [indexStr, set] of Object.entries(sets)) {
                const idx = Number(indexStr);
                const setStyle = getStyleForStance((set as any).currentWeaponStyle);
                if (setStyle === bestStyle) {
                  targetSetIndex = idx;
                  break;
                }
              }

              if (targetSetIndex !== -1 && targetSetIndex !== currentSetIndex) {
                state.changeCurrentCombatSet(targetSetIndex);
                console.log(`[Mod] Auto-switched to combat set ${targetSetIndex} (${bestStyle}) for monster weakness.`);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("[Mod] Error switching combat set to weakness:", e);
    }
  }

  // Stop any active skilling or combat processes
  if (state.state.currentProcess) state.stopProcess();
  if (state.state.currentAttackProcess) state.stopAttackProcess();

  // Trigger attack start. 2000ms is a safe default;
  // the game's MonsterDeathListener will automatically correct this on the first kill.
  const attackSpeed = 2000;
  state.startAttackProcess(monsterId, attackSpeed);
  state.updateAttackTimestamp(Date.now(), attackSpeed);
  console.log(`[Mod] Started combat process with Monster ID: ${monsterId}`);
};

export const triggerGetSlayerTask = (store: any, slayerMasterId: SlayerMasterIds) => {
  if (!store) return null;
  const state = store.getState().state;

  const masterInfo = window.AllSlayerMasters ? window.AllSlayerMasters[slayerMasterId] : null;
  if (!masterInfo) {
    console.error("[Mod] Invalid slayer master ID:", slayerMasterId);
    return null;
  }

  if (state.slayerInfo.currentSlayerTask && state.slayerInfo.currentSlayerTask.currentAmount > 0) {
    console.log("[Mod] Can't get a task: You already have an active Slayer task!");
    return null;
  }

  if (typeof window.getNewSlayerTask !== "function" || typeof window.getMonsterAmount !== "function") {
    console.error("[Mod] Slayer bot utility functions not globally exposed.");
    return null;
  }

  const newTaskMonsterId = window.getNewSlayerTask(
    state.stats,
    state.slayerInfo,
    state.skills,
    state.completedQuests,
    slayerMasterId,
  );

  if (newTaskMonsterId === null) {
    console.log("[Mod] Failed to roll task (requirements not met).");
    return null;
  }

  const monsterAmount = window.getMonsterAmount(state.slayerInfo, slayerMasterId, newTaskMonsterId);
  store.getState().changeSlayerTask(newTaskMonsterId, slayerMasterId, monsterAmount, monsterAmount);
  console.log(
    `[Mod] Legitimate task assigned: Master ${slayerMasterId} rolled Category ${newTaskMonsterId} (x${monsterAmount})`,
  );

  return { categoryId: newTaskMonsterId, amount: monsterAmount };
};

