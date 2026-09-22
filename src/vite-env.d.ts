/// <reference types="vite/client" />

export interface DesktopNativeFile {
  name: string;
  path: string;
  relativePath?: string;
  size: number;
  dataBase64?: string;
  data?: string;
}

export interface DesktopNativeFolder {
  folderPath: string;
  folderName: string;
  files: DesktopNativeFile[];
}

interface Window {
  credsmartDesktop?: {
    isDesktop: boolean;
    platform: string;
    pairingToken: string;
    bridgeActive?: boolean;
    bridgePort?: number;
    requestTally?: (xml: string) => Promise<string>;
    probeTally?: () => Promise<{ online: boolean; companyName?: string; latencyMs?: number; error?: string }>;
    openFiles?: (options?: Record<string, unknown>) => Promise<DesktopNativeFile[] | null>;
    openFolder?: () => Promise<DesktopNativeFolder | null>;
  };
}
