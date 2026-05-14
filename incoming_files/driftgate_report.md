# DRIFTGATE STUDIOS — IMAGE GENERATION AUDIT REPORT
## How Marshall Generates Images, Current Limitations & Path Forward
**Date:** 2026-05-14 | **Prepared by:** Marshall (RTS Studio President)

---

## 1. HOW I GENERATE IMAGES

### The Engine
I use **DALL-E 3** (OpenAI), accessed via the Base44 platform API.
This is a **text-to-image diffusion model** — it generates images from
text prompts, with optional image references for style influence.

### The Process (What Actually Happens)
1. I write a detailed text prompt describing the desired output
2. Optionally attach a reference image for style/composition anchoring
3. DALL-E 3 generates a 1024x1024 PNG
4. I receive the URL and run post-processing in Python (PIL/Pillow):
   - Alpha channel verification
   - Bounding box crop
   - Contact sheet composition
   - Audit metrics

### What "Image Reference" Does (and Doesn't Do)
When I attach a reference image, DALL-E 3 uses it for:
- ✅ General art style (line weight, colour palette, rendering style)
- ✅ Approximate scale and composition
- ❌ NOT precise 3D rotation or viewpoint control
- ❌ NOT "rotate this object to face this direction"
- ❌ NOT spatial/geometric instruction following

The model has no 3D understanding. It pattern-matches to training data.

---

## 2. WHY N AND S KEEP FAILING

### The Core Problem: Training Data Distribution
DALL-E 3 was trained on billions of images from the internet.
Tank images on the internet are overwhelmingly:
- Side profiles (military recognition cards)
- 3/4 front views (magazine photography)
- Front-on hero shots (game promotional art)
- Overhead drone shots (news/military)

**Almost zero training data exists for:**
"A tank viewed from a fixed 50° isometric camera, facing directly away"

When we ask for the N direction, the model has no strong pattern to
match against — so it defaults to the nearest high-confidence pattern
in its training data, which is a rear elevation photo.

### Why Reference Images Don't Fix It
The reference image influences STYLE, not GEOMETRY.
DALL-E 3 cannot perform 3D rotation of an object from a 2D reference.
It can copy the colour palette, line style, and general composition —
but it cannot understand "this tank is at 50° isometric, rotate it 45°."

The directional arrow brief was a smart idea but hits the same wall:
the model sees an arrow as a compositional element, not a geometric
instruction for object rotation.

### Why Mirroring Doesn't Work
mirror(NW sprite) = tank facing upper-RIGHT = effectively NE, not N
The barrel angle changes correctly but the hull geometry is wrong —
tracks, hull side panels, and deck details are now on the wrong sides.
At small zoom this is partially hidden, but it's not a real N sprite.

---

## 3. WHAT DALL-E 3 IS GOOD AT (FOR RTS)

✅ Single-direction building sprites (no rotation needed)
✅ Consistent art style across a faction
✅ Top-down/isometric buildings where angle is less critical
✅ Texture and detail generation (rust, weathering, markings)
✅ Concept art and briefing materials
✅ Generating NE/E/SE/SW/W/NW vehicle sprites (diagonals work well)
✅ Damaged overlays, destruction states, decals
✅ UI elements, icons, portraits

---

## 4. WHAT DALL-E 3 CANNOT DO RELIABLY

❌ Precise 3D rotation of complex objects (N/S cardinal directions)
❌ Guaranteed consistent perspective across multiple generations
❌ True modular layer separation (turret vs hull as separate outputs)
❌ Pixel-level control of anchor points
❌ Seamless tiling assets (walls, roads, terrain)
❌ Consistent unit scale across separate generation sessions
❌ Sprite sheet generation (always attempts multiple views)

---

## 5. OTHER DIFFUSION OPTIONS & THEIR TRADE-OFFS

### Adobe Firefly
- Stronger commercial licensing (safe for game shipping)
- Better at following compositional reference images
- Still a 2D diffusion model — same N/S rotation problem exists
- Better for style-locked generation (trained on licensed content)
- Recommended for: Building sprites, UI, icons, faction identity work

### Runway Gen-3 / Gen-4
- Video model — can animate existing images (not great for rotation)
- Image-to-image with high fidelity reference following
- Motion tools could theoretically "rotate" a tank (risky, unpredictable)
- Better for: Animated FX (explosions, smoke, muzzle flash sequences)

### Stable Diffusion (Local / ComfyUI)
- Open source, runs locally, full control
- Can use ControlNet for depth/pose control — closer to rotation control
- Requires setup and GPU
- ControlNet depth maps could constrain isometric viewpoint better
- Recommended for: If you want AI generation with geometric control

### Midjourney
- Best aesthetic output of any diffusion model currently
- No API, no programmatic control, Discord-only workflow
- Similar N/S rotation failure — same fundamental limitation
- Good for: Concept art, faction identity exploration, building hero shots

---

## 6. THE REAL SOLUTION: 3D RENDER PIPELINE

### Why 3D Solves Everything
A 3D pipeline bypasses all diffusion limitations entirely:

| Problem | Diffusion AI | 3D Render |
|---------|-------------|-----------|
| N/S directions | ❌ Fails | ✅ Trivial |
| 8-direction consistency | ⚠️ Inconsistent | ✅ Perfect |
| Modular layers (hull/turret) | ❌ Cannot separate | ✅ Separate objects |
| Scale consistency | ⚠️ Drift between sessions | ✅ Exact |
| Damage states | ⚠️ Style drift | ✅ Same model, modifier |
| Tiling walls/terrain | ❌ Cannot tile | ✅ Easy |
| New unit variants | Reprompt + drift | ✅ Swap texture/model |

### Option A — Blender (Free, Most Control)
- Free, open source, industry standard
- Free T-72 model on Sketchfab/BlenderKit
- Lock isometric camera ONCE → render all 8 directions in 10 min
- Export with perfect alpha transparency
- AI-assist: generate texture from Firefly → apply to 3D model
- Estimated setup time: 2-3 hours first time, 15 min per new vehicle

### Option B — Asset Forge / Kenney's Tools
- Simpler 3D asset pipeline, game-dev focused
- Less control than Blender but faster learning curve

### Option C — Hybrid Pipeline (Recommended)
1. Use AI (Firefly/DALL-E) to generate TEXTURE and STYLE references
2. Apply textures to a basic 3D model in Blender
3. Render all 8 directions from locked camera
4. Export sprite sheets with perfect alpha
Best of both: AI art direction + 3D geometric precision

---

## 7. RECOMMENDED PIPELINE FOR DRIFTGATE

### Immediate (First Playable Sprint)
- Use existing 6-direction AI sprites (NE/E/SE/SW/W/NW) with direction snapping
- Accept N/S limitation — document it, ship it, revisit post-first-playable
- Use DALL-E 3 / Firefly for buildings (no rotation needed — much better results)
- Use DALL-E 3 for UI, icons, portraits, damage overlays

### Short Term (After First Playable)
- Set up Blender with locked isometric camera (one session, ~2-3 hrs)
- Re-render T-72 in all 8 directions (15 min)
- Establish Blender as the canonical vehicle pipeline
- AI generates textures → applied to 3D models → rendered

### Long Term (Full Production)
- All vehicles: Blender render pipeline
- All buildings: Firefly (style-locked, no rotation issue)
- All terrain/tiles: Blender procedural generation
- AI used for: concept art, texture generation, UI, portraits only

---

## 8. CURRENT ASSET INVENTORY STATUS

| Asset | Count | Quality | Blocker |
|-------|-------|---------|---------|
| Soviet buildings | 11 | ✅ Good post-crop | Needs crop pass |
| General buildings | 11 | ✅ Good post-crop | Needs crop pass |
| Defensive pack | 19 | ✅ True alpha | Needs audit |
| T-72 hull | 6 dirs | ✅ Good | N/S missing |
| T-72 turret | 6 dirs | ✅ Good | N/S missing |
| T-72 shadow | 0 | ❌ Missing | Generate |
| T-72 damage overlay | 0 | ❌ Missing | Generate |
| T-72 wreck | 0 | ❌ Missing | Generate |
| Infantry sprites | 0 | ❌ Missing | Not started |
| FX (explosions etc) | 0 | ❌ Missing | Not started |

---

## 9. HONEST VERDICT

For **buildings and static structures**: DALL-E 3 / Firefly works well.
No rotation required. Style consistency is achievable. Ship these.

For **vehicles requiring 8-direction rotation**: AI diffusion is the
wrong tool. It got us 75% of the way there (6/8 directions) but N/S
require 3D geometry, not language models.

The directional arrow idea was genuinely clever — the right thinking —
but hits a fundamental architectural limitation of how diffusion works.

**Blender is the correct answer for vehicles. It's not a workaround.
It's the industry-standard pipeline that every shipped RTS uses.**

---
*Marshall — Driftgate Studios RTS Director*
*Driftgate Studios — First Playable Sprint Active*
