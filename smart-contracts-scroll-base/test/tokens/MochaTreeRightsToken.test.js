const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MochaTreeRightsToken - Comprehensive", function () {
  async function deployFixture() {
    const [deployer, farmOwner, investor, other, oracle, farmOwner2] = await ethers.getSigners();

    // Deploy MBT (asset)
    const MochaBeanToken = await ethers.getContractFactory("MochaBeanToken");
    const mbt = await MochaBeanToken.deploy();
    await mbt.waitForDeployment();

    // Deploy MLT (ERC721 - farm land)
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    const mlt = await MockERC721.deploy("Mock Land Token", "MLT");
    await mlt.waitForDeployment();

    // Mint farmId 1 to farmOwner
    const farmId = 1n;
    await (await mlt.mint(await farmOwner.getAddress(), farmId)).wait();

    // Deploy MTT (ERC6960 - tree token)
    const MochaTreeToken = await ethers.getContractFactory("MochaTreeToken");
    const mtt = await MochaTreeToken.deploy("1.0");
    await mtt.waitForDeployment();

    // Mint two tree subIds under mainId=farmId to farmOwner (acts as TBA stand-in)
    await (await mtt.mint(await farmOwner.getAddress(), farmId, 1, 1)).wait();
    await (await mtt.mint(await farmOwner.getAddress(), farmId, 2, 1)).wait();

    // Deploy required MTTR libraries and link
    const MTTRBondLibFactory = await ethers.getContractFactory("MTTRBondLib");
    const mttrBondLib = await MTTRBondLibFactory.deploy();
    await mttrBondLib.waitForDeployment();

    const MTTRFarmLibFactory = await ethers.getContractFactory("MTTRFarmLib");
    const mttrFarmLib = await MTTRFarmLibFactory.deploy();
    await mttrFarmLib.waitForDeployment();

    const MTTRYieldLibFactory = await ethers.getContractFactory("MTTRYieldLib");
    const mttrYieldLib = await MTTRYieldLibFactory.deploy();
    await mttrYieldLib.waitForDeployment();

    const MochaTreeRightsToken = await ethers.getContractFactory("MochaTreeRightsToken", {
      libraries: {
        "contracts/diamondPattern/libraries/MTTRBondLib.sol:MTTRBondLib": await mttrBondLib.getAddress(),
        "contracts/diamondPattern/libraries/MTTRFarmLib.sol:MTTRFarmLib": await mttrFarmLib.getAddress(),
        "contracts/diamondPattern/libraries/MTTRYieldLib.sol:MTTRYieldLib": await mttrYieldLib.getAddress(),
      },
    });

    const mttr = await MochaTreeRightsToken.deploy(
      await mbt.getAddress(),
      "Mocha Tree Rights Token",
      "MTTR",
      await mlt.getAddress(),
      await mtt.getAddress()
    );
    await mttr.waitForDeployment();

    return { deployer, farmOwner, farmOwner2, investor, other, oracle, mbt, mlt, mtt, mttr, farmId };
  }

  async function addDefaultFarm(ctx, overrides = {}) {
    const name = overrides.name ?? "Highland Arabica Farm";
    const targetAPYBps = overrides.apy ?? 1000n; // 10%
    const maturityMonths = overrides.maturity ?? 36n; // min
    const tba = overrides.tba ?? (await ctx.farmOwner.getAddress());

    const tx = await ctx.mttr
      .connect(ctx.deployer)
      .addFarm(ctx.farmId, name, tba, targetAPYBps, maturityMonths, "FARM-A", "FARMA");
    await tx.wait();

    // Grant BURNER_ROLE to MTTR vault for MBT burning
    const burnerRole = await ctx.mbt.BURNER_ROLE();
    await (await ctx.mbt.grantRole(burnerRole, await ctx.mttr.getAddress())).wait();

    const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
    return { shareTokenAddress: cfg.shareTokenAddress, name };
  }

  it("constructor initializes MTTR storage pointers and roles", async function () {
    const ctx = await deployFixture();
    expect(await ctx.mttr.mochaLandToken()).to.equal(await ctx.mlt.getAddress());
    expect(await ctx.mttr.mochaTreeToken()).to.equal(await ctx.mtt.getAddress());

    // Deployer should have admin and manager roles
    expect(await ctx.mttr.hasRole(await ctx.mttr.ADMIN_ROLE(), await ctx.deployer.getAddress())).to.equal(true);
    expect(await ctx.mttr.hasRole(await ctx.mttr.VAULT_MANAGER_ROLE(), await ctx.deployer.getAddress())).to.equal(true);
  });

  describe("Interface state variable getters", function () {
    it("returns correct state variable values", async function () {
      const ctx = await deployFixture();
      
      // Test all state variable getters
      expect(await ctx.mttr.totalFarms()).to.equal(0n);
      expect(await ctx.mttr.totalShareTokens()).to.equal(0n);
      expect(await ctx.mttr.totalValueLocked()).to.equal(0n);
      expect(await ctx.mttr.totalActiveBonds()).to.equal(0n);
      expect(await ctx.mttr.minimumMaturityPeriod()).to.equal(36n);
      expect(await ctx.mttr.maximumMaturityPeriod()).to.equal(60n);
      expect(await ctx.mttr.defaultCollateralRatio()).to.equal(12000n);
      expect(await ctx.mttr.getTREE_VALUATION_MBT()).to.equal(4n);
      expect(await ctx.mttr.getBPS_DENOMINATOR()).to.equal(10000n);
      expect(await ctx.mttr.getVAULT_MANAGER_ROLE()).to.equal(await ctx.mttr.VAULT_MANAGER_ROLE());
      expect(await ctx.mttr.getDEFAULT_ADMIN_ROLE()).to.equal(ethers.ZeroHash);
    });

    it("updates state variables after farm operations", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      expect(await ctx.mttr.totalFarms()).to.equal(2n); // totalFarms = highest farmId + 1
      expect(await ctx.mttr.totalShareTokens()).to.equal(1n);

      // Purchase bond to update TVL and active bonds (smaller amount to avoid per-wallet cap)
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      // Grant BURNER_ROLE to MTTR vault for MBT burning
      const burnerRole = await ctx.mbt.BURNER_ROLE();
      await (await ctx.mbt.grantRole(burnerRole, await ctx.mttr.getAddress())).wait();
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      expect(await ctx.mttr.totalValueLocked()).to.equal(investAmount);
      expect(await ctx.mttr.totalActiveBonds()).to.equal(1n);
    });
  });

  describe("Tree information functions", function () {
    it("getFarmTreeCount returns correct tree count", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      const treeCount = await ctx.mttr.getFarmTreeCount(ctx.farmId);
      expect(treeCount).to.equal(2n); // We minted 2 trees in deployFixture

      // Mint another tree and refresh
      await (await ctx.mtt.mint(await ctx.farmOwner.getAddress(), ctx.farmId, 3, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).refreshFarmTreeInfo(ctx.farmId, await ctx.farmOwner.getAddress());

      const newTreeCount = await ctx.mttr.getFarmTreeCount(ctx.farmId);
      expect(newTreeCount).to.equal(3n);
    });

    it("getFarmTreeIds returns correct tree IDs", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      const treeIds = await ctx.mttr.getFarmTreeIds(ctx.farmId);
      expect(treeIds.length).to.equal(2);
      expect(treeIds[0]).to.equal(1n);
      expect(treeIds[1]).to.equal(2n);
    });

    it("getFarmTreeInfo returns comprehensive tree information", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      const [treeCount, treeIds, totalTreeShares] = await ctx.mttr.getFarmTreeInfo(ctx.farmId);
      
      expect(treeCount).to.equal(2n);
      expect(treeIds.length).to.equal(2);
      expect(treeIds[0]).to.equal(1n);
      expect(treeIds[1]).to.equal(2n);
      expect(totalTreeShares).to.equal(2n); // 1 share per tree
    });

    it("fails to get tree info for non-existent farm", async function () {
      const ctx = await deployFixture();
      const nonExistentFarmId = 999n;

      await expect(ctx.mttr.getFarmTreeCount(nonExistentFarmId)).to.be.revertedWith("Farm does not exist as MLT token");
      await expect(ctx.mttr.getFarmTreeIds(nonExistentFarmId)).to.be.revertedWith("Farm does not exist as MLT token");
      await expect(ctx.mttr.getFarmTreeInfo(nonExistentFarmId)).to.be.revertedWith("Farm does not exist as MLT token");
    });
  });

  describe("Active farm management", function () {
    it("getActiveFarmIds returns only active farms", async function () {
      const ctx = await deployFixture();
      
      // Initially no farms
      let activeFarms = await ctx.mttr.getActiveFarmIds();
      expect(activeFarms.length).to.equal(0);

      // Add first farm
      await addDefaultFarm(ctx);
      activeFarms = await ctx.mttr.getActiveFarmIds();
      expect(activeFarms.length).to.equal(1);
      expect(activeFarms[0]).to.equal(ctx.farmId);

      // Add second farm with different owner (farmOwner2)
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");
      
      activeFarms = await ctx.mttr.getActiveFarmIds();
      expect(activeFarms.length).to.equal(2);

      // Deactivate first farm
      await ctx.mttr.connect(ctx.deployer).updateFarm(ctx.farmId, 1000n, false);
      activeFarms = await ctx.mttr.getActiveFarmIds();
      expect(activeFarms.length).to.equal(1);
      expect(activeFarms[0]).to.equal(farmId2);
    });
  });

  describe("Farm management", function () {
    it("adds a farm and seeds share token/tree info", async function () {
      const ctx = await deployFixture();
      const { shareTokenAddress, name } = await addDefaultFarm(ctx);

      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(cfg.farmOwner).to.equal(await ctx.farmOwner.getAddress());
      expect(cfg.treeCount).to.equal(2n);
      expect(cfg.active).to.equal(true);
      expect(cfg.shareTokenAddress).to.equal(shareTokenAddress);

      const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
      const shareToken = FarmShareToken.attach(shareTokenAddress);
      expect(await shareToken.farmId()).to.equal(ctx.farmId);
      expect(await shareToken.farmName()).to.equal(name);
    });

    it("fails to add farm by non-admin and invalid params", async function () {
      const ctx = await deployFixture();
      // Non-admin (other) cannot add farm
      await expect(
        ctx.mttr
          .connect(ctx.other)
          .addFarm(ctx.farmId, "Farm", await ctx.farmOwner.getAddress(), 1000n, 36n, "X", "Y")
      ).to.be.revertedWithCustomError; // AccessControl revert

      // Invalid TBA address
      await expect(
        ctx.mttr
          .connect(ctx.deployer)
          .addFarm(ctx.farmId, "Farm", ethers.ZeroAddress, 1000n, 36n, "X", "Y")
      ).to.be.revertedWith("invalid TBA");

      // APY > 30%
      await expect(
        ctx.mttr
          .connect(ctx.deployer)
          .addFarm(ctx.farmId, "Farm", await ctx.farmOwner.getAddress(), 3001n, 36n, "X", "Y")
      ).to.be.revertedWith("APY 0-30%");

      // Maturity below minimum (default min is 36)
      await expect(
        ctx.mttr
          .connect(ctx.deployer)
          .addFarm(ctx.farmId, "Farm", await ctx.farmOwner.getAddress(), 1000n, 12n, "X", "Y")
      ).to.be.revertedWith("Invalid maturity");
    });

    it("updateFarm by admin and reject others", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      await expect(ctx.mttr.connect(ctx.deployer).updateFarm(ctx.farmId, 1200n, false)).to.not.be
        .reverted;
      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(cfg.targetAPY).to.equal(1200n);
      expect(cfg.active).to.equal(false);

      await expect(ctx.mttr.connect(ctx.other).updateFarm(ctx.farmId, 1000n, true)).to.be.revertedWithCustomError; // AccessControl revert
    });

    it("getFarmTreeInfo and refreshFarmTreeInfo update counts and share token", async function () {
      const ctx = await deployFixture();
      const { shareTokenAddress } = await addDefaultFarm(ctx);

      // Mint another tree to increase count
      await (await ctx.mtt.mint(await ctx.farmOwner.getAddress(), ctx.farmId, 3, 1)).wait();

      // Only VAULT_MANAGER_ROLE (deployer) can refresh
      await expect(
        ctx.mttr.connect(ctx.deployer).refreshFarmTreeInfo(ctx.farmId, await ctx.farmOwner.getAddress())
      ).to.not.be.reverted;

      const info = await ctx.mttr.getFarmTreeInfo(ctx.farmId);
      expect(info[0]).to.equal(3n);

      const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
      const shareToken = FarmShareToken.attach(shareTokenAddress);
      const treeInfo = await shareToken.getTreeInfo();
      expect(treeInfo[0]).to.equal(3n);
    });
  });

  describe("Investments and yield", function () {
    it("purchases bond and mints shares proportional to investment; rejects invalid amounts/state", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);

      await expect(ctx.mttr.connect(ctx.investor).purchaseBond(0n)).to.be.revertedWith(
        "amount > 0"
      );

      // Below min investment (min 0.04 MBT)
      await expect(
        ctx.mttr.connect(ctx.investor).purchaseBond(ethers.parseEther("0.01"))
      ).to.be.revertedWith("min investment not met");

      // Activate -> deactivate farm to test inactive rejection
      await ctx.mttr.connect(ctx.deployer).updateFarm(ctx.farmId, 1000n, false);
      await expect(
        ctx.mttr.connect(ctx.investor).purchaseBond(investAmount)
      ).to.be.revertedWith("farm is inactive");

      // Reactivate and purchase
      await ctx.mttr.connect(ctx.deployer).updateFarm(ctx.farmId, 1000n, true);
      const expectedShares = investAmount / 4n; // valuationPerTree default = 4
      const bondId = await ctx.mttr.connect(ctx.investor).purchaseBond.staticCall(investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      const pos = await ctx.mttr.getBondPosition(await ctx.investor.getAddress(), bondId);
      expect(pos.depositAmount).to.equal(investAmount);
      expect(pos.shareTokenAmount).to.equal(expectedShares);
    });

    it("distributes yield; only vault manager can call; pending when no shares", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Without any purchase (no shares), distribute yield -> pending stays
      const y1 = ethers.parseEther("50");
      await ctx.mbt.mint(await ctx.deployer.getAddress(), y1);
      await ctx.mbt.connect(ctx.deployer).approve(await ctx.mttr.getAddress(), y1);
      await ctx.mttr.connect(ctx.deployer).distributeYield(ctx.farmId, y1);
      const yd1 = await ctx.mttr.getYieldDistribution(ctx.farmId);
      expect(yd1.pendingYield).to.equal(y1);

      // Purchase to create shares (smaller amount to avoid per-wallet cap)
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Only vault manager (deployer) can distribute; others revert
      const y2 = ethers.parseEther("100");
      await ctx.mbt.mint(await ctx.other.getAddress(), y2);
      await ctx.mbt.connect(ctx.other).approve(await ctx.mttr.getAddress(), y2);
      await expect(
        ctx.mttr.connect(ctx.other).distributeYield(ctx.farmId, y2)
      ).to.be.revertedWithCustomError; // AccessControl revert

      await ctx.mbt.mint(await ctx.deployer.getAddress(), y2);
      await ctx.mbt.connect(ctx.deployer).approve(await ctx.mttr.getAddress(), y2);
      await ctx.mttr.connect(ctx.deployer).distributeYield(ctx.farmId, y2);

      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
      const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
      expect(await shareToken.getAssetBalance()).to.equal(y2);

      // User pending yield should be > 0
      const pending = await shareToken.getPendingYield(await ctx.investor.getAddress());
      expect(pending).to.be.gt(0n);
    });
  });

  describe("Collateral and liquidation", function () {
    it("updates collateral valuation; only oracle can call; triggers liquidation when under threshold", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Grant ORACLE_ROLE to oracle signer
      const ORACLE_ROLE = await ctx.mttr.ORACLE_ROLE();
      await (await ctx.mttr.grantRole(ORACLE_ROLE, await ctx.oracle.getAddress())).wait();

      // Purchase to ensure non-zero shares
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Unauthorized caller
      await expect(
        ctx.mttr.connect(ctx.other).updateCollateralValuation(ctx.farmId, 120n)
      ).to.be.revertedWithCustomError; // AccessControl revert

      // Authorized update: set very low valuation per tree to drop coverage ratio
      await expect(ctx.mttr.connect(ctx.oracle).updateCollateralValuation(ctx.farmId, 4n)).to.not.be.reverted;

      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(cfg.active).to.equal(false); // Liquidation triggers inactive
    });
  });

  describe("Redemptions", function () {
    describe("Early Redemption", function () {
      it("redeems early with default penalty (5%)", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        const investAmount = ethers.parseEther("4"); // 1 tree worth
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        // Fund the vault with plenty of MBT for redemptions
        const vaultMBTAmount = ethers.parseEther("1000"); // 1000 MBT for vault
        await ctx.mbt.mint(await ctx.mttr.getAddress(), vaultMBTAmount);

        const before = await ctx.mbt.balanceOf(await ctx.investor.getAddress());
        await ctx.mttr.connect(ctx.investor).redeemBondEarly(0);
        const after = await ctx.mbt.balanceOf(await ctx.investor.getAddress());
        
        // Default penalty is 500 basis points (5%)
        const expected = investAmount - (investAmount * 500n) / 10000n;
        expect(after - before).to.equal(expected);
        expect(await shareToken.balanceOf(await ctx.investor.getAddress())).to.equal(0n);
      });

      it("redeems early with custom penalty (10%)", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        // Update penalty to 10% (1000 basis points)
        await ctx.mttr.connect(ctx.deployer).updateEarlyRedemptionPenalty(1000);

        const investAmount = ethers.parseEther("4"); // 1 tree worth
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        // Fund the vault with plenty of MBT for redemptions
        const vaultMBTAmount = ethers.parseEther("1000"); // 1000 MBT for vault
        await ctx.mbt.mint(await ctx.mttr.getAddress(), vaultMBTAmount);

        const before = await ctx.mbt.balanceOf(await ctx.investor.getAddress());
        await ctx.mttr.connect(ctx.investor).redeemBondEarly(0);
        const after = await ctx.mbt.balanceOf(await ctx.investor.getAddress());
        
        // Custom penalty is 1000 basis points (10%)
        const expected = investAmount - (investAmount * 1000n) / 10000n;
        expect(after - before).to.equal(expected);
        expect(await shareToken.balanceOf(await ctx.investor.getAddress())).to.equal(0n);
      });

      it("enforces minimum time invested before early redemption", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        // Set minimum time invested to 7 days
        await ctx.mttr.connect(ctx.deployer).updateFarmMinTimeInvested(ctx.farmId, 7 * 24 * 60 * 60);

        const investAmount = ethers.parseEther("4"); // 1 tree worth
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        // Fund the vault with plenty of MBT for redemptions
        const vaultMBTAmount = ethers.parseEther("1000"); // 1000 MBT for vault
        await ctx.mbt.mint(await ctx.mttr.getAddress(), vaultMBTAmount);

        // Try to redeem immediately - should fail
        await expect(ctx.mttr.connect(ctx.investor).redeemBondEarly(0))
          .to.be.revertedWith("min time not met");

        // Fast-forward 3 days - should still fail
        await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        await expect(ctx.mttr.connect(ctx.investor).redeemBondEarly(0))
          .to.be.revertedWith("min time not met");

        // Fast-forward to 7 days - should succeed
        await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        await expect(ctx.mttr.connect(ctx.investor).redeemBondEarly(0))
          .to.not.be.reverted;
      });

      it("fails to redeem early with invalid bond id", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);
        await expect(ctx.mttr.connect(ctx.investor).redeemBondEarly(0))
          .to.be.revertedWith("Invalid bond ID");
      });

      it("fails to redeem early when bond already redeemed", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        const investAmount = ethers.parseEther("4");
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        // Fund the vault with plenty of MBT for redemptions
        const vaultMBTAmount = ethers.parseEther("1000"); // 1000 MBT for vault
        await ctx.mbt.mint(await ctx.mttr.getAddress(), vaultMBTAmount);

        // First redemption should succeed
        await ctx.mttr.connect(ctx.investor).redeemBondEarly(0);

        // Second redemption should fail
        await expect(ctx.mttr.connect(ctx.investor).redeemBondEarly(0))
          .to.be.revertedWith("Bond already redeemed");
      });

      it("fails to redeem early when bond already matured", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        const investAmount = ethers.parseEther("4");
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        // Fast-forward to maturity
        await ethers.provider.send("evm_increaseTime", [36 * 30 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        // Should fail because bond is matured
        await expect(ctx.mttr.connect(ctx.investor).redeemBondEarly(0))
          .to.be.revertedWith("Bond already matured - use redeemBond");
      });
    });

    describe("Matured Redemption", function () {
      it("redeems matured bond (principal only)", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        const investAmount = ethers.parseEther("4"); // 1 tree worth
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        // Approve share token for burnFrom
        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        // Fast-forward to maturity (36 months * 30 days)
        await ethers.provider.send("evm_increaseTime", [36 * 30 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        // Fund the vault with plenty of MBT for redemptions
        const vaultMBTAmount = ethers.parseEther("1000"); // 1000 MBT for vault
        await ctx.mbt.mint(await ctx.mttr.getAddress(), vaultMBTAmount);

        const before = await ctx.mbt.balanceOf(await ctx.investor.getAddress());
        await ctx.mttr.connect(ctx.investor).redeemBond(0);
        const after = await ctx.mbt.balanceOf(await ctx.investor.getAddress());
        expect(after - before).to.equal(investAmount);
        expect(await shareToken.balanceOf(await ctx.investor.getAddress())).to.equal(0n);
      });

      it("fails to redeem matured bond before maturity", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        const investAmount = ethers.parseEther("4");
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        // Try to redeem before maturity
        await expect(ctx.mttr.connect(ctx.investor).redeemBond(0))
          .to.be.revertedWith("Bond not yet matured");
      });

      it("fails to redeem with invalid bond id", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);
        await expect(ctx.mttr.connect(ctx.investor).redeemBond(0))
          .to.be.revertedWith("Invalid bond ID");
      });

      it("fails to redeem already redeemed bond", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        const investAmount = ethers.parseEther("4");
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        // Fast-forward to maturity
        await ethers.provider.send("evm_increaseTime", [36 * 30 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        // Fund the vault with plenty of MBT for redemptions
        const vaultMBTAmount = ethers.parseEther("1000"); // 1000 MBT for vault
        await ctx.mbt.mint(await ctx.mttr.getAddress(), vaultMBTAmount);

        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        // First redemption should succeed
        await ctx.mttr.connect(ctx.investor).redeemBond(0);

        // Second redemption should fail
        await expect(ctx.mttr.connect(ctx.investor).redeemBond(0))
          .to.be.revertedWith("Bond already redeemed");
      });
    });

    describe("Penalty Configuration", function () {
      it("allows admin to update early redemption penalty", async function () {
        const ctx = await deployFixture();
        
        // Check default penalty
        expect(await ctx.mttr.earlyRedemptionPenaltyBps()).to.equal(500); // 5%

        // Update to 7.5%
        await ctx.mttr.connect(ctx.deployer).updateEarlyRedemptionPenalty(750);
        expect(await ctx.mttr.earlyRedemptionPenaltyBps()).to.equal(750);

        // Update to 0% (no penalty)
        await ctx.mttr.connect(ctx.deployer).updateEarlyRedemptionPenalty(0);
        expect(await ctx.mttr.earlyRedemptionPenaltyBps()).to.equal(0);
      });

      it("rejects penalty updates from non-admin", async function () {
        const ctx = await deployFixture();
        
        await expect(ctx.mttr.connect(ctx.other).updateEarlyRedemptionPenalty(1000))
          .to.be.revertedWithCustomError; // AccessControl revert
      });

      it("rejects penalty updates above maximum (50%)", async function () {
        const ctx = await deployFixture();
        
        await expect(ctx.mttr.connect(ctx.deployer).updateEarlyRedemptionPenalty(5001))
          .to.be.revertedWith("Penalty too high - max 50%");
      });

      it("applies updated penalty to early redemptions", async function () {
        const ctx = await deployFixture();
        await addDefaultFarm(ctx);

        // Set penalty to 15%
        await ctx.mttr.connect(ctx.deployer).updateEarlyRedemptionPenalty(1500);

        const investAmount = ethers.parseEther("4");
        await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
        await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

        // Fund the vault with plenty of MBT for redemptions
        const vaultMBTAmount = ethers.parseEther("1000"); // 1000 MBT for vault
        await ctx.mbt.mint(await ctx.mttr.getAddress(), vaultMBTAmount);

        const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
        const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
        await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

        const before = await ctx.mbt.balanceOf(await ctx.investor.getAddress());
        await ctx.mttr.connect(ctx.investor).redeemBondEarly(0);
        const after = await ctx.mbt.balanceOf(await ctx.investor.getAddress());
        
        // 15% penalty
        const expected = investAmount - (investAmount * 1500n) / 10000n;
        expect(after - before).to.equal(expected);
      });
    });
  });

  describe("Bond rollover functionality", function () {
    it("successfully rolls over matured bond to new farm", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Create second farm with different owner (farmOwner2) BEFORE fast-forwarding time
      // Use longer maturity period (60 months) so it doesn't mature when we fast-forward 36 months
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 60n, "FARM-B", "FARMB");

      // Purchase bond in first farm
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Fast-forward to maturity (this will only affect the first farm's maturity)
      await ethers.provider.send("evm_increaseTime", [36 * 30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // Approve share token for burnFrom
      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
      const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
      const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
      await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

      // Rollover bond to new farm
      const tx = await ctx.mttr.connect(ctx.investor).rolloverBond(0, farmId2);
      const receipt = await tx.wait();
      // Extract the new bond ID from the event or use static call to get the expected value
      const newBondId = 1n; // Should be the next bond ID
      expect(newBondId).to.equal(1n);

      // Check new bond position
      const newPosition = await ctx.mttr.getBondPosition(await ctx.investor.getAddress(), newBondId);
      expect(newPosition.farmId).to.equal(farmId2);
      expect(newPosition.depositAmount).to.equal(investAmount);
      expect(newPosition.redeemed).to.equal(false);

      // Check that old bond is marked as redeemed
      const oldPosition = await ctx.mttr.getBondPosition(await ctx.investor.getAddress(), 0);
      expect(oldPosition.redeemed).to.equal(true);

      // Check that investor has shares in new farm
      const cfg2 = await ctx.mttr.getFarmConfig(farmId2);
      const shareToken2 = FarmShareToken.attach(cfg2.shareTokenAddress);
      expect(await shareToken2.balanceOf(await ctx.investor.getAddress())).to.be.gt(0n);
    });

    it("fails to rollover immature bond", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Purchase bond
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Create second farm with different owner (farmOwner2)
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");

      // Try to rollover before maturity
      await expect(ctx.mttr.connect(ctx.investor).rolloverBond(0, farmId2)).to.be.revertedWith("Bond not yet matured");
    });

    it("fails to rollover to inactive farm", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Purchase bond
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Create second farm with different owner (farmOwner2) and deactivate it
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");
      await ctx.mttr.connect(ctx.deployer).updateFarm(farmId2, 1000n, false);

      // Fast-forward to maturity
      await ethers.provider.send("evm_increaseTime", [36 * 30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // Approve share token for burnFrom
      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
      const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
      const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
      await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);

      // Try to rollover to inactive farm
      await expect(ctx.mttr.connect(ctx.investor).rolloverBond(0, farmId2)).to.be.revertedWith("New farm not accepting investments");
    });

    it("fails to rollover already redeemed bond", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Purchase bond
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Create second farm with different owner (farmOwner2)
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");

      // Fast-forward to maturity and redeem
      await ethers.provider.send("evm_increaseTime", [36 * 30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
      const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
      const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
      await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);
      await ctx.mttr.connect(ctx.investor).redeemBond(0);

      // Try to rollover already redeemed bond
      await expect(ctx.mttr.connect(ctx.investor).rolloverBond(0, farmId2)).to.be.revertedWith("Bond already redeemed");
    });
  });

  describe("Farm settlement and maturity", function () {
    it("settleMatureFarm marks farm as inactive after maturity", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Purchase bond to create some activity
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Fast-forward to maturity
      await ethers.provider.send("evm_increaseTime", [36 * 30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // Only vault manager can settle mature farm
      await expect(ctx.mttr.connect(ctx.other).settleMatureFarm(ctx.farmId)).to.be.revertedWithCustomError; // AccessControl
      
      await ctx.mttr.connect(ctx.deployer).settleMatureFarm(ctx.farmId);
      
      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(cfg.active).to.equal(false);
    });

    it("fails to settle immature farm", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Try to settle before maturity
      await expect(ctx.mttr.connect(ctx.deployer).settleMatureFarm(ctx.farmId)).to.be.revertedWith("Farm not yet matured");
    });

    it("fails to settle non-existent farm", async function () {
      const ctx = await deployFixture();
      const nonExistentFarmId = 999n;
      
      await expect(ctx.mttr.connect(ctx.deployer).settleMatureFarm(nonExistentFarmId)).to.be.revertedWith("Farm does not exist as MLT token");
    });
  });

  describe("Admin and access controls", function () {
    it("pause/unpause blocks purchaseBond and allows after unpause", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Deployer has ADMIN_ROLE
      await ctx.mttr.connect(ctx.deployer).pause();

      await ctx.mbt.mint(await ctx.investor.getAddress(), ethers.parseEther("4"));
      await ctx.mbt.connect(ctx.investor).approve(await ctx.mttr.getAddress(), ethers.parseEther("4"));
      await expect(
        ctx.mttr.connect(ctx.investor).purchaseBond(ethers.parseEther("4"))
      ).to.be.revertedWithCustomError; // Pausable uses custom errors

      await ctx.mttr.connect(ctx.deployer).unpause();
      await expect(
        ctx.mttr.connect(ctx.investor).purchaseBond(ethers.parseEther("4"))
      ).to.not.be.reverted;
    });

    it("updateMochaLandToken / updateMochaTreeToken by admin only", async function () {
      const ctx = await deployFixture();
      const newAddr = await ctx.other.getAddress();
      await expect(ctx.mttr.connect(ctx.other).updateMochaLandToken(newAddr)).to.be.revertedWithCustomError; // AccessControl
      await expect(ctx.mttr.connect(ctx.deployer).updateMochaLandToken(newAddr)).to.not.be.reverted;
      expect(await ctx.mttr.mochaLandToken()).to.equal(newAddr);

      await expect(ctx.mttr.connect(ctx.other).updateMochaTreeToken(newAddr)).to.be.revertedWithCustomError;
      await expect(ctx.mttr.connect(ctx.deployer).updateMochaTreeToken(newAddr)).to.not.be.reverted;
      expect(await ctx.mttr.mochaTreeToken()).to.equal(newAddr);
    });
  });

  describe("Farm Configuration Updates", function () {
    it("allows admin to update farm target APY", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(cfg.targetAPY).to.equal(1000n); // 10%

      // Update to 15%
      await ctx.mttr.connect(ctx.deployer).updateFarmTargetAPY(ctx.farmId, 1500);
      
      const updatedCfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(updatedCfg.targetAPY).to.equal(1500n);
    });

    it("allows admin to update farm maturity period", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(cfg.maturityPeriod).to.equal(36n); // 36 months

      // Update to 48 months
      await ctx.mttr.connect(ctx.deployer).updateFarmMaturityPeriod(ctx.farmId, 48);
      
      const updatedCfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(updatedCfg.maturityPeriod).to.equal(48n);
      expect(updatedCfg.maturityTimestamp).to.be.gt(cfg.maturityTimestamp);
    });

    it("allows admin to update farm minimum time invested", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(cfg.minTimeInvested).to.equal(30n * 24n * 60n * 60n); // 30 days default

      // Update to 14 days
      const newMinTime = 14n * 24n * 60n * 60n;
      await ctx.mttr.connect(ctx.deployer).updateFarmMinTimeInvested(ctx.farmId, newMinTime);
      
      const updatedCfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(updatedCfg.minTimeInvested).to.equal(newMinTime);
    });

    it("allows admin to update farm investment limits", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(cfg.minInvestment).to.equal(ethers.parseEther("0.04")); // 0.04 MBT
      expect(cfg.maxInvestment).to.equal(ethers.parseEther("80")); // 80 MBT

      // Update limits
      const newMin = ethers.parseEther("0.1");
      const newMax = ethers.parseEther("100");
      await ctx.mttr.connect(ctx.deployer).updateFarmInvestmentLimits(ctx.farmId, newMin, newMax);
      
      const updatedCfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      expect(updatedCfg.minInvestment).to.equal(newMin);
      expect(updatedCfg.maxInvestment).to.equal(newMax);
    });

    it("rejects farm updates from non-admin", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      await expect(ctx.mttr.connect(ctx.other).updateFarmTargetAPY(ctx.farmId, 1500))
        .to.be.revertedWithCustomError; // AccessControl revert

      await expect(ctx.mttr.connect(ctx.other).updateFarmMaturityPeriod(ctx.farmId, 48))
        .to.be.revertedWithCustomError; // AccessControl revert

      await expect(ctx.mttr.connect(ctx.other).updateFarmMinTimeInvested(ctx.farmId, 7 * 24 * 60 * 60))
        .to.be.revertedWithCustomError; // AccessControl revert

      await expect(ctx.mttr.connect(ctx.other).updateFarmInvestmentLimits(ctx.farmId, ethers.parseEther("0.1"), ethers.parseEther("100")))
        .to.be.revertedWithCustomError; // AccessControl revert
    });

    it("validates farm update parameters", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Invalid APY (> 30%)
      await expect(ctx.mttr.connect(ctx.deployer).updateFarmTargetAPY(ctx.farmId, 3001))
        .to.be.revertedWith("APY must be 0-30%");

      // Invalid maturity period (below minimum)
      await expect(ctx.mttr.connect(ctx.deployer).updateFarmMaturityPeriod(ctx.farmId, 12))
        .to.be.revertedWith("Invalid maturity");

      // Invalid maturity period (above maximum)
      await expect(ctx.mttr.connect(ctx.deployer).updateFarmMaturityPeriod(ctx.farmId, 72))
        .to.be.revertedWith("Invalid maturity");

      // Invalid investment limits (min > max)
      await expect(ctx.mttr.connect(ctx.deployer).updateFarmInvestmentLimits(ctx.farmId, ethers.parseEther("100"), ethers.parseEther("50")))
        .to.be.revertedWith("Max investment must be > min investment");
    });

    it("fails to update non-existent farm", async function () {
      const ctx = await deployFixture();
      const nonExistentFarmId = 999n;

      await expect(ctx.mttr.connect(ctx.deployer).updateFarmTargetAPY(nonExistentFarmId, 1500))
        .to.be.revertedWith("Farm not found in vault");

      await expect(ctx.mttr.connect(ctx.deployer).updateFarmMaturityPeriod(nonExistentFarmId, 48))
        .to.be.revertedWith("Farm not found in vault");

      await expect(ctx.mttr.connect(ctx.deployer).updateFarmMinTimeInvested(nonExistentFarmId, 7 * 24 * 60 * 60))
        .to.be.revertedWith("Farm not found in vault");

      await expect(ctx.mttr.connect(ctx.deployer).updateFarmInvestmentLimits(nonExistentFarmId, ethers.parseEther("0.1"), ethers.parseEther("100")))
        .to.be.revertedWith("Farm not found in vault");
    });
  });

  describe("ERC4626 overrides", function () {
    it("reverts ERC4626 entrypoints to enforce bond flows", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);
      await expect(ctx.mttr.deposit(0n, await ctx.investor.getAddress())).to.be.revertedWith(
        "Use purchaseBond instead"
      );
      await expect(ctx.mttr.mint(0n, await ctx.investor.getAddress())).to.be.revertedWith(
        "Use purchaseBond instead"
      );
      await expect(
        ctx.mttr.withdraw(0n, await ctx.investor.getAddress(), await ctx.investor.getAddress())
      ).to.be.revertedWith("Use redeemBond instead");
      await expect(
        ctx.mttr.redeem(0n, await ctx.investor.getAddress(), await ctx.investor.getAddress())
      ).to.be.revertedWith("Use redeemBond instead");
    });

    it("totalAssets returns correct balance", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Initially no assets
      expect(await ctx.mttr.totalAssets()).to.equal(0n);

      // Purchase bond to add assets
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      expect(await ctx.mttr.totalAssets()).to.equal(investAmount);
    });
  });

  describe("Preview functionality", function () {
    it("previewMintFarmTokens returns correct farm and share information", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Test preview with 4 MBT (1 tree worth)
      const mbtAmount = ethers.parseEther("4");
      const [farmId, shareAmount, capacityRemaining] = await ctx.mttr.previewMintFarmTokens(mbtAmount);
      
      expect(farmId).to.equal(ctx.farmId);
      expect(shareAmount).to.equal(ethers.parseEther("1")); // 1 tree worth of shares  
      expect(capacityRemaining).to.equal(ethers.parseEther("2")); // 2 trees total capacity
    });

    it("previewMintFarmTokens handles multiple farms correctly", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Add second farm
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");

      // Test preview with amount that would fill first farm and spill to second
      const mbtAmount = ethers.parseEther("12"); // 3 trees worth, but farm 1 only has 2 trees
      const [farmId, shareAmount, capacityRemaining] = await ctx.mttr.previewMintFarmTokens(mbtAmount);
      
      expect(farmId).to.equal(ctx.farmId); // Should start with first farm
      expect(shareAmount).to.equal(ethers.parseEther("2")); // 2 trees worth (fills farm 1)
      expect(capacityRemaining).to.equal(ethers.parseEther("2")); // Total capacity in farm 1
    });
  });

  describe("Per-user farm tracking functionality", function () {
    it("tracks user's current farm independently", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Add second farm
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 2, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");

      // Both users should start with farm 1
      const user1FarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor.getAddress());
      const user2FarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.other.getAddress());
      expect(user1FarmId).to.equal(ctx.farmId);
      expect(user2FarmId).to.equal(ctx.farmId);

      // User 1 fills farm 1 completely (2 trees = 8 MBT), which marks it as sold out
      const investAmount = ethers.parseEther("8"); // 2 trees * 4 MBT
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // User 1 should now be on farm 2 (farm 1 is sold out)
      const user1FarmIdAfter = await ctx.mttr.getUserCurrentFarmId(await ctx.investor.getAddress());
      expect(user1FarmIdAfter).to.equal(farmId2);

      // User 2 should still be on farm 1 (not automatically advanced until they make a purchase)
      const user2FarmIdAfter = await ctx.mttr.getUserCurrentFarmId(await ctx.other.getAddress());
      expect(user2FarmIdAfter).to.equal(ctx.farmId);

      // User 2 purchases and is automatically advanced to farm 2 (skipping sold-out farm 1)
      const investAmount2 = ethers.parseEther("4"); // 1 tree * 4 MBT
      await ctx.mbt.mint(await ctx.other.getAddress(), investAmount2);
      await ctx.mttr.connect(ctx.other).purchaseBond(investAmount2);

      // User 2 should now be on farm 2 (after being automatically advanced during purchase)
      const user2FarmIdAfter2 = await ctx.mttr.getUserCurrentFarmId(await ctx.other.getAddress());
      expect(user2FarmIdAfter2).to.equal(farmId2);
    });

    it("marks farms as sold out when completely filled", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Add second farm
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");

      // Fill farm 1 completely (2 trees = 8 MBT with 4 MBT per tree)
      const investAmount = ethers.parseEther("8"); // 2 trees * 4 MBT
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Farm 1 should be marked as sold out
      expect(await ctx.mttr.isFarmSoldOut(ctx.farmId)).to.be.true;
      expect(await ctx.mttr.isFarmSoldOut(farmId2)).to.be.false;

      // User should now be on farm 2
      const userFarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor.getAddress());
      expect(userFarmId).to.equal(farmId2);
    });

    it("handles spillover across multiple farms", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Add second farm
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");

      // Purchase more than farm 1 capacity (3 trees worth = 12 MBT, but farm 1 only has 2 trees)
      const investAmount = ethers.parseEther("12"); // 3 trees * 4 MBT
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Check that user is now on farm 2
      const userFarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor.getAddress());
      expect(userFarmId).to.equal(farmId2);

      // Farm 1 should be sold out
      expect(await ctx.mttr.isFarmSoldOut(ctx.farmId)).to.be.true;
    });
  });

  describe("User Bond Management", function () {
    it("gets all user bonds correctly", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Purchase multiple bonds (smaller amounts to stay within farm capacity)
      const investAmount = ethers.parseEther("2"); // 0.5 tree worth each
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount * 3n);
      
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Get all user bonds
      const allBonds = await ctx.mttr.getUserBonds(await ctx.investor.getAddress());
      expect(allBonds.length).to.equal(3);
      
      // Check bond details
      expect(allBonds[0].farmId).to.equal(ctx.farmId);
      expect(allBonds[0].depositAmount).to.equal(investAmount);
      expect(allBonds[0].redeemed).to.equal(false);
      
      expect(allBonds[1].farmId).to.equal(ctx.farmId);
      expect(allBonds[1].depositAmount).to.equal(investAmount);
      expect(allBonds[1].redeemed).to.equal(false);
      
      expect(allBonds[2].farmId).to.equal(ctx.farmId);
      expect(allBonds[2].depositAmount).to.equal(investAmount);
      expect(allBonds[2].redeemed).to.equal(false);
    });

    it("gets user bond count correctly", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Initially no bonds
      expect(await ctx.mttr.getUserBondCount(await ctx.investor.getAddress())).to.equal(0);

      // Purchase bonds
      const investAmount = ethers.parseEther("4");
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount * 2n);
      
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);
      expect(await ctx.mttr.getUserBondCount(await ctx.investor.getAddress())).to.equal(1);
      
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);
      expect(await ctx.mttr.getUserBondCount(await ctx.investor.getAddress())).to.equal(2);
    });

    it("gets active bonds correctly", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Purchase multiple bonds (smaller amounts to stay within farm capacity)
      const investAmount = ethers.parseEther("2"); // 0.5 tree worth each
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount * 3n);
      
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Get active bonds (should be all 3)
      const [activeBonds, activeBondIds] = await ctx.mttr.getUserActiveBonds(await ctx.investor.getAddress());
      expect(activeBonds.length).to.equal(3);
      expect(activeBondIds.length).to.equal(3);
      expect(activeBondIds[0]).to.equal(0);
      expect(activeBondIds[1]).to.equal(1);
      expect(activeBondIds[2]).to.equal(2);

      // Fund the vault with plenty of MBT for redemptions
      const vaultMBTAmount = ethers.parseEther("1000"); // 1000 MBT for vault
      await ctx.mbt.mint(await ctx.mttr.getAddress(), vaultMBTAmount);

      // Redeem one bond
      const cfg = await ctx.mttr.getFarmConfig(ctx.farmId);
      const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
      const shareToken = FarmShareToken.attach(cfg.shareTokenAddress);
      const shares = await shareToken.balanceOf(await ctx.investor.getAddress());
      await shareToken.connect(ctx.investor).approve(await ctx.mttr.getAddress(), shares);
      
      await ctx.mttr.connect(ctx.investor).redeemBondEarly(0);

      // Get active bonds (should be 2 now)
      const [activeBondsAfter, activeBondIdsAfter] = await ctx.mttr.getUserActiveBonds(await ctx.investor.getAddress());
      expect(activeBondsAfter.length).to.equal(2);
      expect(activeBondIdsAfter.length).to.equal(2);
      expect(activeBondIdsAfter[0]).to.equal(1);
      expect(activeBondIdsAfter[1]).to.equal(2);
    });

    it("handles user with no bonds", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // User with no bonds
      const allBonds = await ctx.mttr.getUserBonds(await ctx.other.getAddress());
      expect(allBonds.length).to.equal(0);
      
      const bondCount = await ctx.mttr.getUserBondCount(await ctx.other.getAddress());
      expect(bondCount).to.equal(0);
      
      const [activeBonds, activeBondIds] = await ctx.mttr.getUserActiveBonds(await ctx.other.getAddress());
      expect(activeBonds.length).to.equal(0);
      expect(activeBondIds.length).to.equal(0);
    });
  });

  describe("Interface compliance and edge cases", function () {
    it("handles multiple farms and bonds correctly", async function () {
      const ctx = await deployFixture();
      
      // Add multiple farms with different owners
      await addDefaultFarm(ctx);
      
      const farmId2 = 2n;
      await (await ctx.mlt.mint(await ctx.farmOwner2.getAddress(), farmId2)).wait();
      await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), farmId2, 1, 1)).wait();
      await ctx.mttr.connect(ctx.deployer).addFarm(farmId2, "Farm 2", await ctx.farmOwner2.getAddress(), 1000n, 36n, "FARM-B", "FARMB");

      // Purchase bonds in both farms (smaller amounts to avoid per-wallet cap)
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount * 2n);
      
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);
      // For the second farm, we need to add it first and then purchase
      // Since purchaseBond now auto-selects farms, we need to ensure the second farm is available
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Check state variables
      expect(await ctx.mttr.totalFarms()).to.equal(3n); // totalFarms = highest farmId + 1 (farmId 2 + 1 = 3)
      expect(await ctx.mttr.totalShareTokens()).to.equal(2n);
      expect(await ctx.mttr.totalValueLocked()).to.equal(investAmount * 2n);
      expect(await ctx.mttr.totalActiveBonds()).to.equal(2n);

      // Check bond positions
      const bond0 = await ctx.mttr.getBondPosition(await ctx.investor.getAddress(), 0);
      const bond1 = await ctx.mttr.getBondPosition(await ctx.investor.getAddress(), 1);
      expect(bond0.farmId).to.equal(ctx.farmId);
      expect(bond1.farmId).to.equal(farmId2);
    });

    it("handles zero amounts and edge cases gracefully", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Test zero amount purchase
      await expect(ctx.mttr.connect(ctx.investor).purchaseBond(0)).to.be.revertedWith("amount > 0");

      // Test zero yield distribution
      await expect(ctx.mttr.connect(ctx.deployer).distributeYield(ctx.farmId, 0)).to.be.revertedWith("Yield amount must be > 0");

      // Test zero valuation update - grant ORACLE_ROLE first
      const ORACLE_ROLE = await ctx.mttr.ORACLE_ROLE();
      await (await ctx.mttr.grantRole(ORACLE_ROLE, await ctx.oracle.getAddress())).wait();
      await expect(ctx.mttr.connect(ctx.oracle).updateCollateralValuation(ctx.farmId, 0)).to.be.revertedWithCustomError; // Custom error
    });

    it("maintains data consistency across operations", async function () {
      const ctx = await deployFixture();
      await addDefaultFarm(ctx);

      // Purchase bond
      const investAmount = ethers.parseEther("4"); // 1 tree worth
      await ctx.mbt.mint(await ctx.investor.getAddress(), investAmount);
      const bondId = await ctx.mttr.connect(ctx.investor).purchaseBond.staticCall(investAmount);
      await ctx.mttr.connect(ctx.investor).purchaseBond(investAmount);

      // Check all data is consistent
      const position = await ctx.mttr.getBondPosition(await ctx.investor.getAddress(), bondId);
      const farmConfig = await ctx.mttr.getFarmConfig(ctx.farmId);
      const collateralInfo = await ctx.mttr.getCollateralInfo(ctx.farmId);
      const yieldDistribution = await ctx.mttr.getYieldDistribution(ctx.farmId);

      expect(position.farmId).to.equal(ctx.farmId);
      expect(position.depositAmount).to.equal(investAmount);
      expect(position.redeemed).to.equal(false);
      expect(farmConfig.active).to.equal(true);
      expect(collateralInfo.totalTrees).to.equal(2n);
      expect(yieldDistribution.totalYield).to.equal(0n);
    });
  });
});


