/**
 * MochaLandToken (MLT) Test Suite
 * ERC721 token tests for audit preparation
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MochaLandToken (MLT)", function () {
  async function deployTokenFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock registry and implementation for MLT constructor
    const MockERC6551Registry = await ethers.getContractFactory("MockERC6551Registry");
    const registry = await MockERC6551Registry.deploy();
    await registry.waitForDeployment();

    const MockERC6551Account = await ethers.getContractFactory("ERC6551Account");
    const implementation = await MockERC6551Account.deploy();
    await implementation.waitForDeployment();

    // Deploy mock TreeFarmManager
    const MockTreeFarmManager = await ethers.getContractFactory("MockTreeFarmManager");
    const farmManager = await MockTreeFarmManager.deploy();
    await farmManager.waitForDeployment();

    const MochaLandToken = await ethers.getContractFactory("MochaLandToken");
    // MochaLandToken constructor takes registry and implementation addresses
    const token = await MochaLandToken.deploy(
      await registry.getAddress(),
      await implementation.getAddress()
    );
    await token.waitForDeployment();

    // Set farm manager address (required before minting)
    await token.connect(owner).setFarmManagerAddress(await farmManager.getAddress());

    return { token, owner, user1, user2, farmManager };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("Mocha Land Token");
      expect(await token.symbol()).to.equal("MLT");
    });

    it("Should set owner correctly", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);

      // Create LandMetadata structure
      const metadata = {
        name: "Test Farm",
        description: "A test coffee farm",
        farmInfo: {
          name: "Test Farm",
          location: "Kenya",
          area: "10 hectares",
          soilType: "Volcanic"
        },
        imageURI: "https://example.com/farm.jpg",
        externalURL: "https://example.com/farm"
      };

      const certifications = "Organic, Fair Trade";

      // Mint token (returns nextFarmId, which will be 1)
      await token.connect(owner).mint(user1.address, metadata, certifications);
      
      // Token ID starts at 1
      expect(await token.ownerOf(1)).to.equal(user1.address);
      expect(await token.balanceOf(user1.address)).to.equal(1);
    });

    it("Should prevent non-owner from minting", async function () {
      const { token, user1 } = await loadFixture(deployTokenFixture);

      const metadata = {
        name: "Test Farm",
        description: "A test coffee farm",
        farmInfo: {
          name: "Test Farm",
          location: "Kenya",
          area: "10 hectares",
          soilType: "Volcanic"
        },
        imageURI: "https://example.com/farm.jpg",
        externalURL: "https://example.com/farm"
      };

      await expect(
        token.connect(user1).mint(user1.address, metadata, "cert")
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("Should prevent minting when farm manager not set", async function () {
      const [owner, user1] = await ethers.getSigners();

      const MockERC6551Registry = await ethers.getContractFactory("MockERC6551Registry");
      const registry = await MockERC6551Registry.deploy();
      await registry.waitForDeployment();

      const MockERC6551Account = await ethers.getContractFactory("ERC6551Account");
      const implementation = await MockERC6551Account.deploy();
      await implementation.waitForDeployment();

      const MochaLandToken = await ethers.getContractFactory("MochaLandToken");
      const token = await MochaLandToken.deploy(
        await registry.getAddress(),
        await implementation.getAddress()
      );
      await token.waitForDeployment();

      const metadata = {
        name: "Test Farm",
        description: "A test coffee farm",
        farmInfo: {
          name: "Test Farm",
          location: "Kenya",
          area: "10 hectares",
          soilType: "Volcanic"
        },
        imageURI: "https://example.com/farm.jpg",
        externalURL: "https://example.com/farm"
      };

      await expect(
        token.connect(owner).mint(user1.address, metadata, "cert")
      ).to.be.revertedWith("MTT Token Address not set");
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between users", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployTokenFixture);

      const metadata = {
        name: "Test Farm",
        description: "A test coffee farm",
        farmInfo: {
          name: "Test Farm",
          location: "Kenya",
          area: "10 hectares",
          soilType: "Volcanic"
        },
        imageURI: "https://example.com/farm.jpg",
        externalURL: "https://example.com/farm"
      };

      await token.connect(owner).mint(user1.address, metadata, "cert");
      await token.connect(user1).transferFrom(user1.address, user2.address, 1);

      expect(await token.ownerOf(1)).to.equal(user2.address);
      expect(await token.balanceOf(user1.address)).to.equal(0);
      expect(await token.balanceOf(user2.address)).to.equal(1);
    });

    it("Should prevent transfer without ownership or approval", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployTokenFixture);

      const metadata = {
        name: "Test Farm",
        description: "A test coffee farm",
        farmInfo: {
          name: "Test Farm",
          location: "Kenya",
          area: "10 hectares",
          soilType: "Volcanic"
        },
        imageURI: "https://example.com/farm.jpg",
        externalURL: "https://example.com/farm"
      };

      await token.connect(owner).mint(user1.address, metadata, "cert");
      await expect(
        token.connect(user2).transferFrom(user1.address, user2.address, 1)
      ).to.be.reverted;
    });
  });

  describe("Approvals", function () {
    it("Should allow approval and transferFrom", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployTokenFixture);

      const metadata = {
        name: "Test Farm",
        description: "A test coffee farm",
        farmInfo: {
          name: "Test Farm",
          location: "Kenya",
          area: "10 hectares",
          soilType: "Volcanic"
        },
        imageURI: "https://example.com/farm.jpg",
        externalURL: "https://example.com/farm"
      };

      await token.connect(owner).mint(user1.address, metadata, "cert");
      await token.connect(user1).approve(user2.address, 1);
      await token.connect(user2).transferFrom(user1.address, user2.address, 1);

      expect(await token.ownerOf(1)).to.equal(user2.address);
    });
  });
});
