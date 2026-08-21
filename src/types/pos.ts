export interface Batch {
  id: string;
  costPrice: number;
  mrp: number;
  stock: number;
  batchNumber: string;
  expiryDate?: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  batches: Batch[];
  tags?: Record<string, string>;
  sku?: string;
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  batch: Batch;
  quantity: number;
}

export interface Organization {
  id: string;
  name: string;
  locations: Location[];
}

export interface Location {
  id: string;
  name: string;
  address: string;
}
