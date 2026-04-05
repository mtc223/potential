---
name: sprite-asset-pipeline
description: >
  Use this skill for ALL work on the Life Simulator (codename: Potential) sprite asset pipeline.
  Triggers on any of: finding new assets, adding assets to the catalog, running the sprite review
  tool, processing Michael's decisions, fixing LPC paths, sourcing from OpenGameArt/itch.io,
  updating the embedded catalog, or expanding the taxonomy. Also triggers when Michael says
  things like "show me more sprites", "add these to the review", "what's still missing",
  "search for X asset", or "update the catalog". This is a living process that repeats in
  cycles — always check the current catalog state before starting any new work.
---

# Life Simulator — Sprite Asset Pipeline

This skill captures the full workflow for finding, cataloguing, reviewing, and sourcing pixel art
assets for **Life Simulator** (codename: Potential). The game uses **32px pixel art** in a
**3/4 top-down orthographic** perspective (Pokémon Gen 1/2 / LPC aesthetic).

Read `references/project-state.md` first — it has the current asset counts, what's approved,
and what's still needed so you don't duplicate work.

---

## Key File Locations

| File | Purpose |
|------|---------|
| `mnt/Potential/sprite-review/catalog.json` | Master asset catalog with all decisions |
| `mnt/Potential/sprite-review/index.html` | The interactive sprite review app (single HTML file) |
| `mnt/Potential/gap_strategy.docx` | Gap-filling strategy document from last review session |
| `mnt/uploads/all_decisions.json` | Michael's latest exported decisions (when uploaded) |

The review app loads the catalog from an **embedded JSON variable** (`EMBEDDED_CATALOG`) inside
`index.html`. After any catalog change you must regenerate this — see the Update Cycle below.

---

## The Core Loop

Every session follows this cycle. Figure out where you are and jump in:

```
1. FIND    → Search for new LPC-compatible assets (OGA, itch.io, GitHub)
2. ADD     → Add them to catalog.json with correct metadata
3. EMBED   → Regenerate EMBEDDED_CATALOG in index.html
4. REVIEW  → Michael opens the app, reviews, exports all_decisions.json
5. PROCESS → Read decisions, fix bad paths, update catalog statuses
6. GAPS    → Identify what's still missing; plan next sourcing round
```

---

## Catalog Schema

Each asset in `catalog.json` → `assets[]` has this shape:

```json
{
  "id": "unique_snake_case_id",
  "name": "Human-Readable Name",
  "subcategory": "living_room",
  "source": "lpc",
  "lpcPath": "Objects/Furniture/Shelf.png",
  "sourceUrl": null,
  "license": null,
  "needsGeneration": false,
  "notes": "Optional context",
  "tags": ["furniture", "storage"],
  "decision": "approved",
  "decisionNotes": "",
  "lpcPathFixed": true
}
```

**source values:**
- `"lpc"` — from the ElizaWy/LPC GitHub repo; set `lpcPath` to the repo-relative path
- `"free"` — from OpenGameArt / itch.io; set `sourceUrl` and `license`
- `"gap"` — nothing found yet; set `needsGeneration: true`

**decision values:** `"approved"` | `"rejected"` | `"maybe"` | `"flagged"` | `"pending"`

**subcategory values** (full taxonomy in `references/taxonomy.md`):
nursery, living_room, kitchen, bathroom, parents_bedroom, child_bedroom, teen_bedroom,
basement, attic, classroom, school_hallway, school_cafeteria, school_library, office,
warehouse, construction, auto_repair, factory, restaurant, retail, janitorial,
hospital_room, nursing_home, residential_outdoor, playground, urban_street, nature,
special, vehicle_car, vehicle_bus, vehicle_bigrig, vehicle_airplane, vehicle_subway,
vehicle_bicycle, char_player, char_npc

---

## Finding New Assets

### Compatibility Criteria (non-negotiable)
- **32×32 pixels** per tile (not 16×16 or 48×48)
- **3/4 top-down orthographic** (Pokémon Gen 1/2 style — not isometric, not side-scroller)
- **License:** CC0, CC-BY, CC-BY-SA, or OGA-BY 3.0. Must allow commercial use.
- **Style match:** LPC palette — muted colours, warm shadows, limited saturation

### Source Priority (check in order)

**1. ElizaWy/LPC GitHub** — already integrated, always check first
Browse: `https://github.com/ElizaWy/LPC/tree/main/Objects`
Sub-folders: `Furniture/`, `Furniture/Beds/`, `Furniture/Seating/`, `Furniture/Rugs/`,
`Small Items/`, `Small Items/Food/`, `Small Items/Fabric/`, `Wall Items/`, `Moveable/`
Also check: `https://github.com/ElizaWy/LPC/tree/main/Characters`

**2. OpenGameArt.org** — largest LPC library outside the main repo
OGA is often blocked from direct fetch. Use `WebSearch` with queries like:
- `site:opengameart.org LPC "[item name]" tileset`
- `site:opengameart.org "LPC" "[room type]" furniture interior`
Then record the URL — Michael can visit the page himself to download.

**High-value OGA packs already identified (check these for gap items):**
- [LPC] Simple Modern Furniture → toilet, bathtub, fridge — https://opengameart.org/content/lpc-simple-modern-furniture
- [LPC Revised] Base Object Kit → comprehensive furniture, clutter, lighting — https://opengameart.org/content/lpc-revised-base-object-kit
- LPC Grave Markers (remix) → cemetery gravestones — https://opengameart.org/content/lpc-grave-markers-remix
- 32x32 ambient → microwave, kitchen appliances — https://opengameart.org/content/32x32-ambient
- [LPC] House interior and decorations → kitchen, stove — https://opengameart.org/content/lpc-house-interior-and-decorations
- [LPC] Wooden Furniture → wooden furniture — https://opengameart.org/content/lpc-wooden-furniture
- [LPC] Upholstery → upholstered furniture — https://opengameart.org/content/lpc-upholstery
- [LPC] Interiors (bluecarrot16) → combined interior set — https://opengameart.org/content/lpc-interiors
- Cool School tileset → school furniture, lockers — https://opengameart.org/content/cool-school-tileset
- Industrial Zone Tileset → warehouse/factory props — https://opengameart.org/content/industrial-zone-tileset
- AK TopDown Asset Packs → kitchen appliances — https://opengameart.org/content/ak-topdown-asset-packs

**3. itch.io** — modern packs, sometimes blocked from fetch, use WebSearch
- `site:itch.io LPC top-down 32x32 [category] tileset`
- Filter for free or CC0. Many itch.io packs are 16×16 — always check pixel size.

### When Adding a Free Source Asset
Set `source: "free"`, populate `sourceUrl` (direct OGA/itch page URL) and `license`.
Do NOT set `lpcPath`. The review app will show it as needing a URL, not an LPC image.
Note: the app currently only renders LPC paths via raw.githubusercontent.com. If adding
non-LPC assets, you may need to extend the app to support external `sourceUrl` rendering.

---

## Adding Assets to Catalog

1. Open `catalog.json` and find the right subcategory section
2. Add the new asset object following the schema above
3. Choose a unique `id` (snake_case, descriptive, not too long)
4. Set `decision: "pending"` — Michael hasn't seen it yet
5. Run the embed update script (see below)

**For bulk additions**, write a Python script rather than editing JSON directly — it's
easier to avoid syntax errors. Follow the pattern in `references/update-scripts.md`.

---

## Updating EMBEDDED_CATALOG in index.html

After any catalog.json change, run this Python snippet to sync the app:

```python
import json, re

with open('mnt/Potential/sprite-review/catalog.json') as f:
    catalog = json.load(f)

catalog_json = json.dumps(catalog)  # compact, no indent

with open('mnt/Potential/sprite-review/index.html') as f:
    html = f.read()

pattern = r'(const EMBEDDED_CATALOG = )\{.*?\}(?=;[\s\n])'
match = re.search(pattern, html, re.DOTALL)
if match:
    new_html = html[:match.start()] + f'const EMBEDDED_CATALOG = {catalog_json}' + html[match.end():]
    with open('mnt/Potential/sprite-review/index.html', 'w') as f:
        f.write(new_html)
    print(f'Updated EMBEDDED_CATALOG ({len(catalog_json):,} chars)')
else:
    print('ERROR: Pattern not found — check that EMBEDDED_CATALOG is still in the HTML')
```

Always verify the update landed: `grep -o 'lpcPathFixed' index.html | wc -l` should be
nonzero if fixed assets exist.

---

## Processing Michael's Review Decisions

When Michael uploads `all_decisions.json` (exported from the app's "↓ All Decisions" button):

1. **Parse the summary first** — `data['summary']` has approved/flagged/rejected/pending counts
2. **Classify flagged LPC assets** — distinguish wrong paths from genuine failures:
   - Check the `lpcPath` against the known LPC repo structure (`references/lpc-paths.md`)
   - Common errors: `(A)` suffix should be `A`; missing commas in Small Items names;
     wrong filename entirely (e.g., "Floor lamp.png" → "Lighting (Floor).png")
   - Character paths that point to folders (e.g., `Characters/Body`) need a specific file
3. **Fix paths in catalog.json** — use the path reference in `references/lpc-paths.md`
4. **Apply decisions** — add `decision` and `decisionNotes` fields to each asset
5. **Mark re-review candidates** — assets with fixed paths should get `needsReReview: true`
6. **Regenerate EMBEDDED_CATALOG**
7. **Report to Michael** — summarise: N approved, N fixed (need re-review), N genuine gaps

### LPC Filename Gotchas
- Seating variants: actual files use `A` not `(A)` — e.g., `Chair, Sofa A.png` ✓ vs `Chair, Sofa (A).png` ✗
- Small Items with fire/camp: filenames use commas — `Fire, Camp.png` ✓ vs `Fire Camp.png` ✗
- Floor lamp: actual filename is `Lighting (Floor).png` not `Floor lamp.png`
- Character assets: these are folders with sub-folders, not single files — pick a representative
  sprite (e.g., `Characters/Body/Body 01 - Feminine, Thin/Walk.png`)

---

## Generating the Gap Strategy

After a review session, produce a gap strategy document if there are new gap items:

```python
# Classify gaps from all_decisions.json
gap_assets = [a for a in data['assets'] if a['source'] == 'gap']

# Group by:
# Tier A — common household/school (best chance free on OGA/itch)
# Tier B — industrial/professional (mixed, some commissions needed)
# Tier C — vehicles (commission batch)
```

Use the `docx` skill to produce a formatted strategy document. Save to `mnt/Potential/gap_strategy.docx`.

---

## Extending the Taxonomy

If Michael wants a new room or asset category not in the current taxonomy:

1. Add the new subcategory string to the `TAXONOMY` constant in `index.html`
   (search for `const TAXONOMY = ` — it's a nested object mapping categories to subcategories)
2. Add new assets to `catalog.json` under the new subcategory
3. Regenerate EMBEDDED_CATALOG

Do NOT remove existing subcategories — decisions are keyed by asset ID and subcategory.

---

## Generating New Assets (AI Generation)

For gap items with no free source, generation is an option for a future session. Key constraints:
- 32×32 pixels, 3/4 top-down orthographic
- LPC colour palette (128 colours, muted, warm shadows)
- Transparent background PNG
- Match the style of already-approved LPC assets

Good candidates for generation: nursery items (crib, changing table), gaming setup,
guitar, dumbbell, swing set, trampoline, BBQ grill, washer/dryer, factory equipment.

---

## Quick Reference: Current State

See `references/project-state.md` for the live counts. As of the last session (April 4 2026):
- 218 assets catalogued across 37 subcategories
- ~120 approved (after second re-review pass)
- 78 genuine gaps still needing sourcing or generation
- Key packs to download: [LPC] Simple Modern Furniture, LPC Grave Markers, Base Object Kit
- Vehicles (7 items) deferred — commission as a single batch later
