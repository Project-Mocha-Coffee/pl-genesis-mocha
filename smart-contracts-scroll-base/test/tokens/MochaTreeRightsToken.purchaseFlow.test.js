const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MochaTreeRightsToken - Per-User Farm Tracking", function () {
  async function deployFixture() {
    const [deployer, farmOwner1, farmOwner2, investor1, investor2] = await ethers.getSigners();
    console.log("Deployer:", await deployer.getAddress());
    console.log("FarmOwner1:", await farmOwner1.getAddress());
    console.log("FarmOwner2:", await farmOwner2.getAddress());
    console.log("Investor1:", await investor1.getAddress());
    console.log("Investor2:", await investor2.getAddress());

    // Deploy MBT (asset)
    const MochaBeanToken = await ethers.getContractFactory("MochaBeanToken");
    const mbt = await MochaBeanToken.deploy();
    await mbt.waitForDeployment();

    // Deploy MLT (ERC721 - farm land)
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    const mlt = await MockERC721.deploy("Mock Land Token", "MLT");
    await mlt.waitForDeployment();

    // Mint farm land tokens
    const farmId1 = 1n;
    const farmId2 = 2n;
    const farmId3 = 3n;
    await (await mlt.mint(await farmOwner1.getAddress(), farmId1)).wait();
    await (await mlt.mint(await farmOwner2.getAddress(), farmId2)).wait();
    await (await mlt.mint(await deployer.getAddress(), farmId3)).wait();
    console.log("Minted MLT farmIds:", farmId1.toString(), farmId2.toString(), farmId3.toString());

    // Deploy MTT (ERC6960 - tree token)
    const MochaTreeToken = await ethers.getContractFactory("MochaTreeToken");
    const mtt = await MochaTreeToken.deploy("1.0");
    await mtt.waitForDeployment();

    // Trees will be minted per test as needed
    console.log("MTT deployed, trees will be minted per test");

    // Deploy libraries
    const MTTRBondLibFactory = await ethers.getContractFactory("MTTRBondLib");
    const mttrBondLib = await MTTRBondLibFactory.deploy();
    await mttrBondLib.waitForDeployment();

    const MTTRFarmLibFactory = await ethers.getContractFactory("MTTRFarmLib");
    const mttrFarmLib = await MTTRFarmLibFactory.deploy();
    await mttrFarmLib.waitForDeployment();

    const MTTRYieldLibFactory = await ethers.getContractFactory("MTTRYieldLib");
    const mttrYieldLib = await MTTRYieldLibFactory.deploy();
    await mttrYieldLib.waitForDeployment();

    // Deploy MTTR vault with linked libs
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

    // Grant MTTR vault permission to burn MBT (admin action)
    const burnerRole = await mbt.BURNER_ROLE();
    await (await mbt.grantRole(burnerRole, await mttr.getAddress())).wait();
    console.log("Granted BURNER_ROLE to MTTR vault:", await mttr.getAddress());

    return { 
      deployer, farmOwner1, farmOwner2, investor1, investor2, 
      mbt, mlt, mtt, mttr, farmId1, farmId2, farmId3 
    };
  }

  async function addFarm(mttr, farmOwner, farmId, name, treeCount = 100) {
    console.log("Adding farm", farmId, name, "with", treeCount, "trees");
    await (await mttr.connect(farmOwner).addFarm(
      farmId,
      name,
      await farmOwner.getAddress(),
      1000n, // 10% APY
      36n,
      "FARM",
      "FARM"
    )).wait();
    // Lower min investment to allow spillover on subsequent farms
    await (await mttr
      .connect(farmOwner)
      .updateFarmInvestmentLimits(farmId, ethers.parseEther("1"), ethers.parseEther("1000000")))
      .wait();
    const cfg = await mttr.getFarmConfig(farmId);
    console.log("Farm added:", {
      farmId: farmId.toString(),
      owner: cfg.farmOwner,
      treeCount: cfg.treeCount.toString(),
      shareToken: cfg.shareTokenAddress,
      minInvestment: cfg.minInvestment.toString(),
      maxInvestment: cfg.maxInvestment.toString()
    });
    return cfg.shareTokenAddress;
  }

  it("allows multiple users to purchase from same farm independently", async function () {
    const ctx = await deployFixture();

    // Mint trees for each farm
    await (await ctx.mtt.mint(await ctx.farmOwner1.getAddress(), ctx.farmId1, 1, 100)).wait();
    await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), ctx.farmId2, 1, 100)).wait();
    await (await ctx.mtt.mint(await ctx.deployer.getAddress(), ctx.farmId3, 1, 50)).wait();

    // Add three farms with different capacities
    const st1 = await addFarm(ctx.mttr, ctx.farmOwner1, ctx.farmId1, "Farm 1", 100);
    const st2 = await addFarm(ctx.mttr, ctx.farmOwner2, ctx.farmId2, "Farm 2", 100);
    const st3 = await addFarm(ctx.mttr, ctx.deployer, ctx.farmId3, "Farm 3", 50);

    // Both investors start with farm 1 (index 0)
    const user1FarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor1.getAddress());
    const user2FarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor2.getAddress());
    console.log("Initial user farm IDs:", { user1: user1FarmId.toString(), user2: user2FarmId.toString() });
    expect(user1FarmId).to.equal(ctx.farmId1);
    expect(user2FarmId).to.equal(ctx.farmId1);

    // Investor1 purchases 10 trees worth (1000 MBT) - below per-wallet cap
    const invest1 = ethers.parseEther("1000"); // 10 trees * 100 MBT
    await ctx.mbt.mint(await ctx.investor1.getAddress(), invest1);
    await ctx.mttr.connect(ctx.investor1).purchaseBond(invest1);

    // Investor2 should still be able to purchase from farm 1
    const invest2 = ethers.parseEther("500"); // 5 trees * 100 MBT
    await ctx.mbt.mint(await ctx.investor2.getAddress(), invest2);
    await ctx.mttr.connect(ctx.investor2).purchaseBond(invest2);

    // Check share token balances
    const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
    const share1 = FarmShareToken.attach(st1);
    const share2 = FarmShareToken.attach(st2);

    const bal1_user1 = await share1.balanceOf(await ctx.investor1.getAddress());
    const bal1_user2 = await share1.balanceOf(await ctx.investor2.getAddress());
    const totalSupply1 = await share1.totalSupply();

    console.log("Farm 1 balances:", {
      user1: bal1_user1.toString(),
      user2: bal1_user2.toString(),
      totalSupply: totalSupply1.toString()
    });

    expect(bal1_user1).to.equal(ethers.parseEther("10")); // 10 trees
    expect(bal1_user2).to.equal(ethers.parseEther("5")); // 5 trees
    expect(totalSupply1).to.equal(ethers.parseEther("15")); // 15 trees total

    // Both users should still be on farm 1 (not sold out yet)
    const user1FarmIdAfter = await ctx.mttr.getUserCurrentFarmId(await ctx.investor1.getAddress());
    const user2FarmIdAfter = await ctx.mttr.getUserCurrentFarmId(await ctx.investor2.getAddress());
    console.log("User farm IDs after purchases:", { user1: user1FarmIdAfter.toString(), user2: user2FarmIdAfter.toString() });
    expect(user1FarmIdAfter).to.equal(ctx.farmId1);
    expect(user2FarmIdAfter).to.equal(ctx.farmId1);

    // Farm 1 should not be marked as sold out
    expect(await ctx.mttr.isFarmSoldOut(ctx.farmId1)).to.be.false;
  });

  it("advances users independently when they hit per-wallet cap", async function () {
    const ctx = await deployFixture();

    // Mint trees for each farm
    await (await ctx.mtt.mint(await ctx.farmOwner1.getAddress(), ctx.farmId1, 1, 100)).wait();
    await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), ctx.farmId2, 1, 100)).wait();
    await (await ctx.mtt.mint(await ctx.deployer.getAddress(), ctx.farmId3, 1, 50)).wait();

    // Add farms
    await addFarm(ctx.mttr, ctx.farmOwner1, ctx.farmId1, "Farm 1", 100);
    await addFarm(ctx.mttr, ctx.farmOwner2, ctx.farmId2, "Farm 2", 100);
    await addFarm(ctx.mttr, ctx.deployer, ctx.farmId3, "Farm 3", 50);

    // Investor1 purchases 20 trees (hits per-wallet cap)
    const invest1 = ethers.parseEther("2000"); // 20 trees * 100 MBT
    await ctx.mbt.mint(await ctx.investor1.getAddress(), invest1);
    await ctx.mttr.connect(ctx.investor1).purchaseBond(invest1);

    // Investor1 should now be on farm 2
    const user1FarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor1.getAddress());
    console.log("Investor1 current farm after cap:", user1FarmId.toString());
    expect(user1FarmId).to.equal(ctx.farmId2);

    // Investor2 should still be on farm 1
    const user2FarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor2.getAddress());
    console.log("Investor2 current farm:", user2FarmId.toString());
    expect(user2FarmId).to.equal(ctx.farmId1);

    // Investor2 can still purchase from farm 1
    const invest2 = ethers.parseEther("1000"); // 10 trees
    await ctx.mbt.mint(await ctx.investor2.getAddress(), invest2);
    await ctx.mttr.connect(ctx.investor2).purchaseBond(invest2);

    // Investor1 can purchase from farm 2
    const invest1More = ethers.parseEther("1000"); // 10 trees
    await ctx.mbt.mint(await ctx.investor1.getAddress(), invest1More);
    await ctx.mttr.connect(ctx.investor1).purchaseBond(invest1More);

    // Check balances
    const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
    const share1 = FarmShareToken.attach(await ctx.mttr.getFarmConfig(ctx.farmId1).then(cfg => cfg.shareTokenAddress));
    const share2 = FarmShareToken.attach(await ctx.mttr.getFarmConfig(ctx.farmId2).then(cfg => cfg.shareTokenAddress));

    const bal1_user1 = await share1.balanceOf(await ctx.investor1.getAddress());
    const bal1_user2 = await share1.balanceOf(await ctx.investor2.getAddress());
    const bal2_user1 = await share2.balanceOf(await ctx.investor1.getAddress());

    console.log("Balances after independent purchases:", {
      user1_farm1: bal1_user1.toString(),
      user2_farm1: bal1_user2.toString(),
      user1_farm2: bal2_user1.toString()
    });

    expect(bal1_user1).to.equal(ethers.parseEther("20")); // 20 trees on farm 1
    expect(bal1_user2).to.equal(ethers.parseEther("10")); // 10 trees on farm 1
    expect(bal2_user1).to.equal(ethers.parseEther("10")); // 10 trees on farm 2
  });

  it("marks farms as sold out when completely filled", async function () {
    const ctx = await deployFixture();

    // Mint trees for each farm
    await (await ctx.mtt.mint(await ctx.farmOwner1.getAddress(), ctx.farmId1, 1, 5)).wait();
    await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), ctx.farmId2, 1, 3)).wait();

    // Add farms with small capacity for testing
    await addFarm(ctx.mttr, ctx.farmOwner1, ctx.farmId1, "Small Farm 1", 5); // 5 trees
    await addFarm(ctx.mttr, ctx.farmOwner2, ctx.farmId2, "Small Farm 2", 3); // 3 trees

    // Investor1 fills farm 1 completely (5 trees = 500 MBT)
    const invest1 = ethers.parseEther("500");
    await ctx.mbt.mint(await ctx.investor1.getAddress(), invest1);
    await ctx.mttr.connect(ctx.investor1).purchaseBond(invest1);

    // Farm 1 should be marked as sold out
    expect(await ctx.mttr.isFarmSoldOut(ctx.farmId1)).to.be.true;
    expect(await ctx.mttr.isFarmSoldOut(ctx.farmId2)).to.be.false;

    // Investor1 should now be on farm 2
    const user1FarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor1.getAddress());
    expect(user1FarmId).to.equal(ctx.farmId2);

    // Investor2 should skip sold-out farm 1 and go to farm 2
    const invest2 = ethers.parseEther("300"); // 3 trees
    await ctx.mbt.mint(await ctx.investor2.getAddress(), invest2);
    await ctx.mttr.connect(ctx.investor2).purchaseBond(invest2);

    // Farm 2 should now be sold out
    expect(await ctx.mttr.isFarmSoldOut(ctx.farmId2)).to.be.true;

    // Both users should be on farm 3 (or beyond if no more farms)
    const user1FarmIdAfter = await ctx.mttr.getUserCurrentFarmId(await ctx.investor1.getAddress());
    const user2FarmIdAfter = await ctx.mttr.getUserCurrentFarmId(await ctx.investor2.getAddress());
    console.log("Farm IDs after sold out:", { user1: user1FarmIdAfter.toString(), user2: user2FarmIdAfter.toString() });

    // Check share token supplies
    const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
    const share1 = FarmShareToken.attach(await ctx.mttr.getFarmConfig(ctx.farmId1).then(cfg => cfg.shareTokenAddress));
    const share2 = FarmShareToken.attach(await ctx.mttr.getFarmConfig(ctx.farmId2).then(cfg => cfg.shareTokenAddress));

    const totalSupply1 = await share1.totalSupply();
    const totalSupply2 = await share2.totalSupply();

    expect(totalSupply1).to.equal(ethers.parseEther("5")); // Farm 1 completely filled
    expect(totalSupply2).to.equal(ethers.parseEther("3")); // Farm 2 completely filled
  });

  it("handles spillover across multiple farms for single user", async function () {
    const ctx = await deployFixture();

    // Mint trees for each farm
    await (await ctx.mtt.mint(await ctx.farmOwner1.getAddress(), ctx.farmId1, 1, 2)).wait();
    await (await ctx.mtt.mint(await ctx.farmOwner2.getAddress(), ctx.farmId2, 1, 3)).wait();
    await (await ctx.mtt.mint(await ctx.deployer.getAddress(), ctx.farmId3, 1, 2)).wait();

    // Add farms with small capacities
    await addFarm(ctx.mttr, ctx.farmOwner1, ctx.farmId1, "Farm 1", 2); // 2 trees
    await addFarm(ctx.mttr, ctx.farmOwner2, ctx.farmId2, "Farm 2", 3); // 3 trees
    await addFarm(ctx.mttr, ctx.deployer, ctx.farmId3, "Farm 3", 2); // 2 trees

    // Investor1 purchases 6 trees worth (600 MBT) - should spill across farms
    const invest = ethers.parseEther("600"); // 6 trees * 100 MBT
    await ctx.mbt.mint(await ctx.investor1.getAddress(), invest);
    await ctx.mttr.connect(ctx.investor1).purchaseBond(invest);

    // Check balances across farms
    const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
    const share1 = FarmShareToken.attach(await ctx.mttr.getFarmConfig(ctx.farmId1).then(cfg => cfg.shareTokenAddress));
    const share2 = FarmShareToken.attach(await ctx.mttr.getFarmConfig(ctx.farmId2).then(cfg => cfg.shareTokenAddress));
    const share3 = FarmShareToken.attach(await ctx.mttr.getFarmConfig(ctx.farmId3).then(cfg => cfg.shareTokenAddress));

    const bal1 = await share1.balanceOf(await ctx.investor1.getAddress());
    const bal2 = await share2.balanceOf(await ctx.investor1.getAddress());
    const bal3 = await share3.balanceOf(await ctx.investor1.getAddress());

    console.log("Spillover balances:", {
      farm1: bal1.toString(),
      farm2: bal2.toString(),
      farm3: bal3.toString()
    });

    expect(bal1).to.equal(ethers.parseEther("2")); // 2 trees on farm 1
    expect(bal2).to.equal(ethers.parseEther("3")); // 3 trees on farm 2
    expect(bal3).to.equal(ethers.parseEther("1")); // 1 tree on farm 3

    // User should now be on farm 3 (or beyond)
    const userFarmId = await ctx.mttr.getUserCurrentFarmId(await ctx.investor1.getAddress());
    console.log("User current farm after spillover:", userFarmId.toString());

    // Farms 1 and 2 should be sold out
    expect(await ctx.mttr.isFarmSoldOut(ctx.farmId1)).to.be.true;
    expect(await ctx.mttr.isFarmSoldOut(ctx.farmId2)).to.be.true;
    expect(await ctx.mttr.isFarmSoldOut(ctx.farmId3)).to.be.false;
  });

  it("reverts when no capacity available for user", async function () {
    const ctx = await deployFixture();

    // Mint trees for the farm
    await (await ctx.mtt.mint(await ctx.farmOwner1.getAddress(), ctx.farmId1, 1, 1)).wait();

    // Add only one small farm
    await addFarm(ctx.mttr, ctx.farmOwner1, ctx.farmId1, "Tiny Farm", 1); // 1 tree

    // Investor1 fills the farm
    const invest1 = ethers.parseEther("100"); // 1 tree
    await ctx.mbt.mint(await ctx.investor1.getAddress(), invest1);
    await ctx.mttr.connect(ctx.investor1).purchaseBond(invest1);

    // Farm should be sold out
    expect(await ctx.mttr.isFarmSoldOut(ctx.farmId1)).to.be.true;

    // Investor2 should not be able to purchase (no capacity)
    const invest2 = ethers.parseEther("100");
    await ctx.mbt.mint(await ctx.investor2.getAddress(), invest2);
    
    await expect(ctx.mttr.connect(ctx.investor2).purchaseBond(invest2))
      .to.be.revertedWith("You have maxed out your farm purchases");
  });
});