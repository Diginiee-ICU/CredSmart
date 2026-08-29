import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function exportToCSV(filename: string, rows: any /* eslint-disable-line @typescript-eslint/no-explicit-any */[][]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const processRow = (row: any /* eslint-disable-line @typescript-eslint/no-explicit-any */[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    return row
      .map((val) => {
        const str = String(val === null || val === undefined ? "" : val);
        if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
          return `"${str.replace(/"/g, "\"\"")}"`;
        }
        return str;
      })
      .join(",");
  };
  const csvContent = rows.map(processRow).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
