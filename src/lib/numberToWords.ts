export function numberToWords(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return "Zero";
  if (num === 0) return "Zero";

  const absNum = Math.abs(num);
  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertChunk = (nVal: number): string => {
    if (nVal === 0) return "";
    const numStr = nVal.toString();
    if (numStr.length > 9) return "Overflow";

    const padded = ('000000000' + numStr).slice(-9);
    const parts = padded.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!parts) return "";

    let str = "";
    const crore = Number(parts[1]);
    const lakh = Number(parts[2]);
    const thousand = Number(parts[3]);
    const hundred = Number(parts[4]);
    const tens = Number(parts[5]);

    if (crore > 0) {
      str += (crore < 20 ? a[crore] : b[Math.floor(crore / 10)] + (crore % 10 > 0 ? " " + a[crore % 10] : "")) + " Crore ";
    }
    if (lakh > 0) {
      str += (lakh < 20 ? a[lakh] : b[Math.floor(lakh / 10)] + (lakh % 10 > 0 ? " " + a[lakh % 10] : "")) + " Lakh ";
    }
    if (thousand > 0) {
      str += (thousand < 20 ? a[thousand] : b[Math.floor(thousand / 10)] + (thousand % 10 > 0 ? " " + a[thousand % 10] : "")) + " Thousand ";
    }
    if (hundred > 0) {
      str += a[hundred] + " Hundred ";
    }
    if (tens > 0) {
      if (str !== "") str += "and ";
      str += tens < 20 ? a[tens] : b[Math.floor(tens / 10)] + (tens % 10 > 0 ? " " + a[tens % 10] : "");
    }

    return str.trim();
  };

  const rupeeWords = rupees > 0 ? convertChunk(rupees) : (paise > 0 ? "" : "Zero");
  const paiseWords = paise > 0 ? (paise < 20 ? a[paise] : b[Math.floor(paise / 10)] + (paise % 10 > 0 ? " " + a[paise % 10] : "")) + " Paise" : "";

  let result = rupeeWords;
  if (paiseWords) {
    result = result ? `${result} and ${paiseWords}` : paiseWords;
  }

  return (num < 0 ? "Minus " : "") + result;
}

