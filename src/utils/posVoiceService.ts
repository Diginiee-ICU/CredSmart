/**
 * CredSmart POS Voice Recognition & Speech Assistant Service
 * Supports Web Speech Recognition API with Hinglish & English item parsing,
 * quantity detection, action triggers, and text-to-speech audio feedback.
 */

// Define SpeechRecognition types for browsers
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type POSVoiceIntentType =
  | "ADD_ITEM"
  | "SEARCH_ITEM"
  | "SET_QUANTITY"
  | "SET_PRICE"
  | "SET_DISCOUNT"
  | "SET_PAYMENT_MODE"
  | "SAVE_BILL"
  | "SAVE_AND_PRINT"
  | "HOLD_BILL"
  | "CLEAR_CART"
  | "UNKNOWN";

export interface ParsedVoiceCommand {
  rawTranscript: string;
  intent: POSVoiceIntentType;
  itemName?: string;
  quantity?: number;
  price?: number;
  discountValue?: number;
  discountType?: "percent" | "flat";
  paymentMode?: "Cash" | "UPI" | "Card" | "Credit" | "Split" | "Net Banking";
}

/**
 * Text to speech audio confirmation
 */
export function speakPOSMessage(message: string, soundEnabled: boolean = true) {
  if (!soundEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = "en-IN";

    // Select Indian English or standard voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.includes("en-IN") || v.lang.includes("en-GB") || v.name.includes("India") || v.lang.includes("en-US")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

/**
 * Parses user spoken transcript into structured POS intents and arguments
 */
export function parsePOSVoiceCommand(transcript: string): ParsedVoiceCommand {
  const text = transcript.trim().toLowerCase();

  // 1. Save & Print
  if (
    text.includes("save and print") ||
    text.includes("save & print") ||
    text.includes("print bill") ||
    text.includes("print receipt") ||
    text.includes("bill print") ||
    text.includes("save print")
  ) {
    return { rawTranscript: transcript, intent: "SAVE_AND_PRINT" };
  }

  // 2. Save Bill
  if (
    text === "save" ||
    text === "save bill" ||
    text.includes("save the bill") ||
    text.includes("bill save") ||
    text.includes("complete bill") ||
    text.includes("finish bill")
  ) {
    return { rawTranscript: transcript, intent: "SAVE_BILL" };
  }

  // 3. Hold Bill / New Bill
  if (text.includes("hold bill") || text.includes("park bill") || text.includes("new bill")) {
    return { rawTranscript: transcript, intent: "HOLD_BILL" };
  }

  // 4. Clear Cart
  if (text.includes("clear cart") || text.includes("empty cart") || text.includes("delete all")) {
    return { rawTranscript: transcript, intent: "CLEAR_CART" };
  }

  // 5. Payment Modes
  if (text.includes("cash") || text.includes("nagad")) {
    return { rawTranscript: transcript, intent: "SET_PAYMENT_MODE", paymentMode: "Cash" };
  }
  if (text.includes("upi") || text.includes("qr code") || text.includes("phonepe") || text.includes("gpay") || text.includes("paytm")) {
    return { rawTranscript: transcript, intent: "SET_PAYMENT_MODE", paymentMode: "UPI" };
  }
  if (text.includes("card") || text.includes("debit") || text.includes("credit card")) {
    return { rawTranscript: transcript, intent: "SET_PAYMENT_MODE", paymentMode: "Card" };
  }
  if (text.includes("udhar") || text.includes("credit") || text.includes("khata") || text.includes("baki")) {
    return { rawTranscript: transcript, intent: "SET_PAYMENT_MODE", paymentMode: "Credit" };
  }

  // 6. Discount Command (e.g., "Discount 10 percent", "Discount 50 rupees")
  const discMatch = text.match(/(?:discount|chhoot|off|disc)\s*(?:of|de do)?\s*(\d+(?:\.\d+)?)\s*(%|percent|rupees|rs|flat)?/);
  if (discMatch) {
    const val = parseFloat(discMatch[1]);
    const unit = discMatch[2] || "";
    const isFlat = unit.includes("rupee") || unit.includes("rs") || unit.includes("flat");
    return {
      rawTranscript: transcript,
      intent: "SET_DISCOUNT",
      discountValue: val,
      discountType: isFlat ? "flat" : "percent",
    };
  }

  // 7. Quantity Command (e.g., "Quantity 5", "Qty 3", "Change quantity to 4")
  const qtyMatch = text.match(/(?:quantity|qty|matra|pieces|pcs|packet|kitna)\s*(?:to|is|ko|karo)?\s*(\d+)/);
  if (qtyMatch) {
    return {
      rawTranscript: transcript,
      intent: "SET_QUANTITY",
      quantity: parseInt(qtyMatch[1], 10),
    };
  }

  // 8. Price Command (e.g., "Price 120", "Set price 50", "Rate 200")
  const priceMatch = text.match(/(?:price|rate|cost|keemat|bhav)\s*(?:to|is|ko|karo)?\s*(?:rs|rupees|₹)?\s*(\d+(?:\.\d+)?)/);
  if (priceMatch) {
    return {
      rawTranscript: transcript,
      intent: "SET_PRICE",
      price: parseFloat(priceMatch[1]),
    };
  }

  // 9. Add Item Command (e.g., "Add 2 Maggi", "Add Coca Cola", "3 Milk", "Give 2 Bread", "Lao 5 Aata")
  const addWithQtyMatch = text.match(/^(?:add|put|give|include|daalo|lao|karo)?\s*(\d+)\s*(?:pcs|packets|pkt|box|kg|ltr|pieces|piece)?\s+(?:of\s+)?(.+)$/);
  if (addWithQtyMatch) {
    const qty = parseInt(addWithQtyMatch[1], 10);
    const item = addWithQtyMatch[2].trim();
    if (item.length > 1) {
      return {
        rawTranscript: transcript,
        intent: "ADD_ITEM",
        quantity: isNaN(qty) || qty < 1 ? 1 : qty,
        itemName: item,
      };
    }
  }

  // Pattern: "Add [Item Name]" e.g. "Add Parle G"
  const addMatch = text.match(/^(?:add|give|put|include|daalo|lao)\s+(.+)$/);
  if (addMatch) {
    const item = addMatch[1].trim();
    if (item.length > 1) {
      return {
        rawTranscript: transcript,
        intent: "ADD_ITEM",
        quantity: 1,
        itemName: item,
      };
    }
  }

  // 10. Fallback: Search / Add item if it's a direct noun phrase (e.g. "Basmati Rice", "Dettol Soap")
  if (text.length > 1) {
    return {
      rawTranscript: transcript,
      intent: "ADD_ITEM",
      quantity: 1,
      itemName: text.replace(/^(search|find|dhoondho|dekhna)\s+/i, "").trim(),
    };
  }

  return { rawTranscript: transcript, intent: "UNKNOWN" };
}

/**
 * Check if Web Speech API is supported
 */
export function isVoiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

/**
 * Create a new speech recognition instance
 */
export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  lang: string = "en-IN"
) {
  if (!isVoiceSupported()) {
    onError("Web Speech API is not supported in this browser");
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event: any) => {
    console.warn("Speech recognition error:", event.error);
    onError(event.error);
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
}
