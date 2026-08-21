/**
 * ESC/POS Thermal Printer Command Builder & Raw Byte Generator
 * Supports 80mm (48/42 columns) and 58mm (32/30 columns) POS thermal receipt printers.
 * Compatible with Epson, Star, TVS, Citizen, Bixolon, Xprinter, NGX, POS-58/80, and generic ESC/POS devices.
 */

import { ReceiptData } from "@/components/ReceiptModal";

// --- ESC/POS Command Constants ---
const ESC = 0x1b;
const GS = 0x1d;
const DLE = 0x10;

export type PrinterWidth = "80mm" | "58mm";
export type TextAlignment = "left" | "center" | "right";
export type TextSize = "normal" | "double-height" | "double-width" | "double" | "triple" | "quad";
export type BarcodeType = "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC_A" | "ITF";
export type QrErrorLevel = "L" | "M" | "Q" | "H";

export interface EscPosOptions {
  width?: PrinterWidth;
  cut?: boolean;
  openCashDrawer?: boolean;
  beep?: boolean;
  printQr?: boolean;
  printBarcode?: boolean;
  footerText?: string;
  encoding?: "ascii" | "utf-8" | "windows-1252";
}

export interface TableColumn {
  text: string;
  width: number; // in characters
  align?: TextAlignment;
}

/**
 * EscPosBuilder provides a fluent chainable API for constructing standard ESC/POS binary buffers.
 */
export class EscPosBuilder {
  private buffer: number[] = [];
  private width: PrinterWidth;
  private maxCols: number;

  constructor(width: PrinterWidth = "80mm") {
    this.width = width;
    this.maxCols = width === "80mm" ? 48 : 32;
    this.init();
  }

  /**
   * Initializes printer, resets formatting and line buffer.
   * Command: ESC @ (0x1B 0x40)
   */
  public init(): this {
    this.buffer.push(ESC, 0x40);
    return this;
  }

  /**
   * Set text alignment (left, center, right).
   * Command: ESC a n (0x1B 0x61 n)
   */
  public align(alignment: TextAlignment): this {
    let n = 0;
    if (alignment === "center") n = 1;
    else if (alignment === "right") n = 2;
    this.buffer.push(ESC, 0x61, n);
    return this;
  }

  /**
   * Set bold / emphasized text mode.
   * Command: ESC E n (0x1B 0x45 n)
   */
  public bold(enable: boolean = true): this {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  /**
   * Set underline mode.
   * Command: ESC - n (0x1B 0x2D n)
   * 0 = off, 1 = 1-dot, 2 = 2-dots
   */
  public underline(enable: boolean | 0 | 1 | 2 = 1): this {
    let n = 0;
    if (typeof enable === "boolean") {
      n = enable ? 1 : 0;
    } else {
      n = enable;
    }
    this.buffer.push(ESC, 0x2d, n);
    return this;
  }

  /**
   * Set inverted / reverse text (white text on black background).
   * Command: GS B n (0x1D 0x42 n)
   */
  public invert(enable: boolean = true): this {
    this.buffer.push(GS, 0x42, enable ? 1 : 0);
    return this;
  }

  /**
   * Set character font size multiplier.
   * Command: GS ! n (0x1D 0x21 n)
   */
  public size(textSize: TextSize | { widthMul?: number; heightMul?: number }): this {
    let n = 0x00;

    if (typeof textSize === "string") {
      switch (textSize) {
        case "normal":
          n = 0x00;
          break;
        case "double-height":
          n = 0x01;
          break;
        case "double-width":
          n = 0x10;
          break;
        case "double":
          n = 0x11; // 2x width + 2x height
          break;
        case "triple":
          n = 0x22; // 3x width + 3x height
          break;
        case "quad":
          n = 0x33; // 4x width + 4x height
          break;
      }
    } else {
      const w = Math.min(7, Math.max(0, (textSize.widthMul ?? 1) - 1));
      const h = Math.min(7, Math.max(0, (textSize.heightMul ?? 1) - 1));
      n = (w << 4) | h;
    }

    this.buffer.push(GS, 0x21, n);
    return this;
  }

  /**
   * Add raw text encoded in safe thermal ASCII/Latin-1 characters.
   * Converts Indian Rupee symbol (₹) to standard 'Rs.' so generic thermal ROMs don't print garbage.
   */
  public text(str: string): this {
    const cleanStr = str.replace(/₹/g, "Rs.");
    for (let i = 0; i < cleanStr.length; i++) {
      const code = cleanStr.charCodeAt(i);
      if (code < 128) {
        this.buffer.push(code);
      } else {
        // Fallback for extended ASCII or sanitize
        this.buffer.push(cleanStr.charCodeAt(i) & 0xff);
      }
    }
    return this;
  }

  /**
   * Add text followed by a newline (LF: 0x0A).
   */
  public textLine(str: string = ""): this {
    this.text(str);
    this.buffer.push(0x0a);
    return this;
  }

  /**
   * Feed n lines.
   * Command: ESC d n (0x1B 0x64 n)
   */
  public feed(lines: number = 1): this {
    if (lines <= 0) return this;
    this.buffer.push(ESC, 0x64, Math.min(lines, 255));
    return this;
  }

  /**
   * Add newlines.
   */
  public newline(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  /**
   * Print a horizontal divider line of specified character.
   */
  public hr(char: string = "-", customWidth?: number): this {
    const width = customWidth || this.maxCols;
    const line = char.charAt(0).repeat(width);
    this.textLine(line);
    return this;
  }

  /**
   * Format two columns on a single line (Left text and Right text) with exact space padding.
   */
  public twoColumns(leftText: string, rightText: string, customWidth?: number): this {
    const totalWidth = customWidth || this.maxCols;
    const leftClean = leftText.replace(/₹/g, "Rs.");
    const rightClean = rightText.replace(/₹/g, "Rs.");

    const spaceCount = Math.max(1, totalWidth - leftClean.length - rightClean.length);
    const line = leftClean + " ".repeat(spaceCount) + rightClean;
    this.textLine(line.slice(0, totalWidth));
    return this;
  }

  /**
   * Format a multi-column table row with customizable alignment for each cell.
   */
  public tableRow(cols: TableColumn[]): this {
    let rowStr = "";
    for (const col of cols) {
      const clean = col.text.replace(/₹/g, "Rs.");
      let cell = "";

      if (clean.length > col.width) {
        cell = clean.slice(0, col.width);
      } else {
        const padLen = col.width - clean.length;
        if (col.align === "right") {
          cell = " ".repeat(padLen) + clean;
        } else if (col.align === "center") {
          const leftPad = Math.floor(padLen / 2);
          const rightPad = padLen - leftPad;
          cell = " ".repeat(leftPad) + clean + " ".repeat(rightPad);
        } else {
          // Left align
          cell = clean + " ".repeat(padLen);
        }
      }
      rowStr += cell;
    }
    this.textLine(rowStr);
    return this;
  }

  /**
   * Print standard 1D Barcode (CODE128, CODE39, EAN13).
   * Uses standard ESC/POS GS k sequence.
   */
  public barcode(
    data: string,
    type: BarcodeType = "CODE128",
    options?: { height?: number; width?: number; hriPosition?: "none" | "above" | "below" | "both" }
  ): this {
    const height = options?.height || 64; // default 64 dots
    const width = options?.width || 2; // module width 2-6
    let hri = 2; // below barcode by default
    if (options?.hriPosition === "none") hri = 0;
    else if (options?.hriPosition === "above") hri = 1;
    else if (options?.hriPosition === "both") hri = 3;

    // Set Barcode Height: GS h n
    this.buffer.push(GS, 0x68, height);
    // Set Barcode Width: GS w n
    this.buffer.push(GS, 0x77, width);
    // Set HRI position: GS H n
    this.buffer.push(GS, 0x48, hri);

    // Encode barcode data
    if (type === "CODE128") {
      // CODE128 Function B (GS k 73 len data)
      const cleanData = data.trim();
      const codeBData = "{B" + cleanData;
      this.buffer.push(GS, 0x6b, 73, codeBData.length);
      for (let i = 0; i < codeBData.length; i++) {
        this.buffer.push(codeBData.charCodeAt(i));
      }
    } else if (type === "CODE39") {
      const cleanData = data.trim().toUpperCase();
      this.buffer.push(GS, 0x6b, 69, cleanData.length);
      for (let i = 0; i < cleanData.length; i++) {
        this.buffer.push(cleanData.charCodeAt(i));
      }
    } else if (type === "EAN13") {
      const cleanData = data.replace(/\D/g, "").slice(0, 13);
      this.buffer.push(GS, 0x6b, 67, cleanData.length);
      for (let i = 0; i < cleanData.length; i++) {
        this.buffer.push(cleanData.charCodeAt(i));
      }
    }

    this.feed(1);
    return this;
  }

  /**
   * Print 2D QR Code using standard ESC/POS GS ( k commands.
   * Model 2, configurable module size (1-16) and error correction level.
   */
  public qrCode(
    data: string,
    options?: { size?: number; errorLevel?: QrErrorLevel }
  ): this {
    const size = Math.min(16, Math.max(1, options?.size || (this.width === "80mm" ? 6 : 5)));
    let errCode = 49; // M by default
    if (options?.errorLevel === "L") errCode = 48;
    else if (options?.errorLevel === "Q") errCode = 50;
    else if (options?.errorLevel === "H") errCode = 51;

    const dataBytes: number[] = [];
    for (let i = 0; i < data.length; i++) {
      dataBytes.push(data.charCodeAt(i) & 0xff);
    }

    // 1. Select QR Code Model: GS ( k 4 0 49 65 50 0 (Model 2)
    this.buffer.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

    // 2. Set Module Size: GS ( k 3 0 49 67 size
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size);

    // 3. Set Error Correction Level: GS ( k 3 0 49 69 errCode
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, errCode);

    // 4. Store QR Code Data: GS ( k pL pH 49 80 48 data
    const len = dataBytes.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);
    this.buffer.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...dataBytes);

    // 5. Print QR Code Symbol: GS ( k 3 0 49 81 48
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);

    this.feed(1);
    return this;
  }

  /**
   * Cash Drawer Kick-out pulse.
   * Command: ESC p m t1 t2 (0x1B 0x70 m t1 t2)
   * m = 0 (Pin 2, standard), m = 1 (Pin 5)
   */
  public cashDrawer(pin: 2 | 5 = 2, onTimeMs: number = 50, offTimeMs: number = 250): this {
    const m = pin === 2 ? 0 : 1;
    const t1 = Math.min(255, Math.floor(onTimeMs / 2));
    const t2 = Math.min(255, Math.floor(offTimeMs / 2));
    this.buffer.push(ESC, 0x70, m, t1, t2);
    // Also send standard DLE DC4 real-time cash drawer pulse as fallback
    this.buffer.push(DLE, 0x14, 0x01, 0x00, 0x01);
    return this;
  }

  /**
   * Audio Beep / Buzzer pulse.
   * Command: ESC B n t (0x1B 0x42 n t)
   */
  public beep(times: number = 1, duration: number = 1): this {
    this.buffer.push(ESC, 0x42, Math.min(times, 9), Math.min(duration, 9));
    return this;
  }

  /**
   * Feed and Paper Cut command.
   * Command: GS V 66 n (Feed n lines and partial cut) or GS V 65 n (full cut).
   */
  public cut(partial: boolean = true, feedLines: number = 3): this {
    this.feed(feedLines);
    // GS V m n (m=66 partial cut, m=65 full cut)
    this.buffer.push(GS, 0x56, partial ? 0x42 : 0x41, 0x00);
    return this;
  }

  /**
   * Append raw byte array to buffer.
   */
  public raw(bytes: number[] | Uint8Array): this {
    if (bytes instanceof Uint8Array) {
      for (let i = 0; i < bytes.length; i++) {
        this.buffer.push(bytes[i]);
      }
    } else {
      this.buffer.push(...bytes);
    }
    return this;
  }

  /**
   * Compile and return the generated Uint8Array bytes.
   */
  public build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Return buffer as Blob with application/octet-stream mime type.
   */
  public toBlob(): Blob {
    return new Blob([this.build()], { type: "application/octet-stream" });
  }

  /**
   * Return buffer encoded as base64 string.
   */
  public toBase64(): string {
    const bytes = this.build();
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Trigger direct browser download of the raw binary ESC/POS file.
   */
  public download(filename: string = "receipt.bin"): void {
    const blob = this.toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  /**
   * Maximum printable columns for current paper width.
   */
  public getMaxCols(): number {
    return this.maxCols;
  }
}

// --- High-Level Receipt Generator ---

/**
 * Builds standard ESC/POS raw bytes for a complete receipt from ReceiptData.
 */
export function buildReceiptEscPos(data: ReceiptData, options?: EscPosOptions): Uint8Array {
  const width: PrinterWidth = options?.width || "80mm";
  const is80mm = width === "80mm";
  const builder = new EscPosBuilder(width);

  // 1. Kick Cash Drawer if cash payment or explicitly enabled
  if (options?.openCashDrawer || (data.paymentMethod === "Cash" && options?.openCashDrawer !== false)) {
    builder.cashDrawer(2, 50, 250);
  }

  // 2. Beep if requested
  if (options?.beep) {
    builder.beep(1, 1);
  }

  // 3. Store Header
  builder.align("center");
  builder.bold(true);
  builder.size("double-height");
  builder.textLine(data.storeName || "CredSmart Retail Store");
  builder.size("normal");
  builder.bold(false);

  if (data.storeAddress) {
    builder.textLine(data.storeAddress);
  }
  if (data.storePhone) {
    builder.textLine(`Tel: ${data.storePhone}`);
  }
  if (data.gstin) {
    builder.bold(true);
    builder.textLine(`GSTIN: ${data.gstin}`);
    builder.bold(false);
  }

  builder.newline(1);
  builder.bold(true);
  builder.invert(true);
  builder.textLine(data.isEstimate ? " *** ESTIMATE / QUOTATION *** " : " *** TAX INVOICE *** ");
  builder.invert(false);
  builder.bold(false);

  // 4. Invoice Metadata
  builder.hr("=");
  builder.align("left");

  const receiptDate = data.date instanceof Date ? data.date : new Date(data.date || Date.now());
  const dateStr = receiptDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = receiptDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  builder.twoColumns(`Inv: ${data.invoiceNumber}`, dateStr);
  builder.twoColumns(`Pay: ${data.paymentMethod}`, timeStr);
  builder.textLine(`Cust: ${data.customerName || "Walk-in Customer"}${data.customerPhone ? ` (${data.customerPhone})` : ""}`);

  builder.hr("-");

  // 5. Items Table Header
  builder.bold(true);
  if (is80mm) {
    // 48 column layout: Item (22) + Qty (6) + Rate (10) + Amt (10)
    builder.tableRow([
      { text: "Item Description", width: 22, align: "left" },
      { text: "Qty", width: 6, align: "center" },
      { text: "Rate", width: 10, align: "right" },
      { text: "Amount", width: 10, align: "right" },
    ]);
  } else {
    // 32 column layout: Item (16) + Qty (5) + Amt (11)
    builder.tableRow([
      { text: "Item", width: 16, align: "left" },
      { text: "Qty", width: 5, align: "center" },
      { text: "Amount", width: 11, align: "right" },
    ]);
  }
  builder.bold(false);
  builder.hr("-");

  // 6. Items List
  data.items.forEach((item) => {
    const rate = item.batch.mrp;
    const lineTotal = rate * item.quantity;
    const name = item.product.name;

    if (is80mm) {
      builder.tableRow([
        { text: name, width: 22, align: "left" },
        { text: String(item.quantity), width: 6, align: "center" },
        { text: rate.toFixed(2), width: 10, align: "right" },
        { text: lineTotal.toFixed(2), width: 10, align: "right" },
      ]);
    } else {
      builder.tableRow([
        { text: name, width: 16, align: "left" },
        { text: String(item.quantity), width: 5, align: "center" },
        { text: lineTotal.toFixed(2), width: 11, align: "right" },
      ]);
    }

    if (item.batch.batchNumber && item.batch.batchNumber !== "Default" && item.batch.batchNumber !== "Main") {
      builder.textLine(`  (Batch: ${item.batch.batchNumber})`);
    }
  });

  builder.hr("-");

  // 7. Totals & Tax Calculation
  builder.align("left");
  builder.twoColumns("Subtotal", `Rs.${data.subtotal.toFixed(2)}`);

  if (data.discountAmount > 0) {
    builder.twoColumns(`Discount (${data.discountLabel || "Promo"})`, `-Rs.${data.discountAmount.toFixed(2)}`);
  }

  if (data.tax > 0) {
    const cgst = data.tax / 2;
    const sgst = data.tax / 2;
    builder.twoColumns("CGST (Tax)", `Rs.${cgst.toFixed(2)}`);
    builder.twoColumns("SGST (Tax)", `Rs.${sgst.toFixed(2)}`);
  }

  if (data.creditApplied && data.creditApplied > 0) {
    builder.twoColumns("Credit Applied", `-Rs.${data.creditApplied.toFixed(2)}`);
  }

  const exactTotal = data.subtotal - data.discountAmount + data.tax - (data.creditApplied || 0);
  const roundOff = data.roundOff !== undefined ? data.roundOff : Number((data.total - exactTotal).toFixed(2));
  if (Math.abs(roundOff) > 0.001) {
    builder.twoColumns("Round Off", `${roundOff > 0 ? "+" : ""}Rs.${roundOff.toFixed(2)}`);
  }

  builder.hr("=");

  // Grand Total in Bold / Large
  builder.bold(true);
  builder.size("double-height");
  builder.twoColumns("GRAND TOTAL", `Rs.${data.total.toFixed(2)}`);
  builder.size("normal");
  builder.bold(false);

  builder.hr("=");

  // Split Breakdown if applicable
  if (data.splitPayments) {
    const sp = data.splitPayments;
    let splitSummary = "Split: ";
    if (sp.cash > 0) splitSummary += `Cash: Rs.${sp.cash.toFixed(2)} `;
    if (sp.card > 0) splitSummary += `Card: Rs.${sp.card.toFixed(2)} `;
    if (sp.upi > 0) splitSummary += `UPI: Rs.${sp.upi.toFixed(2)} `;
    if (sp.credit && sp.credit > 0) splitSummary += `Credit: Rs.${sp.credit.toFixed(2)} `;
    builder.textLine(splitSummary);
    builder.newline(1);
  }

  // 8. UPI QR Code or Verification QR Code
  builder.align("center");
  if (options?.printQr !== false) {
    const qrData = `upi://pay?pa=credsmart@upi&pn=${encodeURIComponent(data.storeName || "CredSmart")}&am=${data.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(data.invoiceNumber)}`;
    builder.qrCode(qrData, { size: is80mm ? 6 : 4, errorLevel: "M" });
    builder.textLine("Scan UPI QR to Pay / Verify");
    builder.newline(1);
  }

  // 9. Barcode of Invoice
  if (options?.printBarcode) {
    builder.barcode(data.invoiceNumber.replace(/[^a-zA-Z0-9]/g, ""), "CODE128", {
      height: 48,
      width: 2,
      hriPosition: "below",
    });
  }

  // 10. Footer Slogan
  const footer = options?.footerText || "Thank you for shopping with us! Visit again.";
  builder.textLine(footer);
  builder.textLine("Software by CredSmart Retail OS");

  // 11. Feed & Paper Cut
  if (options?.cut !== false) {
    builder.cut(true, 4);
  } else {
    builder.feed(4);
  }

  return builder.build();
}

// --- Direct Hardware Connectivity Helpers (WebUSB & Web Bluetooth & Raw Spooling) ---

/**
 * Send ESC/POS raw bytes directly to a USB thermal printer via WebUSB API.
 */
export async function printViaWebUSB(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
  try {
    if (!("usb" in navigator)) {
      return { success: false, error: "WebUSB is not supported by your browser. Please use Chrome/Edge or standard print dialog." };
    }

    const usb = (navigator as any).usb;
    const device = await usb.requestDevice({ filters: [] });
    await device.open();

    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    // Locate OUT endpoint
    const iface = device.configuration.interfaces[0];
    const alternate = iface.alternates[0];
    const outEndpoint = alternate.endpoints.find((e: any) => e.direction === "out");

    if (!outEndpoint) {
      await device.close();
      return { success: false, error: "No writable OUT endpoint found on USB printer." };
    }

    await device.transferOut(outEndpoint.endpointNumber, bytes);
    await device.close();
    return { success: true };
  } catch (err: any) {
    console.warn("WebUSB Print Exception:", err);
    return { success: false, error: err.message || "Failed to communicate with USB printer." };
  }
}

/**
 * Send ESC/POS raw bytes directly to a Bluetooth thermal printer via Web Bluetooth API.
 */
export async function printViaWebBluetooth(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
  try {
    if (!("bluetooth" in navigator)) {
      return { success: false, error: "Web Bluetooth is not supported in this browser." };
    }

    const bluetooth = (navigator as any).bluetooth;
    // Request thermal printer device (common thermal services or standard serial)
    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "000018f0-0000-1000-8000-00805f9b34fb", // Standard ESC/POS Service
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      ],
    });

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    let targetCharacteristic: any = null;
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          targetCharacteristic = char;
          break;
        }
      }
      if (targetCharacteristic) break;
    }

    if (!targetCharacteristic) {
      server.disconnect();
      return { success: false, error: "No writable Bluetooth characteristic found on thermal printer." };
    }

    // Send in chunks of 512 bytes
    const chunkSize = 512;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      await targetCharacteristic.writeValue(chunk);
    }

    server.disconnect();
    return { success: true };
  } catch (err: any) {
    console.warn("Web Bluetooth Print Exception:", err);
    return { success: false, error: err.message || "Failed to send Bluetooth print payload." };
  }
}
