#!/usr/bin/env node

/**
 * CredSmart Tally Bridge
 *
 * A loopback-only bridge between the CredSmart webview and Tally Prime.
 * The browser never receives the Tally port directly when the bridge is
 * running, which avoids HTTPS-to-localhost restrictions and keeps pairing
 * token checks in one place.
 */

const http = require("http");
const process = require("process");

const args = process.argv.filter((value) => value.startsWith("--")).reduce((result, value) => {
  const separator = value.indexOf("=");
  const key = value.replace(/^--/, "").slice(0, separator === -1 ? undefined : separator);
  const item = separator === -1 ? true : value.slice(separator + 1);
  result[key] = item;
  return result;
}, {});

const PORT = Number(args.bridgePort || process.env.CREDSMART_BRIDGE_PORT || 9005);
const TALLY_URL = args.tallyUrl || process.env.CREDSMART_TALLY_URL || "http://127.0.0.1:9000";
const PAIRING_TOKEN = args.token || process.env.CREDSMART_SYNC_TOKEN || "";
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;
const ALLOWED_ORIGINS = new Set(
  (process.env.CREDSMART_ALLOWED_ORIGINS || "https://pos.credalert.business,http://localhost:8080,http://127.0.0.1:8080")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const TALLY_REQUESTS = {
  masters: `
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
</ENVELOPE>`.trim(),
  daybook: `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim(),
};

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function originHeaders(request) {
  const origin = request.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Headers": "content-type, x-credsmart-sync-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

function isAuthorized(request) {
  if (!PAIRING_TOKEN) return false;
  const supplied = request.headers["x-credsmart-sync-token"];
  return typeof supplied === "string" && supplied.length > 0 && supplied === PAIRING_TOKEN;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body exceeds the 25 MB limit"));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function requestTally(xml) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(xml, "utf8");
    const target = new URL(TALLY_URL);
    const request = http.request(
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
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Tally returned HTTP ${response.statusCode}`));
            return;
          }
          if (!body.trim()) {
            reject(new Error("Tally returned an empty response"));
            return;
          }
          resolve(body);
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("Tally request timed out")));
    request.on("error", reject);
    request.end(payload);
  });
}

function getRequestType(body) {
  if (body.includes("<REPORTNAME>Day Book</REPORTNAME>")) return "daybook";
  return "masters";
}

const server = http.createServer(async (request, response) => {
  const headers = originHeaders(request);
  if (!headers) {
    writeJson(response, 403, { error: "Origin is not allowed" });
    return;
  }
  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (!isAuthorized(request)) {
    writeJson(response, 401, { error: "Missing or invalid CredSmart pairing token" });
    return;
  }

  if (request.method === "GET" && (request.url === "/" || request.url === "/health")) {
    writeJson(response, 200, {
      status: "ok",
      bridge: "CredSmart Tally Bridge",
      version: "1.0.0",
      tallyUrl: TALLY_URL,
      port: PORT,
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/") {
    writeJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const body = await readBody(request);
    if (!body.trim()) {
      writeJson(response, 400, { error: "XML request body is required" });
      return;
    }
    const xml = await requestTally(body);
    response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    response.end(xml);
    console.log(`[${new Date().toISOString()}] proxied ${getRequestType(body)} request to Tally`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tally bridge request failed";
    console.error(`[${new Date().toISOString()}] ${message}`);
    writeJson(response, 502, { error: message, code: "TALLY_UNAVAILABLE" });
  }
});

server.on("error", (error) => {
  console.error(`Unable to start CredSmart Tally Bridge on port ${PORT}: ${error.message}`);
  process.exitCode = 1;
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`CredSmart Tally Bridge listening on http://127.0.0.1:${PORT}`);
  console.log(`Tally upstream: ${TALLY_URL}`);
});
