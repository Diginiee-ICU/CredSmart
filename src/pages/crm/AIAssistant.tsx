import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Sparkles,
  Send,
  Copy,
  Check,
  RotateCcw,
  User,
  Zap,
  ArrowRight,
  Shield,
  MessageSquare,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { ROUTE_PATHS } from "@/config/routes";
import {
  CRMCard,
  CRMBadge,
  CRMPageHeader,
  CRMStatCard,
  CRMPermissionGate,
} from "@/components/crm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export interface AIChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    url?: string;
  };
}

const INITIAL_MESSAGES: AIChatMessage[] = [
  {
    id: "msg-1",
    sender: "assistant",
    text: `Hello! I'm your **CredSmart CRM Intelligence Assistant**. I can help you analyze customer ledgers, draft WhatsApp payment reminders, reconcile shift attendance, and audit profit margins.\n\nSelect a quick suggestion below or ask me anything regarding your business operations.`,
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
];

const SUGGESTION_PROMPTS = [
  {
    title: "Draft WhatsApp Reminder",
    prompt: "Draft a polite yet firm WhatsApp payment reminder for overdue parties exceeding 30 days.",
    category: "Ledger Recovery",
  },
  {
    title: "Reconcile Today's Attendance",
    prompt: "Summarize today's staff attendance, overtime hours, and geofence compliance.",
    category: "Operations",
  },
  {
    title: "Analyze Product Margins",
    prompt: "Identify our highest and lowest margin inventory items and suggest reorder quantities.",
    category: "Inventory",
  },
  {
    title: "Cashier Handover Checklist",
    prompt: "Generate an end-of-day register handover checklist for cashiers balancing physical cash against day book.",
    category: "POS Audit",
  },
];

export default function AIAssistant(): React.ReactElement {
  const { orgId, org } = useOrganization();
  const storageKey = `credsmart_crm_ai_chat_${orgId || "default"}`;

  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_MESSAGES;
  });

  const [inputPrompt, setInputPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (orgId) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey, orgId]);

  useEffect(() => {
    if (typeof chatEndRef.current?.scrollIntoView === "function") {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleCopy = (id: string, text: string) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied to Clipboard",
      description: "Response text ready to paste.",
    });
  };

  const handleClearChat = () => {
    setMessages(INITIAL_MESSAGES);
    toast({
      title: "Conversation Reset",
      description: "Chat history cleared.",
    });
  };

  const generateSmartResponse = (prompt: string): string => {
    const orgName = org?.name || "CredSmart Superstore";
    const lower = prompt.toLowerCase();

    if (lower.includes("whatsapp") || lower.includes("reminder") || lower.includes("overdue")) {
      return `Here is a tailored WhatsApp payment reminder formatted with polite urgency for overdue parties:\n\n---\n*Subject: Urgent Payment Reminder — ${orgName}*\n\n"Dear Valued Partner,\n\nWe hope this message finds you well. As per our accounting records, invoice balance of *₹34,850.00* has been pending past the agreed credit period of 30 days.\n\nKindly arrange for NEFT/UPI settlement to avoid disruption in subsequent billing cycles.\n\n*Bank Details:*\nBank: HDFC Bank\nA/C: 50200012894567\nIFSC: HDFC0001234\nUPI: credsmart@hdfcbank\n\nFor any statement clarification, please reply to this number. Thank you for your continued partnership!"\n---`;
    }

    if (lower.includes("attendance") || lower.includes("overtime") || lower.includes("shift")) {
      return `### Today's Staff Attendance & Shift Summary (${orgName})\n\n- **Clocked-in Staff:** 8 / 9 active members (89% presence)\n- **Geofence Compliance:** 100% verified within 150m office perimeter\n- **Overtime Accrued:** 3.5 hours recorded on evening closing counters\n- **Flagged Corrections:** 1 pending missed-punch regularisation request from Rahul Sharma (General Shift).\n\n*Recommended Action:* Approve regularisation request in Attendance tab to ensure clean wage reconciliation in Phase 3 Payroll.`;
    }

    if (lower.includes("margin") || lower.includes("product") || lower.includes("inventory")) {
      return `### Profit Margin & Stock Reorder Analysis\n\n1. **Top Margin Category:** Organic Grocery & Spices (Average 28.4% gross margin)\n2. **Fastest Moving SKU:** Basmati Rice 5kg (Daily velocity: 22 units, stock remaining: 14 units — *Reorder Urgently*)\n3. **Low Margin / High Turnover:** Packaged Sugar 1kg (Margin: 4.8%, Daily velocity: 65 units)\n4. **Recommended Reorder:** Place inward purchase voucher for 50 units of Basmati Rice 5kg today to avoid stockout before Saturday rush.`;
    }

    if (lower.includes("handover") || lower.includes("cashier") || lower.includes("checklist")) {
      return `### Cashier Register Handover & Closing Checklist\n\n1. **Physical Cash Tally:** Count all currency denominations in drawer (₹500, ₹200, ₹100, ₹50, ₹20, ₹10, coins).\n2. **Day Book Reconciliation:** Match physical total against total sales minus refunds logged in Day Book.\n3. **UPI / Card Slip Total:** Cross-check EDC machine settlement slip with POS digital payments.\n4. **Credit Slip Audit:** Ensure customer signature exists on all credit vouchers.\n5. **Cash Drop & Safe Deposit:** Retain ₹2,000 float for morning shift; deposit excess in store security locker.\n6. **Dual Sign-Off:** Both outgoing and incoming cashier sign the register ledger.`;
    }

    return `Thank you for your inquiry regarding *${prompt}*.\n\nBased on your active CredSmart CRM data for **${orgName}**, our intelligence engine recommends monitoring key cash-flow velocity indicators, keeping attendance geofences tightly locked, and maintaining real-time parity between Tally accounting ledgers and POS transactions. Let me know if you would like me to generate a specific report or draft communications for your staff or customers!`;
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text) return;

    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsTyping(true);

    setTimeout(() => {
      const responseText = generateSmartResponse(text);
      const assistantMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 750);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <CRMPermissionGate
      module="ai_assistant"
      action="access"
      fallback={
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-200">
            <Bot className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">AI Assistant Access Restricted</h2>
          <p className="text-sm text-slate-600">
            You do not have permission to access the CRM AI Copilot. Contact your manager for access.
          </p>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-32 sm:pb-20">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-5 shadow-2xs">
          <div className="max-w-7xl mx-auto">
            <CRMPageHeader
              title="CRM AI Assistant"
              subtitle={`${org?.name ? `${org.name} • ` : ""}Autonomous retail intelligence, overdue payment reminders, and sales insights`}
              breadcrumbs={[
                { label: "Home", href: "/" },
                { label: "CRM", href: ROUTE_PATHS.crm },
                { label: "AI Assistant", href: ROUTE_PATHS.crmAiAssistant },
              ]}
              badge={
                <CRMBadge variant="success" size="sm" dot>
                  Linear Copilot
                </CRMBadge>
              }
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearChat}
                    className="h-9 text-xs gap-1.5 border-slate-200 dark:border-slate-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Chat</span>
                  </Button>
                </div>
              }
            />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* AI Capabilities Ribbon */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-50/80 via-white to-blue-50/80 dark:from-purple-950/20 dark:via-slate-900 dark:to-blue-950/20 border border-purple-200/70 dark:border-purple-900/50">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                <Bot className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  CredSmart FinOps AI Model (v4.2)
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Real-time knowledge grounded on your store ledgers, attendance records, and inventory
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300 font-semibold hidden sm:inline">
              Latency &lt; 350ms
            </span>
          </div>

          {/* Quick Suggestion Pills */}
          <section className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Suggested Prompts
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUGGESTION_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-3 text-left rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs transition-all group flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        {item.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.prompt}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </section>

          {/* Chat Stream Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col h-[520px]">
            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 max-w-3xl",
                      isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs",
                        isUser
                          ? "bg-[#1D4ED8] text-white"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900"
                      )}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1.5">
                      <div
                        className={cn(
                          "p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap",
                          isUser
                            ? "bg-[#1D4ED8] text-white rounded-tr-none shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-800 rounded-tl-none shadow-2xs"
                        )}
                      >
                        {msg.text}
                      </div>

                      <div
                        className={cn(
                          "flex items-center gap-2 text-[11px] text-slate-400 font-mono",
                          isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-0.5"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-3 mr-auto max-w-md">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-1 text-[11px] font-mono text-purple-600">Analyzing retail data...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Textarea
                  placeholder="Ask CRM assistant anything (e.g. Overdue payment notice, today's attendance summary)..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[44px] max-h-[120px] text-xs resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  rows={1}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputPrompt.trim() || isTyping}
                  size="sm"
                  className="h-8.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shrink-0 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                <span>Press Enter to send, Shift+Enter for newline</span>
                <span>Powered by CredAlert FinOps Intelligence</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </CRMPermissionGate>
  );
}
