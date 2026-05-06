# Day 1 Intake Audit

Date: 2026-05-06

## Purpose

Assess the AI-generated game prototype, preserve the original project baseline, and define the work needed to convert it into an Apps in Toss submission candidate.

## Project Summary

- Game type: Vampire Survivors-like survival action game
- Target format: Mobile-first WebView game
- Engine: Phaser 3
- Build tool: Vite
- Runtime shape: Static SPA, no backend
- Save method: Browser `localStorage`
- Screen baseline: 390 x 844 portrait layout

## Existing Game Features

- Title, lobby, game, level-up, pause, game-over, and result scenes
- Character selection and meta upgrades
- Touch joystick and dash button
- Auto-attacking weapon system
- Enemies, bosses, waves, pickups, exp gems, and damage numbers
- Synergy, combo, hazard, event, and meta progression systems
- Procedural WebAudio effects and vibration guard
- JSON-driven characters, enemies, weapons, waves, passives, achievements, and synergies

## Verified Today

- Local dev server works on `http://127.0.0.1:5188/`
- Production build succeeds with `npm run build`
- Build output is small enough for Apps in Toss direction; current `dist` is about 2.4 MB
- In-browser play test reaches lobby and game scenes
- Level-up card overlay appears during play

## Critical Findings

### P1: Level-up card selection can freeze progression

`src/systems/LevelUpSystem.js` contains event listener registration after an unreachable `return` inside `passiveAtMax()`. As a result, `player:levelup` and `player:select-upgrade` handlers are not reliably registered. In the browser, selecting a level-up card left the game stuck on the level-up overlay.

### P2: Dash event cleanup is too broad

`src/scenes/GameScene.js` registers an anonymous `input:dash` listener and later clears all `input:dash` listeners with `EventBus.off('input:dash')`. This can accidentally remove unrelated dash listeners and create scene-transition input bugs.

## Apps in Toss Scope

The project is a good candidate for Apps in Toss WebView conversion because it is already a static mobile web game. Required conversion work:

- Add Apps in Toss framework setup
- Configure `granite.config.ts`
- Confirm app name, icon, and entry route
- Verify static asset paths after production build
- Test in sandbox and Toss app QR flow
- Prepare game submission materials and checklist

## Day 2 Starting Point

Create a `fix/core-game-loop` branch and fix the core progression blockers:

- Move `LevelUpSystem` event listener binding into the constructor
- Store and remove the GameScene dash handler precisely
- Verify level-up selection resumes play
- Verify start, play, level-up, pause, death/result, and lobby return loop
