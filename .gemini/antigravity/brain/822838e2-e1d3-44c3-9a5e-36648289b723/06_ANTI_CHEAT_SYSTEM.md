# 06 Anti-Cheat System (Mission Validation)

## Objective
Prevent automated or manual exploits that allow players to skip gameplay mechanics and instantly gain XP, items, or faction contributions.

## Threat Model
- **Instant Completion**: Users calling `markMissionComplete` via the browser console without playing the mission.
- **Fail Farming**: Intentional rapid failure to gain small amounts of XP/items.
- **Botting**: Automated scripts running missions faster than a human could.

## Architecture

### 1. Client-Side Timing (`useCollectionStore`)
- **State**: `activeMissionStart` stores the Unix timestamp when a player enters the mission (via `MissionTerminal`).
- **Action**: `startMission()` captures `Date.now()`.
- **Validation**: `markMissionComplete()` calculates the elapsed time:
  ```typescript
  const duration = activeMissionStart ? (Date.now() - activeMissionStart) : 0;
  ```
- **Cleanup**: `activeMissionStart` is reset to `null` immediately to prevent session reuse.

### 2. Server-Side Enforcement (Next.js API)
- **Endpoint**: `/api/player/sync`
- **Logic**:
  - Extracts `duration` from the payload.
  - If `missionId` is present (indicating a completion), it checks against `MIN_THRESHOLD` (30 seconds).
  - Rejects requests with `400 Bad Request` if the duration is too short.
- **Threshold**: Currently set to **30,000ms** (30s). This represents the minimum time required to navigate 3 stages and defeat a boss, even with a high-level character.

## Execution Flow
1. **Entry**: User clicks "Enter Sector" -> `MissionTerminal` mounts -> Calls `startMission()`.
2. **Gameplay**: Battle logic proceeds.
3. **Exit**: Battle concludes -> `markMissionComplete()` called -> Duration calculated -> Sent to server.
4. **Verification**: Server verifies `duration >= 30s` -> XP/Items granted.

## Security Considerations
- **Local Time Manipulation**: While duration is calculated client-side, it is checked on the server. A user could spoof `activeMissionStart` if they knew the structure, but they would still have to wait the actual time before hitting the API.
- **Future Improvement**: Store the start timestamp in the database (Supabase) on `startMission` to move validation entirely server-side.

## Status
- **Implemented**: Duration-based validation for all mission completions.
- **Threshold**: 30 seconds.
