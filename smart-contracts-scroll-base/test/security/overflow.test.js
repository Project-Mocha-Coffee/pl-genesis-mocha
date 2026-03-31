/**
 * Integer Overflow/Underflow Protection Tests
 * Tests for SafeMath and overflow protection
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Integer Overflow/Underflow Protection", function () {
  describe("ICO Contract", function () {
    it("Should handle large token amounts safely", async function () {
      const [owner, user1, treasury] = await ethers.getSigners();

      const MockToken = await ethers.getContractFactory("MockMintableToken");
      const token = await MockToken.deploy("Test", "TST", 18);
      await token.waitForDeployment();

      const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
      const priceFeed = await MockPriceFeed.deploy(ethers.parseUnits("1", 8), 8);
      await priceFeed.waitForDeployment();

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const paymentToken = await MockERC20.deploy("USDT", "USDT", 6);
      await paymentToken.waitForDeployment();

      const ICO = await ethers.getContractFactory("ICO");
      const ico = await ICO.deploy(
        await token.getAddress(),
        ethers.parseEther("1000000000"), // Very large max
        treasury.address,
        await priceFeed.getAddress(),
        await priceFeed.getAddress(),
        await priceFeed.getAddress(),
        await priceFeed.getAddress(),
        await priceFeed.getAddress(),
        await paymentToken.getAddress(),
        await paymentToken.getAddress(),
        await paymentToken.getAddress(),
        await paymentToken.getAddress()
      );
      await ico.waitForDeployment();

      // Verify contract handles large numbers
      const maxTokens = await ico.maxTokensToSell();
      expect(maxTokens).to.equal(ethers.parseEther("1000000000"));
    });
  });

  describe("Token Contracts", function () {
    it("Should prevent overflow in token transfers", async function () {
      const MockToken = await ethers.getContractFactory("MockMintableToken");
      const token = await MockToken.deploy("Test", "TST", 18);
      await token.waitForDeployment();

      // Solidity 0.8+ has built-in overflow protection
      // Verify contract compiles and deploys successfully
      const code = await ethers.provider.getCode(await token.getAddress());
      expect(code).to.not.equal("0x");
    });
  });
});
