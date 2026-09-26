/**
 * Official CredSmart Native Client Download Links
 * Direct high-speed download endpoints for Android APK and Windows Desktop Installer.
 */
export const APP_DOWNLOAD_LINKS = {
  // Direct download link for Android APK (v1.1.5, Code 17)
  androidApk:
    "https://drive.usercontent.google.com/download?id=1QjGPs0RQYpRfsfJVT21DGpRS5UDxgHuc&export=download&authuser=0&confirm=t&uuid=d99dbe5d-c6e4-45b3-8efd-8154bb16410a&at=AMrWOn09sg71wBIm2fhz2fO4pDGi:1790406703768",

  // Direct download link for Windows Desktop EXE (v1.1.5, 64-bit NSIS Setup)
  windowsExe:
    "https://drive.usercontent.google.com/download?id=1mRjsoNGlQ5v5CLHSzX7Pk8Ev2k9zLwl2&export=download&authuser=0&confirm=t&uuid=7741efcb-6437-428b-8fb2-efcfe3d9d8cd&at=AMrWOn3MnsTQBL6t3Eo9iYMUPlh8:1790408483892",

  version: "1.1.5",
  versionCode: 17,
  apkFilename: "CredSmart-v1.1.5.apk",
  exeFilename: "CredSmart-Setup-1.1.5-x64.exe",
  apkSize: "18 MB",
  exeSize: "128 MB",
} as const;

/**
 * Triggers a direct file download in the browser
 */
export function triggerDirectDownload(url: string, filename?: string): void {
  const link = document.createElement("a");
  link.href = url;
  if (filename) link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
