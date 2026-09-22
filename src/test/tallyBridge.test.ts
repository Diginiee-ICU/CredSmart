import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { randomInt } from "node:crypto";
import path from "node:path";

const bridgeScript = path.resolve(process.cwd(), "scripts/credsmart-sync-agent/index.cjs");
const token = "test-pairing-token";
const processes: ChildProcess[] = [];
const servers: Server[] = [];

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

async function waitForBridge(url: string): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${url}/health`, {
        headers: { "X-CredSmart-Sync-Token": token },
      });
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Bridge did not start");
}

afterEach(async () => {
  processes.splice(0).forEach((child) => child.kill());
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

describe("CredSmart Tally bridge", () => {
  it("requires the pairing token and proxies XML to Tally", async () => {
    const tally = createServer((request, response) => {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        expect(body).toContain("<TALLYREQUEST>Export Data</TALLYREQUEST>");
        response.writeHead(200, { "Content-Type": "application/xml" });
        response.end("<ENVELOPE><BODY><TALLYMESSAGE>fixture</TALLYMESSAGE></BODY></ENVELOPE>");
      });
    });
    servers.push(tally);
    const tallyPort = await listen(tally);
    const bridgePort = randomInt(20_000, 30_000);
    const child = spawn(process.execPath, [path.normalize(bridgeScript)], {
      env: {
        ...process.env,
        CREDSMART_BRIDGE_PORT: String(bridgePort),
        CREDSMART_TALLY_URL: `http://127.0.0.1:${tallyPort}`,
        CREDSMART_SYNC_TOKEN: token,
      },
      stdio: "ignore",
    });
    processes.push(child);

    const bridgeUrl = `http://127.0.0.1:${bridgePort}`;
    await waitForBridge(bridgeUrl);

    const unauthorized = await fetch(`${bridgeUrl}/health`);
    expect(unauthorized.status).toBe(401);

    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "X-CredSmart-Sync-Token": token,
        "Content-Type": "text/xml",
      },
      body: "<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER></ENVELOPE>",
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<TALLYMESSAGE>fixture</TALLYMESSAGE>");
  });
});
