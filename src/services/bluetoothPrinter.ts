/**
 * Bluetooth ESC/POS Thermal Receipt Printer Service (58mm / 80mm)
 * Supports standard POS printers connected via Web Bluetooth API (Android Chrome & WebView).
 */

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface ReceiptData {
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  storeGstin?: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxTotal?: number;
  discount?: number;
  grandTotal: number;
  paymentMethod?: string;
  footerNote?: string;
  paperWidth?: 58 | 80;
}

// ESC/POS Command Constants
const ESC = "\x1B";
const GS = "\x1D";
const CMD_INIT = ESC + "@";
const CMD_CENTER = ESC + "a" + "\x01";
const CMD_LEFT = ESC + "a" + "\x00";
const CMD_RIGHT = ESC + "a" + "\x02";
const CMD_BOLD_ON = ESC + "E" + "\x01";
const CMD_BOLD_OFF = ESC + "E" + "\x00";
const CMD_DOUBLE_ON = GS + "!" + "\x11"; // Double height + width
const CMD_DOUBLE_OFF = GS + "!" + "\x00";
const CMD_CUT = GS + "V" + "\x41" + "\x00"; // Full cut

/**
 * Format string row for 58mm (32 chars) or 80mm (48 chars) column width
 */
const formatTwoColumn = (left: string, right: string, width = 32): string => {
  const maxLeft = width - right.length - 1;
  const truncatedLeft = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  const spaces = " ".repeat(Math.max(1, width - truncatedLeft.length - right.length));
  return `${truncatedLeft}${spaces}${right}\n`;
};

const formatThreeColumn = (name: string, qty: string, price: string, width = 32): string => {
  if (width === 58 || width === 32) {
    // 32 chars: Item(16) Qty(6) Total(10)
    const i = (name.length > 15 ? name.slice(0, 15) : name).padEnd(16);
    const q = qty.padStart(6);
    const p = price.padStart(10);
    return `${i}${q}${p}\n`;
  } else {
    // 48 chars: Item(26) Qty(8) Total(14)
    const i = (name.length > 25 ? name.slice(0, 25) : name).padEnd(26);
    const q = qty.padStart(8);
    const p = price.padStart(14);
    return `${i}${q}${p}\n`;
  }
};

/**
 * Generates raw ESC/POS byte commands for thermal receipt printer
 */
export const generateEscPosReceipt = (data: ReceiptData): Uint8Array => {
  const colWidth = data.paperWidth === 80 ? 48 : 32;
  const separator = "-".repeat(colWidth) + "\n";
  const doubleSeparator = "=".repeat(colWidth) + "\n";

  let text = "";

  // 1. Initialize Printer
  text += CMD_INIT;

  // 2. Header (Centered)
  text += CMD_CENTER;
  text += CMD_DOUBLE_ON + CMD_BOLD_ON + data.storeName + "\n" + CMD_DOUBLE_OFF + CMD_BOLD_OFF;

  if (data.storeAddress) text += data.storeAddress + "\n";
  if (data.storePhone) text += `Ph: ${data.storePhone}\n`;
  if (data.storeGstin) text += `GSTIN: ${data.storeGstin}\n`;

  text += doubleSeparator;

  // 3. Invoice & Date Info (Left aligned)
  text += CMD_LEFT;
  text += formatTwoColumn(`Bill: ${data.invoiceNumber}`, data.date, colWidth);
  if (data.customerName) {
    text += `Customer: ${data.customerName}\n`;
  }
  if (data.customerPhone) {
    text += `Phone: ${data.customerPhone}\n`;
  }

  text += separator;

  // 4. Line Items Table Header
  text += CMD_BOLD_ON;
  text += formatThreeColumn("Item", "Qty", "Total", colWidth);
  text += CMD_BOLD_OFF;
  text += separator;

  // 5. Line Items
  data.items.forEach((item) => {
    text += formatThreeColumn(
      item.name,
      `${item.qty}`,
      `₹${item.total.toFixed(2)}`,
      colWidth
    );
  });

  text += separator;

  // 6. Totals & Summary
  text += formatTwoColumn("Subtotal:", `₹${data.subtotal.toFixed(2)}`, colWidth);
  if (data.discount && data.discount > 0) {
    text += formatTwoColumn("Discount:", `-₹${data.discount.toFixed(2)}`, colWidth);
  }
  if (data.taxTotal && data.taxTotal > 0) {
    text += formatTwoColumn("Tax (GST):", `₹${data.taxTotal.toFixed(2)}`, colWidth);
  }

  text += doubleSeparator;
  text += CMD_BOLD_ON + CMD_DOUBLE_ON;
  text += formatTwoColumn("GRAND TOTAL:", `₹${data.grandTotal.toFixed(2)}`, colWidth);
  text += CMD_DOUBLE_OFF + CMD_BOLD_OFF;

  if (data.paymentMethod) {
    text += `Paid via: ${data.paymentMethod}\n`;
  }

  text += doubleSeparator;

  // 7. Footer
  text += CMD_CENTER;
  text += (data.footerNote || "Thank you for your business!") + "\n";
  text += "Powered by CredSmart POS\n\n\n\n";

  // 8. Cut Paper
  text += CMD_CUT;

  const encoder = new TextEncoder();
  return encoder.encode(text);
};

/**
 * Check if Web Bluetooth is supported in current browser/container
 */
export const isBluetoothSupported = (): boolean => {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
};

/**
 * Connect to Bluetooth Thermal Printer and Print Receipt
 */
export const printBluetoothReceipt = async (data: ReceiptData): Promise<boolean> => {
  if (!isBluetoothSupported()) {
    throw new Error("Web Bluetooth is not supported on this device/browser. Please use standard print.");
  }

  try {
    const nav = navigator as any /* eslint-disable-line @typescript-eslint/no-explicit-any */;  
    // Request Bluetooth device
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { services: ["000018f0-0000-1000-8000-00805f9b34fb"] }, // Common ESC/POS Service
        { services: ["e7810a71-73ae-499d-8c15-faa9aef0c3f2"] },
      ],
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      ],
      acceptAllDevices: true,
    });

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    let targetCharacteristic = null;
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            targetCharacteristic = char;
            break;
          }
        }
      } catch {
        // Continue searching
      }
      if (targetCharacteristic) break;
    }

    if (!targetCharacteristic) {
      throw new Error("Could not find writable printer characteristic on the selected Bluetooth device.");
    }

    // Generate ESC/POS command buffer
    const rawBytes = generateEscPosReceipt(data);

    // Send in chunks of 512 bytes (Bluetooth MTU limits)
    const chunkSize = 512;
    for (let offset = 0; offset < rawBytes.length; offset += chunkSize) {
      const slice = rawBytes.slice(offset, offset + chunkSize);
      await targetCharacteristic.writeValue(slice);
    }

    return true;
  } catch (error: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {  
    if (error?.name === "NotFoundError" || error?.message?.includes("User cancelled")) {
      return false; // User dismissed Bluetooth selector
    }
    throw error;
  }
};
