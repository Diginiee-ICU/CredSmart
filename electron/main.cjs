const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const path = require("node:path");

let bridgeProcess;
const desktopPairingToken =
  process.env.CREDSMART_SYNC_TOKEN || `crds_desktop_${randomBytes(18).toString("hex")}`;

function startTallyBridge() {
  const token = desktopPairingToken;
  const tallyUrl = process.env.CREDSMART_TALLY_URL || "http://127.0.0.1:9000";
  const bridgePort = process.env.CREDSMART_BRIDGE_PORT || "9005";
  const packagedBridge = path.join(process.resourcesPath, "CredSmartTallyBridge.exe");
  const isPackaged = app.isPackaged;
  const command = isPackaged ? packagedBridge : process.execPath;
  const args = isPackaged
    ? []
    : [path.join(__dirname, "..", "scripts", "credsmart-sync-agent", "index.cjs")];

  bridgeProcess = spawn(command, args, {
    env: {
      ...process.env,
      CREDSMART_SYNC_TOKEN: token,
      CREDSMART_TALLY_URL: tallyUrl,
      CREDSMART_BRIDGE_PORT: bridgePort,
    },
    windowsHide: true,
    stdio: "ignore",
  });
  bridgeProcess.on("error", (error) => {
    console.error("CredSmart Tally Bridge failed to start:", error);
  });
}

function stopTallyBridge() {
  if (bridgeProcess && !bridgeProcess.killed) {
    bridgeProcess.kill();
    bridgeProcess = undefined;
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#ffffff",
    title: "CredSmart",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  process.env.CREDSMART_SYNC_TOKEN = desktopPairingToken;
  startTallyBridge();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopTallyBridge();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopTallyBridge);

process.on("uncaughtException", (error) => {
  console.error("CredSmart desktop runtime error:", error);
  if (app.isReady()) {
    void dialog.showErrorBox("CredSmart desktop error", error.message);
  }
});
