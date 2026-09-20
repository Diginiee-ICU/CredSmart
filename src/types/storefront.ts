export interface StorefrontSettings {
  id?: string;
  organization_id: string;
  slug: string;
  is_enabled: boolean;
  store_name: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  upi_id?: string;
  theme_color?: string;
  minimum_order_amount?: number;
  delivery_charges?: number;
  free_delivery_above?: number;
  enable_home_delivery?: boolean;
  enable_store_pickup?: boolean;
  custom_announcement?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    google_maps?: string;
    website?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  barcode?: string | null;
  sku?: string;
  category?: string;
  brand?: string | null;
  image_url?: string;
  unit?: string;
  is_featured?: boolean;
  selling_price: number;
  mrp: number;
  current_stock: number;
  created_at?: string;
}

export interface StorefrontCartItem {
  product: StorefrontProduct;
  quantity: number;
}

export interface StorefrontOrderItem {
  product_id: string;
  name: string;
  unit: string;
  price: number;
  mrp: number;
  quantity: number;
  total: number;
}

export interface StorefrontOrder {
  id: string;
  organization_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  delivery_type: "home_delivery" | "store_pickup";
  items: StorefrontOrderItem[];
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  source: "whatsapp" | "web" | "direct";
  created_at: string;
  updated_at?: string;
}

export interface StorefrontTheme {
  id: string;
  name: string;
  hex: string;
  badgeClass: string;
  bgGradient: string;
}

export const STOREFRONT_PRESET_THEMES: StorefrontTheme[] = [
  {
    id: "credsmart-orange",
    name: "CredSmart Orange",
    hex: "#FF6A00",
    badgeClass: "bg-[#FF6A00] text-white",
    bgGradient: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    id: "royal-blue",
    name: "Royal Blue",
    hex: "#1D4ED8",
    badgeClass: "bg-[#1D4ED8] text-white",
    bgGradient: "from-blue-600/20 via-indigo-500/10 to-transparent",
  },
  {
    id: "emerald-green",
    name: "Fresh Emerald",
    hex: "#059669",
    badgeClass: "bg-[#059669] text-white",
    bgGradient: "from-emerald-600/20 via-teal-500/10 to-transparent",
  },
  {
    id: "purple-elegance",
    name: "Royal Purple",
    hex: "#7C3AED",
    badgeClass: "bg-[#7C3AED] text-white",
    bgGradient: "from-purple-600/20 via-violet-500/10 to-transparent",
  },
  {
    id: "sleek-slate",
    name: "Midnight Slate",
    hex: "#0F172A",
    badgeClass: "bg-[#0F172A] text-white",
    bgGradient: "from-slate-800/20 via-slate-700/10 to-transparent",
  },
];
