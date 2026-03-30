/**
 * Shared Game Mechanics Logic
 * Used by both Frontend (UI Display) and Backend (Validation/Persistence)
 */

export const LEVEL_CAP = 100;

// Calculate Level based on Total XP
// Formula: Level 1 + cbrt(XP / 25)  — smoother polynomial curve
// Early levels come faster, late levels require real grind.
// Examples:
// 0 XP -> Lvl 1
// 25 XP -> Lvl 2
// 200 XP -> Lvl 3
// 675 XP -> Lvl 4
// 3125 XP -> Lvl 6
// 15625 XP -> Lvl 11
export function calculateLevel(xp: number): number {
    if (xp < 0) return 1;
    const level = Math.floor(Math.cbrt(xp / 25)) + 1;
    return Math.min(level, LEVEL_CAP);
}

// Calculate XP required to reach a specific level
export function xpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.pow(level - 1, 3) * 25;
}

// Calculate progress percentage to next level (0.0 to 1.0)
export function getLevelProgress(xp: number): number {
    const currentLevel = calculateLevel(xp);
    if (currentLevel >= LEVEL_CAP) return 1.0;

    const currentLevelXp = xpForLevel(currentLevel);
    const nextLevelXp = xpForLevel(currentLevel + 1);

    return (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
}
