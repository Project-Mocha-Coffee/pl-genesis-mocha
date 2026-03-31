const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment information
const deploymentFile = path.join(__dirname, "..", "deployments", "scrollSepolia-ico-deployment.json");
const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

async function main() {
    console.log("🔍 ICO Contract Debug Information");
    console.log("=".repeat(50));

    // Get signers
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);

    // Connect to contracts
    const ico = await ethers.getContractAt("ICO", deployment.contracts.ico);
    const token = await ethers.getContractAt("MochaBeanToken", deployment.contracts.token);

    console.log(`📋 ICO Contract: ${deployment.contracts.ico}`);
    console.log(`🪙 Token Contract: ${deployment.contracts.token}\n`);

    // Check ICO status
    console.log("📊 ICO Status:");
    try {
        const maxTokensToSell = await ico.maxTokensToSell();
        const totalSold = await ico.totalTokensSold();
        const remaining = await ico.getRemainingTokens();
        const isActive = await ico.isIcoActive();
        const treasuryWallet = await ico.treasuryWallet();

        console.log(`   Max Tokens to Sell: ${ethers.formatEther(maxTokensToSell)} MBT`);
        console.log(`   Total Sold: ${ethers.formatEther(totalSold)} MBT`);
        console.log(`   Remaining: ${ethers.formatEther(remaining)} MBT`);
        console.log(`   ICO Active: ${isActive}`);
        console.log(`   Treasury Wallet: ${treasuryWallet}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Check token contract
    console.log("🪙 Token Contract Info:");
    try {
        const name = await token.name();
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        const totalSupply = await token.totalSupply();
        const icoBalance = await token.balanceOf(deployment.contracts.ico);

        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} MBT`);
        console.log(`   ICO Contract Balance: ${ethers.formatEther(icoBalance)} MBT\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Check ICO permissions
    console.log("🔐 ICO Permissions:");
    try {
        const icoAddress = deployment.contracts.ico;
        const hasMinterRole = await token.hasRole(await token.MINTER_ROLE(), icoAddress);
        const hasAdminRole = await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), deployer.address);

        console.log(`   ICO has MINTER_ROLE: ${hasMinterRole}`);
        console.log(`   Deployer has ADMIN_ROLE: ${hasAdminRole}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Check minimum purchase amounts
    console.log("💰 Minimum Purchase Amounts:");
    try {
        const minEth = await ico.minEthPurchase();
        const minUsdt = await ico.minUsdtPurchase();
        const minUsdc = await ico.minUsdcPurchase();
        const minWbtc = await ico.minWbtcPurchase();
        const minScr = await ico.minScrPurchase();

        console.log(`   Min ETH: ${ethers.formatEther(minEth)} ETH`);
        console.log(`   Min USDT: ${ethers.formatUnits(minUsdt, 6)} USDT`);
        console.log(`   Min USDC: ${ethers.formatUnits(minUsdc, 6)} USDC`);
        console.log(`   Min WBTC: ${ethers.formatUnits(minWbtc, 8)} WBTC`);
        console.log(`   Min SCR: ${ethers.formatEther(minScr)} SCR\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Check price feeds
    console.log("💱 Price Feed Status:");
    try {
        const prices = await ico.getCurrentPrices();
        console.log(`   ETH Price: $${ethers.formatEther(prices.ethPrice)}`);
        console.log(`   USDT Price: $${ethers.formatEther(prices.usdtPrice)}`);
        console.log(`   USDC Price: $${ethers.formatEther(prices.usdcPrice)}`);
        console.log(`   BTC Price: $${ethers.formatEther(prices.btcPrice)}`);
        console.log(`   SCR Price: $${ethers.formatEther(prices.scrPrice)}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test a small purchase preview
    console.log("🧪 Test Purchase Preview:");
    try {
        const testAmount = ethers.parseEther("0.001"); // Minimum ETH amount
        const preview = await ico.previewTokenPurchase("ETH", testAmount);
        console.log(`   ETH Amount: ${ethers.formatEther(testAmount)} ETH`);
        console.log(`   USD Value: $${ethers.formatEther(preview.usdValue)}`);
        console.log(`   Tokens to Receive: ${ethers.formatEther(preview.tokensToReceive)} MBT`);
        console.log(`   Slippage: ${preview.slippageBps / 100}%\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
