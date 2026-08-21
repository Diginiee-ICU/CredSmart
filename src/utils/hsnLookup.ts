import { GSTRate } from "@/types/inventory";

export interface HSNRecord {
  code: string;
  description: string;
  category: string;
  gstRate: GSTRate;
}

export const COMMON_HSN_CODES: HSNRecord[] = [
  { code: "0401", description: "Fresh milk, cream not concentrated or sweetened", category: "Dairy", gstRate: 0 },
  { code: "0402", description: "Milk powder, condensed milk, dairy butter & ghee", category: "Dairy", gstRate: 5 },
  { code: "0406", description: "Cheese and curd products", category: "Dairy", gstRate: 12 },
  { code: "0902", description: "Tea whether or not flavored", category: "Grocery", gstRate: 5 },
  { code: "0901", description: "Coffee beans, roasted or unroasted", category: "Grocery", gstRate: 5 },
  { code: "1006", description: "Rice (Basmati & Non-Basmati, packaged)", category: "Grocery", gstRate: 5 },
  { code: "1101", description: "Wheat or meslin flour (Atta / Maida)", category: "Grocery", gstRate: 5 },
  { code: "1507", description: "Soya bean oil and refined cooking oils", category: "Grocery", gstRate: 5 },
  { code: "1701", description: "Cane or beet sugar and pure sucrose", category: "Grocery", gstRate: 5 },
  { code: "1905", description: "Biscuits, bread, pastry, cakes & toasted items", category: "Snacks", gstRate: 18 },
  { code: "2106", description: "Food preparations, health supplements, namkeen", category: "Snacks", gstRate: 18 },
  { code: "2201", description: "Packaged natural mineral drinking water", category: "Beverages", gstRate: 18 },
  { code: "2202", description: "Aerated waters, energy drinks, cold drinks", category: "Beverages", gstRate: 28 },
  { code: "3004", description: "Medicaments consisting of mixed or unmixed products (Pharma)", category: "Pharmacy", gstRate: 12 },
  { code: "3304", description: "Beauty or make-up preparations, skincare", category: "Cosmetics", gstRate: 18 },
  { code: "3401", description: "Toilet soaps, washing soaps, organic surface-active bars", category: "Hygiene", gstRate: 18 },
  { code: "3402", description: "Detergent powders, liquid cleaners, dishwash", category: "Hygiene", gstRate: 18 },
  { code: "3808", description: "Insecticides, fungicides, disinfectants, hand sanitizers", category: "Hygiene", gstRate: 18 },
  { code: "3926", description: "Other articles of plastics, containers, fittings", category: "Hardware", gstRate: 18 },
  { code: "4820", description: "Registers, notebooks, paper stationery, binders", category: "Stationery", gstRate: 12 },
  { code: "7307", description: "Tube or pipe fittings of iron or steel (PVC/Metal elbows)", category: "Hardware", gstRate: 18 },
  { code: "8471", description: "Automatic data processing machines (Computers, Laptops)", category: "Electronics", gstRate: 18 },
  { code: "8517", description: "Smartphones, cellular telephones, networking hardware", category: "Electronics", gstRate: 18 },
  { code: "8528", description: "Monitors, television receivers & projectors", category: "Electronics", gstRate: 18 },
  { code: "9608", description: "Ball point pens, felt tipped pens, markers, refill cartridges", category: "Stationery", gstRate: 18 },
  { code: "9403", description: "Wooden and metal furniture, office desks & chairs", category: "Furniture", gstRate: 18 },
];

export function searchHSNCodes(query: string): HSNRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMON_HSN_CODES.slice(0, 10);
  return COMMON_HSN_CODES.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
}
