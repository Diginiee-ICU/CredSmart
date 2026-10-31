const { app, BrowserWindow, dialog, shell, ipcMain } = require("electron");
const http = require("node:http");
const fs = require("node:fs/promises");
const { randomBytes } = require("node:crypto");
const path = require("node:path");

// ─── Configuration ───────────────────────────────────────────────────────────

const BRIDGE_PORT = Number(process.env.CREDSMART_BRIDGE_PORT || 9005);
let TALLY_URL = process.env.CREDSMART_TALLY_URL || "http://127.0.0.1:9000";
const MAX_BODY_BYTES = 50 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;

const desktopPairingToken =
  process.env.CREDSMART_SYNC_TOKEN ||
  `crds_desktop_${randomBytes(18).toString("hex")}`;

const ALLOWED_ORIGINS = new Set([
  "https://pos.credalert.business",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "null", // Electron file:// origin
]);

let bridgeServer;

// ─── Direct Tally Request Helper (Node-native, 0 CORS) ───────────────────────

function requestTally(xml, customUrl = TALLY_URL, customTimeout = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(xml, "utf8");
    const target = new URL(customUrl);
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path: `${target.pathname || "/"}${target.search || ""}`,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "Content-Length": payload.length,
        },
        timeout: customTimeout,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Tally server responded with HTTP ${res.statusCode}`));
            return;
          }
          if (!body.trim()) {
            reject(new Error("Tally returned an empty response"));
            return;
          }
          resolve(body);
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error(`Tally request timed out after ${customTimeout}ms`)));
    req.on("error", (err) => {
      reject(new Error(`Cannot connect to Tally on ${customUrl}: ${err.message}`));
    });
    req.end(payload);
  });
}

// ─── Tally Bridge (in-process CORS proxy for external browser access) ─────────

function writeJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function getCorsHeaders(req) {
  const origin = req.headers.origin || "null";
  if (origin !== "null" && !ALLOWED_ORIGINS.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, x-credsmart-sync-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

function isAuthorized(req) {
  const origin = req.headers.origin;
  if (!origin || origin === "null") return true;
  if (!desktopPairingToken) return false;
  const supplied = req.headers["x-credsmart-sync-token"];
  return typeof supplied === "string" && supplied.length > 0 && supplied === desktopPairingToken;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body exceeds 50 MB limit"));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function startBridgeServer() {
  bridgeServer = http.createServer(async (req, res) => {
    const cors = getCorsHeaders(req);
    if (!cors) {
      writeJson(res, 403, { error: "Origin not allowed" });
      return;
    }
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!isAuthorized(req)) {
      writeJson(res, 401, { error: "Missing or invalid pairing token" });
      return;
    }

    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      writeJson(res, 200, {
        status: "ok",
        bridge: "CredSmart Embedded Tally Bridge",
        version: "2.0.0",
        tallyUrl: TALLY_URL,
        port: BRIDGE_PORT,
      });
      return;
    }

    if (req.method !== "POST" || req.url !== "/") {
      writeJson(res, 404, { error: "Not found" });
      return;
    }

    try {
      const body = await readBody(req);
      if (!body.trim()) {
        writeJson(res, 400, { error: "XML request body is required" });
        return;
      }
      const xml = await requestTally(body);
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
      res.end(xml);
      const type = body.includes("<REPORTNAME>Day Book</REPORTNAME>") ? "daybook" : "masters";
      console.log(`[CredSmart Bridge] proxied ${type} request to Tally`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tally bridge request failed";
      console.error(`[CredSmart Bridge] ${message}`);
      writeJson(res, 502, { error: message, code: "TALLY_UNAVAILABLE" });
    }
  });

  bridgeServer.on("error", (err) => {
    console.error(`[CredSmart Bridge] Cannot start on port ${BRIDGE_PORT}: ${err.message}`);
  });

  bridgeServer.listen(BRIDGE_PORT, "127.0.0.1", () => {
    console.log(`[CredSmart Bridge] Listening on http://127.0.0.1:${BRIDGE_PORT}`);
    console.log(`[CredSmart Bridge] Tally upstream: ${TALLY_URL}`);
  });
}

function stopBridgeServer() {
  if (bridgeServer) {
    bridgeServer.close();
    bridgeServer = undefined;
    console.log("[CredSmart Bridge] Stopped");
  }
}

// ─── IPC Handlers for Native In-App Direct Sync & File Access ─────────────────

const TALLY_TEST_XML = `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
        <REPORTNAME>List of Companies</REPORTNAME>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

function registerIpcHandlers() {
  // Direct IPC request to Tally with auto-port recovery
  ipcMain.handle("tally:request", async (_event, xml) => {
    try {
      return await requestTally(xml, TALLY_URL, 15000);
    } catch (err) {
      // If primary TALLY_URL failed, quickly auto-scan other common ports
      const commonPorts = [9000, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009, 9010];
      const originalHost = new URL(TALLY_URL).hostname;

      for (const port of commonPorts) {
        const testUrl = `http://${originalHost}:${port}`;
        if (testUrl === TALLY_URL) continue;
        try {
          const res = await requestTally(xml, testUrl, 3000);
          TALLY_URL = testUrl; // Save new discovered port
          console.log(`[CredSmart Bridge] Auto-switched to active Tally port: ${testUrl}`);
          return res;
        } catch {
          // continue scanning
        }
      }

      throw new Error(
        `Cannot connect to Tally. If Tally Prime is open, please press Esc until you are at the main "Gateway of Tally" screen (close any open dialogs or configuration pop-ups) and verify ODBC port 9000 is enabled in F1 > Settings > Connectivity.`
      );
    }
  });

  // Direct IPC probe
  ipcMain.handle("tally:probe", async () => {
    const commonPorts = [9000, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009, 9010, 8080, 9090, 80, 443];
    const originalHost = new URL(TALLY_URL).hostname;

    let lastError = null;
    const scanTimeoutMs = 1500; // Fast fail for non-listening ports

    for (const port of commonPorts) {
      const testUrl = `http://${originalHost}:${port}`;
      try {
        const start = Date.now();
        const xml = await requestTally(TALLY_TEST_XML, testUrl, scanTimeoutMs);
        const latencyMs = Date.now() - start;
        let company = "Tally Active Company";
        const match = xml.match(/<COMPANY[^>]*NAME="([^"]+)"/i) || xml.match(/<COMPANY[^>]*>([^<]+)<\/COMPANY>/i);
        if (match && match[1]) {
          company = match[1].trim();
        }
        TALLY_URL = testUrl; // Save successful URL
        console.log(`[CredSmart Bridge] Auto-discovered Tally on ${testUrl}`);
        return { online: true, companyName: company, latencyMs, resolvedUrl: testUrl };
      } catch (err) {
        lastError = err;
      }
    }

    return {
      online: false,
      error: `Auto-search scanned ports (9000-9010) but Tally was not found. Please ensure Tally is running and ODBC is enabled.`,
    };
  });

  // Direct native file picker
  ipcMain.handle("dialog:openFiles", async (_event, options) => {
    const result = await dialog.showOpenDialog({
      title: "Select Accounting Files (XML, Excel, CSV, TXT)",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Accounting Files", extensions: ["xml", "csv", "xlsx", "xls", "txt"] },
        { name: "All Files", extensions: ["*"] },
      ],
      ...options,
    });

    if (result.canceled || !result.filePaths.length) return null;

    const files = [];
    for (const filePath of result.filePaths) {
      try {
        const buffer = await fs.readFile(filePath);
        files.push({
          name: path.basename(filePath),
          path: filePath,
          relativePath: path.basename(filePath),
          size: buffer.length,
          dataBase64: buffer.toString("base64"),
        });
      } catch (err) {
        console.warn(`Could not read file ${filePath}:`, err.message);
      }
    }
    return files;
  });

  // Direct native directory picker (recursive traversal up to 8 levels)
  ipcMain.handle("dialog:openFolder", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select Accounting Folder or Tally Company Directory",
      properties: ["openDirectory"],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const folderPath = result.filePaths[0];
    const files = [];

    async function scanDir(currentDir, depth = 0) {
      if (depth > 8) return;
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            await scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            try {
              const buffer = await fs.readFile(fullPath);
              files.push({
                name: entry.name,
                path: fullPath,
                relativePath: path.relative(folderPath, fullPath).replace(/\\/g, "/"),
                size: buffer.length,
                dataBase64: buffer.toString("base64"),
              });
            } catch (readErr) {
              console.warn(`Could not read file ${fullPath}:`, readErr.message);
            }
          }
        }
      } catch (dirErr) {
        console.warn(`Could not read directory ${currentDir}:`, dirErr.message);
      }
    }

    await scanDir(folderPath);

    return {
      folderPath,
      folderName: path.basename(folderPath),
      files,
    };
  });

  // Direct native directory picker for Tally auto search
  ipcMain.handle("tally:autoSearchFolder", async () => {
    const { app } = require("electron");
    const searchDirs = [
      "C:\\TallyPrime",
      "C:\\TallyPrime\\Data",
      "C:\\Program Files\\TallyPrime",
      "C:\\Tally.ERP9",
      "C:\\Tally.ERP9\\Data",
      "C:\\Tally",
      "C:\\Tally\\Data",
      "C:\\Program Files\\Tally.ERP9",
      "D:\\TallyPrime",
      "D:\\Tally.ERP9",
      "D:\\Tally",
      path.join(app.getPath("desktop"), "Tally Data"),
      path.join(app.getPath("downloads"), "Tally Data"),
      path.join(app.getPath("documents"), "Tally Data")
    ];

    let foundFiles = [];
    let foundDir = "";

    async function scanDir(currentDir, depth = 0) {
      if (depth > 5) return;
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            await scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const lowerName = entry.name.toLowerCase();
            if (lowerName.endsWith(".xml") || lowerName.endsWith(".csv") || lowerName.endsWith(".1800") || lowerName.endsWith(".900") || lowerName === "company.900") {
              try {
                const buffer = await fs.readFile(fullPath);
                foundFiles.push({
                  name: entry.name,
                  path: fullPath,
                  relativePath: fullPath.substring(currentDir.length + 1).replace(/\\/g, "/"),
                  size: buffer.length,
                  dataBase64: buffer.toString("base64"),
                });
              } catch (readErr) {
                console.warn(`Could not read file ${fullPath}:`, readErr.message);
              }
            }
          }
        }
      } catch (dirErr) {
        // ignore
      }
    }

    for (const dir of searchDirs) {
      try {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
           await scanDir(dir, 0);
           if (foundFiles.length > 0) {
             foundDir = dir;
             break;
           }
        }
      } catch (e) {
        // ignore
      }
    }

    if (foundFiles.length > 0) {
      return {
        folderPath: foundDir,
        folderName: path.basename(foundDir),
        files: foundFiles,
      };
    }

    return null;
  });
}

// ─── Electron Window ─────────────────────────────────────────────────────────

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'dist', 'favicon.ico');
  const fallbackIcon = path.join(__dirname, '..', 'public', 'favicon.ico');

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#ffffff",
    title: "CredSmart ERP & POS",
    icon: require("fs").existsSync(iconPath) ? iconPath : fallbackIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  try {
    const { protocol } = require("electron");
    const distDir = path.join(__dirname, "..", "dist");
    if (protocol && typeof protocol.interceptFileProtocol === "function") {
      protocol.interceptFileProtocol("file", (request, callback) => {
        let url = request.url.replace(/^file:\/\//, "");
        if (process.platform === "win32") {
          if (url.startsWith("/assets/") || url.startsWith("\\assets\\")) {
            return callback({ path: path.join(distDir, "assets", url.slice(8)) });
          }
          if (url.startsWith("/favicon") || url.startsWith("/IMG_9301") || url.startsWith("/manifest.json")) {
            return callback({ path: path.join(distDir, url.slice(1)) });
          }
          const winDriveAssets = url.match(/^[a-zA-Z]:\/assets\/(.*)/);
          if (winDriveAssets) {
            return callback({ path: path.join(distDir, "assets", winDriveAssets[1]) });
          }
        }
        try {
          callback({ path: decodeURIComponent(url) });
        } catch {
          callback({ path: url });
        }
      });
    }
  } catch (err) {
    console.warn("Could not register file interceptor:", err.message);
  }

  process.env.CREDSMART_SYNC_TOKEN = desktopPairingToken;
  startBridgeServer();
  registerIpcHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopBridgeServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopBridgeServer);

process.on("uncaughtException", (error) => {
  console.error("CredSmart desktop runtime error:", error);
  if (app.isReady()) {
    void dialog.showErrorBox("CredSmart desktop error", error.message);
  }
});
