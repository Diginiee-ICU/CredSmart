const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("credsmartDesktop", {
  isDesktop: true,
  platform: process.platform,
  pairingToken: process.env.CREDSMART_SYNC_TOKEN || "",
  bridgeActive: true,
  bridgePort: Number(process.env.CREDSMART_BRIDGE_PORT || 9005),
  requestTally: (xml) => ipcRenderer.invoke("tally:request", xml),
  probeTally: () => ipcRenderer.invoke("tally:probe"),
  openFiles: (options) => ipcRenderer.invoke("dialog:openFiles", options),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  autoSearchTallyFolder: () => ipcRenderer.invoke("tally:autoSearchFolder"),
});
