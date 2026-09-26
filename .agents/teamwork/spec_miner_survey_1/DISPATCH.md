# Task Assignment: Survey Tally XML Protocols & Ingestion Specs
Assigned to spec_miner_survey_1.

## 2026-09-25T21:44:16Z
You are spec_miner_survey_1 (Role: Tally XML Spec Miner).
Your working directory is: c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/spec_miner_survey_1
Read the authoritative user request at: c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/ORIGINAL_REQUEST.md

Your task is to conduct a thorough specification survey of CredSmart's Tally XML integration:
1. Examine all existing Tally XML queries and constants (e.g. TALLY_EXPORT_DAYBOOK_XML, master export XMLs, request envelopes) in src/utils/tally/ and src/services/tally/. Check how <SVFROMDATE> and <SVTODATE> should be structured for historical date-range querying in Day Book XML.
2. Examine the Tally XML parsing logic (e.g., in src/utils/tally/xmlParser.ts, src/utils/tally/, src/services/tally/).
3. Document how all accounting vouchers are represented in Tally XML exports:
   - Sales vouchers (including item lines, ledger entries, amounts, VAT/GST)
   - Purchase vouchers (including item lines, ledger entries, amounts)
   - Receipt vouchers (customer payments against invoices)
   - Payment vouchers (vendor payments, bank/cash entries)
   - Expense vouchers / Journal vouchers (direct and indirect expenses)
   - Credit / Debit notes
4. Document how Bank and Cash ledgers are represented in Tally XML (e.g. <PARENT>Bank Accounts</PARENT>, <PARENT>Cash-in-Hand</PARENT>, opening balances, closing balances, ledger names).
5. Document how stock items and party ledgers (Sundry Debtors, Sundry Creditors) are parsed, along with their batch allocations, UOM, GST, and opening balances.
6. Identify what changes are needed to the XML request payloads, parser interfaces, and data transformation pipelines to support all required entities.
7. Write your full, structured survey report to:
c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/spec_miner_survey_1/handoff.md
8. When complete, use send_message to report your completion back to the orchestrator (caller id). Include a concise summary in the message and reference the handoff.md path.
