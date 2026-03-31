/**
 * Access Control Tests
 * Comprehensive access control testing for audit preparation
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Access Control - System Wide", function () {
  describe("Ownable Pattern", function () {
    async function deployICOFixture() {
      const [owner, user1, treasury] = await ethers.getSigners();

      // Deploy mock token
      const MockToken = await ethers.getContractFactory("MockMintableToken");
      const mockToken = await MockToken.deploy("Test Token", "TEST", 18);
      await mockToken.waitForDeployment();

      // Deploy mock price feeds
      const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
      const ethPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("2000", 8), 8);
      const usdtPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("1", 8), 8);
      const usdcPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("1", 8), 8);
      const btcPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("50000", 8), 8);
      const scrPriceFeed = await MockPriceFeed.deploy(ethers.parseUnits("0.1", 8), 8);

      await Promise.all([
        ethPriceFeed.waitForDeployment(),
        usdtPriceFeed.waitForDeployment(),
        usdcPriceFeed.waitForDeployment(),
        btcPriceFeed.waitForDeployment(),
        scrPriceFeed.waitForDeployment(),
      ]);

      // Deploy mock payment tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const usdtToken = await MockERC20.deploy("USDT", "USDT", 6);
      const usdcToken = await MockERC20.deploy("USDC", "USDC", 6);
      const wbtcToken = await MockERC20.deploy("WBTC", "WBTC", 8);
      const scrToken = await MockERC20.deploy("SCR", "SCR", 18);

      await Promise.all([
        usdtToken.waitForDeployment(),
        usdcToken.waitForDeployment(),
        wbtcToken.waitForDeployment(),
        scrToken.waitForDeployment(),
      ]);

      // Deploy ICO contract
      const ICO = await ethers.getContractFactory("ICO");
      const ico = await ICO.deploy(
        await mockToken.getAddress(),
        ethers.parseEther("1000000"),
        treasury.address,
        await ethPriceFeed.getAddress(),
        await usdtPriceFeed.getAddress(),
        await usdcPriceFeed.getAddress(),
        await btcPriceFeed.getAddress(),
        await scrPriceFeed.getAddress(),
        await usdtToken.getAddress(),
        await usdcToken.getAddress(),
        await wbtcToken.getAddress(),
        await scrToken.getAddress()
      );
      await ico.waitForDeployment();

      return { ico, owner, user1, treasury };
    }

    it("Should correctly identify contract owner", async function () {
      const { ico, owner } = await loadFixture(deployICOFixture);
      expect(await ico.owner()).to.equal(owner.address);
    });

    it("Should prevent non-owners from calling owner-only functions", async function () {
      const { ico, user1 } = await loadFixture(deployICOFixture);

      await expect(
        ico.connect(user1).updateTreasuryWallet(user1.address)
      ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");
    });
  });

  describe("Role-Based Access Control", function () {
    it("Should enforce MINTER_ROLE for token minting", async function () {
      const [owner, user1] = await ethers.getSigners();

      const MockToken = await ethers.getContractFactory("MockMintableToken");
      const token = await MockToken.deploy("Test", "TST", 18);
      await token.waitForDeployment();

      // User without MINTER_ROLE should not be able to mint
      await expect(
        token.connect(user1).mint(user1.address, ethers.parseEther("1000"))
      ).to.be.reverted;
    });
  });
});

