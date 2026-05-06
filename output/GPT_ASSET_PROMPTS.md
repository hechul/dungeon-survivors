# 던전 서바이버즈 — GPT(DALL-E / Midjourney / SDXL) 에셋 생성 프롬프트

> 한 번에 30분짜리 뱀서라이크 게임의 모든 PNG 에셋을 결 일관되게 받아내기 위한 프롬프트북.
> 한 번에 다 던지지 말고 **Phase 단위**로 끊어서 생성하고, 각 Phase가 끝날 때마다 톤 일관성을 사람이 검토합니다.

---

## 0. 결(스타일) 단일 규약 — 모든 프롬프트에 공통 적용

### 0.1 STYLE_HEADER (이 줄을 모든 프롬프트의 맨 앞에 그대로 붙입니다)

```
top-down 2D pixel art for a mobile vampire-survivors-like game,
Kairosoft-inspired chibi 3-head-tall proportions, cute but slightly dark fantasy mood,
limited 32-color palette dominated by deep navy #0b0e14 background, cool blues, muted purples, warm orange/yellow accents,
soft 1-pixel black outline, subtle dithering, no anti-aliasing, no gradients,
clean silhouette readable at 32x32 px, transparent background (alpha PNG),
sprite centered with 2px padding on all sides, no shadow baked in (separate ellipse shadow used in-engine),
consistent with the rest of the "Dungeon Survivors" set
```

### 0.2 NEGATIVE_PROMPT (모든 프롬프트의 끝에 붙입니다)

```
no realistic shading, no 3D render, no photo-real, no anime cel shading, no thick painterly strokes,
no gradients, no glow halos, no JPEG artifacts, no watermark, no text or letters in image,
no background scenery (objects must float on transparent), no bevel, no extruded outline
```

### 0.3 공통 출력 규약
- **포맷:** PNG, alpha 채널 보존
- **렌더 해상도:** 1024×1024로 받고 → 사람이 nearest-neighbor 다운샘플로 타깃 px에 맞춤 (Photoshop/Aseprite 8x 축소)
- **시트 형태:** 가로 스트립 (frames are arranged left-to-right in a single horizontal row)
- **명명:** snake_case + 코드 spriteKey와 1:1 매칭

### 0.4 작업 흐름 (사람이 따라할 절차)
1. Phase 1부터 순차적으로 생성
2. 각 Phase 끝나면 Phase 0의 STYLE_HEADER에 맞는지 4가지 검사: ① 동일 팔레트 ② 동일 외곽선 굵기 ③ 동일 머리비율 ④ 동일 픽셀 그리드
3. 어긋난 결과는 같은 프롬프트를 1~2회 재생성, 그래도 안 맞으면 **레퍼런스 핀**(앞 단계 베스트 1장을 첨부)으로 image-to-image 모드 사용
4. 베스트만 `assets/` 경로에 배치하고 `BootScene.createPlaceholderTextures` 대신 `this.load.spritesheet(...)` / `this.load.image(...)`로 교체

### 0.5 애니메이션 일관성 규약 (ANIM_CONTRACT) — 모든 다중 프레임 프롬프트에 추가

> **현실 직시:** DALL-E / Midjourney / SDXL는 2026년 현재도 sprite sheet 생성을 정식 지원하지 않습니다.
> "4-frame strip" 한 줄로는 프레임마다 외곽선/색/비율이 미묘하게 달라져 인게임에서 "지터링"이 보입니다.
> 따라서 **두 갈래 워크플로우**를 권장합니다:
>
> **A. AI 단독 (저비용, 결과 일관성 약함):** 아래 ANIM_CONTRACT를 강하게 명시 + 같은 프롬프트 5~10번 재생성 → 베스트 1장 채택
> **B. AI + 툴 보간 (권장, 깔끔):** AI는 **키포즈 1프레임씩만 생성** → Aseprite/Photoshop/EbSynth로 in-between 채우기

이 ANIM_CONTRACT 블록을 모든 다중 프레임 프롬프트의 SPEC 다음에 그대로 추가합니다:

```
ANIMATION CONSISTENCY CONTRACT (must be obeyed for every frame in the sheet):
- IDENTICAL canvas: every frame has the EXACT same width, height, and transparent margin (no shrinking/expanding),
- IDENTICAL pivot point: the character's anchor (typically center of feet for characters, center of mass for FX) is at the SAME pixel coordinate in every frame (e.g., x=center, y=28 for a 32x32 character),
- IDENTICAL palette: every frame uses the EXACT same hex color values; do not introduce new colors mid-animation,
- IDENTICAL outline thickness: 1-pixel black outline on every frame, no thicker on motion frames,
- IDENTICAL silhouette mass: the total non-transparent pixel count varies by less than 10% between frames,
- LOOP CLOSURE: the last frame must transition smoothly back to the first frame (frame N+1 = frame 1 must look natural),
- FRAME SEPARATORS: render each frame against the same transparent background; if the model bleeds frames together, draw a 1-pixel transparent gutter between frames,
- NO motion blur, NO smear frames, NO ghosting trails baked in (engine handles trails separately),
- NO color shift between frames except for explicitly described pulsing (e.g. "fuse brightens on frame 3 only").
If you cannot satisfy ALL of the above in a single sheet, output frame 1 only at full quality and I will assemble the sheet myself.
```

> **사용법:** 다중 프레임이 들어가는 모든 프롬프트(walk cycle, idle breathe, FX loop, boss idle, telegraph pulse) 끝에 위 블록을 통째로 붙여넣습니다.

---

### 0.6 워크플로우 B: 키포즈 분할 생성 (권장)

AI가 시트를 못 만들 때의 안전한 폴백.
캐릭터 워크 4프레임을 한 번에 못 만들면 → **4번 따로 생성** + 각 프롬프트에 다음을 명시:

```
This is FRAME {N} of {TOTAL} of a walk cycle for [CHARACTER_NAME].
The character is on a 32x32 transparent canvas with feet at y=28, head at y=4, hip at y=18.
The pose for THIS frame is exactly: {POSE_DESCRIPTION}.
The previous frame ended with: {PREVIOUS_POSE} — make sure this frame is a natural progression toward the next.
The character must be visually IDENTICAL to the reference image attached (use img2img / "use as reference" mode at 70-80% strength).
Single frame only, do NOT make a sprite sheet.
```

### 0.7 보간 도구 추천 (in-between 자동화)
- **Aseprite** ($20, 픽셀아트 표준): 키포즈 2장을 onion skin으로 보고 사이 프레임 직접 그림
- **EbSynth** (무료, AI tween): 키포즈 → 보간 영상 → 프레임 추출
- **AnimateDiff (ComfyUI)**: 같은 캐릭터를 모션 LoRA로 자동 walk cycle 생성
- **Crosshatch / PixelLab.ai**: 픽셀아트 전용 commercial 툴

---

### 0.8 코드 매칭 (spriteKey ↔ 파일경로)
| spriteKey (코드) | 파일 경로 | 페이즈 |
|---|---|---|
| `bg_tile` | `assets/bg/tile_dungeon_floor.png` | P1 |
| `char_warrior` / `char_mage` / `char_ranger` | `assets/sprites/player/{id}.png` | P2 |
| `enemy_slime` ~ `enemy_sniper` | `assets/sprites/enemy/{id}.png` | P3 |
| `boss_skeleton_king` 외 3종 | `assets/sprites/boss/{id}.png` | P4 |
| `weapon_sword` ~ `weapon_frost` (+ 진화) | `assets/sprites/weapon/{id}.png` / `fx/{id}.png` | P5 |
| 젬/픽업/데미지폰트 | `assets/sprites/item/*` | P6 |
| HUD 프레임/버튼/모달/조이스틱 | `assets/ui/*` | P7 |
| 보스 텔레그래프/이벤트 알림/안개 | `assets/fx/*` | P8 |

---

# Phase 1 — 환경 / 배경 타일

## 목표
타일 1장으로 무한 스크롤되는 던전 바닥. 너무 화려하면 안 됨 (적/플레이어 가독성 우선).

## 1-1. `bg_tile` — 던전 바닥 타일
- **파일:** `assets/bg/tile_dungeon_floor.png`
- **타깃 크기:** 32×32 (생성 1024×1024 → 32배 축소)
- **요건:** 좌-우, 상-하로 seamless tile (가장자리에서 잘라 붙여도 이음새 안 보임)

```
{STYLE_HEADER}

A single 32x32 seamlessly tileable top-down dungeon stone floor tile.
Deep navy base #0b0e14 with subtle dark slate tiles #1a2030, very faint cracks and pebble dithering, 
sparse cool-blue moss highlights barely visible, almost monochrome dark, 
must tile perfectly on all four edges, no decorative center motif (player and enemies need contrast on top),
seamless texture, repeating pattern friendly, top-down perspective.

{NEGATIVE_PROMPT}
```

## 1-2. `bg_tile_alt_swamp` — 늪 바이옴 변종 (선택, 후기 단계용)
- **파일:** `assets/bg/tile_swamp.png`
- 동일 32×32, 조금 더 보라/녹색 톤

```
{STYLE_HEADER}

Same seamless 32x32 dungeon floor tile but biome-shifted to swamp/poison: 
deep teal #0e2028 base with muted toxic purple #2a1d3a flecks, 
tiny pale-green moss specks, same outline and dithering rules as the dungeon floor tile, 
must seamlessly tile on all four edges. Top-down perspective.

{NEGATIVE_PROMPT}
```

---

# Phase 2 — 플레이어 캐릭터 3종

## 공용 캐릭터 규약 (이 단락을 캐릭터 프롬프트 앞에 추가로 붙임)

```
Character spec:
- chibi 3-head-tall, big readable eyes, simple flat face,
- 32x32 per frame, the character faces the bottom-right of the screen (3/4 top-down angle),
- silhouette must read at thumbnail size,
- no weapon held in idle (weapons are separate sprites in-engine).

Walk cycle frame breakdown (CLASSIC 4-FRAME PIXEL WALK — exact poses required):
- Frame 1 (CONTACT-DOWN): right foot strikes ground in front, left leg extended back, body at low point (y_offset = -1 from base), arms in mid-swing (right back, left forward),
- Frame 2 (PASSING): both legs nearly together, right leg passing under hip, body at HIGHEST point (y_offset = +1 from base), arms vertical at sides,
- Frame 3 (CONTACT-DOWN MIRRORED): left foot strikes ground in front, right leg extended back, body at low point (y_offset = -1), arms reversed (left back, right forward),
- Frame 4 (PASSING MIRRORED): both legs nearly together, left leg passing under hip, body at HIGH point (y_offset = +1), arms vertical.
Frame 4 must transition cleanly back to Frame 1 (loop closure).

Pivot anchor: the character's CENTER-OF-FEET pixel sits at (x=16, y=28) in every frame. The head/hair may bob, but the feet ground line is fixed.
```

*** 그리고 ANIM_CONTRACT 블록(0.5 절)을 캐릭터 프롬프트 본문 끝에 항상 붙여넣을 것 ***

## 2-1. `char_warrior` — 검사 (시작 캐릭터)
- **파일:** `assets/sprites/player/char_warrior.png`
- **시트:** 4프레임 가로 스트립 (walk)
- **컬러 키:** 차가운 파랑 #4ec9ff 갑옷, 회색 머리

```
{STYLE_HEADER}
{CHARACTER_SPEC}

Character: a young chibi knight named "검사 (Warrior)".
- short silver-gray hair, bright cyan eyes, friendly determined expression,
- cool steel-blue plate armor #4ec9ff with subtle navy shadows, 
- small pauldrons, brown belt with a metal buckle,
- empty hands (sword is rendered separately in-engine),
- 4-frame walk cycle from left to right: foot-down / contact / foot-up / contact (mirrored),
- arms swing slightly opposite to the legs.

{NEGATIVE_PROMPT}
```

## 2-2. `char_mage` — 마법사
- **파일:** `assets/sprites/player/char_mage.png`
- **컬러 키:** 보라 #d97aff 로브

```
{STYLE_HEADER}
{CHARACTER_SPEC}

Character: a young chibi mage named "마법사 (Mage)".
- long lavender hair half-covering one eye, calm intelligent expression, large violet eyes,
- deep purple wizard robe #6a3aa6 with magenta accents #d97aff, 
- a small star/moon emblem on the chest, soft fabric folds with hard pixel shading,
- pointed hood pushed back, no hat,
- empty hands (orb is a separate weapon sprite),
- 4-frame walk cycle, robe hem sways slightly between frames.

{NEGATIVE_PROMPT}
```

## 2-3. `char_ranger` — 사냥꾼
- **파일:** `assets/sprites/player/char_ranger.png`
- **컬러 키:** 숲 녹색 #6fbf73 가죽

```
{STYLE_HEADER}
{CHARACTER_SPEC}

Character: a chibi ranger named "사냥꾼 (Ranger)".
- short tied-back auburn hair, sharp focused eyes, light tan skin,
- forest-green leather hood #3a6b3f over shoulders, lighter green tunic #6fbf73, brown leather boots,
- a single quiver strap across chest (no bow held; weapon is separate),
- agile lean silhouette, slightly forward-leaning posture,
- 4-frame walk cycle with longer stride than warrior.

{NEGATIVE_PROMPT}
```

---

# Phase 3 — 일반 적 (10종)

## 적 공용 규약

```
Enemy spec:
- top-down chibi pixel art consistent with the player set above,
- 2-frame walk/breathe cycle as a horizontal strip,
- enemies face the player; pose is a generic forward-leaning hostile stance,
- silhouette and palette must clearly differ from the player set so the player remains the brightest object on screen,
- enemy outline is the same 1-px black; do NOT add red glow effects (engine handles damage flash).

Enemy 2-frame keypose breakdown (applies to all 2-frame enemies):
- Frame 1 — body at base height, weight on left side / left "limb-equivalent" forward, eyes at neutral position.
- Frame 2 — body at base height +1px (slight bob upward), weight shifted to right side / right "limb-equivalent" forward, eyes identical (do NOT animate eyes — keeps silhouette stable).
- F2 → F1 closes the loop. The total non-transparent pixel count differs by ≤5% between the two frames.
- Pivot anchor (center of feet / center of mass) is at the SAME pixel coordinate in both frames.
- For floating enemies (ghost, bat): instead of weight shift, use a 2px vertical bob (F1 at base y, F2 at base y -2).
```

*** 적 표 본문 프롬프트 끝에 0.5절 ANIM_CONTRACT 블록을 항상 붙일 것 ***

각 적은 동일 STYLE_HEADER + ENEMY_SPEC을 프롬프트 앞에 붙이고, 아래 표의 한 줄을 본문으로 씁니다.

## 일괄 표 (한 번에 배치 생성용)

| 코드 spriteKey | 파일 | 시트 크기 | 본문 프롬프트 |
|---|---|---|---|
| `enemy_slime` | `enemy/slime.png` | 16×16, 2프레임 | `A small green dungeon slime, gelatinous translucent body #4eaa44, two tiny black eyes, slight squish breathing animation across 2 frames, soft round silhouette.` |
| `enemy_bat` | `enemy/bat.png` | 14×14, 2프레임 | `A dark navy bat #5063a0 with slightly larger wingspan than its body, small fangs, glowing red dot eyes, 2-frame wing flap.` |
| `enemy_skeleton` | `enemy/skeleton.png` | 18×18, 2프레임 | `A wobbly chibi skeleton warrior, off-white bone color #e0d8c0, hollow black eye sockets, jaw slightly open, simple loincloth, 2-frame stagger walk.` |
| `enemy_ghost` | `enemy/ghost.png` | 18×18, 2프레임 | `A pale ghostly figure #adc6e6 with translucent floating tail (no legs), hollow eyes, drifting up-and-down 2-frame bob.` |
| `enemy_orc` | `enemy/orc.png` | 22×22, 2프레임 | `A sturdy chibi orc, dark olive skin #356638, leather-strap chest, small tusks, angry eyes, hunched walk with heavy 2-frame step.` |
| `enemy_swarmer` | `enemy/swarmer.png` | 12×12, 2프레임 | `A tiny rat-like creature, dark gray fur #484848, beady red eyes, very small twitchy body, scuttling 2-frame run cycle.` |
| `enemy_caster` | `enemy/caster.png` | 18×18, 2프레임 | `A robed dark cultist enemy, deep purple cloak #934aff with hood obscuring face except glowing eyes, holds a tiny purple orb in one hand, 2-frame chant idle (orb pulses).` |
| `enemy_bomber` | `enemy/bomber.png` | 18×18, 2프레임 | `An angry chibi slime variant, fiery orange #ff7a40 with a lit fuse on its head, wide panicked eyes, slight pulsing glow on the fuse across 2 frames (do not bake glow halo, just brightness shift on the fuse pixel).` |
| `enemy_giant` | `enemy/giant.png` | 32×32, 2프레임 | `A heavy chibi giant ogre, slate gray skin #666666, broad shoulders, small head proportionally, oversized fists, slow heavy 2-frame stomp walk.` |
| `enemy_sniper` | `enemy/sniper.png` | 18×18, 2프레임 | `A robed archer-mage, ash-purple cloak #aeaad4, longer thin profile, holds a thin energy bow drawn taut, 2-frame steady aim (bow string subtly tensed).` |

## 결 통일 규칙 (적 전체 검토 시 체크)
- 모든 적의 **눈 색은 빨강 또는 노랑 계열**로 통일 (플레이어와 시각 구분)
- 모든 적 외곽선은 같은 1px black
- 모든 적이 화면에서 같은 거리(약 1.5~2배 캐릭터 크기 거리)에서 비슷한 비주얼 무게로 읽혀야 함

---

# Phase 4 — 보스 4종

## 보스 공용 규약

```
Boss spec:
- larger than regular enemies (64-96 px), top-down chibi but with more menacing detail,
- distinct silhouette readable from screen edge,
- one defining accent color per boss to match its theme,
- boss must look "important" — slightly higher detail density than mobs but SAME palette family,
- one HP-bar friendly silhouette: top half is the most readable detail.

Boss idle/breathe animation — 4-frame keypose breakdown (must apply to every boss):
- Frame 1 EXHALE LOW — torso scaled to 99% vertical (1px shorter), shoulders at lowest, accent items (cape/hair/runes) at neutral position.
- Frame 2 INHALE START — torso at 100% vertical, shoulders 1px higher, cape starts to drift outward 1px.
- Frame 3 INHALE PEAK — torso at 101% vertical (1px taller), shoulders highest, cape fully drifted outward 2px, accent glow (if any) at brightest level.
- Frame 4 EXHALE START — torso back to 100%, cape returning, accent at mid-brightness.
- Frame 4 → Frame 1 must close the loop seamlessly (frame 1 = same as F4 minus one unit of inhale).

CRITICAL: the BOSS HEAD position is fixed at the same pixel coordinate in all 4 frames (do NOT bob the head). Only the torso/cape/accents move. This keeps the silhouette anchored for the engine's HP bar pointer.
```

*** 보스 본문 프롬프트 끝에는 0.5절 ANIM_CONTRACT 블록을 항상 붙일 것 ***

## 4-1. `boss_skeleton_king` — 해골왕 (5분)
- **파일:** `assets/sprites/boss/skeleton_king.png`
- **시트:** 64×64, 4프레임
- **테마:** 죽음 / 차가움 / 노랑 왕관 액센트

```
{STYLE_HEADER}
{BOSS_SPEC}

Boss: 해골왕 (Skeleton King), Tier-1 boss.
- towering chibi skeleton, off-white bones #e8e0c0 with cool gray shadows,
- tattered black royal cape #1a1a2a with frayed edges,
- golden crown #ffcc44 with three pointed tips, slightly tilted,
- two oversized rib-cage plates as armor,
- glowing red eye sockets,
- 4-frame breathing idle: cape sways subtly, crown stays still,
- silhouette must be clearly "king-shaped" with the crown as the readability anchor.

{NEGATIVE_PROMPT}
```

## 4-2. `boss_dark_mage` — 다크 메이지 (10분)
- **파일:** `assets/sprites/boss/dark_mage.png`
- **시트:** 64×64, 4프레임
- **테마:** 보라 마법 / 떠있음

```
{STYLE_HEADER}
{BOSS_SPEC}

Boss: 다크 메이지 (Dark Mage), Tier-2 boss.
- floating chibi sorcerer hovering above the ground (no feet, robe trails into shadow),
- deep violet robe #5e2da6 with magenta runic embroidery #d97aff at hem and sleeves,
- pointed hood deeply shadowed, only two glowing magenta eyes visible,
- holds a curled crystal staff topped with a faint purple gem (the staff is part of the sprite),
- 4-frame hover animation: robe drifts up/down, gem brightness pulses subtly,
- ominous silhouette but still chibi-cute.

{NEGATIVE_PROMPT}
```

## 4-3. `boss_dragon` — 드래곤 (20분)
- **파일:** `assets/sprites/boss/dragon.png`
- **시트:** 80×80, 4프레임
- **테마:** 적색 / 비늘 / 화염

```
{STYLE_HEADER}
{BOSS_SPEC}

Boss: 드래곤 (Dragon), Tier-3 boss.
- top-down chibi dragon coiled and partially spread, dark red scales #b32030 with darker maroon belly,
- two folded leathery wings forming a heart-like silhouette behind the body,
- short snout with smoke wisps from nostrils, glowing yellow eyes #ffcc44,
- bony spinal ridges along the back,
- claws visible at four corners,
- 4-frame breathing idle: wings flex slightly, smoke wisps drift up,
- silhouette wide and heavy, takes up clearly more screen real estate than mages/skeleton-king.

{NEGATIVE_PROMPT}
```

## 4-4. `boss_demon_king` — 마왕 (30분, 최종)
- **파일:** `assets/sprites/boss/demon_king.png`
- **시트:** 96×96, 4프레임
- **테마:** 흑색 + 적 글로우 (사실은 외곽 픽셀 1줄만 살짝 밝게, 글로우 금지)

```
{STYLE_HEADER}
{BOSS_SPEC}

Boss: 마왕 (Demon King), Tier-4 final boss.
- imposing chibi demon lord, charcoal-black armor #1a0010 with thin crimson trim #b3001a (only on edges, NOT a glow),
- two large curved horns above the head, third smaller horn on the chest plate,
- molten-orange runes #ff5511 etched into the chestplate (dithered, not glowing),
- skeletal cape made of red sinew strands trailing behind,
- four-pointed silhouette readable at thumbnail (horns + cape tips),
- 4-frame idle: cape sways, runes brightness flickers between frames (use 2 brightness levels, no actual blur),
- intimidating but still part of the cute pixel-art set — the menace comes from posture and palette, not from extra effects.

{NEGATIVE_PROMPT}
```

---

# Phase 5 — 무기 / 이펙트 (베이스 9 + 진화 9)

## 무기 공용 규약

```
Weapon/FX spec:
- top-down readability: weapons swing or fly along the screen plane,
- cohesive with character set: same palette, same outline rule,
- effect frames are short (4-8 frames) horizontal strips,
- effects must be tinted-friendly in-engine (mostly white-ish core with one accent), so engine can recolor for evolution variants.
```

## 5-1. 베이스 무기 9종 (배치 생성)

| spriteKey | 파일 | 사양 | 본문 |
|---|---|---|---|
| `weapon_sword` | `weapon/sword_swing.png` | 64×64, 6프레임 부채꼴 휘두름 | `Top-down sword swing arc, 6-frame keypose breakdown: F1 ANTICIPATION — sword silhouette only (silver blade #d8d8e8, brown hilt), tilted back at -45°, no arc yet. F2 STRIKE START — blade rotated to -10°, thin white-blue crescent arc #b8e0ff begins at the blade edge (10° wide). F3 PEAK — blade at +30°, wide 90° fan-shaped crescent arc fully formed, brightest cyan core. F4 FOLLOW-THROUGH — blade at +60°, arc starts trailing, slightly dimmer. F5 TRAIL — blade gone, only the cyan arc remains at lower opacity. F6 FADE — only faint outline of the arc. Pivot at hilt position (x=24, y=40) is identical across all frames. Loop closes by F6 → F1 cleanly. ANIM_CONTRACT applies.` |
| `weapon_orb` | `weapon/orb_proj.png` | 12×12, 4프레임 | `A top-down magical orb projectile, glowing core white-cyan #aaffff, 4-frame loop with subtle inner pulse. NOT a halo — sharp outline, slight pixel sparkle around edges.` |
| `weapon_aura` | `fx/fire_aura_loop.png` | 96×96, 6프레임 | `Circular fire aura ring centered at (48,48) in every frame, hollow center radius 28px, outer flame radius 44px, warm orange #ff7733 inner / deep red #cc3311 outer. 6-frame SEAMLESS LOOP keyposes: F1 BASE — flame tongues all at length 8px, evenly spaced 12 tongues around the ring. F2 RISE — every odd-indexed tongue grows to 12px, even tongues stay at 8px. F3 PEAK — all tongues at 12px, 2 extra tiny sparks #ffeeaa appear above tongues 1, 4, 7, 10. F4 PULSE — every even tongue at 12px (odd back to 8px), sparks gone. F5 SETTLE — all tongues back to 8px, slight inner-ring brightness boost. F6 → identical to F1 minus 1 unit of motion (perfect loop closure). The 12 tongues are at the SAME 12 angular positions in every frame, only their length pulses. Pivot is exact center (48,48), invariant. ANIM_CONTRACT applies.` |
| `weapon_blade` | `weapon/orbit_blade.png` | 16×16, 1프레임 | `A small spinning circular saw blade, polished steel #e0e0e8 with darker teeth, single static frame (engine rotates it). Top-down view, no motion blur.` |
| `weapon_whip` | `weapon/whip_swing.png` | 96×48, 6프레임 | `A horizontal whip-crack arc, golden-yellow #ffe14d energy whip extending left-then-right across 6 frames. Tip cracks with 2 small spark pixels in the final frame. Top-down side-swing.` |
| `weapon_lightning` | `fx/lightning_chain.png` | 64×64, 4프레임 | `A jagged chain-lightning bolt zigzagging between two points, electric pale-cyan #aaffff core with light-blue glow ring (1-pixel only), 4-frame anim from forming to peak intensity to fading. Bolt is angular pixel-stairs, NOT smooth.` |
| `weapon_poison` | `fx/poison_field.png` | 100×100, 6프레임 | `A round poison puddle on the ground, toxic green #4dffa0 with darker green #1a7a4a bubbles popping, 6-frame loop of bubbles forming and bursting. Edges slightly dithered for soft fade.` |
| `weapon_boomerang` | `weapon/boomerang.png` | 14×14, 1프레임 | `A small wooden boomerang silhouette, warm tan #c89a5b with darker stripes, single static frame (engine rotates it). Top-down view.` |
| `weapon_frost` | `fx/frost_burst.png` | 100×100, 6프레임 | `A radial ice burst from the player, ice-blue #aaeeff sharp shards radiating outward, 6-frame anim from small to wide ring then fading. Sharp pixel crystals, no fog.` |

## 5-2. 진화 무기 9종 (베이스의 강화/색 변종 — 결을 베이스에 맞춰 유지)

| spriteKey (코드) | 파일 | 베이스 | 본문 변경점 |
|---|---|---|---|
| `weapon_holy_sword` | `weapon/holy_sword_swing.png` | sword | `Same shape as the sword swing arc but full 360° rotating swing, color shifted to gold-white #ffeeaa with brighter holy core, 8 frames covering full rotation.` |
| `weapon_starfall` | `weapon/starfall_proj.png` | orb | `Same orb but shifted to warm gold #ffd866 with three small star-particle trails, 4-frame loop. Slightly larger (16x16).` |
| `weapon_inferno` | `fx/inferno_aura.png` | aura | `Same circular aura but bigger (128x128) and fiercer: red-orange flames with dark soot specks, 6-frame loop, more chaotic flame tongues.` |
| `weapon_thunder_whip` | `weapon/thunder_whip.png` | whip | `Same whip arc but the whip is now electric-purple #c97aff with crackling lightning forks branching off the main arc, 6 frames.` |
| `weapon_storm` | `fx/storm_chain.png` | lightning | `Same chain lightning but multi-branched (3-4 forks instead of 1), brighter cyan-white core, longer reach effect, 6 frames.` |
| `weapon_plague` | `fx/plague_field.png` | poison | `Same poison puddle but bigger (140x140) and darker — toxic purple-green #5a8a4d with sickly purple bubbles, 6-frame loop, more sinister vibe.` |
| `weapon_tempest` | `weapon/tempest_boom.png` | boomerang | `Same boomerang shape but wreathed in a soft cyan wind trail (2 trailing motion afterimages), 4-frame loop showing trail rotation.` |
| `weapon_blizzard` | `fx/blizzard_burst.png` | frost | `Same ice burst but much wider (160x160) with a swirling snow ring + larger ice shards, 8 frames.` |
| `weapon_death_orbit` | `weapon/death_orbit_blade.png` | orbit_blade | `Same blade silhouette but with a subtle dark-purple aura outline (1px) and inner glyph etched on the disc, single static frame.` |

---

# Phase 6 — 아이템 / 픽업 / 데미지 폰트

## 6-1. 경험치 젬 3종 (가치별 색)
- **파일:** `assets/sprites/item/exp_gem_small.png`, `_med.png`, `_big.png`
- **사양:** 8×8 / 10×10 / 14×14, 4프레임 반짝임 루프

```
{STYLE_HEADER}

Three pixel-art experience gem crystals (one prompt, but specify three variants in same style):
- small (8x8): bright lime-green #4dffa0 cut diamond, 4-frame sparkle loop with one white pixel rotating around it,
- medium (10x10): vivid sapphire-blue #66aaff cut diamond, slightly larger sparkle,
- big (14x14): warm amber-gold #ffaa33 cut diamond, brightest sparkle with two pixels.

All three share same outline thickness, same diamond facet shape, same sparkle pattern (one rotating white pixel + one static dot). They form a clear visual hierarchy: green = common, blue = rare, gold = elite.

{NEGATIVE_PROMPT}
```

## 6-2. 픽업 아이템 4종 (자석 / 폭탄 / 부스트 / 회복)
- **파일:** `assets/sprites/item/pickup_{magnet,bomb,boost,heal}.png`
- **사양:** 16×16, 단일 프레임 (엔진이 부드럽게 위아래 보빙)

```
{STYLE_HEADER}

Four pixel-art pickup item icons (16x16 each, one sprite per item, but generate as a 64x16 horizontal sheet in one image for consistency):
1. magnet — classic horseshoe magnet, cool cyan #66ccff body with white tips, "M" feel, simple silhouette,
2. bomb — round black bomb #1a1a1a with short lit fuse and a tiny orange spark, slight highlight on top,
3. boost — yellow lightning bolt icon #ffe14d in a faint circular outline, energetic posture,
4. heal — red cross / heart hybrid icon #ff5577 with a tiny shine pixel, friendly pickup feel.

All four share: same 16x16 frame, same 1px black outline, same vertical center line, same palette family. They are visually parallel — same "sticker" feel.

{NEGATIVE_PROMPT}
```

## 6-3. 데미지 숫자 폰트 (선택 — 기본 폰트로 대체 가능)
- **파일:** `assets/ui/font_damage.png`
- **사양:** 8×10 글리프 × 13 (0~9 + crit 마커 + plus + minus)

```
{STYLE_HEADER}

A tiny pixel-art damage-number bitmap font sheet, single horizontal row of 13 glyphs in this exact order:
[0][1][2][3][4][5][6][7][8][9][!][+][-]
Each glyph is 8x10 pixels, cream-white #fff8e0 fill with 1-px black outline, slight top highlight.
Crit marker "!" is the same style but in warm gold #ffe14d to differentiate.
All glyphs share identical baseline, identical stroke weight.
The output should be one PNG strip 104x10 px (rendered at 1024 wide for downsample).

{NEGATIVE_PROMPT}
```

---

# Phase 7 — UI / HUD / 모달 / 조이스틱

## 7-1. HUD 프레임 패널 (HP바 / EXP바 배경)
- **파일:** `assets/ui/hud_frame_top.png`, `hud_frame_hp.png`
- **사양:** 9-slice friendly (가장자리 4px가 반복용 모서리, 가운데가 stretch)

```
{STYLE_HEADER}

A 9-slice-ready UI panel frame for a top-down pixel game HUD.
- 32x16 px source size, with 4-px corners for 9-slice (the engine stretches the middle horizontally),
- color: dark slate #1a2030 fill with 1-px navy outline #0b0e14 outside and 1-px lighter slate #2a3550 inside (inset look),
- two variants in one image (32x32 sheet, top row and bottom row):
  Row 1: empty bar background frame,
  Row 2: same frame but slightly more orange-tinted (for boss HP bar variant).
- clean rectangular silhouette, NO ornaments, NO gold filigree. Function over form.

{NEGATIVE_PROMPT}
```

## 7-2. 가상 조이스틱 (베이스 + 스틱)
- **파일:** `assets/ui/joystick_base.png`, `joystick_stick.png`
- **사양:** 베이스 96×96, 스틱 56×56, 둘 다 단일 프레임

```
{STYLE_HEADER}

Two pixel-art mobile virtual joystick UI parts (output as separate PNGs, but generate side-by-side for style match):
1. joystick_base (96x96) — a soft dashed circle ring, semi-transparent white outline 1-px, faint inner crosshair (4 tiny tick marks at N/E/S/W), the inside is fully transparent so the dungeon shows through,
2. joystick_stick (56x56) — a solid round knob, cool blue #4ec9ff fill with a slightly darker bottom half (top-down lit feel), 1-px black outline, no bevel.

Both parts must share outline weight and the same blue accent so they read as one component.

{NEGATIVE_PROMPT}
```

## 7-3. 대시 버튼 (쿨다운 링)
- **파일:** `assets/ui/dash_button.png`
- **사양:** 80×80, 단일 프레임 (엔진이 부채꼴 마스크로 쿨다운 표현)

```
{STYLE_HEADER}

A circular DASH button for mobile UI, 80x80.
- outer ring: 1-px white outline, 1-px black drop outside (for contrast on any background),
- inner fill: cool blue #4ec9ff,
- center label: a small chevron arrow pointing right ">>" in cream white #fff8e0,
- no shadow, no bevel,
- the button has a small 2-px gap between outer ring and inner fill (engine fills this gap with a cooldown sweep).

{NEGATIVE_PROMPT}
```

## 7-4. 레벨업 카드 프레임
- **파일:** `assets/ui/levelup_card_frame.png`, `levelup_card_evo_frame.png`
- **사양:** 9-slice 96×128

```
{STYLE_HEADER}

Two 9-slice card frames, 96x128 each, output as one 192x128 horizontal sheet:
1. Standard card frame: dark navy #162236 fill, 2-px cool-blue #4ec9ff border, 4-px corners for 9-slice,
2. Evolution card frame: same shape but darker amber background #3a2e0d, 3-px gold #ffaa00 border, with two small triangular notches at the top corners (like a "special" card).

Both frames are EMPTY in the middle (the engine renders weapon icon + text). The visual difference signals "normal upgrade" vs "evolution available". No text, no icons baked in.

{NEGATIVE_PROMPT}
```

## 7-5. 일반 버튼 (큰 / 작은)
- **파일:** `assets/ui/button_primary.png`, `button_secondary.png`
- **사양:** 9-slice 64×24 (primary), 48×20 (secondary)

```
{STYLE_HEADER}

Two pixel-art UI buttons (output as one 128x24 sheet, primary on left, secondary on right):
1. Primary button (64x24): cool blue #4ec9ff fill, 1-px black outline, 1-px lighter top edge for inset, 9-slice corners 4px,
2. Secondary button (48x20): muted slate #2a3550 fill, same outline style, smaller.

Both share corner radius (sharp pixel corners, not rounded), share outline weight, share inset lighting. They look like a matched pair.

{NEGATIVE_PROMPT}
```

---

# Phase 8 — 환경 위험 / 보스 텔레그래프 / 알림 FX

## 8-1. 보스 차지 텔레그래프 라인
- **파일:** `assets/fx/charge_telegraph.png`
- **사양:** 256×16, 6프레임 가로 스트립 (펄스)

```
{STYLE_HEADER}

A horizontal warning line indicator for a boss charge attack telegraph.
- 256x16 per frame, 6 frames horizontal strip (total 1536x16),
- the line is segmented into 8 chevron-arrow pixels pointing right, each chevron 16x16,
- color: warning red-pink #ff5577 with a darker red core #b32040 outline,
- 6-frame anim: alternating "all dim / all bright" pulse, plus a sweeping highlight that travels left-to-right across the line,
- engine rotates and stretches this; sprite must look correct as a pure right-pointing line.

{NEGATIVE_PROMPT}
```

## 8-2. 환경 안개 / Hazard 링
- **파일:** `assets/fx/fog_ring.png`
- **사양:** 512×512, 단일 프레임 (엔진에서 스케일/회전 + alpha 합성)

```
{STYLE_HEADER}

A single circular fog/dark-zone ring overlay sprite, 512x512 transparent center.
- the OUTER 1/3 of the image is dark purple-black fog #110018 with dithered noise fading inward,
- the INNER center is fully transparent (the safe zone), 
- the boundary between fog and clear is a sharp 2-px purple ring #aa66ff,
- meant to be drawn with multiply or normal alpha blend; the engine pulses opacity,
- texture is rotation-symmetric so engine rotation looks fine.

{NEGATIVE_PROMPT}
```

## 8-3. 도전과제 / 시너지 알림 배너
- **파일:** `assets/ui/notification_banner.png`
- **사양:** 9-slice 200×40

```
{STYLE_HEADER}

A 9-slice notification banner background for in-game popups (achievements, synergies, evolution).
- 200x40 source, 6-px corners for 9-slice,
- dark slate background #1a2030 with a 2-px gold accent stripe #ffe14d on the LEFT edge only (the engine adds text on the right),
- 1-px black outer outline, 1-px navy inner outline,
- empty interior, no text baked in.
- the gold left stripe is the brand element — same accent color used across LevelUp evolution cards.

{NEGATIVE_PROMPT}
```

## 8-4. 파티클 도트 (사망 / 피격 / 레벨업 공용)
- **파일:** `assets/fx/particle_dot.png`
- **사양:** 4×4 단일 프레임 (엔진이 색만 입혀서 재사용)

```
{STYLE_HEADER}

A single 4x4 white particle dot sprite with a 1-px black outline, perfectly centered.
The interior is pure white #ffffff (the engine tints it per use: red for blood, gold for level-up, cyan for dash, etc.).
This is intentionally minimal — one universal dot used by all particle bursts in the game for color cohesion.

{NEGATIVE_PROMPT}
```

---

# Phase 9 — 타이틀 / 로비 / 결과 화면 (선택 — MVP 후순위)

## 9-1. 타이틀 로고
- **파일:** `assets/ui/title_logo.png`
- **사양:** 320×96, 단일 프레임

```
{STYLE_HEADER}

A pixel-art game title logo for "Dungeon Survivors" (영문) above smaller "던전 서바이버즈" (한글).
- main text uses a chunky pixel font, gold-cream #ffe1a8 fill with 2-px black outline and 1-px deep-orange shadow,
- a small red cross-sword pictogram between the two words,
- centered horizontally,
- transparent background,
- the logo must read at thumbnail size and feel "heroic but cute" (matching the chibi tone of the rest of the game).

{NEGATIVE_PROMPT}
```

## 9-2. 로비 배경 (선택)
- **파일:** `assets/bg/lobby_room.png`
- **사양:** 390×844 풀 화면, 단일 프레임

```
{STYLE_HEADER}

A simple dim dungeon-village hub background, 390x844 portrait, top-down isometric-ish.
- shows a small stone hearth in the center with a gentle cool-cyan flame,
- two wooden chests on the sides,
- worn flagstone floor matching the bg_tile palette,
- cool dark mood but not threatening (this is the safe lobby),
- empty central area where character cards and buttons will be drawn by the engine,
- no UI elements, no text in image.

{NEGATIVE_PROMPT}
```

## 9-3. 결과 화면 배너 (VICTORY / GAME OVER)
- **파일:** `assets/ui/result_victory.png`, `assets/ui/result_gameover.png`
- **사양:** 320×64, 단일 프레임

```
{STYLE_HEADER}

Two result-screen text banners (output as one 320x128 vertical sheet, top: VICTORY, bottom: GAME OVER):
1. VICTORY (top): "VICTORY!" in chunky pixel font, gold #ffe14d fill, 2-px black outline, 1-px white inner highlight,
2. GAME OVER (bottom): "GAME OVER" in same pixel font, muted red #b32040 fill, same outline rules.

Both must use the SAME font shape (consistency!), only color differs. Centered, transparent background.

{NEGATIVE_PROMPT}
```

---

# Phase 10 — 결 일관성 최종 검수 체크리스트

각 Phase가 끝난 직후 사람이 직접 확인:

- [ ] **팔레트 검사:** 모든 에셋의 색을 추출했을 때 핵심 12색 안에 들어가는가? (#0b0e14, #1a2030, #4ec9ff, #d97aff, #ffe14d, #ff5577, #4dffa0, #66ccff, #b32040, #ffaa00, #fff8e0, #88aacc)
- [ ] **외곽선 굵기:** 모든 도트 캐릭터/적/UI의 외곽선이 1px black인가? (UI 큰 프레임은 2px까지 허용)
- [ ] **머리 비율:** 모든 캐릭터/적이 3-head-tall에서 ±0.3 안인가?
- [ ] **그림자 베이크 금지:** 어떤 스프라이트도 자체 그림자/글로우/halo가 들어있지 않은가?
- [ ] **픽셀 그리드 정렬:** 1024 → nearest-neighbor 다운샘플 후 실제 픽셀 그리드가 깨지지 않는가?
- [ ] **서브픽셀 안티앨리어싱 없는가?** (있으면 폐기, 재생성)
- [ ] **결 통일 시각 점검:** 모든 에셋을 한 화면에 1배율로 나란히 배치 → "한 게임에서 나온 것처럼" 보이는가?
- [ ] **gameplay readability:** 타이틀 화면이 아닌 실제 인게임 배경 위에 적/플레이어/투사체가 모두 동시에 떴을 때 플레이어가 가장 밝고 적이 가장 어두운가?

### 애니메이션 매끄러움 검수 (다중 프레임 에셋 전용)

각 다중 프레임 시트를 Aseprite 또는 ezgif.com에 올려 실제 루프로 돌려보고 확인:

- [ ] **앵커 안정성:** 발(또는 중심점) 픽셀이 모든 프레임에서 정확히 같은 좌표인가? (1px 흔들리면 인게임에서 떨림)
- [ ] **루프 폐합:** 마지막 프레임 → 첫 프레임으로 넘어갈 때 끊김/점프가 없는가?
- [ ] **컬러 일관성:** 모든 프레임의 픽셀 팔레트가 동일한가? (한 프레임에서 추가된 색이 있으면 폐기)
- [ ] **외곽선 굵기:** 모든 프레임의 1px 외곽선이 일관되는가? (모션 프레임에서만 굵어지면 폐기)
- [ ] **실루엣 질량:** 비-투명 픽셀 수가 프레임 간 ±10% 이내인가?
- [ ] **스머/모션블러 없음:** 어떤 프레임에도 자체 모션 흐림이 들어있지 않은가?
- [ ] **AI 결과 polling:** 같은 프롬프트로 5~10장 생성했을 때 가장 깔끔한 1장만 채택했는가?
- [ ] **워크플로우 B 적용:** AI 시트가 부드럽지 않으면 키포즈만 살리고 in-between은 Aseprite/EbSynth로 보간했는가?

---

# Phase 11 — 코드 교체 가이드 (사람이 따라할 절차)

에셋 받은 후 `BootScene.js`의 placeholder 블록을 다음으로 교체:

```javascript
preload() {
  // 캐릭터
  this.load.spritesheet('char_warrior', 'assets/sprites/player/char_warrior.png', { frameWidth: 32, frameHeight: 32 });
  this.load.spritesheet('char_mage', 'assets/sprites/player/char_mage.png', { frameWidth: 32, frameHeight: 32 });
  this.load.spritesheet('char_ranger', 'assets/sprites/player/char_ranger.png', { frameWidth: 32, frameHeight: 32 });

  // 적
  this.load.spritesheet('enemy_slime', 'assets/sprites/enemy/slime.png', { frameWidth: 16, frameHeight: 16 });
  // ... (반복)

  // 무기/이펙트
  this.load.spritesheet('weapon_sword', 'assets/sprites/weapon/sword_swing.png', { frameWidth: 64, frameHeight: 64 });
  // ... (반복)

  // 환경/UI
  this.load.image('bg_tile', 'assets/bg/tile_dungeon_floor.png');
  this.load.image('hud_frame_top', 'assets/ui/hud_frame_top.png');
  // ... (반복)
}
```

그리고 각 엔티티의 `spriteKey`를 placeholder가 아닌 실제 키로 바꾸고, `setTint()`를 제거합니다 (실제 에셋은 이미 색이 입혀져 있음).

---

## 결 통일을 위한 마지막 한 줄

> **모든 프롬프트는 "Phase 0의 STYLE_HEADER가 곧 게임의 정체성"이라는 전제로 작성되어 있습니다.**
> 어느 하나라도 STYLE_HEADER 없이 생성한 결과는 폐기하고 다시 생성하세요. 일관성이 무너지면 50개 좋은 에셋도 1개 이질적인 에셋에 의해 분위기가 깨집니다.
