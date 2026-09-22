const { app, BrowserWindow, dialog, shell, ipcMain } = require("electron");
const http = require("node:http");
const fs = require("node:fs/promises");
const { randomBytes } = require("node:crypto");
const path = require("node:path");

// ─── Configuration ───────────────────────────────────────────────────────────

const BRIDGE_PORT = Number(process.env.CREDSMART_BRIDGE_PORT || 9005);
const TALLY_URL = process.env.CREDSMART_TALLY_URL || "http://127.0.0.1:9000";
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

function requestTally(xml) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(xml, "utf8");
    const target = new URL(TALLY_URL);
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
        timeout: REQUEST_TIMEOUT_MS,
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
    req.on("timeout", () => req.destroy(new Error("Tally request timed out after 60s")));
    req.on("error", (err) => {
      reject(new Error(`Cannot connect to Tally on ${TALLY_URL}: ${err.message}`));
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
  // Direct IPC request to Tally
  ipcMain.handle("tally:request", async (_event, xml) => {
    return await requestTally(xml);
  });

  // Direct IPC probe
  ipcMain.handle("tally:probe", async () => {
    try {
      const start = Date.now();
      const xml = await requestTally(TALLY_TEST_XML);
      const latencyMs = Date.now() - start;
      let company = "Tally Active Company";
      const match = xml.match(/<COMPANY[^>]*NAME="([^"]+)"/i) || xml.match(/<COMPANY[^>]*>([^<]+)<\/COMPANY>/i);
      if (match && match[1]) {
        company = match[1].trim();
      }
      return { online: true, companyName: company, latencyMs };
    } catch (err) {
      return {
        online: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
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
      const buffer = await fs.readFile(filePath);
      files.push({
        name: path.basename(filePath),
        path: filePath,
        size: buffer.length,
        data: buffer.toString("utf8"),
      });
    }
    return files;
  });

  // Direct native directory picker
  ipcMain.handle("dialog:openFolder", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select Complete Tally Company Directory",
      properties: ["openDirectory"],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const folderPath = result.filePaths[0];
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(folderPath, entry.name);
        const buffer = await fs.readFile(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          size: buffer.length,
          data: buffer.toString("utf8"),
        });
      }
    }

    return {
      folderPath,
      folderName: path.basename(folderPath),
      files,
    };
  });
}

// ─── Electron Window ─────────────────────────────────────────────────────────

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#ffffff",
    title: "CredSmart ERP & POS",
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
