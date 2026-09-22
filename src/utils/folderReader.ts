/**
 * Recursive Folder Reader & Tally Company Directory Inspector
 *
 * Enables seamless drag-and-drop or selection of entire directories
 * (e.g. C:\TallyPrime\Data\10000 or an export directory with multiple XML/Excel files).
 */

export interface ScannedFolderResult {
  folderName: string;
  files: File[];
  xmlFiles: File[];
  excelFiles: File[];
  csvFiles: File[];
  isRawTallyCompanyDir: boolean;
  tallyCompanyInfo?: {
    companyName?: string;
    companyNumber?: string;
    financialYear?: string;
    address?: string;
  };
}

/**
 * Recursively extracts all files from a DragEvent's DataTransfer items,
 * traversing nested subdirectories.
 */
export async function extractFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const files: File[] = [];

  // Check if items are available and support webkitGetAsEntry
  const items = dataTransfer.items;
  if (items && items.length > 0) {
    const queue: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== "file") continue;

      // Try webkitGetAsEntry for directory traversal
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        queue.push(traverseEntry(entry, files));
      } else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    await Promise.all(queue);
    return files;
  }

  // Fallback to standard files list
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    return Array.from(dataTransfer.files);
  }

  return [];
}

/**
 * Traverses a FileSystemEntry (file or directory) recursively.
 */
async function traverseEntry(entry: any, fileList: File[]): Promise<void> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file(
        (file: File) => {
          // Attach relative path if available
          Object.defineProperty(file, "webkitRelativePath", {
            value: entry.fullPath ? entry.fullPath.replace(/^\//, "") : file.name,
            writable: true,
          });
          fileList.push(file);
          resolve();
        },
        () => resolve()
      );
    });
  }

  if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const readEntries = (): Promise<any[]> => {
      return new Promise((resolve) => {
        dirReader.readEntries(
          (entries: any[]) => resolve(entries),
          () => resolve([])
        );
      });
    };

    let entries: any[] = await readEntries();
    // readEntries can return results in chunks, loop until empty
    while (entries.length > 0) {
      const childrenPromises = entries.map((child) => traverseEntry(child, fileList));
      await Promise.all(childrenPromises);
      entries = await readEntries();
    }
  }
}

/**
 * Inspects a list of files from an uploaded folder to detect Tally structures,
 * categorized files, and extract company metadata from raw Tally files if present.
 */
export async function inspectUploadedFolder(files: File[]): Promise<ScannedFolderResult> {
  if (files.length === 0) {
    return {
      folderName: "Empty Folder",
      files: [],
      xmlFiles: [],
      excelFiles: [],
      csvFiles: [],
      isRawTallyCompanyDir: false,
    };
  }

  // Determine top-level folder name from relative path if available
  let folderName = "Uploaded Folder";
  for (const f of files) {
    const rel = f.webkitRelativePath || (f as any).fullPath;
    if (rel && rel.includes("/")) {
      const topDir = rel.split("/")[0];
      if (topDir) {
        folderName = topDir;
        break;
      }
    }
  }

  const xmlFiles = files.filter((f) => f.name.toLowerCase().endsWith(".xml"));
  const excelFiles = files.filter((f) => {
    const n = f.name.toLowerCase();
    return n.endsWith(".xlsx") || n.endsWith(".xls");
  });
  const csvFiles = files.filter((f) => {
    const n = f.name.toLowerCase();
    return n.endsWith(".csv") || n.endsWith(".txt");
  });

  // Check if this is a raw Tally company directory (e.g. contains Company.900, Company.1800, *.1800, *.900, *.tsf)
  const companyFile = files.find((f) => {
    const n = f.name.toLowerCase();
    return (
      n === "company.900" ||
      n.endsWith(".900") ||
      n === "company.1800" ||
      n.endsWith(".1800")
    );
  });
  const isRawTallyCompanyDir =
    !!companyFile ||
    files.some((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith(".tsf") || n.endsWith(".1800") || n.endsWith(".900");
    });

  let tallyCompanyInfo: ScannedFolderResult["tallyCompanyInfo"] = undefined;
  if (companyFile) {
    tallyCompanyInfo = await parseCompany900File(companyFile, folderName);
  }

  return {
    folderName,
    files,
    xmlFiles,
    excelFiles,
    csvFiles,
    isRawTallyCompanyDir,
    tallyCompanyInfo,
  };
}

/**
 * Parses raw Company.900 or Company.1800 file to extract company name, directory ID, and metadata.
 */
export async function parseCompany900File(
  file: File,
  folderName: string
): Promise<{ companyName?: string; companyNumber?: string; financialYear?: string; address?: string }> {
  try {
    let text = "";

    if (typeof (file as any).text === "function") {
      try {
        text = await (file as any).text();
      } catch {
        text = "";
      }
    }

    if (!text || text.includes("\0")) {
      if (typeof (file as any).arrayBuffer === "function") {
        try {
          const buffer = await (file as any).arrayBuffer();
          const bytes = new Uint8Array(buffer);
          // Try UTF-16LE decoding (for binary TallyPrime .1800 files)
          try {
            const decoder = new TextDecoder("utf-16le");
            const decoded = decoder.decode(bytes).replace(/[^\x20-\x7E\r\n]/g, " ");
            if (decoded.trim().length > 10) {
              text = decoded;
            }
          } catch {
            // ignore
          }

          if (!text) {
            let asciiText = "";
            for (let i = 0; i < bytes.length; i++) {
              const b = bytes[i];
              if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
                asciiText += String.fromCharCode(b);
              } else {
                asciiText += " ";
              }
            }
            text = asciiText;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!text && typeof FileReader !== "undefined") {
      text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsText(file);
      });
    }

    // Tally company names in Company.900 / Company.1800 typically appear near the start
    let companyName: string | undefined;
    const words = text.split(/\s{2,}/).map((w) => w.trim()).filter((w) => w.length > 2);

    // Look for recognizable company strings
    for (const w of words) {
      if (
        /company/i.test(w) ||
        /pvt|ltd|limited|enterprises|traders|agency|stores|industries|corp|user/i.test(w)
      ) {
        companyName = w;
        break;
      }
    }

    if (!companyName && words.length > 0) {
      // Pick the first non-numeric descriptive word
      companyName = words.find((w) => /^[A-Za-z]/.test(w) && w.length >= 4);
    }

    const companyNumber = /^\d+$/.test(folderName) ? folderName : undefined;

    return {
      companyName: companyName || `Tally Company (${folderName})`,
      companyNumber: companyNumber || "10000",
      financialYear: "Current FY",
    };
  } catch (err) {
    console.warn("Error parsing Tally company file:", err);
    return {
      companyName: `Tally Company (${folderName})`,
      companyNumber: folderName,
    };
  }
}
