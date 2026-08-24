import { STATE_CODE_MAP, getEntityCategoryFromPAN, GSTLookupResult, isValidGSTIN, isValidPAN } from "@/utils/gstinLookup";

export function parseTallyGstResult(raw: string | Record<string, any>, fallbackGstin: string = ""): GSTLookupResult {
  let data: Record<string, any> = {};

  if (typeof raw === "object" && raw !== null) {
    data = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    // 1. Try parsing as JSON
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        data = JSON.parse(trimmed);
      } catch {
        data = {};
      }
    }

    // 2. If not JSON or empty, parse key-value lines from Tally text/clipboard
    if (Object.keys(data).length === 0) {
      const lines = trimmed.split(/\r?\n/);
      for (const line of lines) {
        const parts = line.split(/[:\t](.+)/);
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts[1].trim();

          if (key.includes("legal name") || key.includes("leagalname") || key === "lglname") {
            data.legal_name = val;
          } else if (key.includes("trade name") || key === "trdname") {
            data.trade_name = val;
          } else if (key.includes("gstin") || key.includes("gst number")) {
            data.gstin = val;
          } else if (key.includes("status") || key.includes("gstin status")) {
            data.gstin_status = val;
          } else if (key.includes("taxpayer type") || key.includes("registration type")) {
            data.registration_type = val;
          } else if (key.includes("constitution") || key.includes("business constitution")) {
            data.business_constitution = val;
          } else if (key.includes("principal place") || key.includes("address") || key.includes("place of business")) {
            data.address = val;
          } else if (key.includes("date of registration") || key.includes("effective date")) {
            data.effective_date_of_registration = val;
          }
        }
      }
    }
  }

  // Extract fields
  const gstin = (data.gstin || data.gstNo || fallbackGstin || "").trim().toUpperCase();
  const pan = gstin.length >= 12 ? gstin.substring(2, 12) : (data.pan || (isValidPAN(fallbackGstin) ? fallbackGstin : ""));
  const stateCode = gstin.length >= 2 ? gstin.substring(0, 2) : "27";
  const legalName = (data.legal_name || data.legalName || data.lgnm || data.name || "").trim();
  const tradeName = (data.trade_name || data.tradeName || data.tradeNam || legalName).trim();
  const address = (data.address || data.principalPlaceOfBusiness || data.company_address || "").trim();

  // Extract PIN code from address (e.g. 600032 or 700071)
  const pinMatch = address.match(/\b[1-9][0-9]{5}\b/);
  const pincode = data.pincode || data.pin_code || (pinMatch ? pinMatch[0] : "");

  // Extract City and State from address parts
  let state = STATE_CODE_MAP[stateCode] || "Maharashtra";
  let city = "";

  if (address) {
    const parts = address.split(",").map((p: string) => p.trim());
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].replace(/-\s*India/i, "").replace(/[0-9]/g, "").trim();
      const secondLast = parts[parts.length - 2].trim();
      if (lastPart) state = lastPart;
      if (secondLast) city = secondLast;
    }
  }

  // Map constitution to CREDSMART category
  let category = getEntityCategoryFromPAN(pan);
  const constLower = (data.business_constitution || data.constitutionOfBusiness || "").toLowerCase();
  if (constLower.includes("private") || constLower.includes("public limited") || constLower.includes("company")) {
    category = "Corporate";
  } else if (constLower.includes("partnership") || constLower.includes("llp")) {
    category = "Wholesaler";
  } else if (constLower.includes("proprietorship") || constLower.includes("individual")) {
    category = "Retailer";
  }

  const status = (data.gstin_status || data.status || "Active").toLowerCase().includes("inact") ? "Inactive" : "Active";
  const taxpayerType = (data.registration_type || data.taxpayerType || "Regular").toLowerCase().includes("comp")
    ? "Composition"
    : "Regular";

  return {
    gstin,
    legalName,
    tradeName,
    pan,
    state,
    stateCode,
    city,
    pincode,
    address,
    taxpayerType: taxpayerType as any,
    status: status as any,
    registerDate: data.effective_date_of_registration || data.registerDate || "2017-07-01",
    category,
    source: "live_api",
  };
}
