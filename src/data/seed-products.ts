// Seed products per business type, inserted on new org creation during onboarding.
// Each product includes one starter batch.

export interface SeedProduct {
  name: string;
  barcode: string;
  brand: string;
  category: string;
  batch: {
    batchNumber: string;
    costPrice: number;
    mrp: number;
    stock: number;
  };
}

const groceryProducts: SeedProduct[] = [
  { name: "Tata Salt (1kg)", barcode: "8901030615863", brand: "Tata", category: "Grocery", batch: { batchNumber: "BATCH-GR01", costPrice: 18, mrp: 24, stock: 80 } },
  { name: "Fortune Sunflower Oil (1L)", barcode: "8901058002003", brand: "Fortune", category: "Grocery", batch: { batchNumber: "BATCH-GR02", costPrice: 130, mrp: 160, stock: 40 } },
  { name: "Aashirvaad Atta (5kg)", barcode: "8901063512009", brand: "Aashirvaad", category: "Grocery", batch: { batchNumber: "BATCH-GR03", costPrice: 220, mrp: 280, stock: 30 } },
  { name: "Amul Butter (500g)", barcode: "8901030728563", brand: "Amul", category: "Dairy", batch: { batchNumber: "BATCH-DA01", costPrice: 240, mrp: 280, stock: 25 } },
  { name: "Parle-G Biscuits (250g)", barcode: "8901234567890", brand: "Parle", category: "Snacks", batch: { batchNumber: "BATCH-SN01", costPrice: 18, mrp: 25, stock: 100 } },
  { name: "Coca-Cola (300ml)", barcode: "8901491101356", brand: "Coca-Cola", category: "Beverages", batch: { batchNumber: "BATCH-BV01", costPrice: 25, mrp: 35, stock: 60 } },
  { name: "Maggi Noodles (70g)", barcode: "8901058003451", brand: "Nestlé", category: "Snacks", batch: { batchNumber: "BATCH-SN02", costPrice: 10, mrp: 14, stock: 150 } },
  { name: "Surf Excel Detergent (1kg)", barcode: "8901030100208", brand: "Surf Excel", category: "Hygiene", batch: { batchNumber: "BATCH-HY01", costPrice: 110, mrp: 145, stock: 35 } },
];

const pharmacyProducts: SeedProduct[] = [
  { name: "Paracetamol 500mg (10 tabs)", barcode: "8906002410507", brand: "Cipla", category: "Tablets", batch: { batchNumber: "BATCH-PH01", costPrice: 12, mrp: 18, stock: 200 } },
  { name: "Cetirizine 10mg (10 tabs)", barcode: "8906002410514", brand: "Cipla", category: "Tablets", batch: { batchNumber: "BATCH-PH02", costPrice: 8, mrp: 15, stock: 150 } },
  { name: "Dettol Antiseptic (100ml)", barcode: "8901058851403", brand: "Dettol", category: "Antiseptic", batch: { batchNumber: "BATCH-PH03", costPrice: 45, mrp: 65, stock: 60 } },
  { name: "Crocin Advance (15 tabs)", barcode: "8901058851111", brand: "GSK", category: "Tablets", batch: { batchNumber: "BATCH-PH04", costPrice: 22, mrp: 32, stock: 100 } },
  { name: "Volini Spray (40g)", barcode: "8901058851222", brand: "Ranbaxy", category: "Pain Relief", batch: { batchNumber: "BATCH-PH05", costPrice: 95, mrp: 130, stock: 40 } },
  { name: "ORS Sachets (Pack of 5)", barcode: "8901058851333", brand: "Electral", category: "OTC", batch: { batchNumber: "BATCH-PH06", costPrice: 18, mrp: 28, stock: 80 } },
  { name: "Band-Aid Strips (10 pcs)", barcode: "8901058851444", brand: "Johnson & Johnson", category: "First Aid", batch: { batchNumber: "BATCH-PH07", costPrice: 30, mrp: 45, stock: 50 } },
  { name: "Betadine Solution (50ml)", barcode: "8901058851555", brand: "Win-Medicare", category: "Antiseptic", batch: { batchNumber: "BATCH-PH08", costPrice: 55, mrp: 78, stock: 30 } },
];

const hardwareProducts: SeedProduct[] = [
  { name: "PVC Elbow Joint (1\")", barcode: "8901063010222", brand: "Supreme", category: "Plumbing", batch: { batchNumber: "BATCH-HW01", costPrice: 15, mrp: 25, stock: 120 } },
  { name: "Cello Pen (Blue)", barcode: "8901023010124", brand: "Cello", category: "Stationery", batch: { batchNumber: "BATCH-HW02", costPrice: 8, mrp: 11, stock: 200 } },
  { name: "LED Bulb 9W (Cool Day)", barcode: "8901063010333", brand: "Philips", category: "Electrical", batch: { batchNumber: "BATCH-HW03", costPrice: 65, mrp: 95, stock: 50 } },
  { name: "GI Wire (1kg)", barcode: "8901063010444", brand: "Tata", category: "Metal", batch: { batchNumber: "BATCH-HW04", costPrice: 80, mrp: 110, stock: 30 } },
  { name: "White Cement (1kg)", barcode: "8901063010555", brand: "Birla", category: "Construction", batch: { batchNumber: "BATCH-HW05", costPrice: 28, mrp: 40, stock: 60 } },
  { name: "Paint Brush (3\")", barcode: "8901063010666", brand: "Asian", category: "Painting", batch: { batchNumber: "BATCH-HW06", costPrice: 35, mrp: 55, stock: 40 } },
  { name: "Door Handle (SS)", barcode: "8901063010777", brand: "Ozone", category: "Hardware", batch: { batchNumber: "BATCH-HW07", costPrice: 180, mrp: 250, stock: 20 } },
  { name: "Fevicol (500g)", barcode: "8901063010888", brand: "Pidilite", category: "Adhesive", batch: { batchNumber: "BATCH-HW08", costPrice: 120, mrp: 165, stock: 25 } },
];

const fnbProducts: SeedProduct[] = [
  { name: "Basmati Rice (5kg)", barcode: "8901063020111", brand: "India Gate", category: "Grains", batch: { batchNumber: "BATCH-FB01", costPrice: 350, mrp: 450, stock: 20 } },
  { name: "Olive Oil (500ml)", barcode: "8901063020222", brand: "Figaro", category: "Oils", batch: { batchNumber: "BATCH-FB02", costPrice: 280, mrp: 380, stock: 15 } },
  { name: "Tomato Ketchup (1kg)", barcode: "8901063020333", brand: "Kissan", category: "Sauces", batch: { batchNumber: "BATCH-FB03", costPrice: 95, mrp: 130, stock: 40 } },
  { name: "Paneer (200g)", barcode: "8901063020444", brand: "Amul", category: "Dairy", batch: { batchNumber: "BATCH-FB04", costPrice: 70, mrp: 90, stock: 30 } },
  { name: "Coca-Cola (2L)", barcode: "8901063020555", brand: "Coca-Cola", category: "Beverages", batch: { batchNumber: "BATCH-FB05", costPrice: 70, mrp: 95, stock: 25 } },
  { name: "Sugar (1kg)", barcode: "8901063020666", brand: "Uttam", category: "Grocery", batch: { batchNumber: "BATCH-FB06", costPrice: 42, mrp: 55, stock: 50 } },
];

const clothingProducts: SeedProduct[] = [
  { name: "Men's Round Neck T-shirt (M)", barcode: "8901063030111", brand: "Jockey", category: "T-Shirts", batch: { batchNumber: "BATCH-CL01", costPrice: 280, mrp: 450, stock: 20 } },
  { name: "Women's Kurti (L)", barcode: "8901063030222", brand: "W", category: "Ethnic Wear", batch: { batchNumber: "BATCH-CL02", costPrice: 450, mrp: 700, stock: 15 } },
  { name: "Cotton Socks (Pack of 3)", barcode: "8901063030333", brand: "Jockey", category: "Accessories", batch: { batchNumber: "BATCH-CL03", costPrice: 120, mrp: 199, stock: 40 } },
  { name: "Denim Jeans (32)", barcode: "8901063030444", brand: "Levi's", category: "Jeans", batch: { batchNumber: "BATCH-CL04", costPrice: 900, mrp: 1499, stock: 10 } },
  { name: "Handkerchief (Pack of 6)", barcode: "8901063030555", brand: "Peter England", category: "Accessories", batch: { batchNumber: "BATCH-CL05", costPrice: 100, mrp: 180, stock: 30 } },
  { name: "Formal Shirt (40)", barcode: "8901063030666", brand: "Van Heusen", category: "Shirts", batch: { batchNumber: "BATCH-CL06", costPrice: 650, mrp: 1099, stock: 12 } },
];

const electronicsProducts: SeedProduct[] = [
  { name: "USB-C Cable (1m)", barcode: "8901063040111", brand: "Anker", category: "Cables", batch: { batchNumber: "BATCH-EL01", costPrice: 150, mrp: 250, stock: 50 } },
  { name: "Wireless Mouse", barcode: "8901063040222", brand: "Logitech", category: "Peripherals", batch: { batchNumber: "BATCH-EL02", costPrice: 450, mrp: 699, stock: 20 } },
  { name: "Earbuds (TWS)", barcode: "8901063040333", brand: "boAt", category: "Audio", batch: { batchNumber: "BATCH-EL03", costPrice: 600, mrp: 999, stock: 15 } },
  { name: "Phone Tempered Glass", barcode: "8901063040444", brand: "Spigen", category: "Accessories", batch: { batchNumber: "BATCH-EL04", costPrice: 80, mrp: 150, stock: 60 } },
  { name: "32GB Pen Drive", barcode: "8901063040555", brand: "SanDisk", category: "Storage", batch: { batchNumber: "BATCH-EL05", costPrice: 250, mrp: 399, stock: 30 } },
  { name: "LED Desk Lamp", barcode: "8901063040666", brand: "Philips", category: "Lighting", batch: { batchNumber: "BATCH-EL06", costPrice: 380, mrp: 599, stock: 15 } },
];

const generalProducts: SeedProduct[] = [
  ...groceryProducts.slice(0, 3),
  ...pharmacyProducts.slice(0, 2),
  ...hardwareProducts.slice(0, 2),
  { name: "Notebook (200 pages)", barcode: "8901063050111", brand: "Classmate", category: "Stationery", batch: { batchNumber: "BATCH-GN01", costPrice: 35, mrp: 50, stock: 40 } },
];

export const seedProductsByBusinessType: Record<string, SeedProduct[]> = {
  "Grocery": groceryProducts,
  "Pharmacy": pharmacyProducts,
  "Hardware": hardwareProducts,
  "F&B / Restaurant": fnbProducts,
  "Clothing & Apparel": clothingProducts,
  "Electronics": electronicsProducts,
  "General Store": generalProducts,
  "Other": generalProducts,
};
