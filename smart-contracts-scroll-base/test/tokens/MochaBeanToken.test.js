/**
 * MochaBeanToken (MBT) Test Suite
 * ERC20 token tests for audit preparation
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MochaBeanToken (MBT)", function () {
  async function deployTokenFixture() {
    const [owner, user1, user2, minter] = await ethers.getSigners();

    const MochaBeanToken = await ethers.getContractFactory("MochaBeanToken");
    const token = await MochaBeanToken.deploy();
    await token.waitForDeployment();

    // Grant minter role
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.grantRole(MINTER_ROLE, minter.address);

    return { token, owner, user1, user2, minter };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("Mocha Bean Token");
      expect(await token.symbol()).to.equal("MBT");
    });

    it("Should set the correct decimals", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.decimals()).to.equal(18);
    });

    it("Should set owner as default admin", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const { token, minter, user1 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther("1000");

      await token.connect(minter).mint(user1.address, amount);
      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should prevent non-minter from minting", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther("1000");

      await expect(
        token.connect(user1).mint(user2.address, amount)
      ).to.be.reverted;
    });

    it("Should emit Transfer event on mint", async function () {
      const { token, minter, user1 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther("1000");

      await expect(token.connect(minter).mint(user1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between users", async function () {
      const { token, minter, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther("1000");

      await token.connect(minter).mint(user1.address, amount);
      await token.connect(user1).transfer(user2.address, amount);

      expect(await token.balanceOf(user1.address)).to.equal(0);
      expect(await token.balanceOf(user2.address)).to.equal(amount);
    });

    it("Should prevent transfer with insufficient balance", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther("1000");

      await expect(
        token.connect(user1).transfer(user2.address, amount)
      ).to.be.reverted;
    });
  });

  describe("Approvals", function () {
    it("Should allow approval and transferFrom", async function () {
      const { token, minter, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = ethers.parseEther("1000");

      await token.connect(minter).mint(user1.address, amount);
      await token.connect(user1).approve(user2.address, amount);
      await token.connect(user2).transferFrom(user1.address, user2.address, amount);

      expect(await token.balanceOf(user2.address)).to.equal(amount);
      expect(await token.allowance(user1.address, user2.address)).to.equal(0);
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant minter role", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      const MINTER_ROLE = await token.MINTER_ROLE();

      await token.grantRole(MINTER_ROLE, user1.address);
      expect(await token.hasRole(MINTER_ROLE, user1.address)).to.be.true;
    });

    it("Should allow admin to revoke minter role", async function () {
      const { token, owner, minter } = await loadFixture(deployTokenFixture);
      const MINTER_ROLE = await token.MINTER_ROLE();

      await token.revokeRole(MINTER_ROLE, minter.address);
      expect(await token.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("Should prevent non-admin from granting roles", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const MINTER_ROLE = await token.MINTER_ROLE();

      await expect(
        token.connect(user1).grantRole(MINTER_ROLE, user2.address)
      ).to.be.reverted;
    });
  });
});
