/**
 * ICO Contract Edge Cases Tests
 * Comprehensive edge case testing for audit preparation
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ICO Contract - Edge Cases", function () {
  let owner, user1, user2, treasury;
  let ico, token;
  let ethPriceFeed, usdtPriceFeed, usdcPriceFeed;
  let usdtToken, usdcToken;

  async function deployICOFixture() {
    [owner, user1, user2, treasury] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockMintableToken");
    token = await MockToken.deploy("Test Token", "TEST", 18);
    await token.waitForDeployment();

    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    ethPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("2000", 8), 8);
    usdtPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("1", 8), 8);
    usdcPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("1", 8), 8);

    await Promise.all([
      ethPriceFeed.waitForDeployment(),
      usdtPriceFeed.waitForDeployment(),
      usdcPriceFeed.waitForDeployment(),
    ]);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdtToken = await MockERC20.deploy("USDT", "USDT", 6);
    usdcToken = await MockERC20.deploy("USDC", "USDC", 6);
    await Promise.all([usdtToken.waitForDeployment(), usdcToken.waitForDeployment()]);

    const ICO = await ethers.getContractFactory("ICO");
    ico = await ICO.deploy(
      await token.getAddress(),
      ethers.parseEther("1000000"),
      treasury.address,
      await ethPriceFeed.getAddress(),
      await usdtPriceFeed.getAddress(),
      await usdcPriceFeed.getAddress(),
      await ethPriceFeed.getAddress(), // BTC feed (using ETH for simplicity)
      await ethPriceFeed.getAddress(), // SCR feed
      await usdtToken.getAddress(),
      await usdcToken.getAddress(),
      await usdtToken.getAddress(), // WBTC (using USDT for simplicity)
      await usdtToken.getAddress()  // SCR (using USDT for simplicity)
    );
    await ico.waitForDeployment();

    await token.setMinter(await ico.getAddress());

    return { ico, token, owner, user1, user2, treasury };
  }

  describe("Boundary Conditions", function () {
    it("Should handle minimum purchase amounts", async function () {
      const { ico, user1, usdtToken } = await loadFixture(deployICOFixture);

      const minPurchase = await ico.minUsdtPurchase();
      await usdtToken.mint(user1.address, minPurchase);
      await usdtToken.connect(user1).approve(await ico.getAddress(), minPurchase);

      // Should succeed with exact minimum
      await expect(
        ico.connect(user1).buyTokensWithUsdtNoProtection(minPurchase)
      ).to.not.be.reverted;
    });

    it("Should handle maximum token limit", async function () {
      const { ico, user1, usdtToken } = await loadFixture(deployICOFixture);

      const maxTokens = await ico.maxTokensToSell();
      const usdValue = maxTokens * 25n; // $25 per token
      const usdtAmount = usdValue / (10n ** 12n); // Convert to USDT (6 decimals)

      await usdtToken.mint(user1.address, usdtAmount);
      await usdtToken.connect(user1).approve(await ico.getAddress(), usdtAmount);

      // Should succeed purchasing max tokens
      await expect(
        ico.connect(user1).buyTokensWithUsdtNoProtection(usdtAmount)
      ).to.not.be.reverted;
    });

    it("Should reject purchases exceeding max tokens", async function () {
      const { ico, user1, usdtToken } = await loadFixture(deployICOFixture);

      const maxTokens = await ico.maxTokensToSell();
      const excessUsdValue = (maxTokens + ethers.parseEther("1")) * 25n;
      const excessUsdtAmount = excessUsdValue / (10n ** 12n);

      await usdtToken.mint(user1.address, excessUsdtAmount);
      await usdtToken.connect(user1).approve(await ico.getAddress(), excessUsdtAmount);

      // Should fail when exceeding max
      await expect(
        ico.connect(user1).buyTokensWithUsdtNoProtection(excessUsdtAmount)
      ).to.be.reverted;
    });
  });

  describe("Zero Value Handling", function () {
    it("Should reject zero amount purchases", async function () {
      const { ico, user1, usdtToken } = await loadFixture(deployICOFixture);

      await expect(
        ico.connect(user1).buyTokensWithUsdtNoProtection(0)
      ).to.be.reverted;
    });

    it("Should reject zero ETH purchases", async function () {
      const { ico, user1 } = await loadFixture(deployICOFixture);

      await expect(
        ico.connect(user1).buyTokensWithEthNoProtection(user1.address, { value: 0 })
      ).to.be.reverted;
    });
  });

  describe("Price Feed Edge Cases", function () {
    it("Should handle very large price values", async function () {
      const { ico, user1, usdtToken, usdtPriceFeed } = await loadFixture(deployICOFixture);

      // Set very large price
      await usdtPriceFeed.setPrice(ethers.parseUnits("1000000", 8));

      const amount = ethers.parseUnits("1000", 6);
      await usdtToken.mint(user1.address, amount);
      await usdtToken.connect(user1).approve(await ico.getAddress(), amount);

      // Should handle large prices without overflow
      await expect(
        ico.connect(user1).buyTokensWithUsdtNoProtection(amount)
      ).to.not.be.reverted;
    });

    it("Should handle price feed updates during purchase", async function () {
      const { ico, user1, usdtToken, usdtPriceFeed } = await loadFixture(deployICOFixture);

      const amount = ethers.parseUnits("1000", 6);
      await usdtToken.mint(user1.address, amount);
      await usdtToken.connect(user1).approve(await ico.getAddress(), amount);

      // Change price after approval but before purchase
      await usdtPriceFeed.setPrice(ethers.parseUnits("2", 8));

      // Should use updated price
      await expect(
        ico.connect(user1).buyTokensWithUsdtNoProtection(amount)
      ).to.not.be.reverted;
    });
  });
});
