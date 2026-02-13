/** Server-side mission reward computation (deterministic, no randomness for rank/xp/pts) */

export type MissionRank = 'S' | 'A' | 'B' | 'F';

export function computeRank(
    hpRemaining: number,
    maxHp: number,
    turnsUsed: number,
    isFailure: boolean
): MissionRank {
    if (isFailure) return 'F';
    const hpPercent = (hpRemaining / maxHp) * 100;
    if (hpPercent > 80 && turnsUsed < 10) return 'S';
    if (hpPercent > 50 || turnsUsed < 15) return 'A';
    return 'B';
}

export function computeXp(rank: MissionRank, isBoss: boolean): number {
    const baseXP = isBoss ? 150 : 50;
    const rankMult = rank === 'S' ? 1.5 : rank === 'A' ? 1.2 : 1;
    return Math.floor(baseXP * rankMult);
}

export function computePtsReward(rank: MissionRank): number {
    const rewardMap: Record<MissionRank, number> = {
        'S': 100,
        'A': 50,
        'B': 25,
        'F': 0
    };
    return rewardMap[rank];
}

/** Deterministic reward items (server picks from fixed pool) */
export function computeRewardItems(rank: MissionRank): string[] {
    const MISSION_REWARDS: Record<MissionRank, string[]> = {
        S: ['HYPER_RESTORE', 'FULL_PP_RESTORE', 'ATTACK_MATRIX'],
        A: ['RESTORE_CHIP', 'PP_RECHARGE', 'DEFENSE_MATRIX'],
        B: ['RESTORE_CHIP', 'PP_RECHARGE'],
        F: ['RESTORE_CHIP'],
    };

    const possibleRewards = MISSION_REWARDS[rank];
    const numRewards = rank === 'S' ? 3 : rank === 'A' ? 2 : 1;
    const rewards: string[] = [];

    for (let i = 0; i < numRewards; i++) {
        const randomItem = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
        rewards.push(randomItem);
    }

    return rewards;
}
