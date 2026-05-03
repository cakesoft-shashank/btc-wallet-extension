import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const distDir = resolve(rootDir, "dist");
const releaseDir = resolve(rootDir, "release");
const stagingDir = resolve(rootDir, ".package-tmp");
const browserArg = process.argv.find((arg) => arg.startsWith("--browser="));
const targetBrowser = browserArg ? browserArg.split("=")[1] : "all";

function ensureDistExists() {
  if (!existsSync(distDir)) {
    throw new Error("dist directory not found. Run npm run build first.");
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function zipDirectory(sourceDir, outputZipPath) {
  execFileSync("zip", ["-qr", outputZipPath, "."], {
    cwd: sourceDir,
    stdio: "inherit"
  });
}

function buildBrowserManifests(baseManifest) {
  const chromeManifest = structuredClone(baseManifest);
  delete chromeManifest.browser_specific_settings;
  if (chromeManifest.background) {
    delete chromeManifest.background.scripts;
  }

  const firefoxManifest = structuredClone(baseManifest);
  if (firefoxManifest.background) {
    delete firefoxManifest.background.service_worker;
    firefoxManifest.background.scripts = ["background.js"];
  }

  return { chromeManifest, firefoxManifest };
}

function packageExtensions() {
  ensureDistExists();

  if (!["all", "chrome", "firefox"].includes(targetBrowser)) {
    throw new Error("Invalid --browser value. Use all, chrome, or firefox.");
  }

  rmSync(stagingDir, { recursive: true, force: true });
  rmSync(releaseDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });
  mkdirSync(releaseDir, { recursive: true });

  const packageJson = readJson(resolve(rootDir, "package.json"));
  const extensionVersion = packageJson.version;

  const chromeStageDir = resolve(stagingDir, "chrome");
  const firefoxStageDir = resolve(stagingDir, "firefox");

  cpSync(distDir, chromeStageDir, { recursive: true });
  cpSync(distDir, firefoxStageDir, { recursive: true });

  const baseManifestPath = resolve(distDir, "manifest.json");
  const baseManifest = readJson(baseManifestPath);
  const { chromeManifest, firefoxManifest } = buildBrowserManifests(baseManifest);

  writeJson(resolve(chromeStageDir, "manifest.json"), chromeManifest);
  writeJson(resolve(firefoxStageDir, "manifest.json"), firefoxManifest);

  const chromeZip = resolve(releaseDir, `bitcoin-wallet-chrome-v${extensionVersion}.zip`);
  const firefoxZip = resolve(releaseDir, `bitcoin-wallet-firefox-v${extensionVersion}.zip`);

  if (targetBrowser === "all" || targetBrowser === "chrome") {
    zipDirectory(chromeStageDir, chromeZip);
  }
  if (targetBrowser === "all" || targetBrowser === "firefox") {
    zipDirectory(firefoxStageDir, firefoxZip);
  }

  rmSync(stagingDir, { recursive: true, force: true });

  console.log("Created artifacts:");
  if (targetBrowser === "all" || targetBrowser === "chrome") {
    console.log(`- ${chromeZip}`);
  }
  if (targetBrowser === "all" || targetBrowser === "firefox") {
    console.log(`- ${firefoxZip}`);
  }
}

packageExtensions();
