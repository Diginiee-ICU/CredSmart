import { createClient } from "@libsql/client/web";

const tursoUrl = import.meta.env.VITE_TURSO_DATABASE_URL || "https://try-rudra030709.aws-ap-south-1.turso.io";
const tursoAuthToken = import.meta.env.VITE_TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicm8iLCJpYXQiOjE3ODY4MzY0MDEsImlkIjoiMDFhMDA3NzctZjYwMS03MDk2LTk3NjYtMDE5NmRkNjFjYjQ1Iiwia2lkIjoiS2drYWFTMHo0LWlBS3B6amRsQTFGWW5MSWZvNm5YNU5SdER4MllPV0cwVSIsInJpZCI6IjE2MzJmYzc3LWRjZWEtNGY4NS1iMjc0LWU2MzdmMWRjNjY5OSJ9.-iG2ufn4uv-Av5BLA5EBIwNomTk57hZo_hthceMi7kxpNfrWRebVOxtpgSB6E6v66nijpKZ99iaDchTOt_LWAQ";

// Initialize the Turso client using the HTTP web client
export const turso = tursoUrl && tursoAuthToken
  ? createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    })
  : null;

export async function searchCompanies(query: string) {
  if (!turso) {
    throw new Error("Turso database is not configured.");
  }

  const trimmed = query.trim();
  if (!trimmed) return [];

  // Exact 21-character CIN lookup
  if (trimmed.length === 21 && !trimmed.includes(" ")) {
    try {
      const result = await turso.execute({
        sql: "SELECT cin, company_name, company_address, phone_number, company_industrial_classification FROM companies WHERE cin = ?",
        args: [trimmed.toUpperCase()],
      });
      return result.rows;
    } catch (cinErr) {
      console.warn("CIN lookup failed, falling back to text search:", cinErr);
    }
  }

  // Clean and sanitize string for FTS5 MATCH
  const sanitized = trimmed.replace(/["'*();:^]/g, " ").replace(/\s+/g, " ").trim();
  if (!sanitized) return [];

  const ftsQuery = `"${sanitized}"*`;

  try {
    const result = await turso.execute({
      sql: `
        SELECT c.cin, c.company_name, c.company_address, c.phone_number, c.company_industrial_classification
        FROM companies_fts fts
        JOIN companies c ON fts.cin = c.cin
        WHERE companies_fts MATCH ?
        LIMIT 10
      `,
      args: [ftsQuery],
    });

    return result.rows;
  } catch (ftsError) {
    console.warn("FTS search error, trying wildcard LIKE fallback:", ftsError);
    try {
      const fallbackResult = await turso.execute({
        sql: `
          SELECT cin, company_name, company_address, phone_number, company_industrial_classification
          FROM companies
          WHERE company_name LIKE ?
          LIMIT 10
        `,
        args: [`%${sanitized}%`],
      });
      return fallbackResult.rows;
    } catch (fallbackErr) {
      console.error("searchCompanies fallback failed:", fallbackErr);
      return [];
    }
  }
}

export async function discoverCompanies(filters: { search?: string; pinCode?: string; limit?: number }) {
  if (!turso) throw new Error("Turso database is not configured.");

  const limit = Math.min(filters.limit || 50, 100);
  const searchRaw = filters.search?.trim();
  const pinCode = filters.pinCode?.trim();

  // If a search term is provided, leverage the lightning-fast FTS index
  if (searchRaw) {
    const sanitized = searchRaw.replace(/["'*();:^]/g, " ").replace(/\s+/g, " ").trim();
    const ftsQuery = sanitized ? `"${sanitized}"*` : null;

    if (ftsQuery) {
      try {
        if (pinCode) {
          const result = await turso.execute({
            sql: `
              SELECT c.cin, c.company_name, c.company_address, c.company_industrial_classification, c.pin_code, c.company_roc
              FROM companies_fts fts
              JOIN companies c ON fts.cin = c.cin
              WHERE companies_fts MATCH ? AND c.pin_code = ?
              LIMIT ?
            `,
            args: [ftsQuery, pinCode, limit],
          });
          return result.rows;
        } else {
          const result = await turso.execute({
            sql: `
              SELECT c.cin, c.company_name, c.company_address, c.company_industrial_classification, c.pin_code, c.company_roc
              FROM companies_fts fts
              JOIN companies c ON fts.cin = c.cin
              WHERE companies_fts MATCH ?
              LIMIT ?
            `,
            args: [ftsQuery, limit],
          });
          return result.rows;
        }
      } catch (ftsErr) {
        console.warn("discoverCompanies FTS failed, falling back to LIKE query:", ftsErr);
      }
    }
  }

  // Fallback or Non-FTS path (e.g. Pin code only or general exploration)
  try {
    if (pinCode && searchRaw) {
      const sanitized = searchRaw.replace(/["'*();:^]/g, " ").trim();
      const result = await turso.execute({
        sql: `
          SELECT cin, company_name, company_address, company_industrial_classification, pin_code, company_roc
          FROM companies
          WHERE pin_code = ? AND company_name LIKE ?
          LIMIT ?
        `,
        args: [pinCode, `%${sanitized}%`, limit],
      });
      return result.rows;
    } else if (pinCode) {
      const result = await turso.execute({
        sql: `
          SELECT cin, company_name, company_address, company_industrial_classification, pin_code, company_roc
          FROM companies
          WHERE pin_code = ?
          LIMIT ?
        `,
        args: [pinCode, limit],
      });
      return result.rows;
    } else if (searchRaw) {
      const sanitized = searchRaw.replace(/["'*();:^]/g, " ").trim();
      const result = await turso.execute({
        sql: `
          SELECT cin, company_name, company_address, company_industrial_classification, pin_code, company_roc
          FROM companies
          WHERE company_name LIKE ?
          LIMIT ?
        `,
        args: [`%${sanitized}%`, limit],
      });
      return result.rows;
    } else {
      const result = await turso.execute({
        sql: `
          SELECT cin, company_name, company_address, company_industrial_classification, pin_code, company_roc
          FROM companies
          LIMIT ?
        `,
        args: [limit],
      });
      return result.rows;
    }
  } catch (err) {
    console.error("discoverCompanies query failed:", err);
    return [];
  }
}
