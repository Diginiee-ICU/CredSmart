import { describe, expect, it } from "vitest";
import { CREDALERT_URL, NUDGE_MESSAGES, nextNudgeIndex } from "@/crm/components/CredAlertNudge";

describe("CredAlert nudge", () => {
  it("has all 12 distinct messages", () => {
    expect(NUDGE_MESSAGES).toHaveLength(12);
    expect(new Set(NUDGE_MESSAGES).size).toBe(12);
  });
  it("shows one message at a time then repeats the list", () => {
    expect(nextNudgeIndex(-1)).toBe(0);
    expect(nextNudgeIndex(0)).toBe(1);
    expect(nextNudgeIndex(10)).toBe(11);
    expect(nextNudgeIndex(11)).toBe(0);
  });
  it("links to credalert.business", () => expect(CREDALERT_URL).toBe("https://credalert.business"));
});
