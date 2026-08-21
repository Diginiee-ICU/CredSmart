import { Product, CartItem, Batch } from "@/types/pos";

export const demoProducts: Product[] = [
  {
    id: "p1",
    barcode: "8901023010124",
    name: "Cello Pen (Blue)",
    brand: "Cello",
    category: "Stationery",
    batches: [
      { id: "b1a", costPrice: 8, mrp: 11, stock: 15, batchNumber: "BATCH-A01" },
      { id: "b1b", costPrice: 9, mrp: 13, stock: 50, batchNumber: "BATCH-B02" },
    ],
  },
  {
    id: "p2",
    barcode: "8901030728563",
    name: "Amul Butter (500g)",
    brand: "Amul",
    category: "Dairy",
    batches: [
      { id: "b2a", costPrice: 240, mrp: 280, stock: 30, batchNumber: "BATCH-D01" },
    ],
  },
  {
    id: "p3",
    barcode: "8901058851403",
    name: "Dettol Handwash (200ml)",
    brand: "Dettol",
    category: "Hygiene",
    batches: [
      { id: "b3a", costPrice: 90, mrp: 120, stock: 8, batchNumber: "BATCH-H01" },
    ],
  },
  {
    id: "p4",
    barcode: "8906002410507",
    name: "Paracetamol 500mg",
    brand: "Cipla",
    category: "Pharmacy",
    batches: [
      { id: "b4a", costPrice: 12, mrp: 18, stock: 200, batchNumber: "BATCH-P01" },
      { id: "b4b", costPrice: 14, mrp: 22, stock: 100, batchNumber: "BATCH-P02" },
    ],
  },
  {
    id: "p5",
    barcode: "8901491101356",
    name: "Coca-Cola (300ml)",
    brand: "Coca-Cola",
    category: "Beverages",
    batches: [
      { id: "b5a", costPrice: 25, mrp: 35, stock: 60, batchNumber: "BATCH-BV01" },
    ],
  },
  {
    id: "p6",
    barcode: "7622210100559",
    name: "Oreo Cookies (120g)",
    brand: "Cadbury",
    category: "Snacks",
    batches: [
      { id: "b6a", costPrice: 20, mrp: 30, stock: 45, batchNumber: "BATCH-SN01" },
    ],
  },
  {
    id: "p7",
    barcode: "8901063010222",
    name: "PVC Elbow Joint (1\")",
    brand: "Supreme",
    category: "Hardware",
    batches: [
      { id: "b7a", costPrice: 15, mrp: 25, stock: 120, batchNumber: "BATCH-HW01" },
    ],
  },
  {
    id: "p8",
    barcode: "8901030615863",
    name: "Tata Salt (1kg)",
    brand: "Tata",
    category: "Grocery",
    batches: [
      { id: "b8a", costPrice: 18, mrp: 24, stock: 80, batchNumber: "BATCH-GR01" },
    ],
  },
];

export const categories = [
  { id: "all", name: "All Items", icon: "grid" },
  { id: "Grocery", name: "Grocery", icon: "shopping-cart" },
  { id: "Dairy", name: "Dairy", icon: "milk" },
  { id: "Beverages", name: "Beverages", icon: "coffee" },
  { id: "Snacks", name: "Snacks", icon: "cookie" },
  { id: "Stationery", name: "Stationery", icon: "pen-tool" },
  { id: "Pharmacy", name: "Pharmacy", icon: "pill" },
  { id: "Hygiene", name: "Hygiene", icon: "spray-can" },
  { id: "Hardware", name: "Hardware", icon: "wrench" },
];

export const dashboardData = {
  totalSales: 24850,
  todaySales: 3420,
  totalOrders: 186,
  avgOrderValue: 133.6,
  lowStockItems: [
    { name: "Dettol Handwash (200ml)", stock: 8, threshold: 10 },
    { name: "Cello Pen (Blue) - Batch A", stock: 15, threshold: 20 },
  ],
  topSellingItems: [
    { name: "Paracetamol 500mg", unitsSold: 340, revenue: 6120 },
    { name: "Tata Salt (1kg)", unitsSold: 210, revenue: 5040 },
    { name: "Coca-Cola (300ml)", unitsSold: 185, revenue: 6475 },
    { name: "Oreo Cookies (120g)", unitsSold: 160, revenue: 4800 },
    { name: "Amul Butter (500g)", unitsSold: 95, revenue: 26600 },
  ],
  salesByDay: [
    { day: "Mon", sales: 3200 },
    { day: "Tue", sales: 4100 },
    { day: "Wed", sales: 2800 },
    { day: "Thu", sales: 3600 },
    { day: "Fri", sales: 4800 },
    { day: "Sat", sales: 5200 },
    { day: "Sun", sales: 1150 },
  ],
};
