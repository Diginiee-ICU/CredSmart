const crypto = require("crypto");

const clientId = "3cfb3076-4f45-4199-880d-81bf85c48cb7";
const clientSecret = "yRg4mQfUrIvM5VsO";
const rawAppKey = "WSRCaUEQYT96cC52QQ88AXB7IwYRG1JNOhRJZS0sYyE=";
const authPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyVEVC794tjNnLUVjfGPf
NI0amc94Fxoo/1CPvPNmWWDKiJCmcE8jrKisOAhg/AgjgkOVQhyVwFS+RIiB3BEY
psy3f6BUcrOWh96Nj/MR3dehKzMQ6PbDj2VfT00QLY3/xUJhOvRimpG4yKH7YUxx
KugfRIJsq/FWj8nOuQ8nlj7V6wSa+4dF6dpbyq9RCbDQyvytmQfQ68zEQwzptqNP
M+fOqclmpt3GC9hVJyjD/fF8Q1kaWwpVt5n7ts24UD+rA98cIdSdj5adRibU/X0i
rlWIJcrjfw4i7hp3vgpiFZeCp3xpO/ptXkHu1S50/PVWXFK0bZ0PhfBH2k6OBSB/
yQIDAQAB
-----END PUBLIC KEY-----`;

const appKeyBuffer = Buffer.from(rawAppKey, "base64");
const encryptedAppKey = crypto.publicEncrypt(
  {
    key: authPublicKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  },
  appKeyBuffer
).toString("base64");

console.log("Encrypted AppKey base64 length:", encryptedAppKey.length);

async function testAuth() {
  const urls = [
    "https://e-inv-api_sandbox.nic.in/eivital/v1.04/auth",
    "https://eivital.nic.in/eivital/v1.04/auth",
  ];

  for (const url of urls) {
    try {
      console.log("\nAttempting endpoint:", url);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          client_id: clientId,
          client_secret: clientSecret,
          Gstin: "29AABCT1332L000",
        },
        body: JSON.stringify({
          UserName: "NIC_SANDBOX_USER",
          Password: "Password@123",
          AppKey: encryptedAppKey,
          ForceRefreshAccessToken: true,
        }),
      });
      console.log("Status:", res.status);
      const data = await res.text();
      console.log("Response:", data);
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}
testAuth();
