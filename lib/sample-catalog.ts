// Sample exhibitor catalog + orders — construction-relevant demo data used by the
// exhibitor "My products" management screens and the Orders screens. Mirrors the
// SAMPLE_JOBS pattern (presentational; no DB writes needed for the demo UI).

import type { ProductCard } from "@/lib/services/catalog";
import { r2Url } from "@/lib/r2-public";

export type ProductStatus = "active" | "draft" | "archived";
export type StockLevel = "high" | "low" | "out";
export type Availability = "in_stock" | "made_to_order" | "rentable";

/** Sample records don't carry a real `availability` value (that's a DB-only
 *  field) — derive a sensible one from stock level so the PDP's conditional
 *  buy-box CTA still has something to branch on for fallback/demo data. */
export function inferAvailability(stockLevel: StockLevel): Availability {
  return stockLevel === "out" ? "made_to_order" : "in_stock";
}

export type Variant = { id: string; name: string; spec?: string; price: number; stock: number; sku: string; status: boolean };

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  status: ProductStatus;
  category: string;
  type: string;
  vendor: string;
  tags: string[];
  retailMin: number;
  retailMax?: number;
  wholesaleMin: number;
  wholesaleMax?: number;
  costPerItem: number;
  stock: number;
  stockLevel: StockLevel;
  unit: string; // e.g. "bag", "tonne", "unit"
  images: string[];
  description: string;
  availability?: Availability;
  /** Whether the selling company is Nomarc-verified — gates the "Verified
   *  supplier" trust badge on the PDP. Absent/false on unverified sellers. */
  verified?: boolean;
  vendorUserId?: string;
  vendorCompanyId?: string;
  specs: { label: string; value: string }[];
  variants: Variant[];
  totalSales: number;
  ordersCount: number;
  createdAt: string;
  updatedAt: string;
};

// Self-hosted on Cloudflare R2 (mirror-images-to-r2). `q` is the image key id.
const img = (q: string) => r2Url(`site/${q}.jpg`);

export const SAMPLE_CATALOG: CatalogProduct[] = [
  {
    id: "p-rebar-16",
    name: "High-Yield TMT Rebar — 16mm (Grade 500)",
    sku: "RBR-16-500",
    status: "active",
    category: "Rebar & Steel",
    type: "Structural",
    vendor: "Titan SteelCo",
    tags: ["Rebar", "Structural Steel", "BS 4449"],
    retailMin: 18500, retailMax: 21000,
    wholesaleMin: 15800, wholesaleMax: 17200,
    costPerItem: 14200,
    stock: 4200, stockLevel: "high", unit: "length",
    images: [img("photo-1504917595217-d4dc5ebe6122"), img("photo-1581094794329-c8112a89af12"), img("photo-1600607687939-ce8a6c25118c")],
    description:
      "Thermo-mechanically treated high-yield rebar engineered for superior tensile strength and weldability. Compliant with BS 4449:2005 Grade 500B — ideal for columns, beams, slabs and foundations in heavy-load construction.",
    specs: [
      { label: "Diameter", value: "16mm" },
      { label: "Grade", value: "500B" },
      { label: "Standard", value: "BS 4449:2005" },
      { label: "Length", value: "12m" },
      { label: "Yield strength", value: "500 MPa" },
    ],
    variants: [
      { id: "v1", name: "10mm", spec: "Grade 500", price: 11200, stock: 5200, sku: "RBR-10-500", status: true },
      { id: "v2", name: "12mm", spec: "Grade 500", price: 14000, stock: 3800, sku: "RBR-12-500", status: true },
      { id: "v3", name: "16mm", spec: "Grade 500", price: 18500, stock: 4200, sku: "RBR-16-500", status: true },
    ],
    totalSales: 8420000, ordersCount: 132,
    createdAt: "12 Jan 2026", updatedAt: "Yesterday",
  },
  {
    id: "p-cement-dangote",
    name: "Dangote 3X Cement — 42.5R",
    sku: "CEM-DAN-425",
    status: "active",
    category: "Cement & Concrete",
    type: "Binder",
    vendor: "Titan SteelCo",
    tags: ["Cement", "OPC", "42.5R"],
    retailMin: 9200,
    wholesaleMin: 8100,
    costPerItem: 7400,
    stock: 12800, stockLevel: "high", unit: "bag",
    images: [img("photo-1600566753086-00f18fb6b3ea"), img("photo-1503387762-592deb58ef4e")],
    description:
      "Premium Ordinary Portland Cement (42.5R) delivering high early strength and consistent setting times. Suited for structural concrete, blockwork, plastering and screeding across residential and commercial builds.",
    specs: [
      { label: "Grade", value: "42.5R" },
      { label: "Weight", value: "50kg" },
      { label: "Type", value: "OPC" },
      { label: "Setting time", value: "Initial 45min" },
    ],
    variants: [],
    totalSales: 5260000, ordersCount: 410,
    createdAt: "04 Feb 2026", updatedAt: "2 days ago",
  },
  {
    id: "p-tiles-porcelain",
    name: "Porcelain Floor Tile — 600×600 Polished",
    sku: "TIL-PORC-600",
    status: "active",
    category: "Flooring",
    type: "Ceramic & Porcelain",
    vendor: "Titan SteelCo",
    tags: ["Tiles", "Porcelain", "Flooring"],
    retailMin: 6800, retailMax: 9500,
    wholesaleMin: 5400, wholesaleMax: 7200,
    costPerItem: 4900,
    stock: 320, stockLevel: "low", unit: "carton",
    images: [img("photo-1600607687939-ce8a6c25118c"), img("photo-1600566753086-00f18fb6b3ea")],
    description:
      "Rectified polished porcelain tiles with low water absorption and high abrasion resistance. Frost-proof and stain-resistant — engineered for high-traffic interior flooring in homes, malls and offices.",
    specs: [
      { label: "Size", value: "600×600mm" },
      { label: "Finish", value: "Polished" },
      { label: "Thickness", value: "9mm" },
      { label: "Per carton", value: "4 pcs (1.44m²)" },
    ],
    variants: [
      { id: "v1", name: "Carrara White", price: 8500, stock: 120, sku: "TIL-600-CW", status: true },
      { id: "v2", name: "Graphite Grey", price: 8500, stock: 80, sku: "TIL-600-GG", status: true },
      { id: "v3", name: "Sand Beige", price: 6800, stock: 120, sku: "TIL-600-SB", status: false },
    ],
    totalSales: 1980000, ordersCount: 58,
    createdAt: "20 Feb 2026", updatedAt: "Yesterday",
  },
  {
    id: "p-generator",
    name: "Diesel Generator 100kVA — Soundproof",
    sku: "GEN-100-SP",
    status: "draft",
    category: "Heavy Machinery",
    type: "Power",
    vendor: "Titan SteelCo",
    tags: ["Generator", "Power", "Soundproof"],
    retailMin: 8200000,
    wholesaleMin: 7600000,
    costPerItem: 6900000,
    stock: 6, stockLevel: "low", unit: "unit",
    images: [img("photo-1518770660439-4636190af475")],
    description:
      "Three-phase 100kVA diesel generator with acoustic canopy, ATS-ready controller and 200L base fuel tank. Built for continuous site power on construction projects and standby for commercial facilities.",
    specs: [
      { label: "Output", value: "100kVA / 80kW" },
      { label: "Phase", value: "3-phase" },
      { label: "Fuel tank", value: "200L" },
      { label: "Noise", value: "≤ 68 dB @ 7m" },
    ],
    variants: [],
    totalSales: 0, ordersCount: 0,
    createdAt: "01 Mar 2026", updatedAt: "Just now",
  },
  {
    id: "p-paint-emulsion",
    name: "Premium Emulsion Paint — 20L (Matte)",
    sku: "PNT-EMU-20",
    status: "active",
    category: "Finishes",
    type: "Paint & Coatings",
    vendor: "Titan SteelCo",
    tags: ["Paint", "Emulsion", "Interior"],
    retailMin: 24500, retailMax: 28000,
    wholesaleMin: 21000,
    costPerItem: 18500,
    stock: 0, stockLevel: "out", unit: "bucket",
    images: [img("photo-1562259949-e8e7689d7828")],
    description:
      "Low-VOC acrylic emulsion with excellent coverage, washability and a smooth matte finish. Tintable to thousands of colours — formulated for interior walls and ceilings.",
    specs: [
      { label: "Volume", value: "20L" },
      { label: "Finish", value: "Matte" },
      { label: "Coverage", value: "~14 m²/L" },
      { label: "Dry time", value: "2 hrs" },
    ],
    variants: [
      { id: "v1", name: "Brilliant White", price: 24500, stock: 0, sku: "PNT-20-BW", status: true },
      { id: "v2", name: "Magnolia", price: 24500, stock: 0, sku: "PNT-20-MG", status: true },
    ],
    totalSales: 740000, ordersCount: 29,
    createdAt: "28 Feb 2026", updatedAt: "3 days ago",
  },
  {
    id: "p-blocks",
    name: "Sandcrete Hollow Block — 9 inch",
    sku: "BLK-HOL-9",
    status: "active",
    category: "Blocks & Bricks",
    type: "Masonry",
    vendor: "Titan SteelCo",
    tags: ["Blocks", "Masonry", "9 inch"],
    retailMin: 520, retailMax: 650,
    wholesaleMin: 430,
    costPerItem: 360,
    stock: 24000, stockLevel: "high", unit: "block",
    images: [img("photo-1607400201889-565b1ee75f8e")],
    description:
      "Vibrated sandcrete hollow blocks cured for 28 days to full strength. Dimensionally consistent for fast, true blockwork on load-bearing and partition walls.",
    specs: [
      { label: "Size", value: '9" (450×225×225mm)' },
      { label: "Type", value: "Hollow" },
      { label: "Strength", value: "≥ 2.5 N/mm²" },
    ],
    variants: [
      { id: "v1", name: '6 inch', price: 420, stock: 18000, sku: "BLK-HOL-6", status: true },
      { id: "v2", name: '9 inch', price: 520, stock: 24000, sku: "BLK-HOL-9", status: true },
    ],
    totalSales: 3120000, ordersCount: 187,
    createdAt: "15 Jan 2026", updatedAt: "Yesterday",
  },
];

export function getCatalogProduct(id: string) {
  return SAMPLE_CATALOG.find((p) => p.id === id);
}

// ───────────────────────── Orders ─────────────────────────

export type OrderStatus = "pending" | "processing" | "shipped" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "refunded";

export type OrderLine = { name: string; qty: number; unitPrice: number; image: string };
export type SalesOrder = {
  id: string;
  ref: string;
  customer: string;
  company: string;
  date: string;
  items: OrderLine[];
  total: number;
  payment: PaymentStatus;
  status: OrderStatus;
  delivery: string;
  address: string;
  phone: string;
};

export const SAMPLE_ORDERS: SalesOrder[] = [
  {
    id: "o-1042", ref: "#NMC-1042", customer: "Adaeze Okonkwo", company: "BuildRight Ltd", date: "12 Jun 2026",
    items: [{ name: "High-Yield TMT Rebar — 16mm", qty: 240, unitPrice: 17200, image: img("photo-1504917595217-d4dc5ebe6122") }, { name: "Dangote 3X Cement — 42.5R", qty: 600, unitPrice: 8100, image: img("photo-1600566753086-00f18fb6b3ea") }],
    total: 9018000, payment: "paid", status: "processing", delivery: "Site delivery — Lekki Phase 1", address: "Plot 22, Admiralty Way, Lekki, Lagos", phone: "+234 803 221 4455",
  },
  {
    id: "o-1041", ref: "#NMC-1041", customer: "Musa Ibrahim", company: "Sahel Contractors", date: "11 Jun 2026",
    items: [{ name: "Diesel Generator 100kVA", qty: 1, unitPrice: 7600000, image: img("photo-1518770660439-4636190af475") }],
    total: 7600000, payment: "pending", status: "pending", delivery: "Pickup — Abuja depot", address: "Km 12 Airport Rd, Abuja", phone: "+234 705 889 1200",
  },
  {
    id: "o-1040", ref: "#NMC-1040", customer: "Chinwe Eze", company: "Pinnacle Homes", date: "10 Jun 2026",
    items: [{ name: "Porcelain Floor Tile 600×600", qty: 90, unitPrice: 7200, image: img("photo-1600607687939-ce8a6c25118c") }],
    total: 648000, payment: "paid", status: "shipped", delivery: "Courier — GIG Logistics", address: "14 Rumuola Rd, Port Harcourt", phone: "+234 814 552 0098",
  },
  {
    id: "o-1039", ref: "#NMC-1039", customer: "Tunde Bakare", company: "Bakare & Sons", date: "09 Jun 2026",
    items: [{ name: "Sandcrete Hollow Block — 9 inch", qty: 3000, unitPrice: 430, image: img("photo-1607400201889-565b1ee75f8e") }],
    total: 1290000, payment: "paid", status: "completed", delivery: "Site delivery — Ibadan", address: "Bodija Estate, Ibadan, Oyo", phone: "+234 802 110 7766",
  },
  {
    id: "o-1038", ref: "#NMC-1038", customer: "Grace Adeyemi", company: "Crown Interiors", date: "08 Jun 2026",
    items: [{ name: "Premium Emulsion Paint 20L", qty: 24, unitPrice: 21000, image: img("photo-1562259949-e8e7689d7828") }],
    total: 504000, payment: "refunded", status: "cancelled", delivery: "Courier", address: "9 Allen Ave, Ikeja, Lagos", phone: "+234 706 334 8821",
  },
  {
    id: "o-1037", ref: "#NMC-1037", customer: "Emeka Nwosu", company: "Delta Build Co", date: "07 Jun 2026",
    items: [{ name: "Dangote 3X Cement — 42.5R", qty: 1200, unitPrice: 8100, image: img("photo-1600566753086-00f18fb6b3ea") }, { name: "High-Yield TMT Rebar — 12mm", qty: 120, unitPrice: 14000, image: img("photo-1581094794329-c8112a89af12") }],
    total: 11400000, payment: "paid", status: "completed", delivery: "Site delivery — Asaba", address: "Okpanam Rd, Asaba, Delta", phone: "+234 809 776 5500",
  },
];

export function getOrder(id: string) {
  return SAMPLE_ORDERS.find((o) => o.id === id);
}

// Buyer browse cards derived from the sample catalog (used as a fallback so the
// shop always has construction-relevant content even before the DB is seeded).
const AVAIL_FROM_STOCK: Record<StockLevel, string> = { high: "In Stock", low: "Low Stock", out: "Made to Order" };
export function sampleBrowseCards(): ProductCard[] {
  return SAMPLE_CATALOG.filter((p) => p.status === "active").map((p) => ({
    id: p.id,
    name: p.name,
    supplier: p.vendor,
    location: "Lagos, Nigeria",
    avail: AVAIL_FROM_STOCK[p.stockLevel],
    availabilityKey: p.availability ?? inferAvailability(p.stockLevel),
    tags: p.tags,
    img: p.images[0] ?? "",
    verified: true,
    price: p.retailMin,
    hasVariants: p.variants.length > 0,
    createdAt: p.createdAt,
  }));
}

export const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
