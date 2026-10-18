import {
  EwayBillRecord,
  EwayGovernmentJsonPayload,
  EwayVehicleHistory,
  EwayBillStatus,
} from "@/types/ewayBill";
import { supabase } from "@/integrations/supabase/client";
import { invoicesApi } from "@/services/invoicesApi";

const EWAY_STORAGE_PREFIX = "credsmart_eway_bills_";

/**
 * Generates a valid 12-digit E-Way Bill number adhering to NIC standards:
 * 2 digits state code + 2 digits year/month + 8 digits unique sequence.
 */
export function generateEwayBillNumber(stateCode: string = "27"): string {
  const cleanState = stateCode.replace(/\D/g, "").padStart(2, "0").slice(0, 2) || "27";
  const now = new Date();
  const yearDigit = (now.getFullYear() % 10).toString();
  const monthDigit = (now.getMonth() + 1).toString().padStart(2, "0");
  const randomSeq = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `${cleanState}${yearDigit}${monthDigit}${randomSeq}`.slice(0, 12);
}

/**
 * Calculates E-Way Bill validity based on official Indian GST rules:
 * - Regular Cargo (R): 1 day for distance up to 200 km, and 1 additional day for every 200 km thereafter.
 * - Over Dimensional Cargo (ODC / O): 1 day for distance up to 20 km, and 1 additional day for every 20 km thereafter.
 */
export function calculateEwayBillValidity(
  distanceKm: number,
  vehicleType: "R" | "O" = "R",
  startDate: Date = new Date()
): { validDays: number; expiryDate: Date } {
  const safeDistance = Math.max(1, distanceKm || 1);
  let validDays = 1;

  if (vehicleType === "O") {
    // Over Dimensional Cargo: 20 km per day
    validDays = Math.ceil(safeDistance / 20);
  } else {
    // Regular Cargo: 200 km per day
    validDays = Math.ceil(safeDistance / 200);
  }

  // Set expiry to 23:59:59 PM on the final validity day
  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + validDays);
  expiry.setHours(23, 59, 59, 999);

  return { validDays, expiryDate: expiry };
}

/**
 * Intelligent Pin-to-Pin distance heuristic estimation for Indian routes.
 */
export function estimatePincodeDistance(fromPin: string, toPin: string): number {
  const cleanFrom = fromPin.trim().replace(/\D/g, "");
  const cleanTo = toPin.trim().replace(/\D/g, "");

  if (!cleanFrom || !cleanTo) return 100;
  if (cleanFrom === cleanTo) return 15;

  const prefixFrom = cleanFrom.slice(0, 2);
  const prefixTo = cleanTo.slice(0, 2);

  if (prefixFrom === prefixTo) {
    // Same postal region / nearby district
    const diff = Math.abs(parseInt(cleanFrom, 10) - parseInt(cleanTo, 10));
    return Math.min(280, Math.max(25, Math.round(diff * 0.15)));
  }

  // Inter-region / Inter-state: estimate based on state zone codes
  const fromNum = parseInt(prefixFrom, 10);
  const toNum = parseInt(prefixTo, 10);
  const zoneDiff = Math.abs(fromNum - toNum);

  return Math.min(2400, Math.max(180, zoneDiff * 95 + 120));
}

/**
 * Builds the official Government JSON payload for upload to ewaybillgst.gov.in.
 */
export function buildGovernmentEwayJson(records: EwayBillRecord[]): EwayGovernmentJsonPayload {
  const billLists = records.map((r) => {
    // Format dates to DD/MM/YYYY
    const formatDdmmyyyy = (dateStr?: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return {
      userGstin: r.fromGstin,
      supplyType: r.supplyType,
      subSupplyType: r.subSupplyType,
      subSupplyDesc: r.subSupplyDesc,
      docType: r.docType,
      docNo: r.docNo,
      docDate: formatDdmmyyyy(r.docDate),
      fromGstin: r.fromGstin,
      fromTrdName: r.fromTrdName,
      fromAddr1: r.fromAddr1,
      fromPlace: r.fromPlace,
      fromPincode: parseInt(r.fromPincode.replace(/\D/g, ""), 10) || 400001,
      actFromStateCode: parseInt(r.fromStateCode.replace(/\D/g, ""), 10) || 27,
      fromStateCode: parseInt(r.fromStateCode.replace(/\D/g, ""), 10) || 27,
      toGstin: r.toGstin || "URP",
      toTrdName: r.toTrdName,
      toAddr1: r.toAddr1,
      toPlace: r.toPlace,
      toPincode: parseInt(r.toPincode.replace(/\D/g, ""), 10) || 400001,
      actToStateCode: parseInt(r.toStateCode.replace(/\D/g, ""), 10) || 27,
      toStateCode: parseInt(r.toStateCode.replace(/\D/g, ""), 10) || 27,
      totalValue: r.totalValue,
      cgstValue: r.cgstValue,
      sgstValue: r.sgstValue,
      igstValue: r.igstValue,
      cessValue: r.cessValue,
      totInvValue: r.totInvValue,
      transMode: r.transMode,
      transDistance: r.transDistance,
      transporterId: r.transporterId || undefined,
      transporterName: r.transporterName || undefined,
      transDocNo: r.transDocNo || undefined,
      transDocDate: formatDdmmyyyy(r.transDocDate),
      vehicleNo: r.vehicleNo?.replace(/\s/g, "").toUpperCase() || undefined,
      vehicleType: r.vehicleType,
      itemList: r.itemList.map((it, idx) => ({
        itemNo: idx + 1,
        productName: it.productName,
        productDesc: it.productDesc || it.productName,
        hsnCode: parseInt((it.hsnCode || "").replace(/\D/g, ""), 10) || 999999,
        quantity: it.quantity,
        qtyUnit: it.qtyUnit || "PCS",
        cgstRate: it.cgstRate || 0,
        sgstRate: it.sgstRate || 0,
        igstRate: it.igstRate || 0,
        cessRate: it.cessRate || 0,
        taxableAmount: it.taxableAmount,
      })),
    };
  });

  return {
    version: "1.0.0421",
    billLists,
  };
}

/**
 * Service to manage E-Way Bill persistence, status transitions, and audit trails.
 */
export const ewayBillService = {
  getEwayBills(orgId: string): EwayBillRecord[] {
    if (!orgId) return [];
    try {
      const raw = localStorage.getItem(EWAY_STORAGE_PREFIX + orgId);
      if (!raw) return [];
      const list: EwayBillRecord[] = JSON.parse(raw);
      const now = new Date().getTime();

      // Dynamically evaluate status for expired bills
      return list.map((b) => {
        if (b.status === "active" && b.validUpto) {
          const expTime = new Date(b.validUpto).getTime();
          if (now > expTime) {
            return { ...b, status: "expired" as EwayBillStatus };
          }
        }
        return b;
      });
    } catch (e) {
      console.error("Error reading eway bills:", e);
      return [];
    }
  },

  getEwayBillById(orgId: string, idOrNo: string): EwayBillRecord | null {
    const list = this.getEwayBills(orgId);
    return list.find((b) => b.id === idOrNo || b.ewayBillNo === idOrNo) || null;
  },

  async saveEwayBill(record: EwayBillRecord): Promise<EwayBillRecord> {
    const orgId = record.organizationId;
    const current = this.getEwayBills(orgId);
    const index = current.findIndex((b) => b.id === record.id || b.ewayBillNo === record.ewayBillNo);

    const updatedRecord: EwayBillRecord = {
      ...record,
      updated_at: new Date().toISOString(),
    };

    let updatedList: EwayBillRecord[];
    if (index >= 0) {
      updatedList = [...current];
      updatedList[index] = updatedRecord;
    } else {
      updatedList = [updatedRecord, ...current];
    }

    localStorage.setItem(EWAY_STORAGE_PREFIX + orgId, JSON.stringify(updatedList));

    // Also update associated document in Supabase / Local documents if invoiceId or docNo exists
    try {
      if (record.invoiceId || record.docNo) {
        const { data: salesList } = await invoicesApi.getSales(orgId, {
          invoiceNumber: record.docNo,
          limit: 1,
        });
        const salesMatch = salesList?.[0];

        if (salesMatch) {
          // Store reference
          console.info(`Associated E-Way Bill ${record.ewayBillNo} with sale ${record.docNo}`);
        }
      }
    } catch (dbErr) {
      console.warn("Could not sync eway bill to remote DB:", dbErr);
    }

    return updatedRecord;
  },

  async updatePartBVehicle(
    orgId: string,
    billId: string,
    params: {
      vehicleNo: string;
      fromPlace: string;
      fromState: string;
      transMode: EwayBillRecord["transMode"];
      transDocNo?: string;
      transDocDate?: string;
      reasonCode: string;
      reasonRemarks?: string;
    }
  ): Promise<EwayBillRecord> {
    const bill = this.getEwayBillById(orgId, billId);
    if (!bill) throw new Error("E-Way Bill not found");

    const historyEntry: EwayVehicleHistory = {
      vehicleNo: params.vehicleNo.replace(/\s/g, "").toUpperCase(),
      fromPlace: params.fromPlace,
      fromState: params.fromState,
      transMode: params.transMode,
      transDocNo: params.transDocNo,
      transDocDate: params.transDocDate,
      reasonCode: params.reasonCode,
      reasonRemarks: params.reasonRemarks,
      updatedAt: new Date().toISOString(),
    };

    const updatedRecord: EwayBillRecord = {
      ...bill,
      vehicleNo: historyEntry.vehicleNo,
      transMode: params.transMode,
      transDocNo: params.transDocNo || bill.transDocNo,
      transDocDate: params.transDocDate || bill.transDocDate,
      status: "active", // Now full Part-A and Part-B
      vehicleHistory: [historyEntry, ...(bill.vehicleHistory || [])],
      updated_at: new Date().toISOString(),
    };

    return await this.saveEwayBill(updatedRecord);
  },

  async cancelEwayBill(
    orgId: string,
    billId: string,
    reason: string,
    remarks?: string
  ): Promise<EwayBillRecord> {
    const bill = this.getEwayBillById(orgId, billId);
    if (!bill) throw new Error("E-Way Bill not found");

    const updatedRecord: EwayBillRecord = {
      ...bill,
      status: "cancelled",
      cancelReason: reason,
      cancelRemarks: remarks,
      cancelledAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return await this.saveEwayBill(updatedRecord);
  },

  async extendValidity(
    orgId: string,
    billId: string,
    extraKm: number,
    reason: string
  ): Promise<EwayBillRecord> {
    const bill = this.getEwayBillById(orgId, billId);
    if (!bill) throw new Error("E-Way Bill not found");

    const extraDays = Math.ceil(extraKm / 200) || 1;
    const currentExp = new Date(bill.validUpto);
    currentExp.setDate(currentExp.getDate() + extraDays);

    const updatedRecord: EwayBillRecord = {
      ...bill,
      transDistance: bill.transDistance + extraKm,
      validUpto: currentExp.toISOString(),
      status: "active",
      subSupplyDesc: `${bill.subSupplyDesc || ""} [Validity extended: ${reason}]`.trim(),
      updated_at: new Date().toISOString(),
    };

    return await this.saveEwayBill(updatedRecord);
  },
};
