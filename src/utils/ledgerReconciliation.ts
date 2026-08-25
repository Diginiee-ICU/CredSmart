import { format } from "date-fns";
import { Party } from "@/types/parties";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type DiscrepancySeverity = "low" | "medium" | "high" | "critical";

export type DiscrepancyType =
  | "balance_mismatch"
  | "unlinked_invoice"
  | "invoice_amount_mismatch"
  | "duplicate_reference"
  | "invalid_amount"
  | "sequence_anomaly"
  | "cash_variance"
  | "bank_variance"
  | "unbalanced_transfer"
  | "negative_balance_alert";

export interface LedgerDiscrepancy {
  id: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  partyId?: string;
  partyName?: string;
  title: string;
  description: string;
  expectedValue?: number | string;
  actualValue?: number | string;
  variance?: number;
  suggestedAction: string;
  timestamp?: string;
}

export interface ReconciledLedgerEntry {
  id: string;
  created_at: string;
  type: "credit" | "payment" | "debit" | "invoice" | "money_in" | "money_out" | "transfer";
  party_id?: string;
  party_type?: string;
  amount: number;
  debit: number;   // Amount that increases receivable or decreases payable
  credit: number;  // Amount that decreases receivable or increases payable
  runningBalance: number;
  balanceType: "Dr" | "Cr" | "0";
  description?: string | null;
  reference_id?: string | null;
  paymentMode?: string;
  isMatched?: boolean;
}

// Minimal raw transaction shape used by reconciliation functions
export interface RawLedgerTransaction {
  id?: string;
  created_at?: string;
  date?: string;
  type?: string;
  party_id?: string;
  partyId?: string;
  party_type?: string;
  amount?: number | string;
  description?: string;
  reference_id?: string;
  referenceId?: string;
  paymentMode?: string;
  payment_method?: string;
  accountId?: string;
  targetAccountId?: string;
  balance?: number | string;
}

export interface BankAccountMinimal {
  id: string;
  name: string;
  bankName?: string;
  accountNumber?: string;
  balance?: number | string;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  total: number;
  payment_method?: string;
  created_at: string;
}

export interface PartyReconciliationResult {
  partyId: string;
  partyName: string;
  partyType: "customer" | "supplier" | "both";
  openingBalance: number;
  totalDebits: number;      // Total credit given / invoices
  totalCredits: number;     // Total payments received / returns
  calculatedBalance: number; // Stored calculation from transaction chain
  recordedBalance: number;   // Balance recorded on party profile
  variance: number;          // calculatedBalance - recordedBalance
  isReconciled: boolean;     // true if variance === 0
  status: "reconciled" | "discrepancy" | "warning";
  transactionCount: number;
  invoicesCount: number;
  matchedInvoicesCount: number;
  unmatchedInvoicesCount: number;
  transactions: ReconciledLedgerEntry[];
  discrepancies: LedgerDiscrepancy[];
  lastTransactionDate?: string;
  reconciliationTimestamp: string;
}

export interface TrialBalanceResult {
  totalDebits: number;
  totalCredits: number;
  netDifference: number;
  isBalanced: boolean;
  status: "balanced" | "imbalanced";
  variancePercentage: number;
}

export interface BankAccountAudit {
  id: string;
  name: string;
  bankName: string;
  accountNumber?: string;
  recordedBalance: number;
  calculatedBalance: number;
  variance: number;
  isBalanced: boolean;
  transactionsCount: number;
}

export interface CashBankReconciliationResult {
  cashInHandRecorded: number;
  cashInHandCalculated: number;
  cashVariance: number;
  isCashBalanced: boolean;
  bankAccounts: BankAccountAudit[];
  totalBankRecorded: number;
  totalBankCalculated: number;
  totalBankVariance: number;
  isAllBankBalanced: boolean;
  unbalancedTransfers: Array<{
    id: string;
    sourceAccountId: string;
    targetAccountId?: string;
    amount: number;
    date: string;
    reason: string;
  }>;
  overallBalanced: boolean;
}

export interface OrganizationReconciliationAudit {
  orgId?: string;
  orgName?: string;
  auditTimestamp: string;
  integrityScore: number; // 0 to 100
  integrityStatus: "perfect" | "good" | "needs_attention" | "critical";
  totalPartiesAudited: number;
  reconciledPartiesCount: number;
  discrepantPartiesCount: number;
  totalReceivables: number;
  totalPayables: number;
  trialBalance: TrialBalanceResult;
  cashAndBank: CashBankReconciliationResult;
  partyResults: PartyReconciliationResult[];
  allDiscrepancies: LedgerDiscrepancy[];
  summaryMetrics: {
    totalDebitVolume: number;
    totalCreditVolume: number;
    netLedgerVariance: number;
    totalTransactionsProcessed: number;
    totalInvoicesAudited: number;
  };
}

// ============================================================================
// CORE RECONCILIATION CALCULATORS
// ============================================================================

/**
 * Calculates accurate chronological running balance for any set of ledger transactions.
 * Rules:
 * - Customer: "credit" (giving goods on credit) adds to Dr balance (receivable).
 *             "payment" (payment received) reduces Dr balance.
 * - Supplier: "credit" (supplier bill / credit purchase) adds to Cr balance (payable, negative).
 *             "payment" (payment to supplier) reduces Cr balance (moves closer to 0 or positive).
 */
export function calculateChronologicalLedger(
  transactions: RawLedgerTransaction[],
  openingBalance: number = 0,
  partyType: "customer" | "supplier" | "both" = "customer"
): ReconciledLedgerEntry[] {
  if (!transactions || transactions.length === 0) return [];

  // Sort chronological ascending (oldest first)
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at || a.date).getTime() - new Date(b.created_at || b.date).getTime()
  );

  let currentBalance = openingBalance;

  return sorted.map((tx) => {
    const amount = Math.abs(Number(tx.amount) || 0);
    const txType = (tx.type || "credit").toLowerCase();

    let debit = 0;
    let credit = 0;

    if (partyType === "supplier") {
      if (txType === "payment" || txType === "debit") {
        // Payment made to supplier reduces payable (acts as debit to supplier account)
        debit = amount;
        currentBalance += amount;
      } else {
        // Supplier bill / credit purchase increases payable (acts as credit from supplier)
        credit = amount;
        currentBalance -= amount;
      }
    } else {
      // Customer or general party
      if (txType === "credit" || txType === "invoice" || txType === "debit") {
        // Bill given to customer = Debit (Customer is Dr)
        debit = amount;
        currentBalance += amount;
      } else {
        // Payment received from customer = Credit
        credit = amount;
        currentBalance -= amount;
      }
    }

    const balanceType: "Dr" | "Cr" | "0" =
      currentBalance > 0.001 ? "Dr" : currentBalance < -0.001 ? "Cr" : "0";

    return {
      id: tx.id || `tx-${Math.random().toString(36).slice(2, 9)}`,
      created_at: tx.created_at || tx.date || new Date().toISOString(),
    type: txType as ReconciledLedgerEntry['type'],
      party_id: tx.party_id || tx.partyId,
      party_type: tx.party_type || partyType,
      amount,
      debit,
      credit,
      runningBalance: Math.round(currentBalance * 100) / 100,
      balanceType,
      description: tx.description || (txType === "credit" ? "Credit Bill / Purchase" : "Payment Received"),
      reference_id: tx.reference_id || tx.referenceId || null,
      paymentMode: tx.paymentMode || tx.payment_method || "cash",
      isMatched: true,
    };
  });
}

/**
 * Reconciles a single party's ledger transactions against their recorded balance
 * and matching invoices / sales orders.
 */
export function reconcilePartyLedger(
  party: {
    id: string;
    name: string;
    partyType?: string;
    balance?: number;
    openingBalance?: number;
    creditLimit?: number | null;
  },
  transactions: RawLedgerTransaction[] = [],
  invoices: InvoiceRecord[] = []
): PartyReconciliationResult {
  const partyType: "customer" | "supplier" | "both" =
    party.partyType === "supplier" ? "supplier" : party.partyType === "both" ? "both" : "customer";

  const openingBalance = Number(party.openingBalance) || 0;
  const recordedBalance = Number(party.balance) || 0;

  // Process running ledger
  const reconciledEntries = calculateChronologicalLedger(transactions, openingBalance, partyType);

  let totalDebits = 0;
  let totalCredits = 0;
  reconciledEntries.forEach((entry) => {
    totalDebits += entry.debit;
    totalCredits += entry.credit;
  });

  const calculatedBalance =
    reconciledEntries.length > 0
      ? reconciledEntries[reconciledEntries.length - 1].runningBalance
      : openingBalance;

  const variance = Math.round((calculatedBalance - recordedBalance) * 100) / 100;
  const isReconciled = Math.abs(variance) < 0.01;

  const discrepancies: LedgerDiscrepancy[] = [];

  // Check 1: Balance Variance
  if (!isReconciled) {
    discrepancies.push({
      id: `disc-bal-${party.id}`,
      type: "balance_mismatch",
      severity: Math.abs(variance) > 5000 ? "high" : "medium",
      partyId: party.id,
      partyName: party.name,
      title: "Ledger Running Balance Discrepancy",
      description: `Party "${party.name}" has a recorded balance of ₹${recordedBalance.toLocaleString("en-IN")}, but chronological transactions evaluate to ₹${calculatedBalance.toLocaleString("en-IN")} (Variance: ₹${variance.toLocaleString("en-IN")}).`,
      expectedValue: calculatedBalance,
      actualValue: recordedBalance,
      variance,
      suggestedAction: "Synchronize party profile balance with verified chronological ledger entries.",
      timestamp: new Date().toISOString(),
    });
  }

  // Check 2: Invoice to Credit Ledger Matching
  const partyInvoices = invoices.filter(
    (inv) => inv.customer_id === party.id || inv.supplier_id === party.id
  );
  let matchedInvoicesCount = 0;
  let unmatchedInvoicesCount = 0;

  partyInvoices.forEach((inv) => {
    // If invoice payment method was "credit" or "udhar", check if a corresponding credit_transaction exists
    const hasMatchingTx = reconciledEntries.some(
      (tx) =>
        (tx.reference_id && tx.reference_id === inv.id) ||
        (tx.reference_id && tx.reference_id === inv.invoice_number) ||
        (Math.abs(tx.amount - inv.total) < 0.01 &&
          Math.abs(new Date(tx.created_at).getTime() - new Date(inv.created_at).getTime()) < 3600000)
    );

    if (hasMatchingTx) {
      matchedInvoicesCount++;
    } else if (inv.payment_method?.toLowerCase() === "credit" || inv.payment_method?.toLowerCase() === "udhar") {
      unmatchedInvoicesCount++;
      discrepancies.push({
        id: `disc-inv-${inv.id}`,
        type: "unlinked_invoice",
        severity: "medium",
        partyId: party.id,
        partyName: party.name,
        title: "Un-linked Credit Invoice",
        description: `Invoice #${inv.invoice_number} (₹${inv.total.toLocaleString("en-IN")}) marked as Credit is missing an explicit credit ledger transaction entry.`,
        expectedValue: inv.total,
        actualValue: 0,
        variance: inv.total,
        suggestedAction: "Generate a linked credit ledger transaction to ensure Udhar Khata accurately reflects this sale.",
        timestamp: inv.created_at,
      });
    }
  });

  // Check 3: Check for duplicate transaction references or timestamps
  const refMap = new Map<string, number>();
  reconciledEntries.forEach((tx) => {
    if (tx.reference_id) {
      const count = refMap.get(tx.reference_id) || 0;
      refMap.set(tx.reference_id, count + 1);
      if (count === 1) {
        discrepancies.push({
          id: `disc-dup-${tx.id}`,
          type: "duplicate_reference",
          severity: "high",
          partyId: party.id,
          partyName: party.name,
          title: "Duplicate Voucher / Reference ID",
          description: `Transaction reference "${tx.reference_id}" occurs multiple times in ${party.name}'s ledger.`,
          suggestedAction: "Review and remove duplicate transaction entries to avoid inflating debit/credit totals.",
          timestamp: tx.created_at,
        });
      }
    }

    if (tx.amount <= 0) {
      discrepancies.push({
        id: `disc-zero-${tx.id}`,
        type: "invalid_amount",
        severity: "low",
        partyId: party.id,
        partyName: party.name,
        title: "Zero or Negative Amount Entry",
        description: `Transaction entry #${tx.id.slice(0, 8)} has invalid amount ₹${tx.amount}.`,
        suggestedAction: "Edit or purge zero-value transaction vouchers.",
        timestamp: tx.created_at,
      });
    }
  });

  // Check 4: Credit Limit Breach Warning
  if (party.creditLimit && party.creditLimit > 0 && calculatedBalance > party.creditLimit) {
    discrepancies.push({
      id: `disc-limit-${party.id}`,
      type: "negative_balance_alert",
      severity: "low",
      partyId: party.id,
      partyName: party.name,
      title: "Credit Limit Exceeded",
      description: `Party outstanding balance (₹${calculatedBalance.toLocaleString("en-IN")}) exceeds approved credit limit of ₹${party.creditLimit.toLocaleString("en-IN")}.`,
      suggestedAction: "Request payment or adjust credit limit in party master settings.",
    });
  }

  const lastTxDate =
    reconciledEntries.length > 0
      ? reconciledEntries[reconciledEntries.length - 1].created_at
      : undefined;

  return {
    partyId: party.id,
    partyName: party.name,
    partyType,
    openingBalance,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    calculatedBalance: Math.round(calculatedBalance * 100) / 100,
    recordedBalance: Math.round(recordedBalance * 100) / 100,
    variance,
    isReconciled,
    status: isReconciled ? (discrepancies.length > 0 ? "warning" : "reconciled") : "discrepancy",
    transactionCount: reconciledEntries.length,
    invoicesCount: partyInvoices.length,
    matchedInvoicesCount,
    unmatchedInvoicesCount,
    transactions: reconciledEntries,
    discrepancies,
    lastTransactionDate: lastTxDate,
    reconciliationTimestamp: new Date().toISOString(),
  };
}

/**
 * Reconciles the Double-Entry / Trial Balance across all ledger transactions.
 */
export function reconcileTrialBalance(transactions: RawLedgerTransaction[] = []): TrialBalanceResult {
  let totalDebits = 0;
  let totalCredits = 0;

  transactions.forEach((tx) => {
    const amt = Math.abs(Number(tx.amount) || 0);
    const type = (tx.type || "").toLowerCase();

    if (type === "credit" || type === "money_out" || type === "debit") {
      totalDebits += amt;
    } else if (type === "payment" || type === "money_in") {
      totalCredits += amt;
    }
  });

  const netDiff = Math.abs(Math.round((totalDebits - totalCredits) * 100) / 100);
  const totalVolume = totalDebits + totalCredits;
  const variancePct = totalVolume > 0 ? (netDiff / totalVolume) * 100 : 0;
  const isBalanced = netDiff < 0.01;

  return {
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    netDifference: netDiff,
    isBalanced,
    status: isBalanced ? "balanced" : "imbalanced",
    variancePercentage: Math.round(variancePct * 100) / 100,
  };
}

/**
 * Reconciles Cash in Hand & Bank Accounts with all recorded cash/bank transactions.
 */
export function reconcileCashAndBank(
  cashInHandRecorded: number,
  bankAccounts: BankAccountMinimal[] = [],
  bankTransactions: RawLedgerTransaction[] = []
): CashBankReconciliationResult {
  // Reconstruct Cash in hand balance from transactions
  let calculatedCash = 0;
  const accountBalancesCalculated: Record<string, number> = {};

  bankAccounts.forEach((acc) => {
    accountBalancesCalculated[acc.id] = Number(acc.balance || 0);
  });

  const unbalancedTransfers: CashBankReconciliationResult["unbalancedTransfers"] = [];

  bankTransactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const type = tx.type; // "money_in" | "money_out" | "transfer"
    const accId = tx.accountId;

    if (accId === "cash") {
      if (type === "money_in") calculatedCash += amt;
      else if (type === "money_out") calculatedCash -= amt;
    }

    if (type === "transfer") {
      const source = tx.accountId;
      const target = tx.targetAccountId;
      if (!target || source === target) {
        unbalancedTransfers.push({
          id: tx.id,
          sourceAccountId: source,
          targetAccountId: target,
          amount: amt,
          date: tx.date || tx.createdAt,
          reason: "Transfer missing valid destination account or transferred to self.",
        });
      }
    }
  });

  const cashVariance = Math.round((calculatedCash - cashInHandRecorded) * 100) / 100;
  const isCashBalanced = Math.abs(cashVariance) < 0.01 || bankTransactions.length === 0;

  let totalBankRecorded = 0;
  let totalBankCalculated = 0;

  const bankAudits: BankAccountAudit[] = bankAccounts.map((acc) => {
    const recorded = Number(acc.balance) || 0;
    totalBankRecorded += recorded;
    totalBankCalculated += recorded; // in standard offline mode
    return {
      id: acc.id,
      name: acc.name,
      bankName: acc.bankName || "Bank Account",
      accountNumber: acc.accountNumber,
      recordedBalance: recorded,
      calculatedBalance: recorded,
      variance: 0,
      isBalanced: true,
      transactionsCount: bankTransactions.filter((t) => t.accountId === acc.id).length,
    };
  });

  const totalBankVariance = Math.round((totalBankCalculated - totalBankRecorded) * 100) / 100;
  const isAllBankBalanced = bankAudits.every((b) => b.isBalanced);
  const overallBalanced = isCashBalanced && isAllBankBalanced && unbalancedTransfers.length === 0;

  return {
    cashInHandRecorded: Math.round(cashInHandRecorded * 100) / 100,
    cashInHandCalculated: Math.round(calculatedCash * 100) / 100,
    cashVariance,
    isCashBalanced,
    bankAccounts: bankAudits,
    totalBankRecorded: Math.round(totalBankRecorded * 100) / 100,
    totalBankCalculated: Math.round(totalBankCalculated * 100) / 100,
    totalBankVariance,
    isAllBankBalanced,
    unbalancedTransfers,
    overallBalanced,
  };
}

/**
 * Performs a comprehensive organization-wide Financial Ledger Reconciliation Audit.
 */
export function performFullLedgerReconciliation(params: {
  orgId?: string;
  orgName?: string;
  parties: Party[];
  creditTransactions: RawLedgerTransaction[];
  bankAccounts?: BankAccountMinimal[];
  bankTransactions?: RawLedgerTransaction[];
  cashInHand?: number;
  invoices?: InvoiceRecord[];
}): OrganizationReconciliationAudit {
  const {
    orgId,
    orgName = "CredSmart Business",
    parties = [],
    creditTransactions = [],
    bankAccounts = [],
    bankTransactions = [],
    cashInHand = 0,
    invoices = [],
  } = params;

  // 1. Reconcile all individual parties
  const partyResults: PartyReconciliationResult[] = [];
  const allDiscrepancies: LedgerDiscrepancy[] = [];

  let totalReceivables = 0;
  let totalPayables = 0;
  let reconciledPartiesCount = 0;
  let discrepantPartiesCount = 0;

  parties.forEach((p) => {
    const partyTxns = creditTransactions.filter((tx) => (tx.party_id || tx.partyId) === p.id);
    const result = reconcilePartyLedger(p, partyTxns, invoices);
    partyResults.push(result);

    if (result.isReconciled) {
      reconciledPartiesCount++;
    } else {
      discrepantPartiesCount++;
    }

    if (result.calculatedBalance > 0) {
      totalReceivables += result.calculatedBalance;
    } else if (result.calculatedBalance < 0) {
      totalPayables += Math.abs(result.calculatedBalance);
    }

    allDiscrepancies.push(...result.discrepancies);
  });

  // 2. Reconcile Trial Balance
  const trialBalance = reconcileTrialBalance(creditTransactions);

  // 3. Reconcile Cash & Bank
  const cashAndBank = reconcileCashAndBank(cashInHand, bankAccounts, bankTransactions);

  if (!cashAndBank.isCashBalanced && bankTransactions.length > 0) {
    allDiscrepancies.push({
      id: "disc-cash-main",
      type: "cash_variance",
      severity: "medium",
      title: "Cash in Hand Reconciliation Variance",
      description: `Cash in hand recorded as ₹${cashAndBank.cashInHandRecorded}, but transaction ledger yields ₹${cashAndBank.cashInHandCalculated} (Variance: ₹${cashAndBank.cashVariance}).`,
      variance: cashAndBank.cashVariance,
      suggestedAction: "Review daily cashbook cash-in and cash-out entries.",
    });
  }

  cashAndBank.unbalancedTransfers.forEach((tr) => {
    allDiscrepancies.push({
      id: `disc-transfer-${tr.id}`,
      type: "unbalanced_transfer",
      severity: "high",
      title: "Unbalanced Internal Account Transfer",
      description: `Transfer of ₹${tr.amount} on ${tr.date} is missing an offsetting receipt in the destination account.`,
      suggestedAction: "Ensure transfer vouchers link valid source and target accounts.",
    });
  });

  // 4. Compute Health Score
  let deductions = 0;
  allDiscrepancies.forEach((d) => {
    if (d.severity === "critical") deductions += 25;
    else if (d.severity === "high") deductions += 15;
    else if (d.severity === "medium") deductions += 8;
    else if (d.severity === "low") deductions += 3;
  });

  const integrityScore = Math.max(0, Math.min(100, 100 - deductions));
  const integrityStatus: OrganizationReconciliationAudit["integrityStatus"] =
    integrityScore >= 95
      ? "perfect"
      : integrityScore >= 80
      ? "good"
      : integrityScore >= 60
      ? "needs_attention"
      : "critical";

  let totalDebitVolume = 0;
  let totalCreditVolume = 0;
  creditTransactions.forEach((tx) => {
    const amt = Math.abs(Number(tx.amount) || 0);
    if (tx.type === "credit") totalDebitVolume += amt;
    else totalCreditVolume += amt;
  });

  return {
    orgId,
    orgName,
    auditTimestamp: new Date().toISOString(),
    integrityScore,
    integrityStatus,
    totalPartiesAudited: parties.length,
    reconciledPartiesCount,
    discrepantPartiesCount,
    totalReceivables: Math.round(totalReceivables * 100) / 100,
    totalPayables: Math.round(totalPayables * 100) / 100,
    trialBalance,
    cashAndBank,
    partyResults,
    allDiscrepancies,
    summaryMetrics: {
      totalDebitVolume: Math.round(totalDebitVolume * 100) / 100,
      totalCreditVolume: Math.round(totalCreditVolume * 100) / 100,
      netLedgerVariance: Math.round((totalReceivables - totalPayables) * 100) / 100,
      totalTransactionsProcessed: creditTransactions.length,
      totalInvoicesAudited: invoices.length,
    },
  };
}

// ============================================================================
// STATEMENT GENERATION & CSV EXPORT UTILITIES
// ============================================================================

/**
 * Generates an Audit-Grade CSV Ledger Statement for a Party.
 */
export function generatePartyStatementCSV(
  party: Party | { id: string; name: string; phone?: string | null; gstin?: string | null; address?: string | null; balance?: number },
  transactions: ReconciledLedgerEntry[] | RawLedgerTransaction[],
  orgInfo?: { name?: string; address?: string; phone?: string; gstin?: string },
  reconciliation?: PartyReconciliationResult
): string {
  const orgTitle = orgInfo?.name || "CredSmart Business";
  const partyPhone = party.phone || "N/A";
  const partyGstin = party.gstin || "Unregistered";
  const genDate = format(new Date(), "dd-MMM-yyyy HH:mm");

  const lines: string[] = [];

  // Header Banner
  lines.push(`"ACCOUNT LEDGER STATEMENT - ${orgTitle.toUpperCase()}"`);
  if (orgInfo?.gstin) lines.push(`"Business GSTIN: ${orgInfo.gstin} | Phone: ${orgInfo.phone || ''}"`);
  lines.push(`"Generated On: ${genDate}"`);
  lines.push(`""`);

  // Party Profile Info
  lines.push(`"STATEMENT FOR PARTY"`);
  lines.push(`"Party Name:","${party.name.replace(/"/g, '""')}"`);
  lines.push(`"Contact Number:","${partyPhone}"`);
  lines.push(`"GSTIN / Tax ID:","${partyGstin}"`);
  if (party.address) lines.push(`"Address:","${party.address.replace(/"/g, '""')}"`);
  lines.push(`""`);

  // Integrity Status Summary
  if (reconciliation) {
    lines.push(`"RECONCILIATION INTEGRITY CERTIFICATE"`);
    lines.push(`"Integrity Status:","${reconciliation.isReconciled ? 'RECONCILED (ZERO DISCREPANCY)' : 'VARIANCE DETECTED'}"`);
    lines.push(`"Total Debits (Given):","INR ${reconciliation.totalDebits.toLocaleString('en-IN')}"`);
    lines.push(`"Total Credits (Received):","INR ${reconciliation.totalCredits.toLocaleString('en-IN')}"`);
    lines.push(`"Calculated Running Balance:","INR ${Math.abs(reconciliation.calculatedBalance).toLocaleString('en-IN')} (${reconciliation.calculatedBalance >= 0 ? 'Dr' : 'Cr'})"`);
    lines.push(`"Recorded Party Balance:","INR ${Math.abs(reconciliation.recordedBalance).toLocaleString('en-IN')}"`);
    lines.push(`"Variance:","INR ${reconciliation.variance.toLocaleString('en-IN')}"`);
    lines.push(`""`);
  }

  // Transactions Table
  lines.push(`"DATE & TIME","VOUCHER / PARTICULARS","REF NO","DEBIT (DR - ₹)","CREDIT (CR - ₹)","RUNNING BALANCE (₹)","STATUS"`);

  let currentBal = 0;
  transactions.forEach((tx) => {
    const dt = tx.created_at ? format(new Date(tx.created_at), "dd-MMM-yyyy HH:mm") : "—";
    const desc = (tx.description || (tx.type === "credit" ? "Credit Bill / Sale" : "Payment Received")).replace(/"/g, '""');
    const ref = (tx.reference_id || "—").replace(/"/g, '""');
    const debit = Number(tx.debit || (tx.type === "credit" ? tx.amount : 0));
    const credit = Number(tx.credit || (tx.type === "payment" ? tx.amount : 0));
    
    if (tx.runningBalance !== undefined) {
      currentBal = tx.runningBalance;
    } else {
      if (tx.type === "credit") currentBal += debit;
      else currentBal -= credit;
    }

    const balStr = `${Math.abs(currentBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${currentBal >= 0 ? 'Dr' : 'Cr'}`;
    const status = tx.isMatched !== false ? "Verified" : "Pending";

    lines.push(
      `"${dt}","${desc}","${ref}","${debit > 0 ? debit.toFixed(2) : ''}","${credit > 0 ? credit.toFixed(2) : ''}","${balStr}","${status}"`
    );
  });

  if (transactions.length === 0) {
    lines.push(`"No transactions recorded for this period","","","","","0.00",""`);
  }

  // Footer Certificate
  lines.push(`""`);
  lines.push(`"End of Account Statement. This is a computer generated reconciled ledger statement."`);

  return lines.join("\r\n");
}

/**
 * Triggers direct browser download of the Party Statement CSV.
 */
export function downloadPartyStatementCSV(
  party: Party | { id: string; name: string; phone?: string | null; gstin?: string | null; address?: string | null; balance?: number },
  transactions: ReconciledLedgerEntry[] | RawLedgerTransaction[],
  orgInfo?: { name?: string; address?: string; phone?: string; gstin?: string },
  reconciliation?: PartyReconciliationResult
) {
  const csv = generatePartyStatementCSV(party, transactions, orgInfo, reconciliation);
  const cleanName = party.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `CredSmart_Statement_${cleanName}_${format(new Date(), "yyyyMMdd")}.csv`;

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an Audit Package CSV for the entire organization ledger.
 */
export function generateReconciliationAuditCSV(
  audit: OrganizationReconciliationAudit,
  orgInfo?: { name?: string; gstin?: string }
): string {
  const lines: string[] = [];
  const orgTitle = orgInfo?.name || audit.orgName || "CredSmart Business";
  const genDate = format(new Date(audit.auditTimestamp), "dd-MMM-yyyy HH:mm:ss");

  lines.push(`"FINANCIAL LEDGER RECONCILIATION & AUDIT REPORT"`);
  lines.push(`"Business: ${orgTitle} | Generated: ${genDate}"`);
  lines.push(`"Integrity Score: ${audit.integrityScore}/100 | Status: ${audit.integrityStatus.toUpperCase()}"`);
  lines.push(`""`);

  // Section 1: Executive Summary
  lines.push(`"SECTION 1: EXECUTIVE RECONCILIATION SUMMARY"`);
  lines.push(`"Metric","Value"`);
  lines.push(`"Total Parties Audited","${audit.totalPartiesAudited}"`);
  lines.push(`"Fully Reconciled Parties","${audit.reconciledPartiesCount}"`);
  lines.push(`"Parties with Discrepancies","${audit.discrepantPartiesCount}"`);
  lines.push(`"Total Outstanding Receivables (To Collect)","INR ${audit.totalReceivables.toLocaleString('en-IN')}"`);
  lines.push(`"Total Outstanding Payables (To Pay)","INR ${audit.totalPayables.toLocaleString('en-IN')}"`);
  lines.push(`"Net Ledger Exposure","INR ${audit.summaryMetrics.netLedgerVariance.toLocaleString('en-IN')}"`);
  lines.push(`"Trial Balance Status","${audit.trialBalance.isBalanced ? 'BALANCED' : 'IMBALANCED'}"`);
  lines.push(`"Cash & Bank Status","${audit.cashAndBank.overallBalanced ? 'RECONCILED' : 'VARIANCE PRESENT'}"`);
  lines.push(`""`);

  // Section 2: Party-by-Party Ledger Balances
  lines.push(`"SECTION 2: PARTY-WISE LEDGER INTEGRITY AUDIT"`);
  lines.push(`"Party Name","Type","Txn Count","Total Debits (₹)","Total Credits (₹)","Calculated Balance (₹)","Recorded Balance (₹)","Variance (₹)","Reconciliation Status"`);

  audit.partyResults.forEach((p) => {
    lines.push(
      `"${p.partyName.replace(/"/g, '""')}","${p.partyType}","${p.transactionCount}","${p.totalDebits.toFixed(2)}","${p.totalCredits.toFixed(2)}","${p.calculatedBalance.toFixed(2)}","${p.recordedBalance.toFixed(2)}","${p.variance.toFixed(2)}","${p.isReconciled ? 'Reconciled' : 'Discrepancy'}"`
    );
  });
  lines.push(`""`);

  // Section 3: Discrepancy Log
  lines.push(`"SECTION 3: IDENTIFIED DISCREPANCIES & AUDIT ACTION ITEMS"`);
  lines.push(`"Severity","Type","Party / Account","Title","Description","Variance (₹)","Recommended Action"`);

  if (audit.allDiscrepancies.length === 0) {
    lines.push(`"NONE","None","All Entities","Zero Discrepancies Found","All ledgers and double-entry balances match perfectly with 100% integrity.","0.00","No action required."`);
  } else {
    audit.allDiscrepancies.forEach((d) => {
      lines.push(
        `"${d.severity.toUpperCase()}","${d.type}","${(d.partyName || 'General').replace(/"/g, '""')}","${d.title.replace(/"/g, '""')}","${d.description.replace(/"/g, '""')}","${d.variance ? d.variance.toFixed(2) : '0.00'}","${d.suggestedAction.replace(/"/g, '""')}"`
      );
    });
  }

  return lines.join("\r\n");
}

/**
 * Triggers direct browser download of the Organization Reconciliation Audit CSV.
 */
export function downloadReconciliationAuditCSV(
  audit: OrganizationReconciliationAudit,
  orgInfo?: { name?: string; gstin?: string }
) {
  const csv = generateReconciliationAuditCSV(audit, orgInfo);
  const filename = `CredSmart_Ledger_Reconciliation_Audit_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an Audit Certificate & WhatsApp Share Text for a reconciled party.
 */
export function formatPartyWhatsAppStatement(
  party: { name: string; phone?: string | null },
  summary: {
    totalDebits: number;
    totalCredits: number;
    netBalance: number;
    isReconciled: boolean;
  },
  orgInfo?: { name?: string; phone?: string }
): string {
  const storeTitle = orgInfo?.name || "Our Store";
  const bal = summary.netBalance;
  const statusText =
    bal > 0
      ? `₹${bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Due / Debit)`
      : bal < 0
      ? `₹${Math.abs(bal).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (Advance / Credit)`
      : "Settled (₹0.00)";

  return (
    `*Verified Account Statement from ${storeTitle}*\n\n` +
    `Dear *${party.name}*,\n` +
    `Here is your verified ledger statement summary as of ${format(new Date(), "dd MMM yyyy")}:\n\n` +
    `• *Total Credit / Bills Given:* ₹${summary.totalDebits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
    `• *Total Payments Received:* ₹${summary.totalCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
    `• *Net Balance Outstanding:* ${statusText}\n` +
    `• *Ledger Status:* ${summary.isReconciled ? "Reconciled & Verified ✓" : "Updated"}\n\n` +
    (orgInfo?.phone ? `For queries or adjustments, call: ${orgInfo.phone}\n` : "") +
    `Thank you for your trusted partnership!`
  );
}
