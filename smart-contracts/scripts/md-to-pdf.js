#!/usr/bin/env node
/**
 * Convert STARKNET_SCOPE.html to PDF using Puppeteer from the base project.
 * Run from repo root: node scripts/md-to-pdf.js
 */
const path = require("path");
const fs = require("fs");

const starknetDir = path.resolve(__dirname, "..");
const baseDir = path.resolve(starknetDir, "..", "smart-contracts-erc4626-scroll-base");
const htmlPath = path.join(starknetDir, "STARKNET_SCOPE.html");
const pdfPath = path.join(starknetDir, "STARKNET_SCOPE.pdf");

if (!fs.existsSync(htmlPath)) {
  console.error("STARKNET_SCOPE.html not found. Run pandoc first.");
  process.exit(1);
}

async function main() {
  let puppeteer;
  try {
    puppeteer = require(path.join(baseDir, "node_modules", "puppeteer"));
  } catch (e) {
    console.error("Puppeteer not found. Install it in smart-contracts-erc4626-scroll-base: npm install puppeteer");
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
    printBackground: true,
  });
  await browser.close();
  console.log("Created:", pdfPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
