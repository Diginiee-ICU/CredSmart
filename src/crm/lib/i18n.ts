import { useEffect, useSyncExternalStore } from "react";

export type Lang = "en" | "hi";
const KEY = "woodzire-lang";
const listeners = new Set<() => void>();
let current: Lang = "en";
if (typeof window !== "undefined") { try { current = localStorage.getItem(KEY) === "hi" ? "hi" : "en"; } catch { /* ignore */ } }
export const getLang = () => current;
export function setLang(lang: Lang) {
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export function useLang(): Lang {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => current, () => "en");
}

/** English UI text → Hindi. Exact (trimmed) matches only. */
export const HI: Record<string, string> = {
  "Add Employee": "कर्मचारी जोड़ें", "Note": "नोट", "No employees": "कोई कर्मचारी नहीं", "Live counters": "लाइव गणना",
  "Absent": "अनुपस्थित", "Active Staff Profiles": "सक्रिय स्टाफ प्रोफ़ाइल", "Active Tasks": "सक्रिय कार्य", "Active Profiles": "सक्रिय प्रोफ़ाइल",
  "Add a phone number first": "पहले फ़ोन नंबर जोड़ें", "Add Staff": "स्टाफ जोड़ें", "+ Add Staff": "+ स्टाफ जोड़ें", "Admin": "एडमिन", "Advance": "एडवांस", "Advance (Udhar)": "एडवांस (उधार)",
  "Advances Given": "दिए गए एडवांस", "All": "सभी", "All calendar days": "सभी कैलेंडर दिन", "Announcement": "घोषणा", "Approve": "स्वीकृत करें", "Approved & Done": "स्वीकृत व पूर्ण",
  "Assigned Colour": "निर्धारित रंग", "Assign task": "कार्य सौंपें", "Assign Task": "कार्य सौंपें", "Assign Task to Others": "दूसरों को कार्य सौंपें", "Assign to": "किसे सौंपें",
  "Attendance": "हाजिरी", "Awaiting approval": "स्वीकृति लंबित", "Back from Break": "ब्रेक से वापस", "Base Monthly Salary": "मूल मासिक वेतन", "Bold": "बोल्ड",
  "Broadcast on WhatsApp": "WhatsApp पर भेजें", "Checklist": "चेकलिस्ट", "Clocked in": "क्लॉक-इन हुआ", "Clocked out": "क्लॉक-आउट हुआ", "Clock In": "क्लॉक इन", "Clocking in as": "क्लॉक-इन कर रहे हैं",
  "Clock Out": "क्लॉक आउट", "Close": "बंद करें", "Colleague Contacts": "सहकर्मी संपर्क", "Command": "कमांड", "Command Center": "कमांड सेंटर",
  "Company overtime (₹/hr)": "कंपनी ओवरटाइम (₹/घंटा)", "Company rate": "कंपनी दर", "Company Rules": "कंपनी नियम", "Company rules saved": "कंपनी नियम सहेजे गए",
  "Company Salary & Shift Rules": "कंपनी वेतन व शिफ्ट नियम", "Company shift start": "कंपनी शिफ्ट शुरू", "Completed": "पूर्ण", "Completion notes / checklist": "पूर्णता नोट / चेकलिस्ट",
  "Confirm Paid": "भुगतान की पुष्टि", "Convert Note to Task": "नोट को कार्य बनाएं", "Create Custom Role": "कस्टम भूमिका बनाएं", "+ Create Custom Role": "+ कस्टम भूमिका बनाएं",
  "Custom role name": "कस्टम भूमिका नाम", "Custom role saved": "कस्टम भूमिका सहेजी गई", "Date": "तारीख", "Days Present / Late": "उपस्थित / देर दिन", "Decline": "अस्वीकार",
  "Deduction": "कटौती", "Delete note": "नोट हटाएं", "Designation": "पद", "Done": "हो गया", "Edit salary": "वेतन बदलें", "Edit Salary": "वेतन बदलें",
  "End huddle": "हडल समाप्त करें", "End-of-Day Report": "दिन के अंत की रिपोर्ट", "EOD Report": "EOD रिपोर्ट", "Friday": "शुक्रवार", "Full paid day": "पूरा भुगतान दिन",
  "General": "सामान्य", "General Executive": "जनरल एग्ज़ीक्यूटिव", "Generate Room": "रूम बनाएं", "Geofence Settings": "जियोफेंस सेटिंग्स", "GPS is unavailable": "GPS उपलब्ध नहीं",
  "GPS located": "GPS मिला", "GPS Radar": "GPS रडार", "GPS Verified": "GPS सत्यापित", "Half paid day (default)": "आधा भुगतान दिन (डिफ़ॉल्ट)", "Hours": "घंटे",
  "In Progress": "प्रगति में", "Italic": "इटैलिक", "Join Huddle": "हडल में जुड़ें", "Late": "देर से", "Late arrival pay": "देर से आने पर वेतन", "Leave": "छुट्टी",
  "Live Huddle in Progress — Tap to Join": "लाइव हडल चल रहा है — जुड़ने के लिए टैप करें", "Live Team Pulse": "लाइव टीम पल्स", "Live Team Status": "लाइव टीम स्थिति",
  "Location not scanned": "लोकेशन स्कैन नहीं हुई", "Log Deduction": "कटौती दर्ज करें", "Log Overtime": "ओवरटाइम दर्ज करें", "Log Overtime Hours": "ओवरटाइम घंटे दर्ज करें",
  "Manage Employee & Permissions": "कर्मचारी व अनुमतियाँ प्रबंधित करें", "Manager": "मैनेजर", "Marketing": "मार्केटिंग", "Sales": "सेल्स", "Monday": "सोमवार", "Monthly Base": "मासिक मूल",
  "Monthly Salary (₹)": "मासिक वेतन (₹)", "My Overtime Earned": "मेरा ओवरटाइम", "My Passbook": "मेरी पासबुक", "My Pay": "मेरा वेतन", "My Payslips": "मेरी वेतन पर्चियाँ",
  "My Pay & Udhar": "मेरा वेतन व उधार", "My Profile": "मेरी प्रोफ़ाइल", "My Profile & Team": "मेरी प्रोफ़ाइल व टीम", "My Staff Udhar": "मेरा उधार", "My Tasks": "मेरे कार्य",
  "My Urgent Tasks": "मेरे ज़रूरी कार्य", "My Workspace": "मेरा कार्यक्षेत्र", "Name": "नाम", "Name is required": "नाम आवश्यक है", "New Broadcast": "नई घोषणा", "New note": "नया नोट",
  "No recorded payslips yet": "अभी कोई वेतन पर्ची नहीं", "No tasks here": "यहाँ कोई कार्य नहीं", "Notifications": "सूचनाएँ", "Not set": "सेट नहीं", "Number of days": "दिनों की संख्या",
  "On Break": "ब्रेक पर", "One weekly day off": "सप्ताह में एक छुट्टी", "Outside zone": "क्षेत्र से बाहर", "Overtime": "ओवरटाइम", "Overtime Logged": "दर्ज ओवरटाइम",
  "Paid": "भुगतान हुआ", "Paid This Month": "इस माह भुगतान", "Paid / Work Days": "भुगतान / कार्य दिवस", "Payable": "देय", "Payment recorded": "भुगतान दर्ज", "Payroll": "पेरोल",
  "Payroll month": "पेरोल माह", "Payroll updated": "पेरोल अपडेट हुआ", "Pending": "लंबित", "Pending Payroll": "लंबित पेरोल", "Phone": "फ़ोन", "Phone not set": "फ़ोन सेट नहीं",
  "Policy": "नीति", "Post Announcement": "घोषणा पोस्ट करें", "Present": "उपस्थित", "Present / Late / Absent": "उपस्थित / देर / अनुपस्थित", "Priority": "प्राथमिकता",
  "Private": "निजी", "Public": "सार्वजनिक", "Proof awaiting approval": "प्रमाण स्वीकृति लंबित", "Proof of work note": "कार्य प्रमाण नोट", "Proof photos (up to 3)": "प्रमाण फ़ोटो (अधिकतम 3)",
  "Prorated Base": "आनुपातिक मूल", "Quick Notepad": "क्विक नोटपैड", "Quick Notes": "क्विक नोट्स", "Radius (metres)": "दायरा (मीटर)", "Ready for your command": "आपके आदेश के लिए तैयार",
  "Record Paid": "भुगतान दर्ज करें", "Record Salary Payment": "वेतन भुगतान दर्ज करें", "Request Advance": "एडवांस माँगें", "Request approved": "अनुरोध स्वीकृत", "Request Leave": "छुट्टी माँगें",
  "Request Overtime Approval": "ओवरटाइम स्वीकृति माँगें", "Request sent for admin approval": "अनुरोध एडमिन को भेजा गया", "Ring Team": "टीम को कॉल करें", "Role": "भूमिका",
  "Salary calendar": "वेतन कैलेंडर", "Saturday": "शनिवार", "Save": "सहेजें", "Save Company Rules": "कंपनी नियम सहेजें", "Save Custom Role": "कस्टम भूमिका सहेजें", "Saved": "सहेजा गया",
  "Save to Cloud": "क्लाउड में सहेजें", "Send Request": "अनुरोध भेजें", "Share": "शेयर करें", "Shift start override": "शिफ्ट शुरू (विशेष)", "Sign Out": "साइन आउट",
  "Speak Reply": "जवाब बोलें", "Staff details saved": "स्टाफ विवरण सहेजा गया", "Staff Preview": "स्टाफ प्रीव्यू", "Staff Requests": "स्टाफ अनुरोध", "Staff & Roles": "स्टाफ व भूमिकाएँ",
  "Staff Udhar": "स्टाफ उधार", "Start Break": "ब्रेक शुरू करें", "Start Listening": "सुनना शुरू करें", "Start Team Huddle": "टीम हडल शुरू करें", "Stop Listening": "सुनना बंद करें",
  "Submit Proof": "प्रमाण भेजें", "Submit Proof & Complete": "प्रमाण भेजें व पूरा करें", "Sunday": "रविवार", "Sunday off": "रविवार छुट्टी", "Take Break": "ब्रेक लें", "Task": "कार्य",
  "Task alerts enabled": "कार्य अलर्ट चालू", "Task Reminder": "कार्य रिमाइंडर", "Tasks": "कार्य", "Team Broadcasts & Huddles": "टीम घोषणाएँ व हडल", "Team huddle is live": "टीम हडल लाइव है",
  "Team Public Board": "टीम सार्वजनिक बोर्ड", "Thursday": "गुरुवार", "Today's Attendance": "आज की हाजिरी", "Total Net Payroll": "कुल शुद्ध पेरोल", "Total Monthly Payroll": "कुल मासिक पेरोल",
  "Tuesday": "मंगलवार", "Type a command…": "आदेश लिखें…", "Udhar": "उधार", "Udhar / Deductions": "उधार / कटौती", "Unpaid day": "बिना वेतन दिन", "Untitled note": "बिना शीर्षक नोट",
  "Urgent": "ज़रूरी", "Verified today": "आज सत्यापित", "View Report": "रिपोर्ट देखें", "Voice Copilot": "वॉइस कोपायलट", "Wednesday": "बुधवार", "Weekly day off": "साप्ताहिक छुट्टी",
  "WhatsApp Payslip": "WhatsApp वेतन पर्ची", "Workplace not configured": "कार्यस्थल सेट नहीं", "Workplace not set": "कार्यस्थल सेट नहीं", "Workplace saved": "कार्यस्थल सहेजा गया",
  "Workspace": "कार्यक्षेत्र", "CredSmart CRM": "क्रेडस्मार्ट CRM", "CredSmart CRM by Credalert": "क्रेडस्मार्ट CRM - क्रेडअलर्ट", "👑 Admin View": "👑 एडमिन व्यू", "👤 Staff View": "👤 स्टाफ व्यू", "Admin Mode": "एडमिन मोड",
  "Manager Mode": "मैनेजर मोड", "Join Link": "जॉइन लिंक", "Remove Employee": "कर्मचारी हटाएं", "Share Login Details on WhatsApp": "लॉगिन विवरण WhatsApp पर भेजें",
  "Staff Sign-In Link": "स्टाफ साइन-इन लिंक", "Copy Link": "लिंक कॉपī करें", "Share on WhatsApp": "WhatsApp पर भेजें", "Sign-in link copied": "साइन-इन लिंक कॉपī गई", "active profiles": "सक्रिय प्रोफ़ाइल",
  "Can Assign Tasks to Others": "दूसरों को कार्य सौंप सकते हैं", "Can View All Public Tasks": "सभी सार्वजनिक कार्य देख सकते हैं", "Can Manage Payroll & Advances": "पेरोल व एडवांस संभाल सकते हैं",
  "Can Approve Task Proof-of-Work": "कार्य प्रमाण स्वीकृत कर सकते हैं", "Allow Attendance Outside GPS Geofence": "GPS क्षेत्र के बाहर हाजिरी की अनुमति", "Pay & Send WhatsApp Slip": "भुगतान व WhatsApp पर्ची",
  "Add Advance/Deduction": "एडवांस/कटौती जोड़ें", "Listening…": "सुन रहा हूँ…", "Staff": "स्टाफ", "Sign Up": "साइन अप", "Sign In": "साइन इन", "Sign Up / Sign In": "साइन अप / साइन इन", "Create Account": "खाता बनाएं", "Email": "ईमेल", "Password": "पासवर्ड", "Create Your Company Account": "अपनी कंपनी का खाता बनाएं", "Set up your company": "अपनी कंपनी सेट करें", "Company name": "कंपनी का नाम", "Industry": "उद्योग", "Team size": "टीम आकार", "City": "शहर", "Shift starts": "शिफ्ट शुरू", "Your name": "आपका नाम", "Your phone": "आपका फ़ोन", "Create Company Workspace": "कंपनी वर्कस्पेस बनाएं", "Log Out": "लॉग आउट", "Change Passcode": "पासकोड बदलें", "Update Passcode": "पासकोड अपडेट करें", "Current": "मौजूदा", "New": "नया", "Confirm": "पुष्टि", "Menu": "मेन्यू", "Team Size": "टीम संख्या", "Open Tasks": "खुले कार्य", "Awaiting Review": "समीक्षा लंबित", "Month Payroll": "माह का पेरोल", "Staff Sign In": "स्टाफ साइन इन", "I'm the company owner": "मैं कंपनी मालिक हूँ", "Company Code": "कंपनी कोड", "Mobile Number": "मोबाइल नंबर", "Passcode": "पासकोड", "Use the mobile number and passcode your admin shared.": "अपनो मोबाइल नंबर अर पासकोड भराएं जो आपकै एडमिन ने साझा करीया।",
};

const ATTRS = ["placeholder", "title", "aria-label"] as const;
const originals = new WeakMap<Text, string>();
const written = new WeakMap<Text, string>();

function translateNode(node: Text, lang: Lang) {
  const orig = originals.get(node) ?? node.nodeValue ?? "";
  const key = orig.trim();
  if (!key) return;
  const hi = HI[key];
  if (lang === "hi" && hi) { if (!originals.has(node)) originals.set(node, orig); const next = orig.replace(key, hi); written.set(node, next); if (node.nodeValue !== next) node.nodeValue = next; }
  else if (lang === "en" && originals.has(node)) { if (node.nodeValue !== orig) node.nodeValue = orig; }
}
function translateEl(el: Element, lang: Lang) {
  for (const a of ATTRS) {
    const store = `data-i18n-${a}`;
    const stored = el.getAttribute(store); const cur = el.getAttribute(a);
    const orig = stored && cur !== HI[stored.trim()] && cur !== stored ? cur : stored ?? cur;
    if (!orig) continue;
    const hi = HI[orig.trim()];
    if (lang === "hi" && hi) { el.setAttribute(store, orig); if (el.getAttribute(a) !== hi) el.setAttribute(a, hi); }
    else if (lang === "en" && el.hasAttribute(store)) { el.setAttribute(a, orig); el.removeAttribute(store); }
  }
}
function walk(root: Node, lang: Lang) {
  if (root.nodeType === 3) { translateNode(root as Text, lang); return; }
  if (root.nodeType !== 1) return;
  const el = root as Element;
  if (el.closest("[data-no-i18n],textarea,[contenteditable=true],input")) return;
  translateEl(el, lang);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) { if (n.nodeType === 3) translateNode(n as Text, lang); else translateEl(n as Element, lang); n = tw.nextNode(); }
}

/** Translates rendered UI text in place without touching component logic. */
export function useDomTranslation() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    walk(document.body, lang);
    if (lang === "en") return;
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") { const t = m.target as Text; if (t.nodeValue !== written.get(t)) { originals.delete(t); written.delete(t); } translateNode(t, lang); }
        else if (m.type === "attributes") translateEl(m.target as Element, lang);
        else m.addedNodes.forEach((n) => walk(n, lang));
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => obs.disconnect();
  }, [lang]);
}
