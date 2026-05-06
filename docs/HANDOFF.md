# Handoff

## Project

- Title: Dungeon Survivors / 던전 서바이버즈
- Genre: Mobile portrait survival action game
- Target: Apps in Toss WebView game candidate
- Stack: Vite, Phaser 3, JavaScript modules
- Backend: None
- Save: `localStorage`

## Run

```bash
npm install
npm run dev
npm run build
```

## Structure

- `src/main.js`: Phaser game boot entry
- `src/config/`: global constants and Phaser game config
- `src/scenes/`: scene flow such as boot, title, lobby, game, level-up, pause, game-over, result
- `src/entities/`: pooled game objects such as player, enemy, projectile, pickup, exp gem, damage number
- `src/systems/`: gameplay systems such as waves, weapons, collision, level-up, synergy, combo, hazards, meta progression
- `src/ui/`: HUD, virtual joystick, dash button, offscreen indicators
- `src/managers/`: save, audio, haptics, event bus, object pool
- `data/`: JSON-driven gameplay data
- `public/assets/`: sprite and effect assets loaded by Phaser

## Game Loop

1. `BootScene` loads JSON data and image assets.
2. `TitleScene` shows the title and saved best record.
3. `LobbyScene` handles character selection, meta upgrades, and synergy guide.
4. `GameScene` creates the player, UI, input, wave, weapon, collision, level-up, synergy, combo, event, hazard, and meta systems.
5. The player moves with touch joystick or keyboard and weapons attack automatically.
6. Enemies drop exp gems, pickups, and gold.
7. Level-up choices should pause the game and resume after one card is selected.
8. Death moves to `GameOverScene`, then `ResultScene`.
9. `ResultScene` saves gold/high score/unlocks and returns to lobby.

## Save Data

- Storage key: `dungeon-survivors-save-v1`
- Manager: `src/managers/SaveManager.js`
- Main fields:
  - `version`
  - `gold`
  - `unlockedCharacters`
  - `highScore`
  - `metaUpgrades`
  - `achievements`
  - `totals`

## Known Issues

- `src/systems/LevelUpSystem.js` has unreachable event listener registration after a `return` inside `passiveAtMax()`. Level-up card selection can get stuck.
- `src/scenes/GameScene.js` registers `input:dash` with an anonymous handler and later removes all `input:dash` listeners globally.
- No automated tests exist yet.
- No Apps in Toss configuration exists yet.
- No official app icon, screenshots, game description, or submission checklist assets exist yet.
- Asset source/licensing documentation is incomplete.

## Next Work

Recommended Day 2 branch: `fix/core-game-loop`

- Move `LevelUpSystem` event binding into the constructor.
- Store the GameScene dash handler as an instance method or property and remove only that handler during cleanup.
- Verify start, play, level-up, card select, pause, death, result, and lobby return.
- Confirm no console errors during one basic run.

Recommended later branches:

- `feat/apps-in-toss`: Apps in Toss SDK/config setup
- `tune/mobile-gameplay`: mobile UX and early gameplay tuning
- `release/ait-submission`: submission assets, checklist, and release tag

## Apps in Toss Notes

- This is a static Vite game and should be converted as an Apps in Toss WebView mini app.
- Keep the game portrait-first and mobile-touch-first.
- Confirm safe-area behavior, sound on/off behavior, background/foreground behavior, and asset paths after build.
- Game-specific ranking or server save would require additional Apps in Toss/game user identity work.
