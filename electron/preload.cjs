const { contextBridge } = require("electron");
const { randomBytes } = require("node:crypto");

contextBridge.exposeInMainWorld("credsmartDesktop", {
  isDesktop: true,
  platform: process.platform,
  pairingToken: process.env.CREDSMART_SYNC_TOKEN || `crds_desktop_${randomBytes(18).toString("hex")}`,
});
