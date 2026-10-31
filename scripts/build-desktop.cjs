/**
 * CredSmart Desktop Standalone Build Script
 * Packages CredSmart into Windows Standalone Executables (NSIS Setup, Portable EXE, Unpacked).
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const isDirOnly = process.argv.includes("--dir");
const isPortableOnly = process.argv.includes("--portable");

console.log("==================================================");
console.log("  CredSmart Desktop Standalone Build Engine");
console.log("==================================================");

// Step 1: Set Environment Variable for Relative Base Paths
process.env.DESKTOP_BUILD = "true";
process.env.ELECTRON = "true";

console.log("\n[1/4] Compiling Vite Frontend for Desktop Standalone (base: './')...");
try {
  execSync("cmd.exe /c npm run build", {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, DESKTOP_BUILD: "true", ELECTRON: "true" },
  });
} catch (err) {
  console.error("Vite build failed:", err.message);
  process.exit(1);
}

// Step 2: Verify dist/index.html
const indexHtmlPath = path.join(rootDir, "dist", "index.html");
if (!fs.existsSync(indexHtmlPath)) {
  console.error("Error: dist/index.html was not generated.");
  process.exit(1);
}

const htmlContent = fs.readFileSync(indexHtmlPath, "utf8");
if (htmlContent.includes('src="/assets/') || htmlContent.includes('href="/assets/')) {
  console.log("Notice: Adjusting dist/index.html absolute asset paths to relative paths...");
  const patchedHtml = htmlContent
    .replace(/src="\/assets\//g, 'src="./assets/')
    .replace(/href="\/assets\//g, 'href="./assets/')
    .replace(/href="\/favicon/g, 'href="./favicon')
    .replace(/src="\/IMG_9301/g, 'src="./IMG_9301');
  fs.writeFileSync(indexHtmlPath, patchedHtml, "utf8");
}
console.log("[2/4] Frontend distribution verified successfully.");

// Step 3: Run electron-builder
console.log("\n[3/4] Packaging Desktop Standalone with electron-builder...");
let builderArgs = "--win";
if (isDirOnly) {
  builderArgs += " dir";
} else if (isPortableOnly) {
  builderArgs += " portable";
}

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
try {
  execSync(`${npxCmd} electron-builder ${builderArgs}`, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
} catch (err) {
  console.error("electron-builder execution failed:", err.message);
  process.exit(1);
}

// Step 4: Archive Artifacts into releases/
console.log("\n[4/4] Archiving standalone release artifacts into releases/ directory...");
const distDesktop = path.join(rootDir, "dist-desktop");
const releasesDir = path.join(rootDir, "releases");
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

if (fs.existsSync(distDesktop)) {
  const files = fs.readdirSync(distDesktop);
  for (const file of files) {
    const fullPath = path.join(distDesktop, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile() && file.endsWith(".exe")) {
      const destPath = path.join(releasesDir, file);
      fs.copyFileSync(fullPath, destPath);
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
      console.log(`  -> Copied: releases/${file} (${sizeMb} MB)`);
    }
  }
}

console.log("\n==================================================");
console.log("  Desktop Standalone Build Completed Successfully!");
console.log("==================================================\n");
