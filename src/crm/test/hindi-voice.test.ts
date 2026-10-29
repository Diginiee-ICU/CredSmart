import { describe, expect, it } from "vitest";
import { parseVoiceCommand, resolveEmployee } from "@/crm/lib/voice-commands";

const emps = [{ id: "1", name: "Rahul" }, { id: "2", name: "Laxmi" }] as never;

describe("Hindi voice commands", () => {
  it("assigns a task in Hindi", () => expect(parseVoiceCommand("लक्ष्मी को टास्क दो बिल चेक करना", emps)).toMatchObject({ kind: "assign", name: "लक्ष्मी", text: "बिल चेक करना", private: false }));
  it("private Hindi task", () => expect(parseVoiceCommand("राहुल को प्राइवेट टास्क दो स्टॉक गिनो", emps)).toMatchObject({ kind: "assign", private: true }));
  it("status", () => expect(parseVoiceCommand("राहुल के टास्क का क्या अपडेट है", emps)).toMatchObject({ kind: "status", name: "राहुल" }));
  it("attendance", () => expect(parseVoiceCommand("राहुल की हाजिरी दिखाओ", emps)).toMatchObject({ kind: "attendance" }));
  it("advance with Devanagari digits", () => expect(parseVoiceCommand("राहुल को १५०० रुपये एडवांस दो", emps)).toMatchObject({ kind: "advance", name: "राहुल", amount: 1500 }));
  it("English still works", () => expect(parseVoiceCommand("Add ₹1500 advance to Rahul", emps)).toMatchObject({ kind: "advance", amount: 1500 }));
  it("matches Devanagari names to staff", () => {
    expect(resolveEmployee("राहुल", emps)?.id).toBe("1");
    expect(resolveEmployee("लक्ष्मी", emps)?.id).toBe("2");
  });
});
