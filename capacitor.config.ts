import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAP_SERVER_URL;
const isLocalServer = !!serverUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(serverUrl);

if (serverUrl && !/^https:\/\//i.test(serverUrl) && !isLocalServer) {
  throw new Error('CAP_SERVER_URL must use HTTPS outside localhost/127.0.0.1.');
}

const config: CapacitorConfig = {
  appId: 'com.credsmart.pos',
  appName: 'CredSmart',
  webDir: 'dist',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: isLocalServer,
        },
      }
    : {}),
};

export default config;
