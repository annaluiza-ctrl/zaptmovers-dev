/*
  Zapt Movers — inventory catalog.

  cuft = cubic feet the item occupies on the truck
  lbs  = typical weight

  Most household goods run about 7 lbs per cubic foot. Dense items
  (appliances, safes, pianos) carry an explicit weight instead, because
  7 lbs/cuft badly understates them and weight drives crew size on stairs.

  Edit these numbers to match how your crews actually load.
*/
window.ZAPT_INVENTORY = [

  { room: 'Living room', items: [
    { n: 'Sofa, 3-seat',            cuft: 50,  lbs: 250 },
    { n: 'Loveseat',                cuft: 35,  lbs: 180 },
    { n: 'Sectional, per piece',    cuft: 45,  lbs: 220 },
    { n: 'Sleeper sofa',            cuft: 55,  lbs: 400 },
    { n: 'Armchair',                cuft: 25,  lbs: 120 },
    { n: 'Recliner',                cuft: 30,  lbs: 180 },
    { n: 'Ottoman',                 cuft: 8,   lbs: 35 },
    { n: 'Coffee table',            cuft: 10,  lbs: 55 },
    { n: 'End / side table',        cuft: 5,   lbs: 30 },
    { n: 'Console table',           cuft: 10,  lbs: 50 },
    { n: 'TV stand',                cuft: 15,  lbs: 80 },
    { n: 'Entertainment center',    cuft: 30,  lbs: 170 },
    { n: 'Bookcase, small',         cuft: 10,  lbs: 60 },
    { n: 'Bookcase, large',         cuft: 20,  lbs: 120 },
    { n: 'Floor lamp',              cuft: 3,   lbs: 15 },
    { n: 'Area rug, rolled',        cuft: 10,  lbs: 60 },
    { n: 'TV, 40 to 55 inch',       cuft: 8,   lbs: 45,  fragile: true },
    { n: 'TV, 56 to 75 inch',       cuft: 12,  lbs: 70,  fragile: true },
    { n: 'TV, 76 inch or larger',   cuft: 20,  lbs: 110, fragile: true },
  ]},

  { room: 'Dining room', items: [
    { n: 'Dining table',            cuft: 30,  lbs: 160 },
    { n: 'Dining chair',            cuft: 5,   lbs: 20 },
    { n: 'China cabinet / hutch',   cuft: 45,  lbs: 250, fragile: true },
    { n: 'Buffet / sideboard',      cuft: 30,  lbs: 170 },
    { n: 'Bar cart',                cuft: 8,   lbs: 40 },
    { n: 'Bar stool',               cuft: 5,   lbs: 25 },
  ]},

  { room: 'Kitchen', items: [
    { n: 'Refrigerator',            cuft: 30,  lbs: 280 },
    { n: 'Chest freezer',           cuft: 25,  lbs: 220 },
    { n: 'Range / stove',           cuft: 20,  lbs: 180 },
    { n: 'Dishwasher',              cuft: 15,  lbs: 90 },
    { n: 'Microwave',               cuft: 3,   lbs: 35 },
    { n: 'Kitchen table',           cuft: 20,  lbs: 90 },
    { n: 'Kitchen chair',           cuft: 4,   lbs: 18 },
    { n: 'Kitchen island / cart',   cuft: 12,  lbs: 70 },
    { n: 'Small appliance',         cuft: 2,   lbs: 12 },
    { n: 'Pantry cabinet',          cuft: 20,  lbs: 110 },
  ]},

  { room: 'Bedroom', items: [
    { n: 'King bed, complete',      cuft: 70,  lbs: 320 },
    { n: 'Queen bed, complete',     cuft: 60,  lbs: 270 },
    { n: 'Full bed, complete',      cuft: 50,  lbs: 220 },
    { n: 'Twin bed, complete',      cuft: 40,  lbs: 160 },
    { n: 'Bunk bed set',            cuft: 60,  lbs: 280 },
    { n: 'Crib',                    cuft: 15,  lbs: 70 },
    { n: 'Mattress only, king',     cuft: 35,  lbs: 140 },
    { n: 'Mattress only, queen',    cuft: 30,  lbs: 120 },
    { n: 'Dresser, double',         cuft: 30,  lbs: 170 },
    { n: 'Dresser, triple',         cuft: 40,  lbs: 230 },
    { n: 'Chest of drawers',        cuft: 25,  lbs: 140 },
    { n: 'Nightstand',              cuft: 8,   lbs: 40 },
    { n: 'Armoire / wardrobe',      cuft: 40,  lbs: 240 },
    { n: 'Full-length mirror',      cuft: 5,   lbs: 30,  fragile: true },
    { n: 'Vanity / makeup table',   cuft: 20,  lbs: 100 },
  ]},

  { room: 'Home office', items: [
    { n: 'Desk, small',             cuft: 20,  lbs: 100 },
    { n: 'Desk, large / executive', cuft: 35,  lbs: 220 },
    { n: 'Office chair',            cuft: 10,  lbs: 45 },
    { n: 'File cabinet, 2-drawer',  cuft: 8,   lbs: 60 },
    { n: 'File cabinet, 4-drawer',  cuft: 15,  lbs: 120 },
    { n: 'Bookcase',                cuft: 15,  lbs: 90 },
    { n: 'Computer + monitor',      cuft: 5,   lbs: 30,  fragile: true },
    { n: 'Printer',                 cuft: 5,   lbs: 35 },
    { n: 'Safe, small',             cuft: 10,  lbs: 200, heavy: true },
  ]},

  { room: 'Garage & outdoor', items: [
    { n: 'Bicycle',                 cuft: 10,  lbs: 30 },
    { n: 'Push mower',              cuft: 15,  lbs: 80 },
    { n: 'Riding mower',            cuft: 60,  lbs: 450, heavy: true },
    { n: 'Workbench',               cuft: 25,  lbs: 150 },
    { n: 'Tool chest',              cuft: 20,  lbs: 200, heavy: true },
    { n: 'Ladder',                  cuft: 8,   lbs: 35 },
    { n: 'BBQ grill',               cuft: 20,  lbs: 120 },
    { n: 'Patio table',             cuft: 25,  lbs: 120 },
    { n: 'Patio chair',             cuft: 8,   lbs: 30 },
    { n: 'Patio umbrella',          cuft: 5,   lbs: 25 },
    { n: 'Wheelbarrow',             cuft: 12,  lbs: 50 },
    { n: 'Shelving unit',           cuft: 15,  lbs: 70 },
    { n: 'Garden tools, bundle',    cuft: 5,   lbs: 30 },
  ]},

  { room: 'Appliances & fitness', items: [
    { n: 'Washer',                  cuft: 25,  lbs: 200, heavy: true },
    { n: 'Dryer',                   cuft: 25,  lbs: 150 },
    { n: 'Treadmill',               cuft: 40,  lbs: 280, heavy: true },
    { n: 'Exercise bike',           cuft: 15,  lbs: 90 },
    { n: 'Elliptical',              cuft: 35,  lbs: 220, heavy: true },
    { n: 'Weight bench',            cuft: 20,  lbs: 110 },
    { n: 'Weight set',              cuft: 10,  lbs: 300, heavy: true },
    { n: 'Water heater',            cuft: 20,  lbs: 140 },
  ]},

  { room: 'Specialty', items: [
    { n: 'Upright piano',           cuft: 60,  lbs: 500, heavy: true, specialty: true },
    { n: 'Baby grand piano',        cuft: 100, lbs: 750, heavy: true, specialty: true },
    { n: 'Gun safe',                cuft: 25,  lbs: 700, heavy: true, specialty: true },
    { n: 'Pool table',              cuft: 70,  lbs: 800, heavy: true, specialty: true },
    { n: 'Artwork, needs crating',  cuft: 10,  lbs: 40,  fragile: true, specialty: true },
    { n: 'Fish tank, empty',        cuft: 10,  lbs: 60,  fragile: true },
    { n: 'Grandfather clock',       cuft: 20,  lbs: 120, fragile: true, specialty: true },
    { n: 'Marble or glass tabletop',cuft: 10,  lbs: 150, fragile: true, specialty: true },
  ]},

  { room: 'Boxes', items: [
    { n: 'Small box, 1.5 cu ft',    cuft: 1.5, lbs: 35 },
    { n: 'Medium box, 3 cu ft',     cuft: 3,   lbs: 45 },
    { n: 'Large box, 4.5 cu ft',    cuft: 4.5, lbs: 50 },
    { n: 'Extra large box, 6 cu ft',cuft: 6,   lbs: 55 },
    { n: 'Wardrobe box',            cuft: 10,  lbs: 60 },
    { n: 'Dish pack',               cuft: 5,   lbs: 60,  fragile: true },
    { n: 'Picture / mirror box',    cuft: 3,   lbs: 25,  fragile: true },
    { n: 'Plastic bin / tote',      cuft: 3,   lbs: 40 },
    { n: 'Suitcase',                cuft: 3,   lbs: 35 },
  ]},

];
