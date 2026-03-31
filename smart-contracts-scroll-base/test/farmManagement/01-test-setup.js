const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("TreeFarm System", function () {
  let owner, user1, user2, user3;
  let mttToken, mltToken, mbtToken;
  let farmManagement, treeManagement, yieldManagement, treeFarmProxy;

  // Constants updated for ethers v6
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const DECIMAL_POINTS = 10n ** 18n;
  const SHARES_PER_TREE = 100n * DECIMAL_POINTS;

  // Sample data for testing
  const farm1 = {
    farmId: 1,
    info: {
      name: "Green Valley Farm",
      location: "California",
      soilType: "Loamy",
      climate: "Mediterranean",
      description: "Sustainable avocado and citrus farm",
    },
    certifications: "Organic, Fair Trade",
    owner: null, // Will be set in beforeEach
    walletAddress: null, // Will be set in beforeEach
  };

  const tree1 = {
    species: "Hass Avocado",
    pointName: "Block A-1",
    latitude: 34125000, // 34.125000 (scaled to avoid floating point)
    longitude: -118765000, // -118.765000
    altitude: 150, // 150m above sea level
    accuracy: 5, // 5m accuracy
    satelliteCount: 8,
    pdop: 2, // Position dilution of precision
    baseStationId: "BS-001",
    plantingDate: Math.floor(Date.now() / 1000) - 86400 * 180, // 180 days ago
  };

  const tree2 = {
    species: "Meyer Lemon",
    pointName: "Block B-2",
    latitude: 34126000,
    longitude: -118766000,
    altitude: 152,
    accuracy: 4,
    satelliteCount: 9,
    pdop: 2,
    baseStationId: "BS-002",
    plantingDate: Math.floor(Date.now() / 1000) - 86400 * 365, // 1 year ago
  };

  beforeEach(async function () {
    // Get signers (ethers v6 syntax)
    [owner, user1, user2, user3] = await ethers.getSigners();
    farm1.owner = await user1.getAddress();
    farm1.walletAddress = await user1.getAddress();

    // Deploy mock tokens (ethers v6 syntax)
    const MTTToken = await ethers.getContractFactory("MockMTTToken");
    mttToken = await MTTToken.deploy();

    const MLTToken = await ethers.getContractFactory("MockMLTToken");
    mltToken = await MLTToken.deploy();

    const MBTToken = await ethers.getContractFactory("MockMBTToken");
    mbtToken = await MBTToken.deploy();

    // Deploy implementation contracts
    const FarmManagement = await ethers.getContractFactory("FarmManagement");
    farmManagement = await FarmManagement.deploy(
      await mttToken.getAddress(),
      await mltToken.getAddress(),
      await mbtToken.getAddress()
    );

    const TreeManagement = await ethers.getContractFactory("TreeManagement");
    treeManagement = await TreeManagement.deploy(
      await mttToken.getAddress(),
      await mltToken.getAddress(),
      await mbtToken.getAddress(),
      await farmManagement.getAddress()
    );

    const YieldManagement = await ethers.getContractFactory("YieldManagement");
    yieldManagement = await YieldManagement.deploy(
      await mttToken.getAddress(),
      await mltToken.getAddress(),
      await mbtToken.getAddress(),
      await farmManagement.getAddress(),
      await treeManagement.getAddress()
    );

    // Deploy proxy
    const TreeFarmProxy = await ethers.getContractFactory("TreeFarmProxy");
    treeFarmProxy = await TreeFarmProxy.deploy(
      await mttToken.getAddress(),
      await mltToken.getAddress(),
      await mbtToken.getAddress(),
      await farmManagement.getAddress(),
      await treeManagement.getAddress(),
      await yieldManagement.getAddress()
    );

    // Set the proxy contract in each implementation contract
    await farmManagement.setProxyContract(await treeFarmProxy.getAddress());
    await treeManagement.setYieldManagerContract(
      await yieldManagement.getAddress()
    );
    await farmManagement.setYieldManagerContract(
      await yieldManagement.getAddress()
    );
  });

  describe("Contract Setup", function () {
    it("Should set the correct contract references", async function () {
      expect(await farmManagement.MTTToken()).to.equal(
        await mttToken.getAddress()
      );
      expect(await farmManagement.MLTToken()).to.equal(
        await mltToken.getAddress()
      );
      expect(await farmManagement.MBTToken()).to.equal(
        await mbtToken.getAddress()
      );
      expect(await farmManagement.proxyContract()).to.equal(
        await treeFarmProxy.getAddress()
      );
      expect(await farmManagement.yieldManagerContract()).to.equal(
        await yieldManagement.getAddress()
      );

      expect(await treeManagement.farmManagementContract()).to.equal(
        await farmManagement.getAddress()
      );
      expect(await treeManagement.yieldManagerContract()).to.equal(
        await yieldManagement.getAddress()
      );

      expect(await yieldManagement.farmManagementContract()).to.equal(
        await farmManagement.getAddress()
      );
      expect(await yieldManagement.treeManagementContract()).to.equal(
        await treeManagement.getAddress()
      );
    });

    it("Should grant admin role to owner", async function () {
      expect(await farmManagement.hasRole(ADMIN_ROLE, await owner.getAddress()))
        .to.be.true;
    });
  });

  describe("Farm Management", function () {
    it("Should add a new farm", async function () {
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );

      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.farmId).to.equal(farm1.farmId);
      expect(farmInfo.farmManager).to.equal(farm1.owner);
      expect(farmInfo.farmWalletAddress).to.equal(farm1.walletAddress);
      expect(farmInfo.isActive).to.be.true;
      expect(farmInfo.farmInfo.name).to.equal(farm1.info.name);
    });

    it("Should allow setting a farm manager", async function () {
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );

      await treeFarmProxy.setFarmManager(
        await user2.getAddress(),
        true,
        farm1.farmId
      );

      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.farmManager).to.equal(await user2.getAddress());
    });

    it("Should allow setting a farm operator", async function () {
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );

      await treeFarmProxy.setFarmOperator(
        await user3.getAddress(),
        true,
        farm1.farmId
      );

      // Check using the FarmManagement contract directly since the proxy doesn't expose this view function
      expect(
        await farmManagement.authorizedFarmsOperators(
          farm1.farmId,
          await user3.getAddress()
        )
      ).to.be.true;
    });

    it("Should allow setting farm wallet address", async function () {
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );

      const newWallet = await user2.getAddress();
      await treeFarmProxy.setFarmWalletAddress(newWallet, farm1.farmId);

      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.farmWalletAddress).to.equal(newWallet);
    });

    it("Should allow setting farm tree price", async function () {
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );

      const newPrice = ethers.parseEther("200");
      await treeFarmProxy.setFarmTreePrice(farm1.farmId, newPrice);

      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.treePrice).to.equal(newPrice);
    });
  });

  describe("Tree Management", function () {
    beforeEach(async function () {
      // Add a farm for tree tests
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );
    });

    it("Should add a new tree to a farm", async function () {
      await treeFarmProxy.addTree(farm1.farmId, tree1);

      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.treeCount).to.equal(1);
      expect(farmInfo.activeTreeCount).to.equal(1);

      const treeData = await treeFarmProxy.getTreeData(farm1.farmId, 1);
      expect(treeData.species).to.equal(tree1.species);
      expect(treeData.location.pointName).to.equal(tree1.pointName);
      expect(treeData.location.coordinates.latitude).to.equal(tree1.latitude);
      expect(treeData.location.coordinates.longitude).to.equal(tree1.longitude);
      expect(treeData.plantingDate).to.equal(tree1.plantingDate);
      expect(treeData.healthStatus).to.equal("Healthy");
    });

    it("Should add multiple trees in batch", async function () {
      await treeFarmProxy.batchAddTrees(farm1.farmId, [tree1, tree2]);

      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.treeCount).to.equal(2);
      expect(farmInfo.activeTreeCount).to.equal(2);

      const treeData1 = await treeFarmProxy.getTreeData(farm1.farmId, 1);
      expect(treeData1.species).to.equal(tree1.species);

      const treeData2 = await treeFarmProxy.getTreeData(farm1.farmId, 2);
      expect(treeData2.species).to.equal(tree2.species);
    });

    it("Should update tree health status", async function () {
      await treeFarmProxy.addTree(farm1.farmId, tree1);

      const newStatus = "Needs Attention";
      await treeFarmProxy.updateTreeHealth(farm1.farmId, 1, newStatus);

      const treeData = await treeFarmProxy.getTreeData(farm1.farmId, 1);
      expect(treeData.healthStatus).to.equal(newStatus);
    });

    it("Should update active tree count when tree becomes critical", async function () {
      await treeFarmProxy.addTree(farm1.farmId, tree1);

      // Initial state
      let farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.activeTreeCount).to.equal(1);

      // Set to critical
      await treeFarmProxy.updateTreeHealth(farm1.farmId, 1, "Critical");

      // Check updated state
      farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.activeTreeCount).to.equal(0);

      // Restore to healthy
      await treeFarmProxy.updateTreeHealth(farm1.farmId, 1, "Healthy");

      // Check state again
      farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.activeTreeCount).to.equal(1);
    });
  });

  describe("Yield Management", function () {
    beforeEach(async function () {
      // Add a farm for yield tests
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );

      // Add trees
      await treeFarmProxy.addTree(farm1.farmId, tree1);
      await treeFarmProxy.addTree(farm1.farmId, tree2);
    });

    it("Should record yield for a single tree", async function () {
      const yieldAmount = ethers.parseEther("10");
      await treeFarmProxy.recordTreeYield(farm1.farmId, 1, yieldAmount, false);

      // Get the tree data to check last yield
      const treeData = await treeFarmProxy.getTreeData(farm1.farmId, 1);
      expect(treeData.lastYield).to.equal(yieldAmount);

      // Get farm data to check yield records
      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.totalLifetimeYield).to.equal(yieldAmount);
      expect(farmInfo.lastYieldAmount).to.equal(yieldAmount);
      expect(farmInfo.lastYieldTimestamp).to.be.gt(0);
    });

    it("Should record speculative yield for farm", async function () {
      const estimatedYield = ethers.parseEther("20");
      await treeFarmProxy.recordFarmSpeculativeYield(
        farm1.farmId,
        estimatedYield
      );

      // Check that it was recorded correctly in the yield manager
      // Note: This might need to be adapted based on the actual implementation
      // of how speculative yields are stored and retrieved
    });

    it("Should record actual yield for farm", async function () {
      const totalYield = ethers.parseEther("30");
      await treeFarmProxy.recordFarmActualYield(farm1.farmId, totalYield);

      // Get farm data to check yield records
      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.totalLifetimeYield).to.equal(totalYield);
      expect(farmInfo.lastYieldAmount).to.equal(totalYield);

      // Both trees should have received yield
      const treeData1 = await treeFarmProxy.getTreeData(farm1.farmId, 1);
      const treeData2 = await treeFarmProxy.getTreeData(farm1.farmId, 2);

      // Each tree should get half of the total yield (since we have 2 trees)
      const expectedYieldPerTree = totalYield / 2n;
      expect(treeData1.lastYield).to.equal(expectedYieldPerTree);
      expect(treeData2.lastYield).to.equal(expectedYieldPerTree);
    });

    it("Should not distribute yield to critical trees", async function () {
      // Set tree 2 to critical
      await treeFarmProxy.updateTreeHealth(farm1.farmId, 2, "Critical");

      // Record yield
      const totalYield = ethers.parseEther("15");
      await treeFarmProxy.recordFarmActualYield(farm1.farmId, totalYield);

      // Tree 1 should get all yield, tree 2 should get none
      const treeData1 = await treeFarmProxy.getTreeData(farm1.farmId, 1);
      const treeData2 = await treeFarmProxy.getTreeData(farm1.farmId, 2);

      expect(treeData1.lastYield).to.equal(totalYield);
      expect(treeData2.lastYield).to.equal(0);
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      // Add a farm for access control tests
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );
    });

    it("Should prevent non-admins from adding farms", async function () {
      await expect(
        treeFarmProxy
          .connect(user2)
          .addFarm(
            2,
            farm1.info,
            farm1.certifications,
            await user2.getAddress(),
            await user2.getAddress()
          )
      ).to.be.reverted;
    });

    it("Should prevent non-farm managers from adding trees", async function () {
      await expect(treeFarmProxy.connect(user2).addTree(farm1.farmId, tree1)).to
        .be.reverted;
    });

    it("Should allow farm managers to add trees", async function () {
      // Make user2 a farm manager
      await treeFarmProxy.setFarmManager(
        await user2.getAddress(),
        true,
        farm1.farmId
      );

      // Now user2 should be able to add trees
      await treeFarmProxy.connect(user2).addTree(farm1.farmId, tree1);

      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.treeCount).to.equal(1);
    });

    it("Should allow farm operators to add trees", async function () {
      // Make user3 a farm operator
      await treeFarmProxy.setFarmOperator(
        await user3.getAddress(),
        true,
        farm1.farmId
      );

      // Now user3 should be able to add trees
      await treeFarmProxy.connect(user3).addTree(farm1.farmId, tree1);

      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      expect(farmInfo.treeCount).to.equal(1);
    });
  });

  describe("Integration Tests", function () {
    beforeEach(async function () {
      // Add a farm for integration tests
      await treeFarmProxy.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.walletAddress,
        farm1.owner
      );

      // Add trees
      await treeFarmProxy.addTree(farm1.farmId, tree1);
      await treeFarmProxy.addTree(farm1.farmId, tree2);
    });

    it("Should handle complete tree lifecycle", async function () {
      // 1. Record initial yield
      const initialYield = ethers.parseEther("5");
      await treeFarmProxy.recordTreeYield(farm1.farmId, 1, initialYield, false);

      // 2. Update tree health
      await treeFarmProxy.updateTreeHealth(farm1.farmId, 1, "Needs Attention");

      // 3. Record more yield
      const moreYield = ethers.parseEther("3");
      await treeFarmProxy.recordTreeYield(farm1.farmId, 1, moreYield, false);

      // 4. Set tree to critical
      await treeFarmProxy.updateTreeHealth(farm1.farmId, 1, "Critical");

      // 5. Try to record yield - should not increase total yield for tree
      const criticalYield = ethers.parseEther("2");
      await treeFarmProxy.recordTreeYield(farm1.farmId, 1, criticalYield, true);

      // 6. Restore tree health
      await treeFarmProxy.updateTreeHealth(farm1.farmId, 1, "Healthy");

      // 7. Record final yield
      const finalYield = ethers.parseEther("7");
      await treeFarmProxy.recordTreeYield(farm1.farmId, 1, finalYield, false);

      // Get final farm state
      const farmInfo = await treeFarmProxy.getFarmInfo(farm1.farmId);
      // Total lifetime yield should be initial + more + final (critical yield is speculative)
      const expectedTotalYield = initialYield + moreYield + finalYield;
      expect(farmInfo.totalLifetimeYield).to.equal(expectedTotalYield);
    });

    it("Should properly distribute yield across all active trees", async function () {
      // Add a third tree
      await treeFarmProxy.addTree(farm1.farmId, {
        ...tree1,
        pointName: "Block C-3",
      });

      // Set tree 2 to critical (inactive)
      await treeFarmProxy.updateTreeHealth(farm1.farmId, 2, "Critical");

      // Record farm yield
      const totalYield = ethers.parseEther("100");
      await treeFarmProxy.recordFarmActualYield(farm1.farmId, totalYield);

      // Check distribution
      const treeData1 = await treeFarmProxy.getTreeData(farm1.farmId, 1);
      const treeData2 = await treeFarmProxy.getTreeData(farm1.farmId, 2);
      const treeData3 = await treeFarmProxy.getTreeData(farm1.farmId, 3);

      // Trees 1 and 3 should each get half the yield
      // Tree 2 should get nothing (critical)
      const expectedYieldPerTree = totalYield / 2n;
      expect(treeData1.lastYield).to.equal(expectedYieldPerTree);
      expect(treeData2.lastYield).to.equal(0);
      expect(treeData3.lastYield).to.equal(expectedYieldPerTree);
    });
  });
});
