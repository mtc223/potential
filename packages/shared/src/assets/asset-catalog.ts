/**
 * Asset catalog — the complete sprite vocabulary.
 *
 * At runtime the LLM selects assets from this catalog by id — it never
 * generates assets or invents ids. The renderer maps each id to a generated
 * sprite sheet (scripts/generate-sprites.mjs renders every id listed here).
 *
 * `contexts` tags drive prompt filtering: prompt_room receives only the
 * vocabulary relevant to the candidate room concept (plus universals).
 */

export type AssetKind = "object" | "floor" | "wall" | "character";

export interface AssetDef {
  readonly id: string;
  readonly name: string;
  readonly kind: AssetKind;
  /** Room context tags. 'any' = universally available. */
  readonly contexts: readonly string[];
  /** Blocks the walkable grid by default. */
  readonly solid: boolean;
  /** Footprint in tiles. Characters are always 1x1. */
  readonly w: number;
  readonly h: number;
}

const def = (
  id: string,
  name: string,
  kind: AssetKind,
  contexts: readonly string[],
  solid: boolean,
  w = 1,
  h = 1,
): AssetDef => ({ id, name, kind, contexts, solid, w, h });

export const ASSET_CATALOG: readonly AssetDef[] = [
  // ── Floors ────────────────────────────────────────────────────────────
  def("floor_wood", "Wood floor", "floor", ["any"], false),
  def("floor_carpet", "Carpet", "floor", ["any"], false),
  def("floor_tile", "Tile floor", "floor", ["kitchen", "bathroom", "hospital", "school"], false),
  def("floor_linoleum", "Linoleum", "floor", ["kitchen", "school", "office", "hospital"], false),
  def("floor_concrete", "Concrete", "floor", ["warehouse", "garage", "basement", "factory"], false),
  def("floor_grass", "Grass", "floor", ["outdoor", "park", "backyard"], false),
  def("floor_dirt", "Dirt", "floor", ["outdoor", "nature", "construction"], false),
  def("floor_asphalt", "Asphalt", "floor", ["street", "outdoor"], false),
  def("floor_sand", "Sand", "floor", ["beach"], false),
  def("floor_gym", "Gym floor", "floor", ["gym", "school"], false),

  // ── Walls ─────────────────────────────────────────────────────────────
  def("wall_plaster", "Plaster wall", "wall", ["any"], true),
  def("wall_wallpaper", "Wallpaper", "wall", ["home", "nursery", "bedroom"], true),
  def("wall_brick", "Brick wall", "wall", ["street", "basement", "warehouse"], true),
  def("wall_school", "School wall", "wall", ["school"], true),
  def("wall_hospital", "Hospital wall", "wall", ["hospital", "medical"], true),
  def("wall_office", "Office wall", "wall", ["office"], true),
  def("wall_industrial", "Industrial wall", "wall", ["warehouse", "factory", "garage"], true),
  def("wall_hedge", "Hedge", "wall", ["outdoor", "park", "backyard"], true),

  // ── Characters (sprite selectors — layered look baked per id) ─────────
  def("chr_baby", "Baby", "character", ["any"], false),
  def("chr_toddler", "Toddler", "character", ["any"], false),
  def("chr_child", "Child", "character", ["any"], false),
  def("chr_child_b", "Child (look 2)", "character", ["any"], false),
  def("chr_child_c", "Child (look 3)", "character", ["any"], false),
  def("chr_teen", "Teen", "character", ["any"], false),
  def("chr_teen_b", "Teen (look 2)", "character", ["any"], false),
  def("chr_teen_c", "Teen (look 3)", "character", ["any"], false),
  def("chr_adult_casual", "Adult (casual)", "character", ["any"], false),
  def("chr_adult_casual_b", "Adult (casual, look 2)", "character", ["any"], false),
  def("chr_adult_casual_c", "Adult (casual, look 3)", "character", ["any"], false),
  def("chr_adult_casual_d", "Adult (casual, look 4)", "character", ["any"], false),
  def("chr_adult_formal", "Adult (formal)", "character", ["any"], false),
  def("chr_adult_formal_b", "Adult (formal, look 2)", "character", ["any"], false),
  def("chr_adult_worker", "Adult (work clothes)", "character", ["any"], false),
  def("chr_adult_worker_b", "Adult (work clothes, look 2)", "character", ["any"], false),
  def("chr_middle_aged", "Middle-aged adult", "character", ["any"], false),
  def("chr_middle_aged_b", "Middle-aged adult (look 2)", "character", ["any"], false),
  def("chr_senior", "Senior", "character", ["any"], false),
  def("chr_senior_b", "Senior (look 2)", "character", ["any"], false),
  def("chr_doctor", "Doctor", "character", ["hospital", "medical"], false),
  def("chr_nurse", "Nurse", "character", ["hospital", "medical"], false),
  def("chr_teacher", "Teacher", "character", ["school"], false),
  def("chr_police", "Police officer", "character", ["street", "any"], false),
  def("chr_chef", "Cook", "character", ["restaurant", "kitchen"], false),

  // ── Nursery / early life ──────────────────────────────────────────────
  def("crib", "Crib", "object", ["nursery"], true, 2, 1),
  def("changing_table", "Changing table", "object", ["nursery"], true, 2, 1),
  def("rocking_chair", "Rocking chair", "object", ["nursery", "living_room"], true),
  def("toy_chest", "Toy chest", "object", ["nursery", "child_bedroom"], true),
  def("stuffed_animal", "Stuffed animal", "object", ["nursery", "child_bedroom"], false),
  def("night_light", "Night light", "object", ["nursery", "child_bedroom"], false),
  def("highchair", "Highchair", "object", ["kitchen", "nursery"], true),
  def("building_blocks", "Building blocks", "object", ["nursery", "child_bedroom"], false),

  // ── Living room ───────────────────────────────────────────────────────
  def("couch", "Couch", "object", ["living_room"], true, 3, 1),
  def("armchair", "Armchair", "object", ["living_room"], true),
  def("coffee_table", "Coffee table", "object", ["living_room"], true, 2, 1),
  def("tv_stand", "TV on stand", "object", ["living_room"], true, 2, 1),
  def("bookshelf", "Bookshelf", "object", ["living_room", "bedroom", "library", "office"], true),
  def("fireplace", "Fireplace", "object", ["living_room"], true, 2, 1),
  def("family_photo", "Family photo", "object", ["living_room", "bedroom", "nursing_home"], false),
  def("rug", "Rug", "object", ["living_room", "bedroom"], false, 2, 2),
  def("floor_lamp", "Floor lamp", "object", ["living_room", "bedroom", "office"], true),
  def("houseplant", "Houseplant", "object", ["any"], true),

  // ── Kitchen ───────────────────────────────────────────────────────────
  def("dining_table", "Dining table", "object", ["kitchen"], true, 2, 2),
  def("kitchen_chair", "Kitchen chair", "object", ["kitchen"], false),
  def("stove", "Stove", "object", ["kitchen", "restaurant"], true),
  def("refrigerator", "Refrigerator", "object", ["kitchen", "restaurant", "office"], true),
  def("kitchen_counter", "Kitchen counter", "object", ["kitchen", "restaurant"], true, 2, 1),
  def("kitchen_sink", "Kitchen sink", "object", ["kitchen", "restaurant"], true),
  def("microwave", "Microwave", "object", ["kitchen", "office"], false),
  def("fruit_bowl", "Fruit bowl", "object", ["kitchen"], false),

  // ── Bathroom ──────────────────────────────────────────────────────────
  def("toilet", "Toilet", "object", ["bathroom"], true),
  def("bathroom_sink", "Bathroom sink", "object", ["bathroom"], true),
  def("bathtub", "Bathtub", "object", ["bathroom"], true, 2, 1),
  def("mirror", "Mirror", "object", ["bathroom", "bedroom"], false),

  // ── Bedrooms ──────────────────────────────────────────────────────────
  def("single_bed", "Single bed", "object", ["bedroom", "child_bedroom"], true, 1, 2),
  def("double_bed", "Double bed", "object", ["bedroom"], true, 2, 2),
  def("dresser", "Dresser", "object", ["bedroom", "child_bedroom", "nursery"], true, 2, 1),
  def("wardrobe", "Wardrobe", "object", ["bedroom"], true, 2, 1),
  def("nightstand", "Nightstand", "object", ["bedroom"], true),
  def("desk", "Desk", "object", ["bedroom", "office", "school", "child_bedroom"], true, 2, 1),
  def("desk_chair", "Desk chair", "object", ["bedroom", "office", "school"], false),
  def("computer", "Computer", "object", ["bedroom", "office", "library"], false),
  def("poster", "Wall poster", "object", ["bedroom", "child_bedroom"], false),
  def("guitar", "Guitar", "object", ["bedroom"], false),
  def("clothes_pile", "Pile of clothes", "object", ["bedroom"], false),
  def("laundry_hamper", "Laundry hamper", "object", ["bedroom", "bathroom"], true),

  // ── School ────────────────────────────────────────────────────────────
  def("student_desk", "Student desk", "object", ["school"], true),
  def("teacher_desk", "Teacher's desk", "object", ["school"], true, 2, 1),
  def("chalkboard", "Chalkboard", "object", ["school"], true, 3, 1),
  def("locker_row", "Lockers", "object", ["school"], true, 3, 1),
  def("cafeteria_table", "Cafeteria table", "object", ["school", "cafeteria"], true, 3, 1),
  def("globe", "Globe", "object", ["school", "library"], false),
  def("bulletin_board", "Bulletin board", "object", ["school", "office"], false, 2, 1),
  def("water_fountain", "Water fountain", "object", ["school", "park", "gym"], true),
  def("trophy_case", "Trophy case", "object", ["school", "gym"], true, 2, 1),
  def("basketball_hoop", "Basketball hoop", "object", ["gym", "backyard"], true),
  def("bleachers", "Bleachers", "object", ["gym"], true, 3, 1),
  def("gym_mat", "Gym mat", "object", ["gym"], false, 2, 2),

  // ── Office / work ─────────────────────────────────────────────────────
  def("cubicle", "Cubicle divider", "object", ["office"], true, 2, 1),
  def("office_desk", "Office desk", "object", ["office"], true, 2, 1),
  def("office_chair", "Office chair", "object", ["office"], false),
  def("filing_cabinet", "Filing cabinet", "object", ["office"], true),
  def("water_cooler", "Water cooler", "object", ["office", "hospital"], true),
  def("printer", "Printer", "object", ["office"], true),
  def("whiteboard", "Whiteboard", "object", ["office", "school"], false, 2, 1),
  def("conference_table", "Conference table", "object", ["office"], true, 3, 2),
  def("coffee_machine", "Coffee machine", "object", ["office", "kitchen", "restaurant"], false),
  def("vending_machine", "Vending machine", "object", ["office", "school", "hospital", "street"], true),
  def("motivational_poster", "Motivational poster", "object", ["office"], false),

  // ── Warehouse / industrial ────────────────────────────────────────────
  def("pallet", "Wooden pallet", "object", ["warehouse", "construction"], false),
  def("box_stack", "Stacked boxes", "object", ["warehouse", "basement", "attic", "garage"], true),
  def("metal_shelving", "Metal shelving", "object", ["warehouse", "garage", "retail"], true, 3, 1),
  def("forklift", "Forklift", "object", ["warehouse"], true, 2, 2),
  def("conveyor_belt", "Conveyor belt", "object", ["warehouse", "factory"], true, 3, 1),
  def("time_clock", "Punch clock", "object", ["warehouse", "factory", "restaurant"], false),
  def("hand_truck", "Hand truck", "object", ["warehouse", "retail"], false),
  def("safety_sign", "Safety sign", "object", ["warehouse", "factory", "construction"], false),
  def("workbench", "Workbench", "object", ["garage", "basement", "construction", "factory"], true, 2, 1),
  def("toolbox", "Toolbox", "object", ["garage", "construction"], false),
  def("scaffolding", "Scaffolding", "object", ["construction"], true, 2, 2),
  def("cement_mixer", "Cement mixer", "object", ["construction"], true, 2, 1),
  def("safety_cone", "Safety cone", "object", ["construction", "street"], false),
  def("wheelbarrow", "Wheelbarrow", "object", ["construction", "backyard"], false),

  // ── Restaurant / retail ───────────────────────────────────────────────
  def("restaurant_table", "Restaurant table", "object", ["restaurant"], true, 2, 1),
  def("bar_counter", "Counter", "object", ["restaurant", "retail", "bar"], true, 3, 1),
  def("cash_register", "Cash register", "object", ["retail", "restaurant"], false),
  def("retail_shelf", "Store shelf", "object", ["retail"], true, 3, 1),
  def("produce_display", "Produce display", "object", ["retail"], true, 2, 1),
  def("grill", "Flat-top grill", "object", ["restaurant"], true, 2, 1),
  def("deep_fryer", "Deep fryer", "object", ["restaurant"], true),
  def("prep_table", "Prep table", "object", ["restaurant"], true, 2, 1),
  def("bar_stool", "Bar stool", "object", ["restaurant", "bar"], false),
  def("shopping_cart", "Shopping cart", "object", ["retail"], false),

  // ── Medical ───────────────────────────────────────────────────────────
  def("hospital_bed", "Hospital bed", "object", ["hospital", "medical", "nursing_home"], true, 2, 1),
  def("iv_stand", "IV stand", "object", ["hospital", "medical"], false),
  def("patient_monitor", "Patient monitor", "object", ["hospital", "medical"], true),
  def("exam_table", "Exam table", "object", ["medical"], true, 2, 1),
  def("visitor_chair", "Visitor chair", "object", ["hospital", "medical", "nursing_home"], false),
  def("curtain_divider", "Curtain divider", "object", ["hospital"], true, 1, 2),
  def("medical_poster", "Anatomy poster", "object", ["medical"], false),
  def("wheelchair", "Wheelchair", "object", ["hospital", "nursing_home"], false),
  def("walker", "Walker", "object", ["nursing_home", "hospital"], false),
  def("puzzle_table", "Puzzle table", "object", ["nursing_home"], true, 2, 1),

  // ── Outdoor ───────────────────────────────────────────────────────────
  def("tree", "Tree", "object", ["outdoor", "park", "backyard", "nature", "street"], true),
  def("bush", "Bush", "object", ["outdoor", "park", "backyard", "nature"], true),
  def("flower_bed", "Flower bed", "object", ["outdoor", "park", "backyard"], false, 2, 1),
  def("park_bench", "Park bench", "object", ["park", "street", "playground"], true, 2, 1),
  def("street_lamp", "Street lamp", "object", ["street", "park"], true),
  def("mailbox", "Mailbox", "object", ["backyard", "street"], false),
  def("swing_set", "Swing set", "object", ["playground", "backyard"], true, 3, 1),
  def("slide", "Slide", "object", ["playground"], true, 2, 2),
  def("sandbox", "Sandbox", "object", ["playground"], false, 2, 2),
  def("seesaw", "Seesaw", "object", ["playground"], true, 2, 1),
  def("monkey_bars", "Monkey bars", "object", ["playground"], true, 3, 1),
  def("pond", "Pond", "object", ["park", "nature"], true, 3, 2),
  def("picnic_table", "Picnic table", "object", ["park", "nature", "backyard"], true, 2, 2),
  def("bbq_grill", "BBQ grill", "object", ["backyard"], true),
  def("fence", "Fence", "object", ["backyard", "street", "construction"], true, 3, 1),
  def("trash_can", "Trash can", "object", ["street", "park", "school", "office"], true),
  def("fire_hydrant", "Fire hydrant", "object", ["street"], false),
  def("bus_stop", "Bus stop", "object", ["street"], true, 2, 1),
  def("traffic_light", "Traffic light", "object", ["street"], true),
  def("storefront", "Storefront facade", "object", ["street"], true, 3, 1),
  def("dumpster", "Dumpster", "object", ["street"], true, 2, 1),
  def("campfire", "Campfire", "object", ["nature"], true),
  def("tent", "Tent", "object", ["nature"], true, 2, 2),
  def("fallen_log", "Fallen log", "object", ["nature"], true, 2, 1),
  def("boulder", "Boulder", "object", ["nature", "outdoor"], true),
  def("beach_umbrella", "Beach umbrella", "object", ["beach"], true),
  def("beach_towel", "Beach towel", "object", ["beach"], false, 1, 2),
  def("sandcastle", "Sandcastle", "object", ["beach"], false),
  def("lifeguard_tower", "Lifeguard tower", "object", ["beach"], true, 2, 2),
  def("gravestone", "Gravestone", "object", ["cemetery"], true),
  def("wilted_flowers", "Flowers on grave", "object", ["cemetery"], false),

  // ── Vehicles (interiors as rooms) ─────────────────────────────────────
  def("car_seat", "Car seat", "object", ["vehicle"], true),
  def("car_dashboard", "Dashboard", "object", ["vehicle"], true, 3, 1),
  def("steering_wheel", "Steering wheel", "object", ["vehicle"], false),
  def("bus_seat_row", "Bus seats", "object", ["vehicle"], true, 2, 1),

  // ── Basement / attic / misc ───────────────────────────────────────────
  def("washer", "Washing machine", "object", ["basement", "garage"], true),
  def("dryer", "Dryer", "object", ["basement", "garage"], true),
  def("water_heater", "Water heater", "object", ["basement"], true),
  def("covered_furniture", "Sheet-covered furniture", "object", ["basement", "attic"], true, 2, 1),
  def("ping_pong_table", "Ping pong table", "object", ["basement"], true, 3, 2),
  def("dusty_box", "Dusty box", "object", ["attic", "basement"], false),
  def("phone_booth", "Payphone", "object", ["street"], true),
  def("piano", "Piano", "object", ["living_room", "school"], true, 2, 1),
  def("birthday_cake", "Birthday cake", "object", ["kitchen", "living_room"], false),
  def("present_box", "Wrapped present", "object", ["living_room", "child_bedroom"], false),
] as const;

const catalogById = new Map(ASSET_CATALOG.map((a) => [a.id, a]));

export function getAsset(id: string): AssetDef | undefined {
  return catalogById.get(id);
}

export function isValidAssetId(id: string): boolean {
  return catalogById.has(id);
}

/**
 * Vocabulary slice for a room concept. Includes 'any'-context assets.
 * Context matching is substring-tolerant ('school_hallway' matches 'school').
 */
export function getAssetsForContext(context: string, kind?: AssetKind): AssetDef[] {
  const needle = context.toLowerCase();
  return ASSET_CATALOG.filter((a) => {
    if (kind !== undefined && a.kind !== kind) return false;
    return a.contexts.some((c) => c === "any" || needle.includes(c) || c.includes(needle));
  });
}
