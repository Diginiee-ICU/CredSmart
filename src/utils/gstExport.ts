import { BusinessDocument, DocumentLineItem, INDIAN_STATES } from "@/types/documents";

// ============================================================================
// INDIAN GST COMPLIANCE CONSTANTS & SCHEMAS
// ============================================================================

export interface GSTOrgInfo {
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  state?: string;
  turnoverPrecedingFY?: number;
}

// ----------------------------------------------------------------------------
// GSTR-1 JSON Official Types
// ----------------------------------------------------------------------------

export interface GSTR1ItemDetail {
  rt: number; // Tax Rate (0, 0.1, 0.25, 3, 5, 12, 18, 28)
  txval: number; // Taxable Value
  iamt: number; // Integrated Tax (IGST)
  camt: number; // Central Tax (CGST)
  samt: number; // State/UT Tax (SGST)
  csamt: number; // Cess
}

export interface GSTR1InvoiceItem {
  num: number;
  itm_det: GSTR1ItemDetail;
}

export interface GSTR1Invoice {
  inum: string;
  idt: string; // DD-MM-YYYY
  val: number;
  pos: string; // 2-digit state code
  rchrg: "Y" | "N";
  inv_typ: "R" | "DE" | "SEWP" | "SEWOP" | "CBW";
  itms: GSTR1InvoiceItem[];
}

export interface GSTR1B2BParty {
  ctin: string; // Customer GSTIN
  cname?: string;
  inv: GSTR1Invoice[];
}

export interface GSTR1B2CLInvoice {
  inum: string;
  idt: string;
  val: number;
  itms: {
    num: number;
    itm_det: {
      rt: number;
      txval: number;
      iamt: number;
      csamt: number;
    };
  }[];
}

export interface GSTR1B2CLGroup {
  pos: string;
  inv: GSTR1B2CLInvoice[];
}

export interface GSTR1B2CSItem {
  sply_ty: "INTRA" | "INTER";
  pos: string;
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface GSTR1CDNItem {
  nt_num: string;
  nt_dt: string; // DD-MM-YYYY
  ntty: "C" | "D"; // C = Credit, D = Debit
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rchrg: "Y" | "N";
  itms: GSTR1InvoiceItem[];
}

export interface GSTR1CDNRParty {
  ctin: string;
  nt: GSTR1CDNItem[];
}

export interface GSTR1CDNURItem {
  typ: "B2CL" | "B2CS" | "EXP";
  nt_num: string;
  nt_dt: string;
  ntty: "C" | "D";
  inum: string;
  idt: string;
  val: number;
  pos: string;
  itms: GSTR1InvoiceItem[];
}

export interface GSTR1HSNRecord {
  num: number;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  val: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface GSTR1DocCategory {
  doc_num: number; // 1: Outward Invoices, 4: Credit Notes, 5: Debit Notes, 6: Challan
  doc_typ: string;
  docs: {
    num: number;
    from: string;
    to: string;
    totnum: number;
    cancel: number;
    net_issue: number;
  }[];
}

export interface GSTR1Data {
  gstin: string;
  fp: string; // MMYYYY e.g. "042026"
  cur_gt: number;
  gt: number;
  version: string;
  b2b: GSTR1B2BParty[];
  b2cl: GSTR1B2CLGroup[];
  b2cs: GSTR1B2CSItem[];
  cdnr: GSTR1CDNRParty[];
  cdnur: GSTR1CDNURItem[];
  exp: any[];
  hsn: {
    data: GSTR1HSNRecord[];
  };
  doc_issue: {
    doc_det: GSTR1DocCategory[];
  };
  summary: {
    totalInvoicesCount: number;
    totalTaxableValue: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalTax: number;
    totalGrandValue: number;
    b2bCount: number;
    b2csCount: number;
    b2clCount: number;
    cdnrCount: number;
  };
}

// ----------------------------------------------------------------------------
// GSTR-3B JSON Official Types
// ----------------------------------------------------------------------------

export interface GSTR3BData {
  gstin: string;
  ret_period: string; // MMYYYY
  sup_details: {
    osup_det: {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    osup_zero: {
      txval: number;
      iamt: number;
      csamt: number;
    };
    osup_nil_exmp: {
      txval: number;
    };
    isup_rev: {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    osup_nongst: {
      txval: number;
    };
  };
  inter_sup: {
    unreg_details: { pos: string; txval: number; iamt: number }[];
    comp_details: { pos: string; txval: number; iamt: number }[];
    uin_details: { pos: string; txval: number; iamt: number }[];
  };
  itc_elg: {
    itc_avl: {
      ty: string;
      iamt: number;
      camt?: number;
      samt?: number;
      csamt?: number;
    }[];
    itc_rev: {
      ty: string;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }[];
    itc_net: {
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    itc_inel: {
      ty: string;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }[];
  };
  inward_sup: {
    isup_details: {
      ty: string;
      inter: number;
      intra: number;
    }[];
  };
  summary: {
    totalOutwardTaxable: number;
    totalOutwardTax: number;
    totalInwardItc: number;
    netTaxPayable: number;
    salesInvoicesCount: number;
    purchaseInvoicesCount: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS & STATE CODE LOOKUPS
// ============================================================================

export function getStateCode(input?: string): string {
  if (!input) return "27"; // Default Maharashtra
  const trimmed = input.trim();

  // If starts with 2 digits (e.g. "27AAPFU..." or "27-Maharashtra" or "27")
  const match = trimmed.match(/^(\d{2})/);
  if (match) return match[1];

  // Try matching state name against INDIAN_STATES
  const found = INDIAN_STATES.find((s) =>
    s.toLowerCase().includes(trimmed.toLowerCase())
  );
  if (found) {
    return found.split("-")[0];
  }

  return "27";
}

export function getStateName(codeOrState?: string): string {
  if (!codeOrState) return "Maharashtra";
  const code = getStateCode(codeOrState);
  const found = INDIAN_STATES.find((s) => s.startsWith(code + "-"));
  if (found) {
    return found.split("-")[1];
  }
  return codeOrState;
}

export function formatGstDate(dateStr?: string | Date): string {
  if (!dateStr) return new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "01-04-2026";
  }
}

export function formatFilingPeriod(dateInput?: Date | string): string {
  const d = dateInput ? (typeof dateInput === "string" ? new Date(dateInput) : dateInput) : new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}${year}`;
}

export function getFinancialYear(dateInput?: Date | string): string {
  const d = dateInput ? (typeof dateInput === "string" ? new Date(dateInput) : dateInput) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

export function isValidGstin(gstin?: string): boolean {
  if (!gstin) return false;
  const cleaned = gstin.trim().toUpperCase();
  // Standard 15-char GSTIN format regex
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleaned);
}

// ============================================================================
// GSTR-1 DATA PROCESSOR
// ============================================================================

export function processGSTR1Data(
  salesInvoices: BusinessDocument[],
  creditNotes: BusinessDocument[] = [],
  debitNotes: BusinessDocument[] = [],
  challans: BusinessDocument[] = [],
  orgInfo: GSTOrgInfo = {},
  selectedPeriod?: string
): GSTR1Data {
  const supplierGstin = orgInfo.gstin || "27AAPFU0939F1ZV";
  const supplierStateCode = getStateCode(supplierGstin);
  const fp = selectedPeriod || formatFilingPeriod();
  const turnover = orgInfo.turnoverPrecedingFY || 5000000;

  // Data buckets
  const b2bMap: Map<string, { partyName: string; invoices: GSTR1Invoice[] }> = new Map();
  const b2clMap: Map<string, GSTR1B2CLInvoice[]> = new Map();
  const b2csMap: Map<string, GSTR1B2CSItem> = new Map();
  const cdnrMap: Map<string, GSTR1CDNItem[]> = new Map();
  const cdnurList: GSTR1CDNURItem[] = [];
  const hsnMap: Map<string, GSTR1HSNRecord> = new Map();

  let totalTaxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalGrandValue = 0;
  let b2bCount = 0;
  let b2clCount = 0;
  let b2csCount = 0;

  // Process Sales Invoices
  for (const doc of salesInvoices) {
    if (doc.status === "cancelled") continue;

    const docPosCode = doc.placeOfSupply ? getStateCode(doc.placeOfSupply) : (doc.partyGstin ? getStateCode(doc.partyGstin) : supplierStateCode);
    const isInterState = docPosCode !== supplierStateCode;
    const isRegistered = isValidGstin(doc.partyGstin);
    const isB2CLarge = !isRegistered && isInterState && doc.grandTotal > 250000;

    totalTaxableValue += doc.taxableTotal;
    totalCgst += doc.cgstTotal;
    totalSgst += doc.sgstTotal;
    totalIgst += doc.igstTotal;
    totalGrandValue += doc.grandTotal;

    // Build rate-wise line item breakdowns
    const rateMap = new Map<number, { txval: number; iamt: number; camt: number; samt: number; csamt: number }>();

    if (doc.items && doc.items.length > 0) {
      doc.items.forEach((item) => {
        const rate = item.taxRate || 18;
        const current = rateMap.get(rate) || { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        current.txval += item.taxableAmount;
        current.iamt += item.igstAmount;
        current.camt += item.cgstAmount;
        current.samt += item.sgstAmount;
        rateMap.set(rate, current);

        // HSN aggregation
        const hsnCode = item.hsn?.trim() || "9983";
        const unit = (item.unit || "NOS").toUpperCase();
        const hsnKey = `${hsnCode}_${unit}_${rate}`;

        const existingHsn = hsnMap.get(hsnKey) || {
          num: hsnMap.size + 1,
          hsn_sc: hsnCode,
          desc: item.productName || "General Goods / Services",
          uqc: unit,
          qty: 0,
          val: 0,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        };

        existingHsn.qty += item.quantity || 1;
        existingHsn.val += item.lineTotal || (item.taxableAmount + item.igstAmount + item.cgstAmount + item.sgstAmount);
        existingHsn.txval += item.taxableAmount;
        existingHsn.iamt += item.igstAmount;
        existingHsn.camt += item.cgstAmount;
        existingHsn.samt += item.sgstAmount;
        hsnMap.set(hsnKey, existingHsn);
      });
    } else {
      // Fallback if no item array: single aggregate row
      const fallbackRate = doc.taxableTotal > 0 ? Number(((doc.taxTotal / doc.taxableTotal) * 100).toFixed(1)) : 18;
      rateMap.set(fallbackRate, {
        txval: doc.taxableTotal,
        iamt: doc.igstTotal,
        camt: doc.cgstTotal,
        samt: doc.sgstTotal,
        csamt: 0,
      });

      const hsnKey = `9983_NOS_${fallbackRate}`;
      const existingHsn = hsnMap.get(hsnKey) || {
        num: hsnMap.size + 1,
        hsn_sc: "9983",
        desc: "Outward Taxable Supplies",
        uqc: "NOS",
        qty: 1,
        val: doc.grandTotal,
        txval: doc.taxableTotal,
        iamt: doc.igstTotal,
        camt: doc.cgstTotal,
        samt: doc.sgstTotal,
        csamt: 0,
      };
      existingHsn.qty += 1;
      existingHsn.val += doc.grandTotal;
      existingHsn.txval += doc.taxableTotal;
      existingHsn.iamt += doc.igstTotal;
      existingHsn.camt += doc.cgstTotal;
      existingHsn.samt += doc.sgstTotal;
      hsnMap.set(hsnKey, existingHsn);
    }

    const itms: GSTR1InvoiceItem[] = [];
    let itemSeq = 1;
    rateMap.forEach((det, rt) => {
      itms.push({
        num: itemSeq++,
        itm_det: {
          rt,
          txval: Number(det.txval.toFixed(2)),
          iamt: Number(det.iamt.toFixed(2)),
          camt: Number(det.camt.toFixed(2)),
          samt: Number(det.samt.toFixed(2)),
          csamt: 0,
        },
      });
    });

    // 1. Registered B2B
    if (isRegistered && doc.partyGstin) {
      const ctin = doc.partyGstin.trim().toUpperCase();
      const b2bEntry = b2bMap.get(ctin) || { partyName: doc.partyName || "B2B Client", invoices: [] };
      b2bEntry.invoices.push({
        inum: doc.documentNumber,
        idt: formatGstDate(doc.docDate),
        val: Number(doc.grandTotal.toFixed(2)),
        pos: docPosCode,
        rchrg: "N",
        inv_typ: "R",
        itms,
      });
      b2bMap.set(ctin, b2bEntry);
      b2bCount++;
    }
    // 2. Unregistered B2CL (> 2.5L Inter-state)
    else if (isB2CLarge) {
      const b2clList = b2clMap.get(docPosCode) || [];
      b2clList.push({
        inum: doc.documentNumber,
        idt: formatGstDate(doc.docDate),
        val: Number(doc.grandTotal.toFixed(2)),
        itms: itms.map((i) => ({
          num: i.num,
          itm_det: {
            rt: i.itm_det.rt,
            txval: i.itm_det.txval,
            iamt: i.itm_det.iamt,
            csamt: 0,
          },
        })),
      });
      b2clMap.set(docPosCode, b2clList);
      b2clCount++;
    }
    // 3. Unregistered B2CS (Small retail intra/inter)
    else {
      rateMap.forEach((det, rt) => {
        const supplyType: "INTRA" | "INTER" = isInterState ? "INTER" : "INTRA";
        const key = `${supplyType}_${docPosCode}_${rt}`;
        const existing = b2csMap.get(key) || {
          sply_ty: supplyType,
          pos: docPosCode,
          rt,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        };
        existing.txval += det.txval;
        existing.iamt += det.iamt;
        existing.camt += det.camt;
        existing.samt += det.samt;
        b2csMap.set(key, existing);
      });
      b2csCount++;
    }
  }

  // Process Credit & Debit Notes
  const allNotes = [...creditNotes, ...debitNotes];
  let cdnrCount = 0;

  for (const note of allNotes) {
    if (note.status === "cancelled") continue;
    const isCredit = note.docType === "credit_note" || note.docType === "sales_return";
    const noteType: "C" | "D" = isCredit ? "C" : "D";
    const docPosCode = note.placeOfSupply ? getStateCode(note.placeOfSupply) : supplierStateCode;
    const isRegistered = isValidGstin(note.partyGstin);

    const itms: GSTR1InvoiceItem[] = [
      {
        num: 1,
        itm_det: {
          rt: note.taxableTotal > 0 ? Number(((note.taxTotal / note.taxableTotal) * 100).toFixed(1)) : 18,
          txval: Number(note.taxableTotal.toFixed(2)),
          iamt: Number(note.igstTotal.toFixed(2)),
          camt: Number(note.cgstTotal.toFixed(2)),
          samt: Number(note.sgstTotal.toFixed(2)),
          csamt: 0,
        },
      },
    ];

    if (isRegistered && note.partyGstin) {
      const ctin = note.partyGstin.trim().toUpperCase();
      const list = cdnrMap.get(ctin) || [];
      list.push({
        nt_num: note.documentNumber,
        nt_dt: formatGstDate(note.docDate),
        ntty: noteType,
        inum: note.referenceNumber || `INV-ORIG-${note.documentNumber}`,
        idt: formatGstDate(note.docDate),
        val: Number(note.grandTotal.toFixed(2)),
        pos: docPosCode,
        rchrg: "N",
        itms,
      });
      cdnrMap.set(ctin, list);
      cdnrCount++;
    } else {
      cdnurList.push({
        typ: note.grandTotal > 250000 ? "B2CL" : "B2CS",
        nt_num: note.documentNumber,
        nt_dt: formatGstDate(note.docDate),
        ntty: noteType,
        inum: note.referenceNumber || `INV-ORIG-${note.documentNumber}`,
        idt: formatGstDate(note.docDate),
        val: Number(note.grandTotal.toFixed(2)),
        pos: docPosCode,
        itms,
      });
    }
  }

  // Convert Maps to Arrays
  const b2b: GSTR1B2BParty[] = [];
  b2bMap.forEach((val, ctin) => {
    b2b.push({
      ctin,
      cname: val.partyName,
      inv: val.invoices,
    });
  });

  const b2cl: GSTR1B2CLGroup[] = [];
  b2clMap.forEach((inv, pos) => {
    b2cl.push({ pos, inv });
  });

  const b2cs: GSTR1B2CSItem[] = [];
  b2csMap.forEach((val) => {
    b2cs.push({
      ...val,
      txval: Number(val.txval.toFixed(2)),
      iamt: Number(val.iamt.toFixed(2)),
      camt: Number(val.camt.toFixed(2)),
      samt: Number(val.samt.toFixed(2)),
      csamt: 0,
    });
  });

  const cdnr: GSTR1CDNRParty[] = [];
  cdnrMap.forEach((nt, ctin) => {
    cdnr.push({ ctin, nt });
  });

  const hsnData: GSTR1HSNRecord[] = [];
  let hsnSeq = 1;
  hsnMap.forEach((rec) => {
    hsnData.push({
      ...rec,
      num: hsnSeq++,
      val: Number(rec.val.toFixed(2)),
      txval: Number(rec.txval.toFixed(2)),
      iamt: Number(rec.iamt.toFixed(2)),
      camt: Number(rec.camt.toFixed(2)),
      samt: Number(rec.samt.toFixed(2)),
    });
  });

  // Build Document Issue Category table (Table 13)
  const buildDocSeries = (
    docs: BusinessDocument[],
    docNum: number,
    docTyp: string,
    prefix: string
  ): GSTR1DocCategory => {
    if (docs.length === 0) {
      return {
        doc_num: docNum,
        doc_typ: docTyp,
        docs: [
          {
            num: 1,
            from: `${prefix}0001`,
            to: `${prefix}0000`,
            totnum: 0,
            cancel: 0,
            net_issue: 0,
          },
        ],
      };
    }

    const docNums = docs.map((d) => d.documentNumber).sort();
    const fromDoc = docNums[0];
    const toDoc = docNums[docNums.length - 1];
    const cancelledCount = docs.filter((d) => d.status === "cancelled").length;
    const totalCount = docs.length;

    return {
      doc_num: docNum,
      doc_typ: docTyp,
      docs: [
        {
          num: 1,
          from: fromDoc,
          to: toDoc,
          totnum: totalCount,
          cancel: cancelledCount,
          net_issue: totalCount - cancelledCount,
        },
      ],
    };
  };

  const doc_det: GSTR1DocCategory[] = [
    buildDocSeries(salesInvoices, 1, "Invoices for outward supply", "INV-"),
    buildDocSeries(creditNotes, 4, "Credit Note", "CN-"),
    buildDocSeries(debitNotes, 5, "Debit Note", "DN-"),
    buildDocSeries(challans, 6, "Delivery Challan", "DC-"),
  ];

  return {
    gstin: supplierGstin,
    fp,
    cur_gt: Number(totalGrandValue.toFixed(2)),
    gt: turnover,
    version: "GST2.0",
    b2b,
    b2cl,
    b2cs,
    cdnr,
    cdnur: cdnurList,
    exp: [],
    hsn: { data: hsnData },
    doc_issue: { doc_det },
    summary: {
      totalInvoicesCount: salesInvoices.length,
      totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalIgst: Number(totalIgst.toFixed(2)),
      totalTax: Number((totalCgst + totalSgst + totalIgst).toFixed(2)),
      totalGrandValue: Number(totalGrandValue.toFixed(2)),
      b2bCount,
      b2csCount,
      b2clCount,
      cdnrCount,
    },
  };
}

// ============================================================================
// GSTR-3B DATA PROCESSOR
// ============================================================================

export function processGSTR3BData(
  salesInvoices: BusinessDocument[],
  purchaseInvoices: BusinessDocument[] = [],
  creditNotes: BusinessDocument[] = [],
  debitNotes: BusinessDocument[] = [],
  orgInfo: GSTOrgInfo = {},
  selectedPeriod?: string
): GSTR3BData {
  const gstin = orgInfo.gstin || "27AAPFU0939F1ZV";
  const supplierStateCode = getStateCode(gstin);
  const ret_period = selectedPeriod || formatFilingPeriod();

  // 3.1 Outward supplies calculation
  let outwardTxval = 0;
  let outwardCamt = 0;
  let outwardSamt = 0;
  let outwardIamt = 0;
  const zeroRatedTxval = 0;
  const nilExemptTxval = 0;

  // Inter-state unregistered supplies (Table 3.2)
  const unregInterMap = new Map<string, { txval: number; iamt: number }>();

  for (const doc of salesInvoices) {
    if (doc.status === "cancelled") continue;
    const docPosCode = doc.placeOfSupply ? getStateCode(doc.placeOfSupply) : supplierStateCode;
    const isInter = docPosCode !== supplierStateCode;
    const isUnregistered = !isValidGstin(doc.partyGstin);

    outwardTxval += doc.taxableTotal;
    outwardCamt += doc.cgstTotal;
    outwardSamt += doc.sgstTotal;
    outwardIamt += doc.igstTotal;

    if (isInter && isUnregistered) {
      const existing = unregInterMap.get(docPosCode) || { txval: 0, iamt: 0 };
      existing.txval += doc.taxableTotal;
      existing.iamt += doc.igstTotal;
      unregInterMap.set(docPosCode, existing);
    }
  }

  // Adjust for Credit Notes
  for (const cn of creditNotes) {
    if (cn.status === "cancelled") continue;
    outwardTxval -= cn.taxableTotal;
    outwardCamt -= cn.cgstTotal;
    outwardSamt -= cn.sgstTotal;
    outwardIamt -= cn.igstTotal;
  }

  // Table 4: Eligible Input Tax Credit (ITC) from Purchases
  let itcIamt = 0;
  let itcCamt = 0;
  let itcSamt = 0;

  for (const pur of purchaseInvoices) {
    if (pur.status === "cancelled" || pur.status === "draft") continue;
    itcIamt += pur.igstTotal || 0;
    itcCamt += pur.cgstTotal || 0;
    itcSamt += pur.sgstTotal || 0;
  }

  // Debit Notes increase purchase ITC / reduce sales
  for (const dn of debitNotes) {
    if (dn.status === "cancelled") continue;
    itcIamt += dn.igstTotal || 0;
    itcCamt += dn.cgstTotal || 0;
    itcSamt += dn.sgstTotal || 0;
  }

  const unreg_details: { pos: string; txval: number; iamt: number }[] = [];
  unregInterMap.forEach((val, pos) => {
    unreg_details.push({
      pos,
      txval: Number(val.txval.toFixed(2)),
      iamt: Number(val.iamt.toFixed(2)),
    });
  });

  const totalOutwardTax = outwardCamt + outwardSamt + outwardIamt;
  const totalInwardItc = itcCamt + itcSamt + itcIamt;
  const netTaxPayable = Math.max(0, totalOutwardTax - totalInwardItc);

  return {
    gstin,
    ret_period,
    sup_details: {
      osup_det: {
        txval: Number(outwardTxval.toFixed(2)),
        iamt: Number(outwardIamt.toFixed(2)),
        camt: Number(outwardCamt.toFixed(2)),
        samt: Number(outwardSamt.toFixed(2)),
        csamt: 0,
      },
      osup_zero: {
        txval: Number(zeroRatedTxval.toFixed(2)),
        iamt: 0,
        csamt: 0,
      },
      osup_nil_exmp: {
        txval: Number(nilExemptTxval.toFixed(2)),
      },
      isup_rev: {
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      },
      osup_nongst: {
        txval: 0,
      },
    },
    inter_sup: {
      unreg_details,
      comp_details: [],
      uin_details: [],
    },
    itc_elg: {
      itc_avl: [
        { ty: "IMPG", iamt: 0, csamt: 0 },
        { ty: "IMPS", iamt: 0, csamt: 0 },
        { ty: "ISRC", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "ISD", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        {
          ty: "OTH",
          iamt: Number(itcIamt.toFixed(2)),
          camt: Number(itcCamt.toFixed(2)),
          samt: Number(itcSamt.toFixed(2)),
          csamt: 0,
        },
      ],
      itc_rev: [
        { ty: "RUL", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
      ],
      itc_net: {
        iamt: Number(itcIamt.toFixed(2)),
        camt: Number(itcCamt.toFixed(2)),
        samt: Number(itcSamt.toFixed(2)),
        csamt: 0,
      },
      itc_inel: [
        { ty: "RUL", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
      ],
    },
    inward_sup: {
      isup_details: [
        { ty: "GST", inter: 0, intra: 0 },
        { ty: "NONGST", inter: 0, intra: 0 },
      ],
    },
    summary: {
      totalOutwardTaxable: Number(outwardTxval.toFixed(2)),
      totalOutwardTax: Number(totalOutwardTax.toFixed(2)),
      totalInwardItc: Number(totalInwardItc.toFixed(2)),
      netTaxPayable: Number(netTaxPayable.toFixed(2)),
      salesInvoicesCount: salesInvoices.length,
      purchaseInvoicesCount: purchaseInvoices.length,
    },
  };
}

// ============================================================================
// OFFICIAL JSON EXPORT BUILDERS
// ============================================================================

export function generateGSTR1JSON(data: GSTR1Data): object {
  return {
    gstin: data.gstin,
    fp: data.fp,
    gt: data.gt,
    cur_gt: data.cur_gt,
    version: data.version,
    b2b: data.b2b,
    b2cl: data.b2cl,
    b2cs: data.b2cs,
    cdnr: data.cdnr,
    cdnur: data.cdnur,
    exp: data.exp,
    hsn: data.hsn,
    doc_issue: data.doc_issue,
  };
}

export function generateGSTR3BJSON(data: GSTR3BData): object {
  return {
    gstin: data.gstin,
    ret_period: data.ret_period,
    sup_details: data.sup_details,
    inter_sup: data.inter_sup,
    itc_elg: data.itc_elg,
    inward_sup: data.inward_sup,
  };
}

// ============================================================================
// MULTI-SHEET EXCEL WORKBOOK GENERATOR (SpreadsheetML XML)
// ============================================================================

function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXmlCell(value: any, isHeader = false, isNumeric = false): string {
  const styleAttr = isHeader ? ' ss:StyleID="HeaderStyle"' : isNumeric ? ' ss:StyleID="NumberStyle"' : ' ss:StyleID="TextStyle"';
  const type = isNumeric && !isNaN(Number(value)) ? "Number" : "String";
  const content = isNumeric && !isNaN(Number(value)) ? Number(value).toFixed(2) : escapeXml(value);
  return `<Cell${styleAttr}><Data ss:Type="${type}">${content}</Data></Cell>`;
}

function buildXmlRow(cells: string[]): string {
  return `<Row>${cells.join("")}</Row>`;
}

function buildXmlWorksheet(name: string, rows: string[]): string {
  return `
    <Worksheet ss:Name="${escapeXml(name)}">
      <Table ss:DefaultColumnWidth="120" ss:DefaultRowHeight="20">
        ${rows.join("\n")}
      </Table>
    </Worksheet>
  `;
}

export function generateGSTR1ExcelWorkbook(data: GSTR1Data, orgName = "CredSmart Merchant"): string {
  const sheets: string[] = [];

  // 1. SUMMARY SHEET
  const summaryRows: string[] = [
    buildXmlRow([buildXmlCell("GSTR-1 OFFICIAL RETURN WORKBOOK", true)]),
    buildXmlRow([buildXmlCell(`Business Legal Name: ${orgName}`)]),
    buildXmlRow([buildXmlCell(`Supplier GSTIN: ${data.gstin}`)]),
    buildXmlRow([buildXmlCell(`Filing Tax Period: ${data.fp}`)]),
    buildXmlRow([buildXmlCell(`Gross Turnover (FY): ₹ ${data.gt.toLocaleString("en-IN")}`)]),
    buildXmlRow([buildXmlCell("")]),
    buildXmlRow([
      buildXmlCell("Table Code", true),
      buildXmlCell("GST Return Section", true),
      buildXmlCell("Document Count", true),
      buildXmlCell("Taxable Value (₹)", true),
      buildXmlCell("IGST (₹)", true),
      buildXmlCell("CGST (₹)", true),
      buildXmlCell("SGST (₹)", true),
      buildXmlCell("Total Value (₹)", true),
    ]),
    buildXmlRow([
      buildXmlCell("4A, 4B, 6B"),
      buildXmlCell("B2B Invoices (Registered)"),
      buildXmlCell(data.summary.b2bCount, false, true),
      buildXmlCell(data.b2b.reduce((acc, p) => acc + p.inv.reduce((ia, i) => ia + i.itms.reduce((ta, it) => ta + it.itm_det.txval, 0), 0), 0), false, true),
      buildXmlCell(data.b2b.reduce((acc, p) => acc + p.inv.reduce((ia, i) => ia + i.itms.reduce((ta, it) => ta + it.itm_det.iamt, 0), 0), 0), false, true),
      buildXmlCell(data.b2b.reduce((acc, p) => acc + p.inv.reduce((ia, i) => ia + i.itms.reduce((ta, it) => ta + it.itm_det.camt, 0), 0), 0), false, true),
      buildXmlCell(data.b2b.reduce((acc, p) => acc + p.inv.reduce((ia, i) => ia + i.itms.reduce((ta, it) => ta + it.itm_det.samt, 0), 0), 0), false, true),
      buildXmlCell(data.b2b.reduce((acc, p) => acc + p.inv.reduce((ia, i) => ia + i.val, 0), 0), false, true),
    ]),
    buildXmlRow([
      buildXmlCell("5A, 5B"),
      buildXmlCell("B2CL Large Invoices (Unregistered > 2.5L)"),
      buildXmlCell(data.summary.b2clCount, false, true),
      buildXmlCell(data.b2cl.reduce((acc, g) => acc + g.inv.reduce((ia, i) => ia + i.itms.reduce((ta, it) => ta + it.itm_det.txval, 0), 0), 0), false, true),
      buildXmlCell(data.b2cl.reduce((acc, g) => acc + g.inv.reduce((ia, i) => ia + i.itms.reduce((ta, it) => ta + it.itm_det.iamt, 0), 0), 0), false, true),
      buildXmlCell(0, false, true),
      buildXmlCell(0, false, true),
      buildXmlCell(data.b2cl.reduce((acc, g) => acc + g.inv.reduce((ia, i) => ia + i.val, 0), 0), false, true),
    ]),
    buildXmlRow([
      buildXmlCell("7"),
      buildXmlCell("B2CS Small Invoices (Unregistered Retail)"),
      buildXmlCell(data.summary.b2csCount, false, true),
      buildXmlCell(data.b2cs.reduce((acc, it) => acc + it.txval, 0), false, true),
      buildXmlCell(data.b2cs.reduce((acc, it) => acc + it.iamt, 0), false, true),
      buildXmlCell(data.b2cs.reduce((acc, it) => acc + it.camt, 0), false, true),
      buildXmlCell(data.b2cs.reduce((acc, it) => acc + it.samt, 0), false, true),
      buildXmlCell(data.b2cs.reduce((acc, it) => acc + (it.txval + it.iamt + it.camt + it.samt), 0), false, true),
    ]),
    buildXmlRow([
      buildXmlCell("9B"),
      buildXmlCell("CDNR Credit / Debit Notes (Registered)"),
      buildXmlCell(data.summary.cdnrCount, false, true),
      buildXmlCell(data.cdnr.reduce((acc, p) => acc + p.nt.reduce((na, n) => na + n.itms.reduce((ta, it) => ta + it.itm_det.txval, 0), 0), 0), false, true),
      buildXmlCell(data.cdnr.reduce((acc, p) => acc + p.nt.reduce((na, n) => na + n.itms.reduce((ta, it) => ta + it.itm_det.iamt, 0), 0), 0), false, true),
      buildXmlCell(data.cdnr.reduce((acc, p) => acc + p.nt.reduce((na, n) => na + n.itms.reduce((ta, it) => ta + it.itm_det.camt, 0), 0), 0), false, true),
      buildXmlCell(data.cdnr.reduce((acc, p) => acc + p.nt.reduce((na, n) => na + n.itms.reduce((ta, it) => ta + it.itm_det.samt, 0), 0), 0), false, true),
      buildXmlCell(data.cdnr.reduce((acc, p) => acc + p.nt.reduce((na, n) => na + n.val, 0), 0), false, true),
    ]),
    buildXmlRow([
      buildXmlCell("12"),
      buildXmlCell("HSN-wise Summary of Outward Supplies"),
      buildXmlCell(data.hsn.data.length, false, true),
      buildXmlCell(data.hsn.data.reduce((acc, h) => acc + h.txval, 0), false, true),
      buildXmlCell(data.hsn.data.reduce((acc, h) => acc + h.iamt, 0), false, true),
      buildXmlCell(data.hsn.data.reduce((acc, h) => acc + h.camt, 0), false, true),
      buildXmlCell(data.hsn.data.reduce((acc, h) => acc + h.samt, 0), false, true),
      buildXmlCell(data.hsn.data.reduce((acc, h) => acc + h.val, 0), false, true),
    ]),
    buildXmlRow([
      buildXmlCell("TOTAL", true),
      buildXmlCell("CONSOLIDATED OUTWARD TOTALS", true),
      buildXmlCell(data.summary.totalInvoicesCount, true, true),
      buildXmlCell(data.summary.totalTaxableValue, true, true),
      buildXmlCell(data.summary.totalIgst, true, true),
      buildXmlCell(data.summary.totalCgst, true, true),
      buildXmlCell(data.summary.totalSgst, true, true),
      buildXmlCell(data.summary.totalGrandValue, true, true),
    ]),
  ];
  sheets.push(buildXmlWorksheet("Summary", summaryRows));

  // 2. B2B SHEET
  const b2bRows: string[] = [
    buildXmlRow([
      buildXmlCell("GSTIN/UIN of Recipient", true),
      buildXmlCell("Receiver Name", true),
      buildXmlCell("Invoice Number", true),
      buildXmlCell("Invoice date", true),
      buildXmlCell("Invoice Value", true),
      buildXmlCell("Place Of Supply", true),
      buildXmlCell("Reverse Charge", true),
      buildXmlCell("Invoice Type", true),
      buildXmlCell("Rate (%)", true),
      buildXmlCell("Taxable Value (₹)", true),
      buildXmlCell("Integrated Tax (₹)", true),
      buildXmlCell("Central Tax (₹)", true),
      buildXmlCell("State/UT Tax (₹)", true),
      buildXmlCell("Cess (₹)", true),
    ]),
  ];
  data.b2b.forEach((party) => {
    party.inv.forEach((inv) => {
      inv.itms.forEach((itm) => {
        b2bRows.push(
          buildXmlRow([
            buildXmlCell(party.ctin),
            buildXmlCell(party.cname || "B2B Client"),
            buildXmlCell(inv.inum),
            buildXmlCell(inv.idt),
            buildXmlCell(inv.val, false, true),
            buildXmlCell(`${inv.pos}-${getStateName(inv.pos)}`),
            buildXmlCell(inv.rchrg),
            buildXmlCell("Regular"),
            buildXmlCell(itm.itm_det.rt, false, true),
            buildXmlCell(itm.itm_det.txval, false, true),
            buildXmlCell(itm.itm_det.iamt, false, true),
            buildXmlCell(itm.itm_det.camt, false, true),
            buildXmlCell(itm.itm_det.samt, false, true),
            buildXmlCell(0, false, true),
          ])
        );
      });
    });
  });
  sheets.push(buildXmlWorksheet("b2b", b2bRows));

  // 3. B2CL SHEET
  const b2clRows: string[] = [
    buildXmlRow([
      buildXmlCell("Invoice Number", true),
      buildXmlCell("Invoice date", true),
      buildXmlCell("Invoice Value", true),
      buildXmlCell("Place Of Supply", true),
      buildXmlCell("Rate (%)", true),
      buildXmlCell("Taxable Value (₹)", true),
      buildXmlCell("Integrated Tax (₹)", true),
      buildXmlCell("Cess (₹)", true),
    ]),
  ];
  data.b2cl.forEach((grp) => {
    grp.inv.forEach((inv) => {
      inv.itms.forEach((itm) => {
        b2clRows.push(
          buildXmlRow([
            buildXmlCell(inv.inum),
            buildXmlCell(inv.idt),
            buildXmlCell(inv.val, false, true),
            buildXmlCell(`${grp.pos}-${getStateName(grp.pos)}`),
            buildXmlCell(itm.itm_det.rt, false, true),
            buildXmlCell(itm.itm_det.txval, false, true),
            buildXmlCell(itm.itm_det.iamt, false, true),
            buildXmlCell(0, false, true),
          ])
        );
      });
    });
  });
  sheets.push(buildXmlWorksheet("b2cl", b2clRows));

  // 4. B2CS SHEET
  const b2csRows: string[] = [
    buildXmlRow([
      buildXmlCell("Type", true),
      buildXmlCell("Place Of Supply", true),
      buildXmlCell("Rate (%)", true),
      buildXmlCell("Taxable Value (₹)", true),
      buildXmlCell("Integrated Tax (₹)", true),
      buildXmlCell("Central Tax (₹)", true),
      buildXmlCell("State/UT Tax (₹)", true),
      buildXmlCell("Cess (₹)", true),
    ]),
  ];
  data.b2cs.forEach((it) => {
    b2csRows.push(
      buildXmlRow([
        buildXmlCell(it.sply_ty === "INTER" ? "Inter-State" : "Intra-State"),
        buildXmlCell(`${it.pos}-${getStateName(it.pos)}`),
        buildXmlCell(it.rt, false, true),
        buildXmlCell(it.txval, false, true),
        buildXmlCell(it.iamt, false, true),
        buildXmlCell(it.camt, false, true),
        buildXmlCell(it.samt, false, true),
        buildXmlCell(0, false, true),
      ])
    );
  });
  sheets.push(buildXmlWorksheet("b2cs", b2csRows));

  // 5. CDNR SHEET
  const cdnrRows: string[] = [
    buildXmlRow([
      buildXmlCell("GSTIN/UIN of Recipient", true),
      buildXmlCell("Note/Voucher Number", true),
      buildXmlCell("Note/Voucher date", true),
      buildXmlCell("Document Type", true),
      buildXmlCell("Original Invoice Number", true),
      buildXmlCell("Original Invoice date", true),
      buildXmlCell("Place Of Supply", true),
      buildXmlCell("Note Value (₹)", true),
      buildXmlCell("Rate (%)", true),
      buildXmlCell("Taxable Value (₹)", true),
      buildXmlCell("Integrated Tax (₹)", true),
      buildXmlCell("Central Tax (₹)", true),
      buildXmlCell("State/UT Tax (₹)", true),
    ]),
  ];
  data.cdnr.forEach((party) => {
    party.nt.forEach((nt) => {
      nt.itms.forEach((itm) => {
        cdnrRows.push(
          buildXmlRow([
            buildXmlCell(party.ctin),
            buildXmlCell(nt.nt_num),
            buildXmlCell(nt.nt_dt),
            buildXmlCell(nt.ntty === "C" ? "Credit Note" : "Debit Note"),
            buildXmlCell(nt.inum),
            buildXmlCell(nt.idt),
            buildXmlCell(`${nt.pos}-${getStateName(nt.pos)}`),
            buildXmlCell(nt.val, false, true),
            buildXmlCell(itm.itm_det.rt, false, true),
            buildXmlCell(itm.itm_det.txval, false, true),
            buildXmlCell(itm.itm_det.iamt, false, true),
            buildXmlCell(itm.itm_det.camt, false, true),
            buildXmlCell(itm.itm_det.samt, false, true),
          ])
        );
      });
    });
  });
  sheets.push(buildXmlWorksheet("cdnr", cdnrRows));

  // 6. HSN SHEET
  const hsnRows: string[] = [
    buildXmlRow([
      buildXmlCell("HSN", true),
      buildXmlCell("Description", true),
      buildXmlCell("UQC", true),
      buildXmlCell("Total Quantity", true),
      buildXmlCell("Total Value (₹)", true),
      buildXmlCell("Taxable Value (₹)", true),
      buildXmlCell("Integrated Tax Amount (₹)", true),
      buildXmlCell("Central Tax Amount (₹)", true),
      buildXmlCell("State/UT Tax Amount (₹)", true),
      buildXmlCell("Cess Amount (₹)", true),
    ]),
  ];
  data.hsn.data.forEach((h) => {
    hsnRows.push(
      buildXmlRow([
        buildXmlCell(h.hsn_sc),
        buildXmlCell(h.desc),
        buildXmlCell(h.uqc),
        buildXmlCell(h.qty, false, true),
        buildXmlCell(h.val, false, true),
        buildXmlCell(h.txval, false, true),
        buildXmlCell(h.iamt, false, true),
        buildXmlCell(h.camt, false, true),
        buildXmlCell(h.samt, false, true),
        buildXmlCell(h.csamt, false, true),
      ])
    );
  });
  sheets.push(buildXmlWorksheet("hsn", hsnRows));

  // 7. DOCS SHEET
  const docRows: string[] = [
    buildXmlRow([
      buildXmlCell("Nature of Document", true),
      buildXmlCell("Sr. No. From", true),
      buildXmlCell("Sr. No. To", true),
      buildXmlCell("Total Number", true),
      buildXmlCell("Cancelled", true),
      buildXmlCell("Net Issued", true),
    ]),
  ];
  data.doc_issue.doc_det.forEach((det) => {
    det.docs.forEach((doc) => {
      docRows.push(
        buildXmlRow([
          buildXmlCell(det.doc_typ),
          buildXmlCell(doc.from),
          buildXmlCell(doc.to),
          buildXmlCell(doc.totnum, false, true),
          buildXmlCell(doc.cancel, false, true),
          buildXmlCell(doc.net_issue, false, true),
        ])
      );
    });
  });
  sheets.push(buildXmlWorksheet("docs", docRows));

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
    </Style>
    <Style ss:ID="HeaderStyle">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#4338CA" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2D2889"/>
      </Borders>
    </Style>
    <Style ss:ID="NumberStyle">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="TextStyle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
    </Style>
  </Styles>
  ${sheets.join("\n")}
</Workbook>`;
}

export function generateGSTR3BExcelWorkbook(data: GSTR3BData, orgName = "CredSmart Merchant"): string {
  const sheets: string[] = [];

  // Sheet 1: 3.1 & 3.2 Outward Return
  const summaryRows: string[] = [
    buildXmlRow([buildXmlCell("GSTR-3B MONTHLY SUMMARY RETURN", true)]),
    buildXmlRow([buildXmlCell(`Business: ${orgName}`)]),
    buildXmlRow([buildXmlCell(`GSTIN: ${data.gstin}`)]),
    buildXmlRow([buildXmlCell(`Filing Period: ${data.ret_period}`)]),
    buildXmlRow([buildXmlCell("")]),
    buildXmlRow([
      buildXmlCell("Table", true),
      buildXmlCell("Nature of Supplies", true),
      buildXmlCell("Taxable Value (₹)", true),
      buildXmlCell("Integrated Tax (₹)", true),
      buildXmlCell("Central Tax (₹)", true),
      buildXmlCell("State/UT Tax (₹)", true),
      buildXmlCell("Cess (₹)", true),
    ]),
    buildXmlRow([
      buildXmlCell("3.1(a)"),
      buildXmlCell("Outward taxable supplies (other than zero rated, nil and exempted)"),
      buildXmlCell(data.sup_details.osup_det.txval, false, true),
      buildXmlCell(data.sup_details.osup_det.iamt, false, true),
      buildXmlCell(data.sup_details.osup_det.camt, false, true),
      buildXmlCell(data.sup_details.osup_det.samt, false, true),
      buildXmlCell(0, false, true),
    ]),
    buildXmlRow([
      buildXmlCell("3.1(b)"),
      buildXmlCell("Outward taxable supplies (zero rated)"),
      buildXmlCell(data.sup_details.osup_zero.txval, false, true),
      buildXmlCell(data.sup_details.osup_zero.iamt, false, true),
      buildXmlCell(0, false, true),
      buildXmlCell(0, false, true),
      buildXmlCell(0, false, true),
    ]),
    buildXmlRow([
      buildXmlCell("3.1(c)"),
      buildXmlCell("Other outward supplies (Nil rated, exempted)"),
      buildXmlCell(data.sup_details.osup_nil_exmp.txval, false, true),
      buildXmlCell(0, false, true),
      buildXmlCell(0, false, true),
      buildXmlCell(0, false, true),
      buildXmlCell(0, false, true),
    ]),
    buildXmlRow([
      buildXmlCell("3.1(d)"),
      buildXmlCell("Inward supplies (liable to reverse charge)"),
      buildXmlCell(data.sup_details.isup_rev.txval, false, true),
      buildXmlCell(data.sup_details.isup_rev.iamt, false, true),
      buildXmlCell(data.sup_details.isup_rev.camt, false, true),
      buildXmlCell(data.sup_details.isup_rev.samt, false, true),
      buildXmlCell(0, false, true),
    ]),
    buildXmlRow([
      buildXmlCell("4(A)(5)"),
      buildXmlCell("All other Input Tax Credit (ITC Available from Purchases)"),
      buildXmlCell(0, false, true),
      buildXmlCell(data.itc_elg.itc_net.iamt, false, true),
      buildXmlCell(data.itc_elg.itc_net.camt, false, true),
      buildXmlCell(data.itc_elg.itc_net.samt, false, true),
      buildXmlCell(0, false, true),
    ]),
    buildXmlRow([
      buildXmlCell("NET", true),
      buildXmlCell("Net Tax Liability Payable in Cash", true),
      buildXmlCell(data.summary.totalOutwardTaxable, true, true),
      buildXmlCell(Math.max(0, data.sup_details.osup_det.iamt - data.itc_elg.itc_net.iamt), true, true),
      buildXmlCell(Math.max(0, data.sup_details.osup_det.camt - data.itc_elg.itc_net.camt), true, true),
      buildXmlCell(Math.max(0, data.sup_details.osup_det.samt - data.itc_elg.itc_net.samt), true, true),
      buildXmlCell(0, true, true),
    ]),
  ];
  sheets.push(buildXmlWorksheet("GSTR3B_Summary", summaryRows));

  // Sheet 2: 3.2 Inter-state Unregistered Breakdown
  const interRows: string[] = [
    buildXmlRow([
      buildXmlCell("Place of Supply (State)", true),
      buildXmlCell("Total Taxable Value (₹)", true),
      buildXmlCell("Amount of Integrated Tax (₹)", true),
    ]),
  ];
  data.inter_sup.unreg_details.forEach((u) => {
    interRows.push(
      buildXmlRow([
        buildXmlCell(`${u.pos}-${getStateName(u.pos)}`),
        buildXmlCell(u.txval, false, true),
        buildXmlCell(u.iamt, false, true),
      ])
    );
  });
  sheets.push(buildXmlWorksheet("3.2_InterState_Supplies", interRows));

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="HeaderStyle">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#059669" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="NumberStyle">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="#,##0.00"/>
    </Style>
    <Style ss:ID="TextStyle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
    </Style>
  </Styles>
  ${sheets.join("\n")}
</Workbook>`;
}

// ============================================================================
// DOWNLOAD TRIGGER HELPERS
// ============================================================================

export function downloadJSONFile(filename: string, jsonContent: object): void {
  const jsonStr = JSON.stringify(jsonContent, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadExcelXMLFile(filename: string, xmlContent: string): void {
  const blob = new Blob(["\uFEFF" + xmlContent], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadGSTR1JSON(gstr1Data: GSTR1Data, filename?: string): void {
  const name = filename || `GSTR1_${gstr1Data.gstin}_${gstr1Data.fp}.json`;
  const officialJson = generateGSTR1JSON(gstr1Data);
  downloadJSONFile(name, officialJson);
}

export function downloadGSTR3BJSON(gstr3bData: GSTR3BData, filename?: string): void {
  const name = filename || `GSTR3B_${gstr3bData.gstin}_${gstr3bData.ret_period}.json`;
  const officialJson = generateGSTR3BJSON(gstr3bData);
  downloadJSONFile(name, officialJson);
}

export function downloadGSTR1Excel(gstr1Data: GSTR1Data, orgName = "CredSmart Merchant", filename?: string): void {
  const name = filename || `GSTR1_Export_${gstr1Data.gstin}_${gstr1Data.fp}.xls`;
  const xmlWorkbook = generateGSTR1ExcelWorkbook(gstr1Data, orgName);
  downloadExcelXMLFile(name, xmlWorkbook);
}

export function downloadGSTR3BExcel(gstr3bData: GSTR3BData, orgName = "CredSmart Merchant", filename?: string): void {
  const name = filename || `GSTR3B_Summary_${gstr3bData.gstin}_${gstr3bData.ret_period}.xls`;
  const xmlWorkbook = generateGSTR3BExcelWorkbook(gstr3bData, orgName);
  downloadExcelXMLFile(name, xmlWorkbook);
}

// ============================================================================
// SAMPLE DATA GENERATOR (For instant testing & demonstrations)
// ============================================================================

export function generateSampleGSTDocuments(orgId: string, orgGstin = "27AAPFU0939F1ZV"): {
  sales: BusinessDocument[];
  creditNotes: BusinessDocument[];
  purchases: BusinessDocument[];
} {
  const today = new Date().toISOString().split("T")[0];

  const sales: BusinessDocument[] = [
    {
      id: "sample-sale-1",
      organizationId: orgId,
      docType: "sales_invoice",
      documentNumber: "INV-2026-001",
      partyName: "Shree Balaji Wholesalers",
      partyGstin: "27AABCU9603R1ZM",
      partyPhone: "9876543210",
      placeOfSupply: "27-Maharashtra",
      docDate: today,
      subtotal: 50000,
      discountTotal: 2500,
      taxableTotal: 47500,
      cgstTotal: 4275,
      sgstTotal: 4275,
      igstTotal: 0,
      taxTotal: 8550,
      roundOff: 0,
      grandTotal: 56050,
      paidAmount: 56050,
      balanceDue: 0,
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "item-1",
          productName: "Amul Pure Ghee 1L",
          hsn: "0402",
          quantity: 50,
          unit: "LTR",
          rate: 600,
          discountPercent: 5,
          discountAmount: 1500,
          taxRate: 5,
          taxableAmount: 28500,
          cgstAmount: 712.5,
          sgstAmount: 712.5,
          igstAmount: 0,
          lineTotal: 29925,
        },
        {
          id: "item-2",
          productName: "Dettol Antiseptic Liquid 500ml",
          hsn: "3808",
          quantity: 100,
          unit: "BTL",
          rate: 200,
          discountPercent: 5,
          discountAmount: 1000,
          taxRate: 18,
          taxableAmount: 19000,
          cgstAmount: 1710,
          sgstAmount: 1710,
          igstAmount: 0,
          lineTotal: 22420,
        },
      ],
    },
    {
      id: "sample-sale-2",
      organizationId: orgId,
      docType: "sales_invoice",
      documentNumber: "INV-2026-002",
      partyName: "Karnataka Retail Solutions",
      partyGstin: "29AABCU9603R1ZM",
      partyPhone: "9823011223",
      placeOfSupply: "29-Karnataka",
      docDate: today,
      subtotal: 45000,
      discountTotal: 0,
      taxableTotal: 45000,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 8100,
      taxTotal: 8100,
      roundOff: 0,
      grandTotal: 53100,
      paidAmount: 53100,
      balanceDue: 0,
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "item-3",
          productName: "Dell Wireless Keyboard & Mouse",
          hsn: "8471",
          quantity: 30,
          unit: "NOS",
          rate: 1500,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 18,
          taxableAmount: 45000,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 8100,
          lineTotal: 53100,
        },
      ],
    },
    {
      id: "sample-sale-3",
      organizationId: orgId,
      docType: "sales_invoice",
      documentNumber: "INV-2026-003",
      partyName: "Walk-in Retail Customer",
      partyGstin: "",
      partyPhone: "9988776655",
      placeOfSupply: "27-Maharashtra",
      docDate: today,
      subtotal: 12500,
      discountTotal: 500,
      taxableTotal: 12000,
      cgstTotal: 1080,
      sgstTotal: 1080,
      igstTotal: 0,
      taxTotal: 2160,
      roundOff: 0,
      grandTotal: 14160,
      paidAmount: 14160,
      balanceDue: 0,
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "item-4",
          productName: "Tata Tea Gold 1kg",
          hsn: "0902",
          quantity: 20,
          unit: "KG",
          rate: 625,
          discountPercent: 4,
          discountAmount: 500,
          taxRate: 18,
          taxableAmount: 12000,
          cgstAmount: 1080,
          sgstAmount: 1080,
          igstAmount: 0,
          lineTotal: 14160,
        },
      ],
    },
  ];

  const creditNotes: BusinessDocument[] = [
    {
      id: "sample-cn-1",
      organizationId: orgId,
      docType: "credit_note",
      documentNumber: "CN-2026-001",
      referenceNumber: "INV-2026-001",
      partyName: "Shree Balaji Wholesalers",
      partyGstin: "27AABCU9603R1ZM",
      placeOfSupply: "27-Maharashtra",
      docDate: today,
      subtotal: 3000,
      discountTotal: 0,
      taxableTotal: 3000,
      cgstTotal: 270,
      sgstTotal: 270,
      igstTotal: 0,
      taxTotal: 540,
      roundOff: 0,
      grandTotal: 3540,
      paidAmount: 3540,
      balanceDue: 0,
      status: "paid",
      created_at: new Date().toISOString(),
      items: [
        {
          id: "cn-item-1",
          productName: "Dettol Antiseptic Liquid (Damaged Return)",
          hsn: "3808",
          quantity: 15,
          unit: "BTL",
          rate: 200,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 18,
          taxableAmount: 3000,
          cgstAmount: 270,
          sgstAmount: 270,
          igstAmount: 0,
          lineTotal: 3540,
        },
      ],
    },
  ];

  const purchases: BusinessDocument[] = [
    {
      id: "sample-pur-1",
      organizationId: orgId,
      docType: "purchase_invoice",
      documentNumber: "PI-2026-091",
      partyName: "Hindustan Consumer Goods Ltd",
      partyGstin: "27AABCH1234F1Z8",
      placeOfSupply: "27-Maharashtra",
      docDate: today,
      subtotal: 75000,
      discountTotal: 0,
      taxableTotal: 75000,
      cgstTotal: 6750,
      sgstTotal: 6750,
      igstTotal: 0,
      taxTotal: 13500,
      roundOff: 0,
      grandTotal: 88500,
      paidAmount: 88500,
      balanceDue: 0,
      status: "paid",
      created_at: new Date().toISOString(),
      items: [],
    },
  ];

  return { sales, creditNotes, purchases };
}
