# LPC Repo Path Reference

Base URL: `https://raw.githubusercontent.com/ElizaWy/LPC/main/`
GitHub browse: `https://github.com/ElizaWy/LPC/tree/main/`

## Objects/Furniture/ (44 files)
Direct PNG files (use path as-is):
Barrel, Bin, Cabinet, Cauldron, Chest, Christmas Tree, Clock (Grandfather), Copy Machine,
Countertop, Crate, Desk (Office), Desk (Vanity), Dresser, End Table, Fireplace,
Fireplace (Cast Iron), Fridge, Ladder, Lighting (Floor), Lighting (Outdoors),
Mirror (Standing), Oven (Modern), Planter, Sawhorse, Shavehorse, Shelf, Sink (Countertop),
Sink (Pedestal), Standing Screen, Stone Slab, Table (Card), Table (Ornate Wood),
Table (Rough Wood), Table (Workshop), Trough, TV (Widescreen), TV (Widescreen - No Service),
Vase-Studies, Vending Machine, Water Cooler, Wolf Stone, Workbench (Carpentry),
Workbench (Wire Drawing)

**IMPORTANT:** The floor lamp is called `Lighting (Floor).png` — NOT "Floor lamp".

## Objects/Furniture/Beds/ (16 files)
Beds, Child Headboards.png
Beds, Child Mattresses.png
Beds, Child.png
Beds, Double B.png
Beds, Double C - Overlays.png
Beds, Double C.png
Beds, Double Headboards.png
Beds, Double Mattresses.png
Beds, Double.png
Beds, Single A.png       ← correct
Beds, Single B.png
Beds, Single C.png       ← Michael rejected this one
Beds, Single Headboards.png
Beds, Single Mattresses.png
Single Beds B.png

## Objects/Furniture/Seating/ (31 files)
**CRITICAL NAMING:** Variants use plain `A`, `B`, etc. — NOT `(A)`, `(B)`.
Bar Stools.png
Chair, Dining A.png      ← NOT "Chair, Dining (A).png"
Chair, Dining B.png
Chair, Dining C.png
Chair, Dining D.png
Chair, Dining E.png
Chair, Dining F.png
Chair, Office.png
Chair, Sofa A.png        ← NOT "Chair, Sofa (A).png"
Chair, Sofa B.png
Chair, Sofa C.png  through G.png (7 variants total)
Loveseat, Small - Casual Patterned A.png   ← NOT "(A)"
Loveseat, Small - Casual Patterned B.png through D.png
Loveseat, Small - Casual Solid A.png through C.png
Loveseat, Small - Formal A.png
Ottoman, Long A.png      ← NOT "(A)"
Ottoman, Medium A.png
Ottoman, Small A.png
Ottoman, Small B.png
Sofa Set, Casual A.png   ← NOT "(A)"
Sofa, Casual A.png
Thrones.png

## Objects/Small Items/ (26 files + 3 subdirs)
**CRITICAL NAMING:** Many use commas as separators.
Baskets A.png
Boxes.png
Buckets.png
Coffee Maker.png
Dishes A.png
Dungeon Elements.png
Fire, Camp.png           ← comma required
Fire, Fireplace.png      ← comma required
Fireplace, Accessories A.png  ← comma required
Flowers.png
Games.png
Hay & Straw.png
Kitchen Clutter A.png
Laptop.png
Lighting, Table.png      ← comma required
Loose Paper.png
Lumber.png
Pillows.png
Presents.png
Rotary Phones.png
Sawdust.png
Skeletons A.png
Tabletop Portraits.png
Tools, Carpentry.png     ← comma required
Tools, Sewing.png        ← comma required
Tools, Smithing.png      ← comma required

Subdirs: Food/, Fabric/, Ores & Ingots/

## Objects/Wall Items/ (13 files)
Christmas Wall Decor.png
Curtains.png
Graffiti Elements.png
Graffiti.png
Lighting, Wall.png
Mailboxes (tiling).png
Mirrors.png
Paintings, Abstract.png
Paintings, Landscape.png
Paintings, Portraits.png
Paintings, Still Life.png
Posters.png
Pride Flags.png

## Objects/Moveable/ (7 files)
Shopping Cart.png
Wheelchair, Black.png
Wheelchair, Blue.png
Wheelchair, Pink.png
Wheelchair, Tan.png
Wheelchair, White.png

## Objects/Furniture/Rugs/
Contains rug tilesets (checked, already in catalog)

## Characters/ (folder paths — need specific file, not folder)
Characters are nested 3 levels deep. Representative preview paths:
- Body: `Characters/Body/Body 01 - Feminine, Thin/Walk.png`
- Children: `Characters/Children/Body 01 - Child/Walk.png`
- Clothing: navigate sub-folders for specific clothing type
- Hair: `Characters/Hair/Medium 01 - Page/Walk.png`
- Head: sub-folders by head type
- Head Accessories: sub-folders by accessory type
- Props: sub-folders by prop type

## URL Encoding
The app uses `encodeURIComponent()` per path segment, so:
- Spaces → %20
- Commas → %2C
- Parentheses → NOT encoded (they're safe characters)
All of these decode correctly on raw.githubusercontent.com.
