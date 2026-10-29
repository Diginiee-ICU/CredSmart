import { actions, fmtTime, money, monthKey, PALETTE, payrollRow, teamStatus, today, type Employee, type State, type Task } from "./store";
export type VoiceIntent =
  | { kind: "assign"; name: string; text: string; private: boolean }
  | { kind: "status" | "attendance" | "payroll"; name: string }
  | { kind: "advance"; name: string; amount: number }
  | { kind: "note"; text: string }
  | { kind: "broadcast"; text: string }
  | { kind: "open"; target: "command" | "attendance" | "tasks" | "payroll" | "staff" | "profile" | "add" }
  | { kind: "addEmployee"; name: string };
export type NavTab = "command" | "attendance" | "tasks" | "payroll" | "staff" | "profile";
export type VoiceResult = { reply: string; details: string[]; tasks?: Task[]; navigate?: { tab: NavTab; employeeId?: string; openAdd?: boolean }; add?: Extract<VoiceIntent, { kind: "assign" }> };
const clean = (s: string) => s.trim().replace(/[?.!]+$/, "").replace(/’/g, "'");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DEV: Record<string, string> = { "क": "k", "ख": "k", "ग": "g", "घ": "g", "च": "c", "छ": "c", "ज": "j", "झ": "j", "ट": "t", "ठ": "t", "ड": "d", "ढ": "d", "ण": "n", "त": "t", "थ": "t", "द": "d", "ध": "d", "न": "n", "प": "p", "फ": "f", "ब": "b", "भ": "b", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "s", "ष": "s", "स": "s", "ह": "h", "ञ": "n", "ङ": "n", "ं": "n", "ँ": "n", "ज़": "z", "फ़": "f", "ड़": "r", "ढ़": "r" };
/** Loose consonant skeleton so "राहुल" matches "Rahul" and "लक्ष्मी" matches "Laxmi". */
export function nameKey(name: string) {
  let s = name.toLowerCase().normalize("NFC").replace(/क्ष/g, "x");
  s = Array.from(s).map((c) => DEV[c] ?? c).join("");
  return s.replace(/ksh|x/g, "x").replace(/ph/g, "f").replace(/w/g, "v").replace(/[^a-z]/g, "").replace(/[aeiouh]/g, "").replace(/(.)\1+/g, "$1");
}
export function resolveEmployee(name: string, employees: Employee[]) {
  const normalized = clean(name).toLowerCase().replace(/'s$/, "").replace(/\s+(?:जी|ji)$/, "");
  const exact = employees.filter((e) => e.name.toLowerCase() === normalized);
  let matches = exact.length ? exact : employees.filter((e) => e.name.split(/\s+/)[0]?.toLowerCase() === normalized);
  if (!matches.length && nameKey(normalized)) { const k = nameKey(normalized); matches = employees.filter((e) => nameKey(e.name) === k); if (!matches.length) matches = employees.filter((e) => nameKey(e.name.split(/\s+/)[0] ?? "") === k); }
  if (matches.length > 1) throw new Error("More than one employee matches. Use their full name.");
  return matches[0];
}
function splitAssignment(rest: string, employees: Employee[]) {
  const candidates = employees.flatMap((e) => [e.name, e.name.split(/\s+/)[0] ?? e.name]).sort((a, b) => b.length - a.length);
  for (const name of candidates) {
    const match = rest.match(new RegExp(`^(${escape(name)})(?:\\s+|$)(.*)$`, "i"));
    if (match) return { name: match[1] ?? "", text: (match[2] ?? "").replace(/^(?:to\s+|(?:he|she|they)\s+(?:needs?\s+to\s+|should\s+))/i, "").trim() };
  }
  const match = rest.match(/^(.+?)\s+(?:to\s+|(?:he|she|they)\s+(?:needs?\s+to\s+|should\s+))(.+)$/i) ?? rest.match(/^(\S+)\s+(.+)$/);
  return { name: match?.[1] ?? "", text: match?.[2] ?? "" };
}
export function parseVoiceCommand(raw: string, employees: Employee[]): VoiceIntent {
  const text = clean(raw).replace(/\s+/g, " ").replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d))).replace(/[।]+$/, "");
  const nav = parseNavigation(text);
  if (nav) return nav;
  const hindi = parseHindi(text);
  if (hindi) return hindi;
  const note = text.match(/^(?:make (?:a )?note|take (?:a )?note)\s+(.+)$/i);
  if (note?.[1]) return { kind: "note", text: note[1] };
  const broadcast = text.match(/^broadcast\s+(.+)$/i);
  if (broadcast?.[1]) return { kind: "broadcast", text: broadcast[1] };
  const assign = text.match(/^(?:assign\s+(?:a\s+)?(?:private\s+)?task\s+to|tell)\s+(.+)$/i);
  if (assign?.[1]) {
    const parts = splitAssignment(assign[1], employees);
    if (!parts.name || !parts.text) throw new Error("Include an employee name and task details.");
    return { kind: "assign", ...parts, private: /\bprivate\b/i.test(text) };
  }
  const advance = text.match(/^add\s+(?:₹\s*|rs\.?\s*|rupees\s*)?([\d,]+(?:\.\d+)?)\s*(?:rupees\s+)?(?:advance|udhar)\s+to\s+(.+)$/i);
  if (advance?.[1] && advance[2]) {
    const amount = Number(advance[1].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Use an advance amount greater than zero.");
    return { kind: "advance", name: advance[2], amount };
  }
  const patterns: { kind: "status" | "attendance" | "payroll"; expression: RegExp }[] = [
    { kind: "status", expression: /^(?:what'?s|what is) the update on the task I assigned to (.+)$/i },
    { kind: "status", expression: /^(?:what'?s|what is) the update on (.+?)(?:'s)? task$/i },
    { kind: "status", expression: /^task status of (.+)$/i },
    { kind: "status", expression: /^what is (.+) working on$/i },
    { kind: "attendance", expression: /^(?:open (?:the )?attendance report of|show attendance of|open attendance report of) (.+)$/i },
    { kind: "attendance", expression: /^is (.+) present today$/i },
    { kind: "payroll", expression: /^open payroll of (.+)$/i },
    { kind: "payroll", expression: /^how much salary is due for (.+)$/i },
  ];
  for (const p of patterns) { const m = text.match(p.expression); if (m?.[1]) return { kind: p.kind, name: m[1] }; }
  throw new Error("I couldn't match that command. Try one of the sample commands.");
}
function parseHindi(text: string): VoiceIntent | null {
  const note = text.match(/^(?:नोट\s*(?:बनाओ|करो|लिखो|बनाइए|कर लो)?|नोट कर|लिख लो)\s*[:-]?\s+(.+)$/);
  if (note?.[1]) return { kind: "note", text: note[1] };
  const broadcast = text.match(/^(?:ब्रॉडकास्ट|ब्रोडकास्ट|घोषणा(?:\s*करो)?|सबको बताओ(?:\s*कि)?)\s*[:-]?\s+(.+)$/);
  if (broadcast?.[1]) return { kind: "broadcast", text: broadcast[1] };
  const priv = /प्राइवेट|निजी/.test(text);
  const strip = (t: string) => t.replace(/^(?:कि|की)\s+/, "").replace(/\s*(?:का|की)\s+(?:काम|टास्क)\s*(?:दो|दें|दीजिए|सौंपो)$/, "").trim();
  const assign = text.match(/^(.+?)\s+को\s+(?:एक\s+)?(?:प्राइवेट\s+|निजी\s+)?(?:टास्क|काम|कार्य)\s+(?:दो|दें|असाइन करो|सौंपो)\s*[:-]?\s*(.+)$/)
    ?? text.match(/^(.+?)\s+को\s+(?:बोलो|कहो|बताओ)\s+(.+)$/)
    ?? text.match(/^(.+?)\s+को\s+(?:प्राइवेट\s+|निजी\s+)?(.+?)\s+(?:का|की)\s+(?:काम|टास्क)\s+(?:दो|दें|दीजिए|सौंपो)$/);
  if (assign?.[1] && assign[2]) { const t = strip(assign[2]); if (!t) throw new Error("कर्मचारी का नाम और कार्य बताइए।"); return { kind: "assign", name: assign[1], text: t, private: priv }; }
  const advance = text.match(/^(.+?)\s+को\s+(?:₹\s*)?([\d,]+)\s*(?:रुपये|रुपए|रु\.?)?\s*(?:का\s+)?(?:एडवांस|उधार|अग्रिम)/)
    ?? text.match(/^(?:₹\s*)?([\d,]+)\s*(?:रुपये|रुपए)?\s*(?:का\s+)?(?:एडवांस|उधार)\s+(.+?)\s+को/);
  if (advance) {
    const [name, amt] = /^\d/.test(advance[1] ?? "") || /^₹/.test(text) ? [advance[2], advance[1]] : [advance[1], advance[2]];
    const amount = Number((amt ?? "").replace(/,/g, ""));
    if (!name || !Number.isFinite(amount) || amount <= 0) throw new Error("एडवांस की राशि शून्य से अधिक रखें।");
    return { kind: "advance", name, amount };
  }
  const patterns: { kind: "status" | "attendance" | "payroll"; expression: RegExp }[] = [
    { kind: "status", expression: /^(.+?)\s+(?:के|का|की)\s+(?:टास्क|काम|कार्य)\s+(?:का\s+)?(?:क्या\s+)?(?:अपडेट|स्टेटस|स्थिति)/ },
    { kind: "status", expression: /^(.+?)\s+क्या\s+कर\s+(?:रहा|रही|रहे)/ },
    { kind: "attendance", expression: /^क्या\s+(.+?)\s+आज\s+(?:आया|आई|आए|प्रेजेंट|उपस्थित)/ },
    { kind: "attendance", expression: /^(.+?)\s+(?:की\s+)?(?:अटेंडेंस|हाजिरी|हाज़िरी|उपस्थिति)/ },
    { kind: "payroll", expression: /^(.+?)\s+(?:की|का)\s+(?:सैलरी|तनख्वाह|तनख़्वाह|वेतन|पेरोल)/ },
  ];
  for (const p of patterns) { const m = text.match(p.expression); if (m?.[1]) return { kind: p.kind, name: m[1] }; }
  if (/[\u0900-\u097F]/.test(text)) throw new Error("यह आदेश समझ नहीं आया। कोई सैंपल आदेश आज़माएँ।");
  return null;
}
const NAV_WORDS: [RegExp, Extract<VoiceIntent, { kind: "open" }>["target"]][] = [
  [/^(?:add (?:a )?(?:new )?(?:user|employee|staff(?: member)?)|new (?:user|employee|staff))$/i, "add"],
  [/^(?:नया\s+)?(?:कर्मचारी|यूज़र|यूजर|स्टाफ)\s+(?:जोड़ो|जोड़ें|ऐड करो)$/, "add"],
  [/payroll|salary|पेरोल|सैलरी|वेतन/i, "payroll"],
  [/attendance|हाजिरी|हाज़िरी|अटेंडेंस|उपस्थिति/i, "attendance"],
  [/tasks?\b|टास्क|कार्य/i, "tasks"],
  [/staff|roles|employees|users|स्टाफ|कर्मचारी/i, "staff"],
  [/profile|प्रोफाइल|प्रोफ़ाइल/i, "profile"],
  [/command|home|dashboard|होम|डैशबोर्ड/i, "command"],
];
const ADD_EMPLOYEE_PATTERNS: RegExp[] = [
  /^(?:add|create)\s+(?:a\s+)?(?:new\s+)?(?:user|employee|staff(?:\s+member)?)\s+(?:named|called|name)\s+(.+)$/i,
  /^(?:add\s+)?(?:a\s+)?(?:new\s+)?(?:user|employee|staff)\s*name\s+(.+)$/i,
  /^(?:add|create)\s+(.+?)\s+as\s+(?:a\s+|an\s+)?(?:new\s+)?(?:user|employee|staff(?:\s+member)?|team\s+member)$/i,
  /^(?:add|create)\s+(.+?)\s+(?:in|to|into|on)\s+(?:the\s+)?(?:staff|team)(?:\s+(?:list|members?|roster|section|page))?$/i,
  /^(.+?)\s+को\s+(?:स्टाफ|टीम|कर्मचारी)\s+(?:में|मैं)\s+(?:जोड़ो|जोड़ें|ऐड करो|शामिल करो)$/,
  /^(.+?)\s+(?:नाम\s+(?:का|की|के)\s+)?(?:नया\s+)?(?:कर्मचारी|यूज़र|यूजर|स्टाफ)\s+(?:जोड़ो|जोड़ें|ऐड करो)$/,
];
const NOT_A_NAME = /^(?:a|an|the|this|that|new|user|users|employee|employees|staff|team|task|tasks|note|notes|reminder|reminders|advance|advances|नया)$/i;
function parseAddEmployee(text: string): VoiceIntent | null {
  for (const re of ADD_EMPLOYEE_PATTERNS) {
    const name = text.match(re)?.[1]?.trim().replace(/\s+/g, " ");
    if (name && !NOT_A_NAME.test(name)) return { kind: "addEmployee", name };
  }
  return null;
}
function parseNavigation(text: string): VoiceIntent | null {
  const add = parseAddEmployee(text);
  if (add) return add;
  const open = /\b(?:of|for)\b/i.test(text) ? null : text.match(/^(?:open|show|go to|view)\s+(?:the\s+)?(?:add\s+(?:user|employee|staff)|[a-z &]+?)(?:\s+(?:page|tab|screen|form))?$/i);
  const hiOpen = text.match(/^(.+?)\s+(?:खोलो|खोलें|दिखाओ|दिखाएं|पर जाओ)$/);
  if (/^(?:open|show|go to|view)\s+(?:the\s+)?add\s+(?:user|employee|staff)/i.test(text)) return { kind: "open", target: "add" };
  for (const [re, target] of NAV_WORDS) {
    if (target === "add" && re.test(text)) return { kind: "open", target };
    if (target !== "add" && ((open && re.test(text)) || (hiOpen?.[1] && hiOpen[1].split(/\s+/).length <= 2 && re.test(hiOpen[1])))) return { kind: "open", target };
  }
  return null;
}
export function executeVoiceCommand(intent: VoiceIntent, s: State, staff?: Employee, confirmAdd = false, lang: "en" | "hi" = "en"): VoiceResult {
  const r = executeCore(intent, s, staff, confirmAdd);
  if (lang !== "hi") return r;
  const who = "name" in intent ? (s.employees.find((e) => e.id === r.navigate?.employeeId)?.name ?? intent.name) : "";
  return { ...r, reply: hindiReply(intent, r, who) };
}
export function hindiError(message: string) {
  const map: [RegExp, string][] = [[/^Only the admin can post broadcasts/, "केवल एडमिन घोषणा कर सकते हैं।"], [/^No employee named (.+)\.$/, "$1 नाम का कोई कर्मचारी नहीं है।"], [/^You can only open your own/, "आप केवल अपनी हाजिरी और वेतन देख सकते हैं।"], [/^You don't have permission/, "आपको दूसरों को कार्य सौंपने की अनुमति नहीं है।"], [/^Ask the admin/, "पहले एडमिन से कर्मचारी जुड़वाएँ।"], [/^More than one employee/, "एक से अधिक कर्मचारी मिले। पूरा नाम बोलें।"], [/^I couldn't match/, "यह आदेश समझ नहीं आया। कोई सैंपल आदेश आज़माएँ।"], [/^Include an employee/, "कर्मचारी का नाम और कार्य बताइए।"]];
  for (const [re, hi] of map) if (re.test(message)) return message.replace(re, hi);
  return message;
}
function hindiReply(intent: VoiceIntent, r: VoiceResult, who: string) {
  if (r.add) return `${r.add.name} अभी स्टाफ सूची में नहीं है।`;
  switch (intent.kind) {
    case "open": return "खोल दिया।";
    case "addEmployee": return r.reply.includes("already") ? `${who} अभी स्टाफ सूची में हैं।` : `${who} को स्टाफ में जोड़ दिया।`;
    case "note": return "आपका नोट सहेज दिया गया।";
    case "broadcast": return "आपकी घोषणा पोस्ट हो गई।";
    case "assign": return `हो गया! मैंने ${who} को कार्य सौंप दिया है।`;
    case "status": { const n = r.reply.match(/(\d+) pending tasks, (\d+) in progress, (\d+) awaiting approval and (\d+) completed/); return n ? `${who} के ${n[1]} लंबित, ${n[2]} प्रगति में, ${n[3]} स्वीकृति हेतु और आज ${n[4]} कार्य पूरे हुए।` : r.reply; }
    case "attendance": { const st = r.reply.match(/ is (.+) today/)?.[1] ?? ""; const map: Record<string, string> = { present: "उपस्थित", late: "देर से आए", absent: "अनुपस्थित", "on break": "ब्रेक पर" }; return `${who} आज ${map[st] ?? st} हैं।`; }
    case "advance": { const m = r.reply.match(/(₹[\d,.]+)/); return r.reply.startsWith("Requested") ? `${m?.[1] ?? ""} एडवांस का अनुरोध एडमिन को भेजा गया।` : `${who} के लिए ${m?.[1] ?? ""} एडवांस दर्ज किया। शुद्ध देय ${r.reply.match(/Net payable is (₹[\d,.]+)/)?.[1] ?? ""} है।`; }
    case "payroll": { const amt = r.reply.match(/(₹[\d,.]+)/)?.[1] ?? ""; return `${who} का देय वेतन ${amt} है।`; }
  }
}
function executeCore(intent: VoiceIntent, s: State, staff?: Employee, confirmAdd = false): VoiceResult {
  const admin = !staff;
  if (intent.kind === "note") {
    const id = actions.addNote(staff?.id);
    actions.updateNote(id, { text: intent.text, html: intent.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), title: "Voice note" });
    return { reply: "Saved your note.", details: [intent.text] };
  }
  if (intent.kind === "broadcast") {
    if (!admin) throw new Error("Only the admin can post broadcasts.");
    actions.broadcast(intent.text);
    return { reply: "Your broadcast is posted.", details: [intent.text] };
  }
  if (intent.kind === "open") {
    if (!admin && ["payroll", "staff", "add"].includes(intent.target)) throw new Error("Only the admin can open this.");
    if (intent.target === "add") return { reply: "Opening the new employee form.", details: [], navigate: { tab: "staff", openAdd: true } };
    return { reply: `Opening ${intent.target}.`, details: [], navigate: { tab: intent.target } };
  }
  if (intent.kind === "addEmployee") {
    if (!admin) throw new Error("Only the admin can open this.");
    let existing: Employee | undefined;
    try { existing = resolveEmployee(intent.name, s.employees); } catch { existing = undefined; }
    if (existing) return { reply: `${existing.name} is already in your staff list.`, details: ["No duplicate was added."], navigate: { tab: "staff", employeeId: existing.id } };
    const added = actions.addEmployee({ name: intent.name, mobile: "", designation: "General Executive", role: "General Executive", salary: 0 });
    return { reply: `Added ${added.name} as a General Executive.`, details: ["Add mobile and salary from Staff & Roles."], navigate: { tab: "staff", employeeId: added.id } };
  }
  let e = resolveEmployee(intent.name, s.employees);
  if (intent.kind === "assign") {
    if (staff && (!e || e.id !== staff.id) && !staff.permissions.assign) throw new Error("You don't have permission to assign tasks to others.");
    if (!e) {
      if (!admin) throw new Error("Ask the admin to add this employee first.");
      if (!confirmAdd) return { reply: `${intent.name} isn't in your staff list yet.`, details: [intent.text], add: intent };
      e = actions.addEmployee({ name: intent.name, mobile: "", designation: "General Executive", role: "General Executive", salary: 0 });
      const color = PALETTE.find((p) => !s.employees.some((other) => other.color === p.c))?.c;
      if (color) { actions.updateEmployee(e.id, { color }); e = { ...e, color }; }
    }
    const task = actions.addTask({ assigneeId: e.id, title: intent.text, isPublic: !intent.private });
    return { reply: `Done! I have assigned the task to ${e.name}.`, details: [`${intent.private ? "Private" : "Public"} · 2-hour reminders started`], tasks: [task], navigate: { tab: "tasks", employeeId: e.id } };
  }
  if (!e) throw new Error(`No employee named ${intent.name}.`);
  if (intent.kind === "status") {
    const tasks = s.tasks.filter((t) => t.assigneeId === e.id && (!staff || e.id === staff.id || (staff.permissions.publicTasks && t.isPublic)));
    const pending = tasks.filter((t) => !t.done && !t.inProgress && t.review !== "pending");
    const progress = tasks.filter((t) => !t.done && t.inProgress && t.review !== "pending");
    const review = tasks.filter((t) => !t.done && t.review === "pending");
    const done = tasks.filter((t) => t.done);
    const completedToday = done.filter((t) => t.doneAt && new Date(t.doneAt).toLocaleDateString("en-CA") === today()).length;
    return { reply: `${e.name} has ${pending.length} pending tasks, ${progress.length} in progress, ${review.length} awaiting approval and ${completedToday} completed today.${pending[0] ? ` Next: ${pending[0].title}.` : ""}`, details: [`${done.length} completed tasks in total${staff && e.id !== staff.id ? " · Public tasks only" : ""}`], tasks };
  }
  if (staff && e.id !== staff.id) throw new Error("You can only open your own attendance and pay records.");
  const row = payrollRow(e, s, monthKey());
  if (intent.kind === "attendance") {
    const a = s.attendance.find((a) => a.empId === e.id && a.date === today());
    return { reply: `${e.name} is ${teamStatus(e, s).toLowerCase()} today.`, details: [`Clock in ${fmtTime(a?.inAt)} · Out ${fmtTime(a?.outAt)}`, `GPS distance: ${a?.distance === undefined ? "Not recorded" : `${a.distance} metres`} · ${a?.verified ? "Verified" : "Not verified"}`, `${monthKey()} · Present ${row.present} · Late ${row.late} · Absent ${row.absent}`], navigate: { tab: "attendance", employeeId: e.id } };
  }
  if (intent.kind === "advance") {
    if (staff) {
      actions.request({ empId: e.id, kind: "Advance", value: intent.amount, date: today(), note: "Voice advance request" });
      return { reply: `Requested ${money(intent.amount)} advance for admin approval.`, details: ["Payroll is unchanged until approval."], navigate: { tab: "payroll", employeeId: e.id } };
    }
    actions.addAdjustment({ empId: e.id, amount: intent.amount, kind: "Advance", month: monthKey(), date: today(), note: "Voice command · cash advance recorded" });
    const next = payrollRow(e, { ...s, adjustments: [...s.adjustments, { id: "voice-preview", empId: e.id, amount: intent.amount, kind: "Advance", month: monthKey(), note: "" }] }, monthKey());
    return { reply: `Recorded ${money(intent.amount)} advance for ${e.name}. Net payable is ${money(next.net)}.`, details: ["Records an already-given advance; no money is transferred."], navigate: { tab: "payroll", employeeId: e.id } };
  }
  return { reply: `${e.name}'s net ${row.paid ? "paid salary" : "payable salary"} is ${money(row.paid?.amount ?? row.net)}.`, details: [`${monthKey()} · Base ${money(e.salary)} · Staff Udhar ${money(row.advance)}`, s.policy.configured ? "Attendance-based calculation" : "Provisional full base · company rules not configured"], navigate: { tab: "payroll", employeeId: e.id } };
}