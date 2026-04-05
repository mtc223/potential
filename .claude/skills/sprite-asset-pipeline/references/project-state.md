# Life Simulator — Current Asset Pipeline State

*Last updated: April 4, 2026 (Session 1)*

## Review Session Summary

| Status | Count | Notes |
|--------|-------|-------|
| Approved | ~120 | Increased after path fixes + re-review pass |
| Rejected | 1 | Single Bed C |
| Flagged | ~96 | Mix of genuine gaps + pending sourcing |
| Total Catalogued | 218 | Across 37 subcategories |

## Genuine Gaps (still need sourcing or generation): ~78 items

### Household (27)
- **Kitchen:** Microwave, Highchair, Toaster, Fruit Bowl, Dish Rack
- **Bathroom:** Toilet, Bathtub/Shower, Towel Rack, Medicine Cabinet, Rubber Duck
- **Living Room:** Coffee Table
- **Parents Bedroom:** Wardrobe/Closet
- **Child Bedroom:** Desk (Child), Lego/Building Blocks, Stuffed Animals
- **Teen Bedroom:** Gaming Setup, Guitar/Instrument, Dumbbell/Weights, Clothes on Floor
- **Nursery:** Crib, Changing Table, Baby Monitor, Soft Toys, Night Light
- **Basement:** Washer, Dryer, Ping Pong Table

### School (8)
- **Classroom:** Student Desks (Row), Chalkboard/Whiteboard, Globe, Clock (Wall)
- **School Hallway:** Lockers (Row), Bulletin Board, Trophy Case
- **School Cafeteria:** Food Service Counter

### Industrial (26)
- **Office:** Whiteboard on Stand, Conference Table (10-person)
- **Warehouse:** Pallet Jack, Forklift, Metal Shelving (Tall), Conveyor Belt, Hard Hat (Hanging)
- **Construction:** Toolbox, Scaffolding, Cement Mixer, Safety Cones
- **Auto Repair:** Car on Hydraulic Lift, Tool Pegboard, Creeper Dolly
- **Factory:** Assembly Line Conveyor, Industrial Press, Robotic Arm (silhouette)
- **Restaurant:** Industrial Flat Top Grill, Deep Fryer, POS Terminal
- **Retail:** Cash Register/POS, Retail Shelving Units
- **Janitorial:** Mop and Bucket (Wheeled), Industrial Floor Buffer, Caution Wet Floor Sign, Supply Cart (Rolling)

### Medical (3)
- **Hospital Room:** IV Stand (with bag)
- **Nursing Home:** Walker, Medication Tray

### Outdoor / Nature (7)
- **Residential Outdoor:** BBQ Grill, Driveway Basketball Hoop, Trampoline
- **Playground:** Swing Set
- **Special:** Cemetery Gravestones, Iron Fence (Cemetery), Weeping Willow

### Vehicles (7) — Deferred
- Car Interior (Front + Back Seat), School Bus Interior, Big Rig Cab Interior,
  Airplane Cabin, Subway Car Interior, Bicycle
- *Michael's decision: commission as a single batch later*

## Free Sources Already Identified (not yet downloaded)

These OGA packs cover several gap items — download and verify style match first:

| Pack | URL | Likely covers |
|------|-----|---------------|
| [LPC] Simple Modern Furniture | https://opengameart.org/content/lpc-simple-modern-furniture | Toilet, Bathtub |
| [LPC Revised] Base Object Kit | https://opengameart.org/content/lpc-revised-base-object-kit | Wardrobe, Desk (Child), clutter |
| LPC Grave Markers (remix) | https://opengameart.org/content/lpc-grave-markers-remix | Cemetery Gravestones |
| 32x32 ambient | https://opengameart.org/content/32x32-ambient | Microwave, kitchen appliances |
| Cool School tileset | https://opengameart.org/content/cool-school-tileset | Lockers, Chalkboard, Desks |
| Industrial Zone Tileset | https://opengameart.org/content/industrial-zone-tileset | Warehouse equipment |
| [LPC] House interior and decorations | https://opengameart.org/content/lpc-house-interior-and-decorations | Kitchen items |

## Items Likely Needing AI Generation (no free LPC source found)

- Nursery: Crib, Changing Table, Baby Monitor, Night Light
- Teen: Gaming Setup, Guitar/Instrument, Dumbbell/Weights
- Outdoor: Swing Set, Trampoline, BBQ Grill, Basketball Hoop
- Factory: Assembly Line Conveyor, Industrial Press, Robotic Arm
- Medical: Walker, IV Stand, Medication Tray

## LPC Path Fixes Applied (session 1)
27 paths were wrong in the original catalog — all corrected. Common patterns:
- `(A)` suffix → `A` (e.g., `Chair, Sofa (A).png` → `Chair, Sofa A.png`)
- Missing commas in Small Items (e.g., `Fire Camp.png` → `Fire, Camp.png`)
- Floor lamp renamed: `Floor lamp.png` → `Lighting (Floor).png`
- Character assets pointed at folders → now point at representative sprite files
