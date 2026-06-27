import type { PlayerData } from "@game/data/AllTypes/PlayerDataTypes";
import type { SlayerMasterIds } from "@game/data/AllTypes/SlayerTypes";
import type { MonsterIds } from "@game/data/MonsterData/MonsterInfoUtil";
import type { SlayerCategoriesIds } from "@game/data/MonsterData/MonsterTypes";

interface GameMonster {
  id: MonsterIds;
  name: string;
  tier?: number;
  slayer?: {
    category: number[];
  };
  itemCost?: Array<{ id: number; amount: number }>;
  stats?: {
    hitpoints: number;
  };
}

interface StoreState {
  state: PlayerData;
  stopProcess: () => void;
  stopAttackProcess: () => void;
  startAttackProcess: (monsterId: MonsterIds, speed: number) => void;
  updateAttackTimestamp: (time: number, speed: number) => void;
  changeSlayerTask: (monsterId: SlayerCategoriesIds, masterId: SlayerMasterIds, minAmount: number, maxAmount: number) => void;
}

interface PlayerStore {
  getState: () => StoreState;
  subscribe: (listener: () => void) => () => void;
}

declare global {
  interface Window {
    autoSlayerEnabled: boolean;
    autoSlayerDifficulty: SlayerMasterIds;
    autoSlayerStrategy: string;
    autoSlayerManualSelection: Record<number, Record<number, number>>;
    autoSlayerIgnoreCost: boolean;
    autoSlayerWeakness: boolean;
    getWeakestAttackStyleSkillId?: (stats: any) => number | null;
    getFiber: (el: Element | null) => any;
    AllMonsters?: Record<number, GameMonster>;
    AllSlayerMasters?: Record<number, any>;
    getMonsterInfo?: (monsterId: any, t?: any) => any;
    i18n?: any;
    SlayerCategoriesIds?: any;
    getNewSlayerTask?: (
      stats: any,
      slayerInfo: any,
      skills: any,
      completedQuests: any,
      slayerMasterId: number
    ) => SlayerCategoriesIds | null;
    getMonsterAmount?: (
      slayerInfo: any,
      slayerMasterId: number,
      categoryId: SlayerCategoriesIds
    ) => number;
    playerStore?: PlayerStore;
    persistentStore?: any;
    createMod: (cb: (stores: { playerStore: PlayerStore; persistentStore: any }) => void) => void;
    modCallbacks?: Array<(stores: { playerStore: PlayerStore; persistentStore: any }) => void>;
  }

  var AllMonsters: Record<number, GameMonster> | undefined;
  var AllSlayerMasters: Record<number, any> | undefined;
  var getMonsterInfo: ((monsterId: any, t?: any) => any) | undefined;
  var i18n: any;
  var getNewSlayerTask: ((
    stats: any,
    slayerInfo: any,
    skills: any,
    completedQuests: any,
    slayerMasterId: number
  ) => SlayerCategoriesIds | null) | undefined;
  var getMonsterAmount: ((
    slayerInfo: any,
    slayerMasterId: number,
    categoryId: SlayerCategoriesIds
  ) => number) | undefined;
  var autoSlayerEnabled: boolean;
  var autoSlayerDifficulty: SlayerMasterIds;
  var autoSlayerStrategy: string;
  var autoSlayerManualSelection: Record<number, Record<number, number>>;
  var autoSlayerIgnoreCost: boolean;
  var autoSlayerWeakness: boolean;
  var getWeakestAttackStyleSkillId: ((stats: any) => number | null) | undefined;
  var getFiber: (el: Element | null) => any;
  var createMod: (cb: (stores: { playerStore: PlayerStore; persistentStore: any }) => void) => void;
}
