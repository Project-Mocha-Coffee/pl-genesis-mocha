#!/usr/bin/env node
/**
 * Convert STARKNET_WHATS_DEPLOYED.md to STARKNET_WHATS_DEPLOYED.pdf
 * using Puppeteer from the Scroll/Base project.
 *
 * Usage (from starknet folder):
 *   node scripts/whats-deployed-md-to-pdf.js
 */
const fs = require("fs");
const path = require("path");

const starknetDir = path.resolve(__dirname, "..");
const baseDir = path.resolve(starknetDir, "..", "smart-contracts-erc4626-scroll-base");
const mdPath = path.join(starknetDir, "STARKNET_WHATS_DEPLOYED.md");
const pdfPath = path.join(starknetDir, "STARKNET_WHATS_DEPLOYED.pdf");

if (!fs.existsSync(mdPath)) {
  console.error("STARKNET_WHATS_DEPLOYED.md not found.");
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

  const md = fs.readFileSync(mdPath, "utf8");

  // Very simple HTML wrapper: render markdown as preformatted text.
  const escapeHtml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Project Mocha – Starknet Mainnet Deployment (v1)</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      padding: 24px 32px;
      line-height: 1.5;
      font-size: 14px;
      white-space: pre-wrap;
    }
    h1, h2, h3 {
      font-weight: 600;
    }
  </style>
</head>
<body>
${escapeHtml(md)}
</body>
</html>`;

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
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

