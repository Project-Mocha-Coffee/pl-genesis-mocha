const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { PANIC_CODES } = require("@nomicfoundation/hardhat-chai-matchers/panic");

const name = "Mocha Bean Token";
const symbol = "MBT";
const initialSupply = 100n;
const description =
  "MBT is a blockchain-based reward token used for staking, trading, and yield incentives in the tokenized coffee ecosystem.";
const externalUrl = "https://projectmocha.com";

describe("MochaBeanToken", function () {
  async function deployTokenFixture() {
    const [owner, treeContract, user1, user2] = await ethers.getSigners();

    const MochaBeanToken = await ethers.getContractFactory("MochaBeanToken");
    const token = await MochaBeanToken.deploy();
    await token.mint(owner.address, initialSupply);

    return { token, owner, treeContract, user1, user2 };
  }

  describe("Basic Token Functions", function () {
    it("has correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal(name);
      expect(await token.symbol()).to.equal(symbol);
    });

    it("has 18 decimals", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.decimals()).to.equal(18n);
    });

    it("returns the total supply", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.totalSupply()).to.equal(initialSupply);
    });
  });

  describe("Minting", function () {
    it("allows owner to mint tokens", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      const mintAmount = 100n;
      await token.connect(owner).mint(user1.address, mintAmount);
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("allows tree contract to mint tokens", async function () {
      const { token, treeContract, user1 } =
        await loadFixture(deployTokenFixture);
      await token.setTreeContract(treeContract.address);
      const mintAmount = 100n;
      await token.connect(treeContract).mint(user1.address, mintAmount);
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("prevents non-authorized addresses from minting", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const mintAmount = 100n;
      await expect(
        token.connect(user1).mint(user2.address, mintAmount)
      ).to.be.revertedWith("Only tree contract or admin can mint");
    });

    it("prevents minting to zero address", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      await expect(token.mint(ethers.ZeroAddress, 100n))
      .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
      .withArgs(ethers.ZeroAddress);
    });
  });

  describe("Burning", function () {
    it("allows owner to burn tokens", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      // First mint some tokens
      const mintAmount = 100n;
      await token.mint(user1.address, mintAmount);
      // Then burn them
      await token.burn(user1.address, mintAmount);
      expect(await token.balanceOf(user1.address)).to.equal(0n);
    });

    it("prevents non-owner from burning", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const mintAmount = 100n;
      await token.mint(user1.address, mintAmount);
      await expect(token.connect(user1).burn(user1.address, mintAmount))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });
  });

  describe("Transfers", function () {
    it("allows transfers when not paused", async function () {
      const { token, owner, user1, user2 } =
        await loadFixture(deployTokenFixture);
      const transferAmount = 50n;
      await token.mint(user1.address, 100n);
      await token.connect(user1).transfer(user2.address, transferAmount);
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("prevents transfers when paused", async function () {
      const { token, owner, user1, user2 } =
        await loadFixture(deployTokenFixture);
      const transferAmount = 50n;
      await token.mint(user1.address, 100n);
      await token.pause();
      await expect(
        token.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  describe("Approval", function () {
    it("allows approval and transferFrom", async function () {
      const { token, owner, user1, user2 } =
        await loadFixture(deployTokenFixture);
      const approvalAmount = 100n;
      await token.mint(user1.address, approvalAmount);
      await token.connect(user1).approve(user2.address, approvalAmount);
      expect(await token.allowance(user1.address, user2.address)).to.equal(
        approvalAmount
      );

      const transferAmount = 50n;
      await token
        .connect(user2)
        .transferFrom(user1.address, user2.address, transferAmount);
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("prevents transferFrom when paused", async function () {
      const { token, owner, user1, user2 } =
        await loadFixture(deployTokenFixture);
      const approvalAmount = 100n;
      await token.mint(user1.address, approvalAmount);
      await token.connect(user1).approve(user2.address, approvalAmount);
      await token.pause();

      await expect(
        token.connect(user2).transferFrom(user1.address, user2.address, 50n)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  describe("Tree Contract Management", function () {
    it("allows owner to set tree contract", async function () {
      const { token, treeContract } = await loadFixture(deployTokenFixture);
      await token.setTreeContract(treeContract.address);
      expect(await token.treeContract()).to.equal(treeContract.address);
    });

    it("prevents non-owner from setting tree contract", async function () {
      const { token, treeContract, user1 } =
        await loadFixture(deployTokenFixture);
      await expect(token.connect(user1).setTreeContract(treeContract.address))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("prevents setting zero address as tree contract", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      await expect(
        token.setTreeContract(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });
});
