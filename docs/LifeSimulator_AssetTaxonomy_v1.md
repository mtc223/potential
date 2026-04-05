**Life Simulator**

Asset Taxonomy & Room Generation Reference

*v1.0 · Companion to System Design Document*

**Overview**

This document catalogues all game assets required by the Life Simulator
--- the pixel art sprites, props, furniture, tiles, and environmental
objects needed to populate procedurally generated rooms across a
player\'s entire lifespan. It is a companion to the main System Design
Document, which should be consulted for architectural decisions.

Assets are organized by room context. At runtime, the LLM selects and
composes assets from this library to populate a RoomLayout --- it never
generates assets, only references them by asset_id. Background tiles are
composed dynamically; only the object/prop vocabulary needs to exist in
advance.

**Asset Sources**

Primary library: Liberated Pixel Cup (LPC) --- 32px, 3/4 top-down
orthographic perspective. Consistent with the Pokémon Gen 1/2 aesthetic.
CC-BY licensed, commercial use permitted with attribution.

-   LPC Curated Collection (ElizaWy): https://github.com/ElizaWy/LPC

-   LPC OpenGameArt Repository:
    https://github.com/OpenGameArt/LiberatedPixelCup

-   Universal LPC Character Generator:
    https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/

Gap-filling strategy: Assets not covered by LPC (modern technology,
age-specific props, blue collar equipment) will be generated via AI
image generation constrained to 32px 3/4 perspective and reviewed
manually before inclusion in the library.

**CHARACTERS**

**Characters**

Characters are layered sprite sheets composed from base body +
clothing + hair. The LPC Universal Character Generator handles most
character composition. All characters require walk cycles in 4
directions minimum.

**Player Character**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Baby / Infant**     No walk cycle. Crawl animation. Held-by-parent
                        state.

  **Toddler**           Wobbly walk cycle. Small scale vs adult.

  **Child (5-12)**      Standard walk cycle, smaller proportions

  **Teen (13-17)**      Standard walk cycle, approaching adult height

  **Young Adult         Full adult sprite, customizable appearance
  (18-30)**             

  **Middle Aged         Subtle aging variants --- weight, posture
  (30-60)**             

  **Senior (60+)**      Slower walk cycle, optional cane/walker accessory
  -----------------------------------------------------------------------

**NPC Characters**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Parents**           Mom and Dad variants, age-progressed across
                        decades

  **Siblings**          Child/teen/adult variants

  **Grandparents**      Senior sprites, distinctive clothing

  **Teachers**          Adult, formal clothing, clipboard/book prop

  **Doctor / Nurse**    Scrubs, white coat variants

  **Boss / Coworker**   Office and blue collar variants

  **Friends**           Casual clothing, multiple skin tones

  **Romantic Partner**  Adult, customizable

  **Children            Baby through teen, inherits player palette
  (player\'s)**         

  **Strangers /         Background NPCs, varied clothing
  Pedestrians**         
  -----------------------------------------------------------------------

**INDOOR ROOMS --- EARLY LIFE**

**Indoor Rooms**

**Nursery**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Crib**              With and without mobile overhead

  **Changing Table**    With diaper supplies on shelf

  **Rocking Chair**     

  **Baby Monitor**      On dresser or nightstand

  **Soft Toys / Stuffed Floor-placed variants
  Animals**             

  **Mobile (ceiling)**  Hanging stars/animals

  **Toy Chest**         Open and closed states

  **Night Light**       Plugged into wall, soft glow
  -----------------------------------------------------------------------

**Living Room**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Couch**             2-seater and 3-seater, multiple color variants

  **Armchair**          Matching set with couch

  **Coffee Table**      Wood variants

  **TV Stand**          With CRT (early life) and flatscreen (modal
                        overlay)

  **Bookshelf**         With books, full and sparse

  **Fireplace**         With and without fire animation

  **Family Photos**     Wall-hung, small sprites

  **Rug**               Floor tile variant

  **Floor Lamp**        Corner placement

  **Houseplant**        Potted, multiple sizes

  **Side Table**        
  -----------------------------------------------------------------------

**Kitchen**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Dining Table**      4-person and 6-person

  **Kitchen Chairs**    Matching set

  **Stove / Oven**      

  **Refrigerator**      Open and closed states

  **Kitchen Cabinets**  Upper and lower, LPC covered

  **Sink**              LPC covered

  **Microwave**         Counter-top, needs generation

  **Toaster**           Counter-top

  **Highchair**         Baby/toddler era only

  **Kitchen Counter**   Tile variant

  **Fruit Bowl**        Counter prop

  **Dish Rack**         Counter prop
  -----------------------------------------------------------------------

**Bathroom**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Toilet**            

  **Sink / Vanity**     With mirror above

  **Bathtub**           With shower curtain

  **Shower (separate)** Glass door variant

  **Towel Rack**        Wall-mounted

  **Medicine Cabinet**  Wall-mounted

  **Bath Mat**          Floor tile

  **Toilet Paper        Wall prop
  Holder**              

  **Rubber Duck**       Bathtub prop, childhood era
  -----------------------------------------------------------------------

**Parents\' Bedroom**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Double Bed**        Queen/King, multiple linen colors

  **Dresser**           4-drawer and 6-drawer

  **Wardrobe / Closet** Double door

  **Nightstand**        Pair, with lamp

  **Vanity Mirror**     

  **Laundry Hamper**    
  -----------------------------------------------------------------------

**Child Bedroom**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Single Bed**        With colorful linen variants

  **Toy Chest**         Open and closed

  **Bookshelf (small)** Kid-height

  **Desk (child)**      Small, with crayons/paper

  **Stuffed Animals**   Floor and bed props

  **Lego / Building     Floor scatter prop
  Blocks**              

  **Posters (child)**   Wall-hung, cartoon themes

  **Bean Bag Chair**    

  **Toy Box (open)**    With toys spilling out
  -----------------------------------------------------------------------

**Teen Bedroom**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Bed (full)**        Unmade variant

  **Desk (teen/adult)** With monitor (modal overlay)

  **Desk Chair**        Rolling, various colors

  **Bookshelf (tall)**  With books and trinkets

  **Guitar /            Leaning against wall
  Instrument**          

  **Posters (teen)**    Band, sports, movie themes

  **Clothes on Floor**  Scatter prop

  **Gaming Setup**      Chair + desk arrangement

  **Mirror (full        Door or wall
  length)**             

  **Dumbbell /          Floor prop
  Weights**             
  -----------------------------------------------------------------------

**Basement**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Washer**            

  **Dryer**             

  **Water Heater**      

  **Storage Boxes       Cardboard variants
  (stacked)**           

  **Old Furniture       Sheet-draped
  (covered)**           

  **Ping Pong Table**   

  **Workbench**         With tools

  **Fuse Box**          Wall-mounted
  -----------------------------------------------------------------------

**Attic**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Dusty Boxes**       Scatter variants

  **Old Furniture**     Covered with sheets

  **Holiday             Boxes labeled Xmas etc.
  Decorations**         

  **Forgotten Toys**    Old childhood items

  **Exposed Beams**     Ceiling/wall tile

  **Attic Window**      Small, dusty
  -----------------------------------------------------------------------

**INDOOR ROOMS --- SCHOOL**

**Classroom**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Student Desks**     Row arrangement, single-seat

  **Teacher\'s Desk**   Larger, front of room

  **Chalkboard /        Wall-mounted, full-width tile
  Whiteboard**          

  **Globe**             Desk prop

  **Bookshelf           Back of room
  (classroom)**         

  **Clock**             Wall-mounted

  **Flag**              Corner stand

  **Pencil Sharpener**  Wall-mounted

  **Bulletin Board**    Wall tile with paper pinned

  **Projector Screen**  Rollable, front of room
  -----------------------------------------------------------------------

**School Hallway**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Lockers**           Row tile, open and closed states

  **Water Fountain**    Wall-mounted

  **Trophy Case**       Wall display

  **Bulletin Board      With flyers
  (hallway)**           

  **Fire Extinguisher** Wall-mounted

  **Hall Pass Hook**    Near door
  -----------------------------------------------------------------------

**School Cafeteria**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Long Tables**       Bench-style, 8-person

  **Food Service        With sneeze guard
  Counter**             

  **Lunch Tray**        With food props

  **Trash / Recycling   End of row
  Station**             

  **Vending Machine**   Wall-placed
  -----------------------------------------------------------------------

**School Gym**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Basketball Hoops**  Wall-mounted

  **Bleachers**         Folded and extended states

  **Gymnastics Mats**   Floor tiles

  **Scoreboard**        Wall-mounted

  **Rope Climb**        Ceiling-mounted

  **Volleyball Net**    Portable stand
  -----------------------------------------------------------------------

**School Library**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Tall Bookshelves**  Double-sided row tiles

  **Reading Tables**    4-person

  **Card Catalog /      Era-dependent
  Computer Terminals**  

  **Checkout Desk**     Librarian counter

  **Cozy Reading        Bean bag, low shelf
  Corner**              
  -----------------------------------------------------------------------

**INDOOR ROOMS --- WORK**

**Office**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Cubicle Dividers**  Modular tile

  **Office Desk**       

  **Office Chair**      Rolling

  **Monitor (modal      Screen as UI overlay
  overlay)**            

  **Filing Cabinet**    2 and 4 drawer

  **Motivational        Wall prop, ironic
  Poster**              

  **Water Cooler**      

  **Printer / Copier**  

  **Whiteboard**        On stand

  **Conference Table**  Large, 10-person

  **Projector**         Ceiling-mounted

  **Break Room Fridge** 

  **Coffee Machine**    Counter-top

  **Vending Machine     
  (office)**            
  -----------------------------------------------------------------------

**Warehouse**

*ℹ️ Needs image generation --- not in LPC*

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Pallet Jack**       Animated operating state

  **Forklift**          Stationary and operating

  **Wooden Pallets**    Stacked variants, 1x-4x height

  **Cardboard Boxes     Labeled, various heights
  (stacked)**           

  **Metal Shelving      Floor-to-ceiling tile
  (tall)**              

  **Conveyor Belt**     Animated, directional

  **Loading Dock Door** Roll-up, open and closed

  **Hand Truck /        
  Dolly**               

  **Shrink Wrap Roll**  Pallet prop

  **Barcode Scanner     Counter-top
  Station**             

  **Hard Hat            Wall hook prop
  (hanging)**           

  **Safety Vest         Wall hook prop
  (hanging)**           

  **Time Clock (punch   Wall-mounted
  card)**               
  -----------------------------------------------------------------------

**Construction Site**

*ℹ️ Needs image generation --- not in LPC*

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Scaffolding**       Modular tile, multiple heights

  **Sawhorses**         Pair

  **Lumber Stack**      Floor prop

  **Concrete Blocks**   Stack variants

  **Porta-Potty**       Exterior prop

  **Tool Trailer**      Exterior prop

  **Cement Mixer**      Animated

  **Wheelbarrow**       Empty and loaded

  **Safety Cones**      Orange, scatter prop

  **Circular Saw (on    
  bench)**              

  **Toolbox**           Open and closed

  **Blueprints on       Table prop
  Table**               
  -----------------------------------------------------------------------

**Auto Repair Shop**

*ℹ️ Needs image generation --- not in LPC*

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Car on Hydraulic    Raised, silhouette
  Lift**                

  **Creeper Dolly**     Floor prop

  **Tool Pegboard**     Wall tile with tools

  **Oil Drain Pan**     Floor prop

  **Tire Stacks**       Corner prop

  **Diagnostic Computer Rolling station
  (cart)**              

  **Air Compressor**    Floor unit

  **Grease Rags**       Scatter prop

  **Empty Oil Cans**    Scatter prop

  **Shop Sink**         Wall-mounted, grimy
  -----------------------------------------------------------------------

**Factory / Manufacturing**

*ℹ️ Needs image generation --- not in LPC*

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Assembly Line       Animated, directional tile
  Conveyor**            

  **Industrial Press**  Large machine

  **Robotic Arm         Background prop
  (silhouette)**        

  **Safety Goggles      Wall-mounted dispenser
  Station**             

  **First Aid Kit**     Wall-mounted

  **Emergency Stop      Wall-mounted, red
  Button**              

  **Lockers (factory)** Row tile

  **Punch Card Clock**  Wall-mounted
  -----------------------------------------------------------------------

**Restaurant / Food Service**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Industrial Flat Top 
  Grill**               

  **Deep Fryer**        

  **Hood Vent**         Ceiling-mounted over grill

  **Walk-In Cooler      Wall prop
  Door**                

  **Bus Tub**           Table prop

  **Dish Pit with       Sink station
  Sprayer**             

  **Order Ticket Rail** Wall-mounted strip

  **POS Terminal**      Counter-top

  **Server Apron        Hook prop
  (hanging)**           

  **Prep Table          
  (stainless)**         

  **Hanging Pots**      Ceiling rack
  -----------------------------------------------------------------------

**Trucking**

*ℹ️ Needs image generation --- not in LPC*

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Big Rig Cab         Wide dash, CB radio, sleeper bunk, coffee
  Interior**            thermos, gauges

  **Truck Stop Fuel     Oversized, exterior prop
  Pumps**               

  **Weigh Station**     Exterior building prop

  **Loading Dock        Floor plate at dock
  Leveler**             

  **Yellow Dock         Wall-mounted at dock
  Bumpers**             

  **CB Radio**          Dash prop

  **Sleeper Bunk**      Behind cab seats

  **Trucker Logbook**   Dash prop
  -----------------------------------------------------------------------

**Retail / Grocery**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Shelving Units      Aisle tile, stocked and sparse
  (retail)**            

  **Checkout Conveyor   
  Belt**                

  **Cash Register /     
  POS**                 

  **Produce Display**   Tiered stand

  **Meat Counter**      Refrigerated case

  **Deli Slicer**       Counter-top

  **Stock Cart**        With boxes

  **Pricing Gun**       Counter prop

  **Shopping Cart       Exterior/entry prop
  Corral**              
  -----------------------------------------------------------------------

**Landscaping / Groundskeeping**

*ℹ️ Partially covered by LPC outdoor tiles*

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Riding Lawnmower**  

  **Push Mower**        

  **Leaf Blower**       Carried prop

  **Weed Trimmer**      Leaning prop

  **Mulch Pile**        Ground prop

  **Garden Hose Reel**  Wall-mounted

  **Truck Bed with      Partial vehicle prop
  Equipment**           

  **Trailer Hitch**     Vehicle prop
  -----------------------------------------------------------------------

**Janitorial**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Mop and Bucket      
  (wheeled)**           

  **Industrial Floor    
  Buffer**              

  **Supply Cart**       Rolling

  **Caution Wet Floor   Yellow, foldable
  Sign**                

  **Trash Barrel on     Large, industrial
  Wheels**              

  **Cleaning Supply     Wall unit
  Shelf**               
  -----------------------------------------------------------------------

**INDOOR ROOMS --- MEDICAL**

**Hospital Room**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Hospital Bed**      With rails, adjustable back

  **IV Stand**          With bag

  **Patient Monitor**   Bedside, screen as modal

  **Curtain Divider**   Room divider tile

  **Visitor Chair**     Plain, institutional

  **Bedside Table       
  (wheeled)**           

  **Call Button         
  (wall)**              

  **Oxygen Tank**       Floor prop
  -----------------------------------------------------------------------

**Doctor\'s Office**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Examination Table** With paper roll

  **Doctor\'s Desk**    With files

  **Medical Posters     Wall prop
  (anatomy)**           

  **Scale (medical)**   Floor prop

  **Blood Pressure      Wall-mounted
  Cuff**                

  **Stethoscope         Hook prop
  (hanging)**           

  **Prescription Pad**  Desk prop
  -----------------------------------------------------------------------

**INDOOR ROOMS --- LATE LIFE**

**Nursing Home / Senior Living**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Hospital-Style      Single, with rails
  Bed**                 

  **TV (wall-mounted)** Modal overlay screen

  **Family Photos       Cluster prop
  (wall)**              

  **Wheelchair**        Folded and occupied states

  **Medication Tray**   Bedside prop

  **Walker**            Beside bed

  **Comfortable Chairs  Cluster arrangement
  (common room)**       

  **Puzzle Table**      Common room prop

  **Large TV Stand      
  (common room)**       

  **Potted Plants**     Common room props
  -----------------------------------------------------------------------

**OUTDOOR ROOMS**

**Outdoor Rooms**

Outdoor spaces use LPC tile sets as the foundation. The LPC outdoor
tiles (grass, water, dirt, trees, paths) cover most terrain. The objects
below are placed within those tiled environments.

**Residential Outdoor**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Mailbox**           Curb-placed

  **Flower Beds**       Garden tile border

  **Porch / Stoop**     Steps + landing

  **Garage Door**       Roll-up, open and closed

  **Driveway Basketball 
  Hoop**                

  **Chalk Drawings**    Driveway floor tile

  **Swing Set**         Backyard

  **BBQ Grill**         Patio prop

  **Lawn Chairs**       Folding, around grill

  **Garden Shed**       Small structure

  **Trampoline**        Backyard

  **Fence**             Wood and chain-link variants, tile

  **Garden Hose         Side of house
  (coiled)**            

  **Birdbath**          Yard prop
  -----------------------------------------------------------------------

**Playground**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Swings**            2-seat and 4-seat variants

  **Slide**             Standalone and attached to structure

  **Monkey Bars**       

  **Sandbox**           With toys inside

  **Park Bench**        Wood slat, multiple placements

  **Drinking Fountain** Standalone

  **Climbing            Multi-piece prop
  Structure**           

  **Seesaw /            
  Teeter-Totter**       

  **Spring Rider**      Animal-shaped

  **Rubber Mulch        Floor tile variant
  Ground**              
  -----------------------------------------------------------------------

**City Park**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Park Benches**      Along path

  **Walking Path**      Gravel/paved tile

  **Pond**              Water tile with ducks

  **Ducks**             Animated, on water

  **Trash Can (park)**  Green, round

  **Street Lamp (park   
  style)**              

  **Dog (on leash)**    NPC prop

  **Jogger NPC**        Background character

  **Picnic Table**      

  **Gazebo**            Shelter structure

  **Flower Beds         Formal arrangement
  (park)**              
  -----------------------------------------------------------------------

**Sports Fields**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Baseball Diamond**  Dirt tile infield, bases

  **Dugout Bench**      Low wall + bench

  **Chain Link Fence    
  (backstop)**          

  **Scoreboard**        Outfield prop

  **Soccer Goal Posts** Pair

  **Sideline Benches**  Team bench

  **Football            End zone
  Goalposts**           

  **Running Track**     Oval tile border
  -----------------------------------------------------------------------

**Urban / Street**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Storefront          Tile variants --- diner, barbershop, laundromat
  Facades**             

  **Traffic Light**     Corner prop

  **Bus Stop**          Shelter with bench

  **Crosswalk**         Floor tile

  **Parking Meter**     Sidewalk prop

  **Fire Hydrant**      Sidewalk prop

  **Trash Can (city)**  Metal, lidded

  **Street Lamp**       

  **Newspaper Box**     Sidewalk prop

  **Manhole Cover**     Street tile

  **Graffiti Wall**     Alley tile variant

  **Dumpster**          Alley prop

  **Fire Escape**       Building side structure
  -----------------------------------------------------------------------

**Beach**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Sand**              Tile, various shades

  **Ocean Waves**       Animated tile border

  **Beach Umbrella**    Planted in sand

  **Beach Towel**       Floor prop

  **Lifeguard Tower**   Elevated structure

  **Surfboard**         Leaning prop

  **Sandcastle**        

  **Cooler**            Prop

  **Beach Ball**        

  **Seashells**         Scatter prop

  **Boardwalk**         Wooden plank tile
  -----------------------------------------------------------------------

**Nature / Outdoors**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Forest Path**       Dirt tile with tree canopy

  **Fallen Log**        Obstacle prop

  **Campfire**          Animated flame

  **Tent**              Two-person, various colors

  **Picnic Table        Weathered wood
  (nature)**            

  **River / Stream**    Animated water tile

  **Rocks / Boulders**  LPC covered

  **Birds               Animated, perched and flying
  (background)**        
  -----------------------------------------------------------------------

**Special / Transitional**

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Cemetery            Multiple styles, weathered
  Gravestones**         

  **Iron Fence          Tile
  (cemetery)**          

  **Weeping Willow**    Cemetery prop

  **Flower on Grave**   Placed prop

  **Church Steps /      Columns and steps
  Exterior**            

  **Ambulance Bay**     Hospital exterior

  **Airport Gate        Row of connected chairs
  Seating**             

  **Departure Board**   Modal overlay

  **Luggage Carousel**  Animated belt

  **Rooftop AC Units**  Background props

  **Water Tower**       Background structure

  **String Lights**     Rooftop/patio ambiance
  -----------------------------------------------------------------------

**VEHICLES**

**Vehicles**

*ℹ️ Vehicle interiors are self-contained room types with unique tile
sets. All need image generation.*

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Car Interior ---    Dashboard, steering wheel, gear shift, rearview
  Front**               mirror, window views

  **Car Interior ---    Bench seat, window view, behind headrests
  Back Seat**           

  **School Bus          Rows of green seats, aisle, large windows, driver
  Interior**            compartment

  **Big Rig Cab**       Wide dashboard, CB radio, gauges, cup holder,
                        sleeper bunk

  **Airplane Cabin**    3+3 seats, overhead bins, small oval windows,
                        aisle

  **Subway Car**        Bench seats along walls, hanging rails, doors,
                        route map overhead

  **Bicycle**           Exterior prop / player mount
  -----------------------------------------------------------------------

**UI / OVERLAY**

**UI Overlay Elements**

These are not pixel art assets --- they are rendered as screen overlays
(modal rectangles) consistent with the Pokémon dialogue box aesthetic.

  -----------------------------------------------------------------------
  **Asset / Prop**      **Notes / Variants**
  --------------------- -------------------------------------------------
  **Dialogue Box**      Bottom-screen text box, NPC speech

  **Phone Screen**      App launcher, messages, photos, journal

  **TV Screen**         Full-room overlay, channel/content

  **Computer Screen**   Full or partial overlay

  **Departure Board**   Airport context

  **Patient Monitor**   Hospital context

  **Scoreboard (live    Sports context
  game)**               

  **Notification        Small top-corner overlay
  Popup**               

  **Stat Change         +/- delta on player stats
  Indicator**           

  **Room Transition     Fade black, text narration
  Screen**              
  -----------------------------------------------------------------------

**GENERATION GAPS SUMMARY**

**Assets Requiring Generation**

The following categories are not covered by LPC and require generation
via image pipeline before launch:

-   Modern technology objects --- laptop, smartphone, flatscreen TV,
    microwave, gaming console

-   Baby/toddler specific props --- baby monitor, mobile, soft toys,
    high chair

-   Warehouse equipment --- pallet jack, forklift, conveyor belt,
    shelving

-   Construction site equipment --- cement mixer, scaffolding, site
    trailer

-   Auto repair shop --- hydraulic lift, pegboard tools, creeper dolly

-   Trucking --- big rig cab interior, truck stop props, CB radio

-   Factory/manufacturing --- assembly line, industrial press, robotic
    arm

-   Vehicle interiors --- all vehicle room types

-   Cemetery props --- gravestones, iron fence, weeping willow

-   Beach assets --- waves, lifeguard tower, boardwalk

-   Urban storefronts --- facade tile variants

-   Nursing home --- wheelchair, walker, medication tray

*See System Design Document for room object schema, RoomLayout
composition logic, LLM asset selection prompt design, and architectural
decisions.*
