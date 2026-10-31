import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Layers,
  ShieldCheck,
  Share2,
  BarChart3,
  Users2,
  Clock,
  Paperclip,
  Network,
  Play,
  Search,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Building,
  AlertTriangle,
  RotateCw,
  Download,
  Smartphone,
  Monitor,
  Printer,
  Zap,
  ShoppingCart,
  Receipt,
  QrCode,
  Package,
  FileSpreadsheet,
  MapPin,
  Landmark,
  CheckSquare,
  Video,
  Mic,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { CredSmartLogo } from "@/components/public/CredSmartLogo";
import { CredAlertShield3D } from "@/components/public/Landing3DIcons";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { SEOHead } from "@/components/public/SEOHead";
import { HeroDashboardCard } from "@/components/public/HeroDashboardCard";
import { DownloadAppModal } from "@/components/public/DownloadAppModal";
import { APP_DOWNLOAD_LINKS } from "@/config/downloadLinks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─────────────────────────── JSON-LD MULTI-SCHEMA ─────────────────────────── */
const structuredDataSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CredSmart by CredAlert",
    url: "https://pos.credalert.bussiness",
    logo: "https://pos.credalert.bussiness/favicon.png",
    description: "India's free GST billing, POS software, and business management platform by CredAlert.",
    sameAs: ["https://www.credalert.business"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CredSmart",
    url: "https://pos.credalert.bussiness",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://pos.credalert.bussiness/discovery?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CredSmart",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS, Windows, macOS",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "2480",
    },
    description:
      "CredSmart by CredAlert is India's all-in-one completely free business management software. Invoicing, POS billing, inventory, purchases, accounting, customer ledger, and credit intelligence.",
    featureList: [
      "100% Free Forever with Zero Hidden Fees",
      "GST Billing with CGST SGST IGST Breakdown",
      "High-Speed POS Retail Checkout & Thermal Printing",
      "Multi-Godown Inventory Management & Low Stock Alerts",
      "Customer Udhar Khata & Digital Payment Ledgers",
      "Business Ecosystem Automated Invoice Exchange",
      "CredAlert Commercial Credit Risk Intelligence",
      "Barcode Label Designer Studio",
      "GSTR-1 Excel and JSON Tax Export",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is CredSmart really 100% free forever?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. CredSmart is completely free with zero subscription fees, zero bill limits, and zero hidden charges.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use CredSmart offline without internet?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Both Android and Windows desktop apps support offline billing and automatically sync when online.",
        },
      },
      {
        "@type": "Question",
        name: "What is the CredSmart Business Ecosystem?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "When both businesses use CredSmart, transactions flow automatically. When you create a sales invoice, it automatically becomes the recipient's purchase invoice with zero manual re-entry.",
        },
      },
      {
        "@type": "Question",
        name: "What is CredAlert Intelligence?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "CredAlert Intelligence alerts you if a business counterparty is flagged for commercial disputes, unpaid dues, or risk indicators, helping you protect cash flow and make safe credit decisions.",
        },
      },
      {
        "@type": "Question",
        name: "Does CredSmart support thermal receipt printers and barcode scanners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. CredSmart supports all standard 58mm and 80mm ESC/POS thermal printers, barcode scanners, and thermal label sticker printers natively.",
        },
      },
    ],
  },
];

export interface ModuleShowcaseItem {
  id: string;
  suite: "pos" | "crm";
  title: string;
  shortName: string;
  badge: string;
  badgeColor: string;
  desc: string;
  tag: string;
  metrics: Array<{ label: string; value: string; hint?: string }>;
  points: string[];
  icon: LucideIcon;
  simulation: {
    title: string;
    subtitle: string;
    stats: Array<{ label: string; value: string; status?: "success" | "blue" | "amber" }>;
    bannerText: string;
    badgeText: string;
  };
}

export const MODULE_SHOWCASES: Record<string, ModuleShowcaseItem> = {
  // ── SUITE 1: RETAIL POS & ERP (6 MODULES) ──
  pos: {
    id: "pos",
    suite: "pos",
    shortName: "POS Billing",
    tag: "Counter Checkout",
    badge: "Fast POS Terminal",
    badgeColor: "bg-blue-100 text-blue-800",
    title: "Lightning-Fast Retail POS Billing Workbench",
    desc: "Process rush-hour customer queues with keyboard shortcuts (F1-F12), held bill stacks, instant barcode lookup, and split payments.",
    icon: ShoppingCart,
    metrics: [
      { label: "Held Bill Stacks", value: "5 Max", hint: "1-Click Recall" },
      { label: "Barcode Lookup", value: "< 50ms", hint: "Ultra-low latency" },
      { label: "Thermal Roll", value: "58 / 80mm", hint: "ESC/POS Native" },
    ],
    points: [
      "5 Concurrent Held Bills with instant 1-click restore",
      "Instant barcode scanner SKU resolution (< 50ms)",
      "Split cash, UPI, card & Udhar credit tender",
      "Direct thermal printing on 58mm & 80mm ESC/POS rolls",
    ],
    simulation: {
      title: "Main Retail Counter 01",
      subtitle: "Active Cashier Session",
      stats: [
        { label: "Active Counter", value: "Cashier 01 (Online)", status: "success" },
        { label: "Hardware Status", value: "Thermal 80mm ESC/POS Ready", status: "success" },
        { label: "Offline Sync", value: "Zero-Lag SQLite Sync", status: "blue" },
      ],
      bannerText: "Press F8 to tender cash or Enter to print receipt instantly.",
      badgeText: "Ready",
    },
  },
  gst: {
    id: "gst",
    suite: "pos",
    shortName: "GST Invoicing",
    tag: "Multi-Rate Tax",
    badge: "100% Tax Compliant",
    badgeColor: "bg-emerald-100 text-emerald-800",
    title: "Automated GST Invoicing & Multi-Rate Tax Engine",
    desc: "Create official tax invoices with automatic CGST, SGST, IGST calculations, HSN resolution, and dynamic payment QR codes.",
    icon: Receipt,
    metrics: [
      { label: "GST Slabs", value: "0% - 28%", hint: "All tax tiers" },
      { label: "HSN / SAC Lookup", value: "Automated", hint: "Instant resolve" },
      { label: "Dynamic UPI QR", value: "Direct Print", hint: "Zero MDR fees" },
    ],
    points: [
      "Supports 0%, 5%, 12%, 18%, 28% GST tax slabs",
      "Automated intra-state & inter-state tax engine",
      "Dynamic UPI payment QR printed directly on bill",
      "B2B and B2C custom invoice series",
    ],
    simulation: {
      title: "Tax Invoice #INV-2026-089",
      subtitle: "Sharma General Store (GSTIN: 27AABCU9603R1ZM)",
      stats: [
        { label: "Tax Classification", value: "Intra-State (CGST + SGST)", status: "blue" },
        { label: "Invoice Amount", value: "₹ 14,850.00", status: "success" },
        { label: "UPI Payment QR", value: "Embedded on PDF", status: "success" },
      ],
      bannerText: "Cryptographically verified GST calculations with round-off logic.",
      badgeText: "Compliant",
    },
  },
  barcode: {
    id: "barcode",
    suite: "pos",
    shortName: "Barcode Studio",
    tag: "Label Designer",
    badge: "Thermal Label Studio",
    badgeColor: "bg-purple-100 text-purple-800",
    title: "Custom Barcode & Sticker Generator Studio",
    desc: "Design and print custom barcode price tags directly from your product catalog on thermal sticker rolls or A4 label sheets.",
    icon: QrCode,
    metrics: [
      { label: "Thermal Rolls", value: "50x38 / 38x25", hint: "Custom sizes" },
      { label: "A4 Label Sheets", value: "24 / 40 / 65", hint: "Per page" },
      { label: "Symbologies", value: "EAN-13 / Code128", hint: "+ QR Codes" },
    ],
    points: [
      "Thermal roll sizes: 50x38mm, 38x25mm & custom label sizing",
      "Standard laser/inkjet A4 sheets (24, 40, 65 labels per sheet)",
      "Code 128, EAN-13, and QR Code barcode encoding",
      "Batch print queue synced directly with purchase bills",
    ],
    simulation: {
      title: "Sticker Batch #PRN-102",
      subtitle: "50x38mm Thermal Roll Preview",
      stats: [
        { label: "Batch Item", value: "Fortune Premium Oil 1L", status: "blue" },
        { label: "Barcode / SKU", value: "8901030382910 (EAN-13)", status: "blue" },
        { label: "Batch Count", value: "120 Labels Queued", status: "success" },
      ],
      bannerText: "Direct thermal label driver interface with automatic calibration.",
      badgeText: "Calibrated",
    },
  },
  inventory: {
    id: "inventory",
    suite: "pos",
    shortName: "Stock & Godowns",
    tag: "Warehouse Control",
    badge: "Multi-Godown Stock",
    badgeColor: "bg-amber-100 text-amber-800",
    title: "Multi-Godown Stock & Batch Expiry Tracking",
    desc: "Track inventory quantities in real time across multiple retail godowns, batch expiry dates, and low-stock reorder thresholds.",
    icon: Package,
    metrics: [
      { label: "Warehouse Godowns", value: "Unlimited", hint: "Multi-location" },
      { label: "Valuation Mode", value: "FIFO & Avg", hint: "Real-time" },
      { label: "Expiry Tracking", value: "Batch MFG", hint: "Zero wastage" },
    ],
    points: [
      "Multi-godown stock transfers and real-time tracking",
      "Batch tracking with MFG and Expiry date warnings",
      "Stock valuation reports (FIFO / Average Costing)",
      "Automatic low-stock SMS and push alerts",
    ],
    simulation: {
      title: "Central Godown B • Aisle 4",
      subtitle: "Real-Time Stock Audit",
      stats: [
        { label: "Tracked SKUs", value: "1,420 Active Items", status: "blue" },
        { label: "Low Stock Items", value: "16 Items Under Reorder", status: "amber" },
        { label: "Stock Valuation", value: "₹ 18,45,200 (FIFO)", status: "success" },
      ],
      bannerText: "Real-time sync between retail counter sales and warehouse deductions.",
      badgeText: "Synchronized",
    },
  },
  khata: {
    id: "khata",
    suite: "pos",
    shortName: "Udhar Khata",
    tag: "Party Ledgers",
    badge: "Customer Khata",
    badgeColor: "bg-orange-100 text-orange-800",
    title: "Digital Udhar Khata & WhatsApp Payment Reminders",
    desc: "Maintain clean party ledgers, track receivables, record partial payments, and send instant WhatsApp payment reminder links with bill PDFs.",
    icon: Users2,
    metrics: [
      { label: "WhatsApp Alerts", value: "1-Click", hint: "Free reminder" },
      { label: "Ledger Audit", value: "Bilateral", hint: "Anti-dispute" },
      { label: "Party Credit Limits", value: "Enforced", hint: "Risk control" },
    ],
    points: [
      "Customer & supplier running debit/credit ledger statements",
      "1-click WhatsApp payment reminders with invoice PDF link",
      "SharedLedger bilateral balance reconciliation",
      "Credit limit enforcement and overdue aging alerts",
    ],
    simulation: {
      title: "Party: Rajesh Trading Co.",
      subtitle: "Udhar Ledger Statement",
      stats: [
        { label: "Outstanding Balance", value: "₹ 24,500 Dr", status: "amber" },
        { label: "Credit Limit", value: "₹ 50,000 (Safe)", status: "success" },
        { label: "Last Payment", value: "₹ 10,000 on 28 Oct", status: "blue" },
      ],
      bannerText: "1-Tap WhatsApp dispatch sends itemized PDF statement with UPI pay link.",
      badgeText: "Reconciled",
    },
  },
  reports: {
    id: "reports",
    suite: "pos",
    shortName: "Tax & CA Reports",
    tag: "GSTR-1 JSON",
    badge: "CA & Government Ready",
    badgeColor: "bg-indigo-100 text-indigo-800",
    title: "GSTR-1 JSON Schema 2.0 & Excel Tax Reports",
    desc: "Export 100% government-compliant GSTR-1 JSON Schema 2.0 files and detailed Excel audit sheets for your CA in seconds.",
    icon: FileSpreadsheet,
    metrics: [
      { label: "GSTR-1 JSON", value: "Schema 2.0", hint: "GSTN Portal" },
      { label: "Tally Bridge", value: "XML Bridge", hint: "1-Click Import" },
      { label: "Excel Sheets", value: "B2B/B2C/HSN", hint: "Multi-tab format" },
    ],
    points: [
      "GSTR-1 B2B, B2CL, B2CS, and HSN summary export",
      "Profit & loss, sales summary, and tax registers",
      "Tally XML import & export bridge compatibility",
      "1-click CA sharing link with password protection",
    ],
    simulation: {
      title: "GSTR-1 Monthly Return Export",
      subtitle: "FY 2026-27 • September Filing",
      stats: [
        { label: "Total Taxable Value", value: "₹ 8,42,100", status: "blue" },
        { label: "Total Tax Amount", value: "₹ 1,51,578 (CGST+SGST)", status: "blue" },
        { label: "JSON Schema Status", value: "Validated (Zero Errors)", status: "success" },
      ],
      bannerText: "Directly uploadable to GSTN portal without manual CA re-entry.",
      badgeText: "Valid",
    },
  },

  // ── SUITE 2: WORKFORCE CRM (6 MODULES) ──
  attendance: {
    id: "attendance",
    suite: "crm",
    shortName: "GPS Attendance",
    tag: "100m Geofence",
    badge: "Anti-Proxy GPS",
    badgeColor: "bg-blue-100 text-blue-800",
    title: "100m GPS Geofenced Mobile Attendance & Clock-In",
    desc: "Eliminate buddy punching and proxy attendance with strict GPS perimeter validation, timestamp verification, and instant mobile selfie check-ins.",
    icon: MapPin,
    metrics: [
      { label: "Geofence Radius", value: "100 Meters", hint: "Store perimeter" },
      { label: "Verification", value: "GPS + Selfie", hint: "Anti-proxy" },
      { label: "Live Dashboard", value: "Real-time", hint: "Instant sync" },
    ],
    points: [
      "Strict 100m geofence perimeter around store or warehouse",
      "Mobile selfie clock-in with live timestamp validation",
      "Late mark, half-day, and overtime automated calculation",
      "Works on Android smartphones without dedicated biometric hardware",
    ],
    simulation: {
      title: "Store 01 • Main Geofence Hub",
      subtitle: "Perimeter: Lat 19.0760, Lng 72.8777 (100m)",
      stats: [
        { label: "Store Roster", value: "24 / 26 Staff Present", status: "success" },
        { label: "Outside Perimeter", value: "0 Rejected Clock-ins", status: "success" },
        { label: "Average Check-in", value: "08:54 AM", status: "blue" },
      ],
      bannerText: "Location validated via device high-accuracy GPS before attendance registers.",
      badgeText: "Geofence Active",
    },
  },
  payroll: {
    id: "payroll",
    suite: "crm",
    shortName: "Monthly Payroll",
    tag: "Automated Slips",
    badge: "1-Click Salary Run",
    badgeColor: "bg-emerald-100 text-emerald-800",
    title: "Automated Monthly Payroll & Salary Slips Engine",
    desc: "Calculate accurate net salaries based on verified attendance records, leave balances, PF/ESI deductions, and cash advances in 1 click.",
    icon: Landmark,
    metrics: [
      { label: "Payroll Run", value: "1-Click", hint: "Under 10s" },
      { label: "Salary Slips", value: "WhatsApp PDF", hint: "Automated delivery" },
      { label: "Deductions", value: "PF / ESI / Advance", hint: "Auto-calculated" },
    ],
    points: [
      "Direct synchronization with GPS attendance and leave tracking",
      "Automated PF, ESI, professional tax, and advance deductions",
      "Professional salary slips generated with company letterhead",
      "1-click salary slip dispatch via WhatsApp and SMS",
    ],
    simulation: {
      title: "Monthly Payroll Run • October 2026",
      subtitle: "26 Employees • 100% Attendance Reconciled",
      stats: [
        { label: "Gross Salary Disbursed", value: "₹ 5,12,000", status: "blue" },
        { label: "Statutory Deductions", value: "₹ 29,500 (PF+ESI)", status: "amber" },
        { label: "Net Payable", value: "₹ 4,82,500", status: "success" },
      ],
      bannerText: "Bank NEFT/RTGS batch payout sheet generated with one click.",
      badgeText: "Calculated",
    },
  },
  tasks: {
    id: "tasks",
    suite: "crm",
    shortName: "Task Boards",
    tag: "Kanban SOPs",
    badge: "Operations Kanban",
    badgeColor: "bg-purple-100 text-purple-800",
    title: "Role-Based Task Delegation & Kanban Workflow",
    desc: "Assign store opening checklists, stock restocking tasks, and counter audit duties to specific staff members with real-time status tracking.",
    icon: CheckSquare,
    metrics: [
      { label: "Active Boards", value: "Kanban", hint: "To Do / In Prog / Done" },
      { label: "Task SLA", value: "Due Time Alerts", hint: "Push notifications" },
      { label: "Checklists", value: "Daily Recurring", hint: "Store SOPs" },
    ],
    points: [
      "Visual Kanban boards for store tasks, stock checks, and deliveries",
      "Recurring daily checklists for store open and close procedures",
      "Photo proof of completion required for high-importance tasks",
      "Mobile push notifications when tasks are assigned or overdue",
    ],
    simulation: {
      title: "Store Operations Sprint Board",
      subtitle: "Morning Shift • 18 Daily SOP Tasks",
      stats: [
        { label: "Tasks Completed", value: "14 / 18 Tasks Done", status: "success" },
        { label: "In Progress", value: "4 Tasks Active", status: "blue" },
        { label: "Overdue Items", value: "0 Tasks Pending", status: "success" },
      ],
      bannerText: "Photo verification enabled: Cashier uploaded till balance photo.",
      badgeText: "In Progress",
    },
  },
  roles: {
    id: "roles",
    suite: "crm",
    shortName: "Staff Roles",
    tag: "Granular RBAC",
    badge: "6-Tier RBAC Matrix",
    badgeColor: "bg-rose-100 text-rose-800",
    title: "Multi-Tier Staff Role Permissions & Access Control",
    desc: "Safeguard confidential business data with granular permissions for Store Owners, Managers, Cashiers, Warehouse Handlers, and Accountants.",
    icon: ShieldCheck,
    metrics: [
      { label: "Pre-Built Roles", value: "6 Tiers", hint: "Owner to Trainee" },
      { label: "Permission Keys", value: "48 Granular", hint: "Zero data leaks" },
      { label: "Audit Log", value: "Immutable", hint: "User action trails" },
    ],
    points: [
      "Restrict discount limits, cost price visibility, and delete permissions",
      "Cashier lockdown prevents viewing total business profit or vendor costs",
      "Manager approval required for bill cancellations and item returns",
      "Full chronological audit log of every invoice edit and reprint",
    ],
    simulation: {
      title: "RBAC Security Matrix",
      subtitle: "Store Counter 01 • Cashier Profile",
      stats: [
        { label: "Price Edit Access", value: "Locked (Manager PIN)", status: "amber" },
        { label: "Profit Margin View", value: "Hidden (Admin Only)", status: "amber" },
        { label: "Fast POS Checkout", value: "Full Authorization", status: "success" },
      ],
      bannerText: "Zero risk of revenue leakage or unauthorized cashier discounts.",
      badgeText: "Secured",
    },
  },
  meet: {
    id: "meet",
    suite: "crm",
    shortName: "Team Meet",
    tag: "Audio/Video Huddles",
    badge: "Daily Huddles",
    badgeColor: "bg-cyan-100 text-cyan-800",
    title: "Daily Morning Huddles & Team Video/Audio Sync",
    desc: "Connect multi-store managers and remote warehouse staff with integrated 1-click video and audio meeting rooms directly inside the CRM.",
    icon: Video,
    metrics: [
      { label: "Meeting Rooms", value: "1-Click", hint: "Zero app download" },
      { label: "Team Chat", value: "Encrypted", hint: "End-to-End" },
      { label: "Daily Huddle", value: "Automated", hint: "Scheduled 09:30 AM" },
    ],
    points: [
      "Instant 1-click team video huddle without third-party meeting links",
      "Store opening briefing and daily sales target announcements",
      "Store-to-store secure text messaging and photo sharing",
      "Zero friction communication across dispersed retail outlets",
    ],
    simulation: {
      title: "Daily Store Managers Huddle",
      subtitle: "Room #HUDDLE-HQ-01 • WebRTC Audio/Video",
      stats: [
        { label: "Connected Stores", value: "3 Retail Outlets", status: "success" },
        { label: "Participants", value: "5 Managers Online", status: "blue" },
        { label: "Call Quality", value: "HD Low-Latency", status: "success" },
      ],
      bannerText: "Reviewing daily sales targets and distributor inward shipments.",
      badgeText: "Live Huddle",
    },
  },
  copilot: {
    id: "copilot",
    suite: "crm",
    shortName: "Voice Copilot",
    tag: "Hindi/English AI",
    badge: "AI Voice Copilot",
    badgeColor: "bg-violet-100 text-violet-800",
    title: "Bilingual Hindi & English Voice Copilot Assistant",
    desc: "Speak natural voice commands in Hindi or English to check daily sales, lookup product stock, or log employee attendance hands-free.",
    icon: Mic,
    metrics: [
      { label: "Languages", value: "Hindi + English", hint: "Hinglish ready" },
      { label: "Response Speed", value: "< 200ms", hint: "Local WebSpeech" },
      { label: "Command Set", value: "40+ Actions", hint: "Voice enabled" },
    ],
    points: [
      "Ask 'Aaj ki total sales kitni hai?' to get instant verbal audio response",
      "Voice product lookup: 'Check stock of Fortune 1L in Godown B'",
      "Hands-free bill creation and fast shortcut voice navigation",
      "Designed specifically for busy shop owners on the counter",
    ],
    simulation: {
      title: "CredSmart Voice AI Engine",
      subtitle: "Active Microphone • Hindi & English Speech Model",
      stats: [
        { label: "Last Query", value: "\"Aaj ka cash collection kitna hai?\"", status: "blue" },
        { label: "AI Response", value: "\"Aaj ka cash collection ₹ 42,350 hai\"", status: "success" },
        { label: "Speech Engine", value: "Zero-Cloud Latency", status: "success" },
      ],
      bannerText: "Natural language processing calibrated for Indian retail terminology.",
      badgeText: "Listening",
    },
  },
};

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userRole } = useOrganization();
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [ecosystemModalOpen, setEcosystemModalOpen] = useState(false);
  const [credibilityModalOpen, setCredibilityModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadPlatform, setDownloadPlatform] = useState<"android" | "desktop">("android");
  const [searchGstin, setSearchGstin] = useState("");
  const [activeSuiteTab, setActiveSuiteTab] = useState<"pos" | "crm">("pos");
  const [activeModuleKey, setActiveModuleKey] = useState<string>("pos");
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const targetAppRoute = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;

  const handleLaunchPos = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credsmart_launch_portal_active", "billing");
    }
    if (userRole === "cashier") {
      navigate(ROUTE_PATHS.checkout);
    } else {
      navigate("/billing/dashboard");
    }
  };

  const handleLaunchCrm = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credsmart_launch_portal_active", "crm");
    }
    navigate("/crm");
  };

  const handleStartFree = () => {
    if (user) {
      navigate(targetAppRoute);
    } else {
      navigate(`${ROUTE_PATHS.auth}?mode=signup`);
    }
  };

  const handleCredibilitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchGstin.trim()) {
      navigate(`${ROUTE_PATHS.discovery}?q=${encodeURIComponent(searchGstin.trim())}`);
    } else {
      navigate(ROUTE_PATHS.discovery);
    }
  };

  const handleOpenDownload = (platform: "android" | "desktop") => {
    setDownloadPlatform(platform);
    setDownloadModalOpen(true);
  };

  const currentSuiteModules = Object.values(MODULE_SHOWCASES).filter(
    (mod) => mod.suite === activeSuiteTab
  );
  const activeModule = MODULE_SHOWCASES[activeModuleKey] || MODULE_SHOWCASES.pos;

  // FAQ list
  const faqs = [
    {
      q: "Is CredSmart really 100% free forever? Are there any hidden fees?",
      a: "Yes, CredSmart is genuinely 100% free forever. There are zero subscription fees, zero limits on invoices or items, zero watermarks on your bills, and no credit card is ever required. Our platform is backed by CredAlert's commercial enterprise network.",
    },
    {
      q: "Does CredSmart support thermal receipt printers and barcode scanners?",
      a: "Yes. CredSmart natively supports all standard 58mm and 80mm ESC/POS thermal printers via USB, Bluetooth, LAN, and Wi-Fi, as well as plug-and-play USB barcode scanners and mobile camera scanning.",
    },
    {
      q: "What is the CredSmart Business Ecosystem?",
      a: "When both businesses use CredSmart, transactions flow automatically. When you create a sales invoice, it automatically registers in the recipient's purchase invoice ledger with zero manual re-typing and zero reconciliation errors.",
    },
    {
      q: "What is CredAlert Intelligence and how does it protect my shop?",
      a: "CredAlert Intelligence alerts you if a commercial customer or counterparty has a history of commercial payment defaults or registered disputes across our database of 3.2M+ Indian entities, helping you avoid bad debts and safe credit terms.",
    },
    {
      q: "Can I use CredSmart offline without an active internet connection?",
      a: "Yes. Both our Android App and Windows Desktop App feature full offline billing modes. You can continue creating bills and receipts without internet, and the system automatically syncs with the cloud once reconnected.",
    },
    {
      q: "Can I migrate my existing items and parties from Vyapar, myBillBook, or Tally?",
      a: "Yes. CredSmart features a 1-click Excel/CSV importer and a native Tally XML bridge that imports your complete item catalog, customer contacts, and opening stock balances in under 60 seconds.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <>
      <SEOHead
        title="CredSmart by CredAlert — Free GST Billing, POS & Business Software"
        description="India's all-in-one completely free business management platform. Invoicing, POS billing, inventory, purchases, accounting, customer ledger, and credit intelligence. Download for Android & Desktop."
        keywords="free GST billing software India, free POS software India, download billing app android, download pos desktop windows, GST invoice generator free, Vyapar alternative free, myBillBook alternative free, retail billing software, CredAlert credit risk intelligence"
        canonicalUrl="https://pos.credalert.bussiness/"
        structuredData={structuredDataSchemas}
      />

      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#FF6A00] selection:text-white">
        
        {/* ── TOP NAVIGATION HEADER ── */}
        <PublicHeader onOpenDownloadModal={handleOpenDownload} />

        {/* ── SECTION 1: MASTER SCREEN-FITTED HERO SECTION (50/50 Split) ── */}
        <section className="relative pt-5 sm:pt-8 lg:pt-10 pb-8 sm:pb-10 lg:pb-12 overflow-hidden border-b border-slate-200/70">
          {/* Subtle Ambient Background Mesh Gradients */}
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-blue-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-orange-200/20 via-amber-100/15 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">
              
              {/* ── LEFT COLUMN: DUAL-SUITE VALUE PROPOSITION (lg:col-span-6) ── */}
              <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
                
                {/* Dual-Suite Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200/80 bg-blue-50/80 text-blue-700 text-xs font-semibold mb-3 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>CredSmart ERP &amp; CRM Platform</span>
                </div>

                {/* Dual-Suite Main Headline */}
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-black tracking-tight text-[#0F172A] leading-[1.15] mb-3">
                  POS &amp; Billing ERP <br className="hidden sm:inline" />
                  <span className="text-slate-800">&amp; Workforce CRM. </span>
                  <span className="text-[#FF6A00]">100% Free.</span>
                </h1>

                {/* Concise Value Proposition (Zero Redundant Micro-Prose) */}
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4 max-w-xl">
                  High-speed retail counter billing, thermal ESC/POS printing, GST tax compliance, and GPS staff attendance payroll in a single unified platform.
                </p>

                {/* 3 Horizontal Feature Chips */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/90 border border-blue-100 text-slate-800 text-xs font-bold shadow-2xs">
                    <span className="text-blue-600">⚡</span>
                    <span>Retail POS &amp; GST</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-100 text-slate-800 text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>GPS Attendance &amp; Payroll</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50/90 border border-orange-100 text-slate-800 text-xs font-bold shadow-2xs">
                    <span className="text-[#FF6A00]">🎁</span>
                    <span>100% Free Forever</span>
                  </div>
                </div>

                {/* Master Standard Action Buttons (h-9.5 px-4.5) */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto mb-4">
                  <button
                    type="button"
                    onClick={handleStartFree}
                    className="w-full sm:w-auto h-9.5 px-4.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Start Free Now</span>
                    <span>🚀</span>
                  </button>

                  <a
                    href="/#suites"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("suites")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full sm:w-auto h-9.5 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 font-semibold text-sm shadow-2xs active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Explore Dual Suites</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </div>

                {/* Compact App Download Trigger Strip */}
                <div className="flex items-center justify-center lg:justify-start gap-2 pt-3 pb-3 border-t border-slate-200/60 w-full max-w-lg text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Download className="w-3 h-3 text-blue-600" /> Native Apps:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenDownload("android")}
                    className="h-7 px-2.5 rounded-md border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-3 h-3 text-emerald-600" />
                    <span>Android APK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDownload("desktop")}
                    className="h-7 px-2.5 rounded-md border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Monitor className="w-3 h-3 text-blue-600" />
                    <span>Windows PC</span>
                  </button>
                </div>

                {/* Trust Checklist Row */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    No Credit Card Required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    100% Free Forever
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    Setup in Minutes
                  </span>
                </div>

              </div>

              {/* ── RIGHT COLUMN: INTERACTIVE LIVE DASHBOARD PREVIEW DOCK (lg:col-span-6) ── */}
              <div className="lg:col-span-6 w-full max-w-xl mx-auto lg:max-w-none">
                <HeroDashboardCard onStartFree={handleStartFree} />
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 2: DEDICATED DUAL-SUITE PLATFORM SHOWCASE (#suites) ── */}
        <section id="suites" className="py-10 sm:py-14 bg-white border-b border-slate-200/70 scroll-mt-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200/80 bg-blue-50/80 text-blue-700 text-xs font-semibold mb-2 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Enterprise Dual-Suite Platform</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Two Dedicated Suites. <span className="text-[#FF6A00]">One Unified Platform.</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl mx-auto">
                Switch seamlessly between fast counter retail checkout and mobile field workforce operations, or run both concurrently under one business organization.
              </p>
            </div>

            {/* Dual Suite Showcase Grid (2 Balanced Cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* ── SUITE A CARD: POS & BILLING ERP ── */}
              <div
                id="billing-erp"
                className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top Accent Stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                
                <div>
                  {/* Suite Badge & Target Role */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold font-mono">
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                      <span>Suite 1 &bull; Retail POS &amp; Billing ERP</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      Role: Cashier / Store Owner
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                    Retail POS &amp; Billing ERP
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                    Engineered for high-speed retail checkout, multi-godown stock control, barcode sticker printing, and official GST tax compliance.
                  </p>

                  {/* 6 Capabilities Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-xs text-slate-700">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">F1-F12 Fast Hotkey Billing</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">58mm &amp; 80mm ESC/POS Thermal</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">GSTR-1 JSON Schema 2.0 Export</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">Multi-Godown Stock &amp; Batch Expiry</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">Barcode Label Designer Studio</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">100% Offline SQLite Billing Mode</span>
                    </div>
                  </div>
                </div>

                {/* Live Metrics & Action Footer */}
                <div>
                  {/* Micro Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-slate-50/80 border border-slate-100 mb-4 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Speed</span>
                      <span className="text-xs font-black text-slate-800 font-mono">&lt; 50ms</span>
                    </div>
                    <div className="border-x border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Invoices</span>
                      <span className="text-xs font-black text-slate-800 font-mono">Unlimited</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Cost</span>
                      <span className="text-xs font-black text-emerald-600 font-mono">₹ 0 / Free</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleLaunchPos}
                      className="w-full sm:w-auto h-8.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Launch POS Billing ERP</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to="/features#pos"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span>View POS Modules</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── SUITE B CARD: WORKFORCE CRM ── */}
              <div
                id="workforce-crm"
                className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top Accent Stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6A00] to-amber-500" />

                <div>
                  {/* Suite Badge & Target Role */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-bold font-mono">
                      <Users2 className="w-3.5 h-3.5 text-[#FF6A00]" />
                      <span>Suite 2 &bull; Workforce CRM Platform</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      Role: Business Owner / HR
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                    Workforce CRM &amp; Operations
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
                    Designed for store managers, field staff, and HR operations. Automated attendance, salary disbursement, team huddles, and task Kanban.
                  </p>

                  {/* 6 Capabilities Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-xs text-slate-700">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">GPS Geofenced Mobile Attendance</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">Automated Monthly Salary Slips</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">Task Delegation &amp; Kanban Boards</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">Multi-Tier RBAC Staff Permissions</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">Team Meet, Huddle &amp; Notices</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium">Bilingual Hindi/English Voice Copilot</span>
                    </div>
                  </div>
                </div>

                {/* Live Metrics & Action Footer */}
                <div>
                  {/* Micro Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-xl bg-slate-50/80 border border-slate-100 mb-4 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Accuracy</span>
                      <span className="text-xs font-black text-slate-800 font-mono">100% Audit</span>
                    </div>
                    <div className="border-x border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Staff</span>
                      <span className="text-xs font-black text-slate-800 font-mono">Unlimited</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Cost</span>
                      <span className="text-xs font-black text-emerald-600 font-mono">₹ 0 / Free</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleLaunchCrm}
                      className="w-full sm:w-auto h-8.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Launch Workforce CRM</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to="/features#crm"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>View CRM Modules</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ── SECTION 3: "WHY BUSINESSES LOVE CREDSMART" (6-Card Grid) ── */}
        <section id="features" className="py-14 sm:py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Why Businesses Love <span className="text-[#FF6A00]">CredSmart</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Everything required to digitize billing, speed up counter sales, and secure customer credit.
              </p>
            </div>

            {/* 6 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
              
              {/* 1. Complete & Free */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-4 shadow-2xs">
                  🎁
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Complete &amp; Free
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Use every feature. Forever. No hidden charges. No limits.
                </p>
              </div>

              {/* 2. All-in-One Platform */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  All-in-One Platform
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Invoicing, POS, Inventory, Sales, Purchases, Accounting – everything in one place.
                </p>
              </div>

              {/* 3. Business Ecosystem */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 shadow-2xs">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Business Ecosystem
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your sales invoice can automatically become their purchase invoice.
                </p>
              </div>

              {/* 4. CredAlert Intelligence */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-2xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  CredAlert Intelligence
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Know the credibility of the businesses you deal with. Stay protected.
                </p>
              </div>

              {/* 5. Real-time Insights */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-2xs">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Real-time Insights
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Live financial dashboard. Track collections, payments &amp; cash flow in real-time.
                </p>
              </div>

              {/* 6. Built for Every Business */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 shadow-2xs">
                  <Users2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Built for Every Business
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Retailers, Wholesalers, Distributors, Manufacturers, Service Businesses &amp; more.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ── SECTION 4: DUAL BENTO SPOTLIGHT CARDS (Ecosystem & CredAlert Intelligence) ── */}
        <section className="py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* ── Left Bento Card: The CredSmart Business Ecosystem ── */}
              <div
                id="ecosystem"
                className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
                    The CredSmart <span className="text-[#FF6A00]">Business Ecosystem</span>
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                    Connect directly with businesses on CredSmart. When you create a sales invoice, it automatically registers in your buyer’s purchase ledger. No manual entry. Zero errors.
                  </p>

                  {/* Flow Diagram Micro-Widget */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                    <div className="flex items-center justify-between gap-2">
                      
                      {/* Business A Node */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs mb-2">
                          <Building className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Business A</span>
                        <span className="text-[11px] text-slate-500 font-medium">Issues Sales Invoice</span>
                      </div>

                      {/* Direction Arrow */}
                      <div className="flex flex-col items-center text-blue-500 font-bold px-2">
                        <ArrowRight className="w-5 h-5 animate-pulse" />
                      </div>

                      {/* Business B Node */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs mb-2">
                          <Building className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Business B</span>
                        <span className="text-[11px] text-slate-500 font-medium">Receives as Purchase Invoice</span>
                      </div>

                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setEcosystemModalOpen(true)}
                      className="h-8.5 px-3.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs active:scale-[0.98]"
                    >
                      Learn More
                    </button>
                  </div>
                </div>

                {/* 3 Perks Row at Bottom of Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-100 text-xs">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Save Time</div>
                      <div className="text-slate-500 text-[11px]">No manual data entry</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Paperclip className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Reduce Errors</div>
                      <div className="text-slate-500 text-[11px]">Eliminate duplicate data</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Network className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Stronger Network</div>
                      <div className="text-slate-500 text-[11px]">Grow with connected businesses</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Right Bento Card: CredAlert Intelligence ── */}
              <div
                id="intelligence"
                className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  
                  {/* Left info column inside the right card */}
                  <div className="sm:col-span-7 flex flex-col items-start">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
                      CredAlert <span className="text-[#FF6A00]">Intelligence</span>
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                      Get alerted if a business is flagged as a potential defaulter or risky counterparty by our CredAlert Intelligence system. Make smarter credit decisions. Reduce risk.
                    </p>

                    <button
                      type="button"
                      onClick={() => setCredibilityModalOpen(true)}
                      className="h-8.5 px-3.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors cursor-pointer mb-4 inline-flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
                    >
                      <span>Check Business Credibility</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <p className="text-xs text-slate-500 font-medium">
                      For more details visit{" "}
                      <a
                        href="https://www.credalert.business"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        www.credalert.business
                      </a>
                    </p>
                  </div>

                  {/* Right 3D Shield Graphic inside the right card */}
                  <div className="sm:col-span-5 flex items-center justify-center">
                    <CredAlertShield3D />
                  </div>

                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <ShieldCheck className="w-4 h-4" /> Real-time Default Risk Alerts
                  </span>
                  <span>MCA &amp; GST Registered Database</span>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 5: BOUNDED DUAL-SUITE MODULE EXPLORER (max-h-[520px]) ── */}
        <section className="py-12 sm:py-16 bg-slate-50/60 border-y border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-8">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">
                12 Enterprise Modules Included
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Interactive Platform <span className="text-[#FF6A00]">Module Explorer</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                Explore enterprise capabilities across both platform suites with zero paywalls.
              </p>
            </div>

            {/* Bounded Container: max-h-[520px] */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden max-h-[520px] flex flex-col">
              {/* Explorer Command Header with Suite Switcher */}
              <div className="bg-slate-50/80 px-4 sm:px-6 py-2.5 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>Module Navigator</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {activeSuiteTab === "pos" ? "6 POS & ERP Modules" : "6 Workforce CRM Modules"}
                    </span>
                  </h3>
                </div>

                {/* Suite Tab Switcher */}
                <div className="flex items-center p-0.5 rounded-lg bg-slate-200/70 border border-slate-300/60 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSuiteTab("pos");
                      setActiveModuleKey("pos");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer text-xs font-bold",
                      activeSuiteTab === "pos"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 font-medium"
                    )}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                    <span>Retail POS &amp; ERP (6)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSuiteTab("crm");
                      setActiveModuleKey("attendance");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer text-xs font-bold",
                      activeSuiteTab === "crm"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 font-medium"
                    )}
                  >
                    <Users2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Workforce CRM (6)</span>
                  </button>
                </div>
              </div>

              {/* Split Panes Body */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200/80">
                {/* Left Column (35%): Compact Scrollable Module List */}
                <div className="md:col-span-4 lg:col-span-4 overflow-y-auto max-h-[445px] p-2 space-y-1 bg-slate-50/40">
                  {currentSuiteModules.map((mod) => {
                    const Icon = mod.icon;
                    const isSelected = activeModuleKey === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setActiveModuleKey(mod.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-white border-blue-500/50 shadow-xs ring-1 ring-blue-500/20 text-slate-900"
                            : "bg-white/60 hover:bg-white border-slate-200/70 text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                              isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate leading-tight">
                              {mod.shortName}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate font-mono">
                              {mod.tag}
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0",
                            isSelected
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {mod.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Column (65%): Active Module Interactive Preview Card */}
                <div className="md:col-span-8 lg:col-span-8 p-3.5 sm:p-4 overflow-y-auto max-h-[445px] flex flex-col justify-between bg-white">
                  <div className="space-y-2.5">
                    {/* Header Badge & Status */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold font-mono", activeModule.badgeColor)}>
                          {activeModule.badge}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Suite: {activeSuiteTab === "pos" ? "POS & Billing ERP" : "Workforce CRM"}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{activeModule.simulation.badgeText}</span>
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                        {activeModule.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                        {activeModule.desc}
                      </p>
                    </div>

                    {/* 3 Metrics with font-mono tabular-nums */}
                    <div className="grid grid-cols-3 gap-2">
                      {activeModule.metrics.map((m, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                            {m.label}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 font-mono tabular-nums block mt-0.5">
                            {m.value}
                          </span>
                          {m.hint && (
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                              {m.hint}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Feature Points Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                      {activeModule.points.map((pt, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-tight">{pt}</span>
                        </div>
                      ))}
                    </div>

                    {/* Interactive Simulation Widget */}
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/90 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                        <span className="font-bold text-slate-800">{activeModule.simulation.title}</span>
                        <span>{activeModule.simulation.subtitle}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-[10px]">
                        {activeModule.simulation.stats.map((s, idx) => (
                          <div key={idx}>
                            <span className="text-slate-400 block font-mono">{s.label}:</span>
                            <span className={cn("font-bold font-mono", s.status === "success" ? "text-emerald-700" : s.status === "amber" ? "text-amber-700" : "text-blue-700")}>
                              {s.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200/60">
                        &bull; {activeModule.simulation.bannerText}
                      </div>
                    </div>
                  </div>

                  {/* Bottom CTA Bar */}
                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      100% Free Forever &bull; Zero Paywalls
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        type="button"
                        onClick={activeSuiteTab === "pos" ? handleLaunchPos : handleLaunchCrm}
                        className="h-8.5 px-3.5 rounded-lg text-xs font-semibold shadow-2xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.98]"
                      >
                        <span>Try {activeModule.shortName} Free</span>
                        <span>🚀</span>
                      </Button>

                      <Link to={`${ROUTE_PATHS.features}#${activeModule.id}`}>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-[0.98]"
                        >
                          <span>Explore Features</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: DEDICATED NATIVE APPS SHOWCASE & DOWNLOAD HUB (1 Android, 1 Desktop) ── */}
        <section id="download" className="py-14 sm:py-20 bg-slate-100/70 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold font-mono uppercase tracking-wider mb-3">
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Native Multi-Platform Downloads</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Run CredSmart on Any Device. <span className="text-[#FF6A00]">100% Free.</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Download high-performance native apps for Android smartphones, tablets, and Windows PC. Works offline with seamless cloud sync.
              </p>
            </div>

            {/* 2 Dedicated Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              
              {/* ── CARD 1: ANDROID APP (Button 1 for Android) ── */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold font-mono tracking-wider">
                      ANDROID MOBILE &amp; TABLET
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      v{APP_DOWNLOAD_LINKS.version}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                    <Smartphone className="w-6 h-6 text-emerald-600" />
                    <span>CredSmart for Android</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    Full-featured mobile billing terminal. Create invoices on the go, print over Bluetooth, manage party Udhar, and share receipts via WhatsApp.
                  </p>

                  <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Instant 1-tap WhatsApp PDF invoice sharing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Bluetooth thermal printer support (58mm / 80mm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Camera barcode scanning for fast inventory lookup</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>100% offline billing mode with background cloud sync</span>
                    </div>
                  </div>
                </div>

                {/* Android Download Action */}
                <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Android 8.0+ &bull; {APP_DOWNLOAD_LINKS.apkSize} &bull; Free</span>
                  </div>

                  <a
                    href={APP_DOWNLOAD_LINKS.androidApk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-9.5 px-4.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 no-underline cursor-pointer active:scale-[0.98] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download for Android (.apk)</span>
                  </a>
                </div>
              </div>

              {/* ── CARD 2: DESKTOP APP (Button 2 for Desktop) ── */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold font-mono tracking-wider">
                      WINDOWS PC DESKTOP
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      v{APP_DOWNLOAD_LINKS.version} (x64)
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                    <Monitor className="w-6 h-6 text-blue-600" />
                    <span>CredSmart for Windows</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                    Engineered for high-volume billing counters, wholesale distribution warehouses, and zero-latency retail checkouts.
                  </p>

                  <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Ultra-fast F1-F12 keyboard POS shortcuts for cashiers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Direct USB, LAN &amp; Virtual COM thermal receipt printer drivers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Dual-screen customer display support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Local SQLite offline engine &bull; zero internet downtime</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Download Action */}
                <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Windows 10/11 &bull; {APP_DOWNLOAD_LINKS.exeSize} &bull; 64-bit</span>
                  </div>

                  <a
                    href={APP_DOWNLOAD_LINKS.windowsExe}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-9.5 px-4.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 no-underline cursor-pointer active:scale-[0.98] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download for Windows (.exe)</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 7: COMPARISON MATRIX (CredSmart vs Vyapar vs myBillBook vs Tally) ── */}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-widest font-mono">
                The ₹0 Advantage
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                How CredSmart Compares with <span className="text-[#FF6A00]">Paid Alternatives</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Why thousands of shop owners are switching from paid renewal software to CredSmart.
              </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="py-4 px-5 font-bold">Feature</th>
                    <th className="py-4 px-5 font-black text-blue-700 bg-blue-50/60">CredSmart</th>
                    <th className="py-4 px-5 font-semibold text-slate-500">Vyapar</th>
                    <th className="py-4 px-5 font-semibold text-slate-500">myBillBook</th>
                    <th className="py-4 px-5 font-semibold text-slate-500">Tally Prime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">Annual Software Cost</td>
                    <td className="py-3.5 px-5 font-black text-emerald-600 bg-blue-50/30">₹ 0 (100% Free Forever)</td>
                    <td className="py-3.5 px-5 text-slate-600">₹ 2,999 / year</td>
                    <td className="py-3.5 px-5 text-slate-600">₹ 2,399 / year</td>
                    <td className="py-3.5 px-5 text-slate-600">₹ 22,500 + Renewal</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">Invoice Limit</td>
                    <td className="py-3.5 px-5 font-bold text-blue-700 bg-blue-50/30">Unlimited</td>
                    <td className="py-3.5 px-5 text-slate-600">Limited on Free</td>
                    <td className="py-3.5 px-5 text-slate-600">Limited on Free</td>
                    <td className="py-3.5 px-5 text-slate-600">Unlimited</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">Ecosystem Auto-Sync</td>
                    <td className="py-3.5 px-5 font-bold text-emerald-600 bg-blue-50/30">✓ Included Free</td>
                    <td className="py-3.5 px-5 text-rose-500">✗ Not Available</td>
                    <td className="py-3.5 px-5 text-rose-500">✗ Not Available</td>
                    <td className="py-3.5 px-5 text-rose-500">✗ Manual Import</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">CredAlert Risk Intelligence</td>
                    <td className="py-3.5 px-5 font-bold text-emerald-600 bg-blue-50/30">✓ Integrated</td>
                    <td className="py-3.5 px-5 text-rose-500">✗ Not Available</td>
                    <td className="py-3.5 px-5 text-rose-500">✗ Not Available</td>
                    <td className="py-3.5 px-5 text-rose-500">✗ Not Available</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">Barcode Label Studio</td>
                    <td className="py-3.5 px-5 font-bold text-emerald-600 bg-blue-50/30">✓ Included Free</td>
                    <td className="py-3.5 px-5 text-slate-600">Paid Plan Only</td>
                    <td className="py-3.5 px-5 text-slate-600">Paid Plan Only</td>
                    <td className="py-3.5 px-5 text-slate-600">Third-party plugin</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">Multi-Device Cloud Sync</td>
                    <td className="py-3.5 px-5 font-bold text-emerald-600 bg-blue-50/30">✓ Real-time Free</td>
                    <td className="py-3.5 px-5 text-slate-600">Additional Cost</td>
                    <td className="py-3.5 px-5 text-slate-600">Additional Cost</td>
                    <td className="py-3.5 px-5 text-slate-600">Desktop only</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-center">
              <Link to={ROUTE_PATHS.pricing}>
                <Button variant="outline" className="h-8.5 px-3 rounded-lg border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-[0.98]">
                  View Full Detailed Pricing Breakdown &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 8: SOCIAL PROOF & METRICS STRIP ── */}
        <section className="py-12 bg-slate-900 text-white border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                  50,000+
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  Invoices Generated
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-blue-400 font-mono">
                  ₹ 100 Cr+
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  Reconciled GMV
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                  99.99%
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  Cloud Uptime
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-black text-[#FF6A00] font-mono">
                  4.9 / 5.0
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                  User Rating
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 9: INTERACTIVE FAQ ACCORDION WITH SEARCH ── */}
        <section className="py-14 sm:py-20 bg-white border-b border-slate-200/70">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">
                Got Questions?
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                Frequently Asked <span className="text-[#FF6A00]">Questions</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                Clear answers regarding our 100% free model, offline billing, hardware, and data security.
              </p>

              {/* FAQ Search Filter */}
              <div className="mt-6 max-w-md mx-auto relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search questions (e.g. offline, printer, pricing)..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Accordion items */}
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200",
                          isOpen && "rotate-180 text-blue-600"
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <Link to={ROUTE_PATHS.faq}>
                <Button variant="outline" className="h-8.5 px-3 rounded-lg border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-[0.98]">
                  Read All Help Center &amp; Support FAQs &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 10: BOTTOM HIGH-CONVERSION BANNER ── */}
        <section className="py-14 sm:py-20 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              
              {/* Left Copy */}
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-3xl shadow-lg shrink-0 hidden sm:flex">
                  🚀
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                    Run Your Entire Business. <span className="text-amber-300">For Free.</span>
                  </h3>
                  <p className="text-sm sm:text-base text-blue-100 mt-1 max-w-xl font-medium">
                    Stop juggling multiple tools and paying annual subscription renewals. Start using CredSmart today.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-blue-100">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Complete Solution
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> All Features Free
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Android &amp; Windows Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Right CTA Cluster */}
              <div className="shrink-0 w-full sm:w-auto z-10 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartFree}
                  className="w-full sm:w-auto h-9.5 px-4.5 rounded-lg bg-white hover:bg-slate-50 text-blue-800 font-bold text-sm shadow-xs active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-base">🚀</span>
                  <span>Start Free Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDownload("android")}
                  className="w-full sm:w-auto h-9.5 px-4 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-white border border-white/20 font-semibold text-xs shadow-xs active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-300" />
                  <span>Download Apps</span>
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* ── PUBLIC FOOTER ── */}
        <PublicFooter />

        {/* ── MODALS FOR INTERACTIVE EXPLORATION ── */}
        
        {/* 1. Video Tour Modal */}
        <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
          <DialogContent className="max-w-3xl p-6 rounded-2xl bg-white text-slate-900 border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CredSmartLogo size="sm" showTagline={false} />
                <span>Interactive Product Overview</span>
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-xs">
                See how fast you can create GST invoices, manage POS billing, and automate ledger reconciliation with zero setup fees.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 rounded-xl overflow-hidden bg-slate-950 aspect-video flex flex-col items-center justify-center text-white p-6 relative border border-slate-800">
              <div className="w-14 h-14 rounded-full bg-[#FF6A00] flex items-center justify-center shadow-xl animate-pulse cursor-pointer">
                <Play className="w-6 h-6 fill-white text-white ml-1" />
              </div>
              <p className="mt-3 text-xs font-bold text-slate-200">CredSmart 2-Minute Guided Tour</p>
              <p className="text-[11px] text-slate-400">GST Billing &bull; Barcode POS &bull; Inventory &amp; Ledgers</p>
            </div>
            <div className="mt-4 flex justify-end gap-2.5">
              <Button variant="outline" className="h-8.5 px-3 rounded-lg text-xs" onClick={() => setVideoModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setVideoModalOpen(false);
                  handleStartFree();
                }}
                className="h-8.5 px-3.5 rounded-lg bg-[#FF6A00] hover:bg-[#E65F00] text-white font-bold text-xs"
              >
                Get Started Free Now 🚀
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2. Ecosystem Modal */}
        <Dialog open={ecosystemModalOpen} onOpenChange={setEcosystemModalOpen}>
          <DialogContent className="max-w-2xl p-6 rounded-2xl bg-white text-slate-900 border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                The CredSmart Business Ecosystem
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-xs">
                How automatic connected billing eliminates manual accounting errors.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-4 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
                <span className="text-lg">1️⃣</span>
                <div>
                  <h4 className="font-bold text-slate-900">Direct Invoicing Sync</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">When you issue a GST invoice to another business using CredSmart, it instantly registers in their purchase ledger for one-click verification.</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-2.5">
                <span className="text-lg">2️⃣</span>
                <div>
                  <h4 className="font-bold text-slate-900">Zero Re-Entry &amp; Reconciliation</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">HSN codes, batch numbers, rates, and GST taxes match automatically, preventing tax credit discrepancies.</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
                <span className="text-lg">3️⃣</span>
                <div>
                  <h4 className="font-bold text-slate-900">Unified Payment &amp; Credit Ledger</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">Track Udhar, credit cycles, and payment receipts with cryptographically verified transaction receipts.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <Button variant="outline" className="h-8.5 px-3 rounded-lg text-xs" onClick={() => setEcosystemModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setEcosystemModalOpen(false);
                  handleStartFree();
                }}
                className="h-8.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                Join the Ecosystem
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3. Check Business Credibility Modal */}
        <Dialog open={credibilityModalOpen} onOpenChange={setCredibilityModalOpen}>
          <DialogContent className="max-w-xl p-6 rounded-2xl bg-white text-slate-900 border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>CredAlert Intelligence Check</span>
              </DialogTitle>
              <DialogDescription className="text-slate-600 text-xs">
                Search any Indian business by GSTIN, PAN, or Company Name to verify default records and commercial credibility.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCredibilitySearch} className="space-y-3.5 my-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Business Name, GSTIN or PAN
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchGstin}
                    onChange={(e) => setSearchGstin(e.target.value)}
                    placeholder="e.g. 27AABCU9603R1ZM or Tata Motors"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                  />
                </div>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>CredAlert indexes over 3.2M+ registered companies and commercial payment track records across India.</span>
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <Button type="button" variant="outline" className="h-8.5 px-3 rounded-lg text-xs" onClick={() => setCredibilityModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="h-8.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  Check Credibility Now
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 4. DEDICATED NATIVE APP DOWNLOAD MODAL (Android & Desktop) */}
        <DownloadAppModal
          open={downloadModalOpen}
          onOpenChange={setDownloadModalOpen}
          defaultPlatform={downloadPlatform}
        />

      </div>
    </>
  );
}
