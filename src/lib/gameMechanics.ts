/**
 * Shared Game Mechanics Logic
 * Used by both Frontend (UI Display) and Backend (Validation/Persistence)
 */

export const LEVEL_CAP = 100;

// Calculate Level based on Total XP
// Formula: Level 1 + sqrt(XP / 100)
// Examples:
// 0 XP -> Lvl 1
// 100 XP -> Lvl 2
// 400 XP -> Lvl 3
// 900 XP -> Lvl 4
// 2500 XP -> Lvl 6
export function calculateLevel(xp: number): number {
    if (xp < 0) return 1;
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    return Math.min(level, LEVEL_CAP);
}

// Calculate XP required to reach a specific level
export function xpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.pow(level - 1, 2) * 100;
}

// Calculate progress percentage to next level (0.0 to 1.0)
export function getLevelProgress(xp: number): number {
    const currentLevel = calculateLevel(xp);
    if (currentLevel >= LEVEL_CAP) return 1.0;

    const currentLevelXp = xpForLevel(currentLevel);
    const nextLevelXp = xpForLevel(currentLevel + 1);

    return (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
}
