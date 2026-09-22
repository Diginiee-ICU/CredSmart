/// <reference types="vite/client" />
interface Window {
  credsmartDesktop?: {
    isDesktop: boolean;
    platform: string;
    pairingToken: string;
  };
}
