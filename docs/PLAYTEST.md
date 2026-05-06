# Playtest Checklist

## Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Basic Smoke Test

- Page loads without a blank screen.
- Title scene appears on a fresh save.
- Tap or key press moves from title to lobby.
- Lobby shows character, upgrades, synergy tab, and dungeon entry button.
- Dungeon entry starts gameplay.
- HUD shows level, HP, timer, kills, gold, and weapon/passive count.
- Player can move with touch joystick.
- Player can move with keyboard for development testing.
- Dash button works and shows cooldown.
- Enemies spawn and move toward the player.
- Weapons attack automatically.
- Exp gems can be collected.
- Level-up overlay appears after gaining enough exp.
- Selecting a level-up card resumes gameplay.
- Pause can open and resume gameplay.
- Player death leads to game-over/result flow.
- Result screen can return to lobby.
- Gold/high score persist after returning to lobby.

## Mobile WebView Test

- Portrait layout fills the screen.
- No UI overlaps the notch/safe area.
- Main controls are reachable with thumbs.
- Text is readable on mobile.
- Buttons are large enough for touch.
- Touch joystick and dash button do not conflict.
- Browser/page scroll does not interfere with gameplay.
- App can go background and foreground without breaking.
- Sound does not autoplay before user interaction.
- Sound can be muted or disabled before submission.
- Vibration calls fail safely when unsupported.

## Apps in Toss Preflight

- Production build succeeds.
- Built assets load with relative paths.
- Bundle size is under Apps in Toss limits.
- No critical console errors during a basic run.
- First visible screen appears quickly.
- Back/pause/restart behavior is predictable.
- Game description, screenshots, icon, and rating materials are prepared.

## Current Known Failing Case

- Level-up card selection can remain stuck until `LevelUpSystem` event binding is fixed.
