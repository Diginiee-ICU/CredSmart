#!/usr/bin/env node

/**
 * CredSmart Desktop Sync Daemon (Tray & Headless Agent)
 * Connects to a local Tally Prime HTTP server and pushes its XML export to CredSmart Cloud.
 *
 * Usage:
 *   node index.js --org="<ORG_ID>" --token="<SYNC_PAIRING_TOKEN>" --port=9000 --interval=15
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Parse CLI Args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, "").split("=");
  acc[k] = v || true;
  return acc;
}, {});

const ORG_ID = args.org || process.env.CREDSMART_ORG_ID || "demo-org";
const TOKEN = args.token || process.env.CREDSMART_SYNC_TOKEN || "crds_live_demo";
const TALLY_HOST = args.host || "127.0.0.1";
const TALLY_PORT = parseInt(args.port || "9000", 10);
const INTERVAL_MINUTES = parseInt(args.interval || "15", 10);
const API_URL = args.api || "https://api.credsmart.in/sync/tally";

console.log("==================================================================");
console.log("  ⚡ CredSmart Desktop Auto-Sync Daemon v2.1.0");
console.log("==================================================================");
console.log(`  • Organization ID  : ${ORG_ID}`);
console.log(`  • Pairing Token    : ${TOKEN.substring(0, 14)}...`);
console.log(`  • Target Tally     : http://${TALLY_HOST}:${TALLY_PORT}`);
console.log(`  • Cloud API        : ${API_URL}`);
console.log(`  • Sync Interval    : Every ${INTERVAL_MINUTES} minutes`);
console.log("==================================================================\n");

const TALLY_XML_REQUEST = `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <ACCOUNTTYPE>All Masters</ACCOUNTTYPE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
`.trim();

function queryLocalTally() {
  return new Promise((resolve, reject) => {
    const postData = Buffer.from(TALLY_XML_REQUEST);
    const req = http.request(
      {
        hostname: TALLY_HOST,
        port: TALLY_PORT,
        path: "/",
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          "Content-Length": postData.length,
        },
        timeout: 10000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`Tally HTTP Server returned status ${res.statusCode}`));
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout contacting Tally HTTP Server on port " + TALLY_PORT));
    });

    req.write(postData);
    req.end();
  });
}

function uploadToCredSmart(xml) {
  return new Promise((resolve, reject) => {
    const target = new URL(API_URL);
    const transport = target.protocol === "https:" ? https : http;
    const req = transport.request(
      target,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "X-CredSmart-Organization": ORG_ID,
          "X-CredSmart-Sync-Token": TOKEN,
          "Content-Type": "application/xml; charset=utf-8",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(xml),
        },
        timeout: 30000,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body });
          } else {
            reject(new Error(`CredSmart API returned HTTP ${res.statusCode}: ${body.slice(0, 240)}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Timeout uploading sync data to CredSmart"));
    });
    req.end(xml);
  });
}

let syncCount = 0;

async function performSync() {
  syncCount++;
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 🔄 Sync #${syncCount} initiated...`);

  try {
    const xml = await queryLocalTally();
    const itemMatches = (xml.match(/<STOCKITEM/gi) || []).length;
    const ledgerMatches = (xml.match(/<LEDGER/gi) || []).length;

    console.log(`[${timestamp}] 📦 Extracted from Tally: ${itemMatches} Stock Items, ${ledgerMatches} Ledgers.`);
    console.log(`[${timestamp}] 🚀 Transmitting payload to CredSmart Cloud...`);
    await uploadToCredSmart(xml);
    console.log(`[${timestamp}] ✅ Sync #${syncCount} completed successfully!`);
  } catch (err) {
    console.warn(`[${timestamp}] ⚠️ Tally connection paused: ${err.message}`);
    console.log(`[${timestamp}] ℹ️ Ensure Tally Prime is open and F12: Server is enabled.`);
  }
}

// Initial sync
performSync();

// Scheduled Interval
setInterval(performSync, INTERVAL_MINUTES * 60 * 1000);
console.log(`\n🟢 Daemon active in background. Press Ctrl+C to stop.\n`);
