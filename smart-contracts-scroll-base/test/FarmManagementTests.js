const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("TreeFarmFactory", function () {
  let owner, admin, farmOwner, operator, user;
  let mttToken, mltToken, mbtToken;
  let farmManagement, treeManagement, yieldManagement, treeFarmFactory;

  const DECIMAL_POINTS = 10n ** 18n;
  const SHARES_PER_TREE = 100n * DECIMAL_POINTS;

  // Sample data for testing
  const farm1 = {
    farmId: 1,
    info: {
      name: "Remainder Test Farm",
      location: "Test Location",
      area: "Nairobi",
      soilType: "loam",
    },
    certifications: "Organic, Fair Trade",
    owner: null, // Will be set in beforeEach
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
    pointName: "Tree Point",
    baseStationId: "BS001",
    plantingDate: BigInt(Math.floor(Date.now() / 1000) - 86400),
    latitude: 123456789n,
    longitude: 987654321n,
    altitude: 100n,
    accuracy: 5n,
    satelliteCount: 8n,
    pdop: 2n,
    species: "Oak",
  };

  beforeEach(async function () {
    // Get signers
    [owner, admin, farmOwner, operator, user] = await ethers.getSigners();
    farm1.owner = await farmOwner.getAddress();

    // Deploy mock tokens
    const MTTToken = await ethers.getContractFactory("MockMTTToken");
    mttToken = await MTTToken.deploy();

    const MLTToken = await ethers.getContractFactory("MockMLTToken");
    mltToken = await MLTToken.deploy();

    const MBTToken = await ethers.getContractFactory("MockMBTToken");
    mbtToken = await MTTToken.deploy();

    // Deploy the factory
    const TreeFarmFactory = await ethers.getContractFactory("TreeFarmFactory");
    treeFarmFactory = await TreeFarmFactory.deploy();

    // Deploy the system using the factory
    await treeFarmFactory.deploySystem(
      await mttToken.getAddress(),
      await mltToken.getAddress(),
      await mbtToken.getAddress()
    );

    // Get deployed contract addresses
    const farmManagementAddress =
      await treeFarmFactory.farmManagementContract();
    const treeManagementAddress =
      await treeFarmFactory.treeManagementContract();
    const yieldManagementAddress =
      await treeFarmFactory.yieldManagementContract();

    // Get contract instances
    const FarmManagement = await ethers.getContractFactory("FarmManagement");
    farmManagement = FarmManagement.attach(farmManagementAddress);

    const TreeManagement = await ethers.getContractFactory("TreeManagement");
    treeManagement = TreeManagement.attach(treeManagementAddress);

    const YieldManagement = await ethers.getContractFactory("YieldManagement");
    yieldManagement = YieldManagement.attach(yieldManagementAddress);

    // Set admin permissions
    await treeFarmFactory.setAdmin(await admin.getAddress(), true);
  });

  describe("Deployment and Setup", function () {
    it("Should set the owner as admin", async function () {
      expect(await treeFarmFactory.isAdmin(await owner.getAddress())).to.be
        .true;
    });

    it("Should correctly set up the newly appointed admin", async function () {
      expect(await treeFarmFactory.isAdmin(await admin.getAddress())).to.be
        .true;
    });

    it("Should correctly set up contract references", async function () {
      expect(await treeFarmFactory.MTTToken()).to.equal(
        await mttToken.getAddress()
      );
      expect(await treeFarmFactory.MLTToken()).to.equal(
        await mltToken.getAddress()
      );
      expect(await treeFarmFactory.MBTToken()).to.equal(
        await mbtToken.getAddress()
      );

      expect(await farmManagement.getTreeManagementContract()).to.equal(
        await treeManagement.getAddress()
      );
      expect(await farmManagement.getYieldManagementContract()).to.equal(
        await yieldManagement.getAddress()
      );

      expect(await treeManagement.getFarmManagementContract()).to.equal(
        await farmManagement.getAddress()
      );
      expect(await treeManagement.getYieldManagementContract()).to.equal(
        await yieldManagement.getAddress()
      );

      expect(await yieldManagement.getFarmManagementContract()).to.equal(
        await farmManagement.getAddress()
      );
      expect(await yieldManagement.getTreeManagementContract()).to.equal(
        await treeManagement.getAddress()
      );
    });
  });

  describe("Farm Management through Factory", function () {
    it("Should allow admin to add a farm", async function () {
      await treeFarmFactory
        .connect(admin)
        .addFarm(farm1.farmId, farm1.info, farm1.certifications, farm1.owner);

      // Verify farm was added
      const farmInfo = await treeFarmFactory.getFarmInfo(farm1.farmId);
      expect(farmInfo.farmId).to.equal(farm1.farmId);
      expect(farmInfo.farmManager).to.equal(farm1.owner);
      expect(farmInfo.isActive).to.be.true;
      expect(farmInfo.farmInfo.name).to.equal(farm1.info.name);

      // Verify farm owner is set in factory
      expect(await treeFarmFactory.farmOwners(farm1.farmId)).to.equal(
        farm1.owner
      );
    });

    it("Should prevent non-admin from adding a farm", async function () {
      await expect(
        treeFarmFactory
          .connect(user)
          .addFarm(farm1.farmId, farm1.info, farm1.certifications, farm1.owner)
      ).to.be.reverted;
    });

    it("Should allow farm owner to set operators", async function () {
      // First add a farm
      await treeFarmFactory.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.owner
      );

      // Farm owner sets an operator
      await treeFarmFactory
        .connect(farmOwner)
        .setFarmOperator(farm1.farmId, await operator.getAddress(), true);

      // Verify operator is set
      expect(
        await treeFarmFactory.farmOperators(
          farm1.farmId,
          await operator.getAddress()
        )
      ).to.be.true;
      expect(
        await treeFarmFactory.isAuthorizedForFarm(
          await operator.getAddress(),
          farm1.farmId
        )
      ).to.be.true;
    });
  });

  describe("Tree Management through Factory", function () {
    beforeEach(async function () {
      // Add a farm first
      await treeFarmFactory.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.owner
      );
    });

    it("Should allow farm owner to add trees", async function () {
      await treeFarmFactory.connect(farmOwner).addTree(farm1.farmId, tree1);

      // Get tree data and verify
      const treeData = await treeFarmFactory.getTreeData(farm1.farmId, 1);
      expect(treeData.species).to.equal(tree1.species);
      expect(treeData.location.pointName).to.equal(tree1.pointName);
      expect(treeData.healthStatus).to.equal("Healthy");
    });

    it("Should allow farm operator to add trees", async function () {
      // Set operator
      await treeFarmFactory
        .connect(farmOwner)
        .setFarmOperator(farm1.farmId, await operator.getAddress(), true);

      // Operator adds a tree
      await treeFarmFactory.connect(operator).addTree(farm1.farmId, tree2);

      // Verify tree was added
      const treeData = await treeFarmFactory.getTreeData(farm1.farmId, 1);
      expect(treeData.species).to.equal(tree2.species);
    });

    it("Should prevent unauthorized users from adding trees", async function () {
      await expect(
        treeFarmFactory.connect(user).addTree(farm1.farmId, tree1)
      ).to.be.revertedWith("Not authorized for farm");
    });

    it("Should allow batch adding trees", async function () {
      await treeFarmFactory
        .connect(farmOwner)
        .batchAddTrees(farm1.farmId, [tree1, tree2]);

      // Get farm info and verify trees were added
      const farmInfo = await treeFarmFactory.getFarmInfo(farm1.farmId);
      expect(farmInfo.treeCount).to.equal(2);

      // Verify individual trees
      const treeData1 = await treeFarmFactory.getTreeData(farm1.farmId, 1);
      const treeData2 = await treeFarmFactory.getTreeData(farm1.farmId, 2);

      expect(treeData1.species).to.equal(tree1.species);
      expect(treeData2.species).to.equal(tree2.species);
    });
  });

  describe("Tree Health and Yield Management", function () {
    beforeEach(async function () {
      // Add farm and trees
      await treeFarmFactory.addFarm(
        farm1.farmId,
        farm1.info,
        farm1.certifications,
        farm1.owner
      );

      await treeFarmFactory
        .connect(farmOwner)
        .batchAddTrees(farm1.farmId, [tree1, tree2]);
    });

    it("Should allow updating tree health status", async function () {
      const newStatus = "Needs Attention";
      await treeFarmFactory
        .connect(farmOwner)
        .updateTreeHealth(farm1.farmId, 1, newStatus);

      const treeData = await treeFarmFactory.getTreeData(farm1.farmId, 1);
      expect(treeData.healthStatus).to.equal(newStatus);
    });

    it("Should handle active tree count changes when health becomes critical", async function () {
      // Initial state
      let farmInfo = await treeFarmFactory.getFarmInfo(farm1.farmId);
      expect(farmInfo.activeTreeCount).to.equal(2);

      // Set tree to critical
      await treeFarmFactory
        .connect(farmOwner)
        .updateTreeHealth(farm1.farmId, 1, "Critical");

      // Check updated farm metadata
      farmInfo = await treeFarmFactory.getFarmInfo(farm1.farmId);
      expect(farmInfo.activeTreeCount).to.equal(1);
    });

    it("Should allow recording yield for a tree", async function () {
      const yieldAmount = ethers.parseEther("10");
      await treeFarmFactory
        .connect(farmOwner)
        .recordTreeYield(farm1.farmId, 1, yieldAmount, false);

      // Check tree data
      const treeData = await treeFarmFactory.getTreeData(farm1.farmId, 1);
      expect(treeData.lastYield).to.equal(yieldAmount);

      // Check farm data
      const farmInfo = await treeFarmFactory.getFarmInfo(farm1.farmId);
      expect(farmInfo.totalLifetimeYield).to.equal(yieldAmount);
    });

    it("Should allow recording yield for the entire farm", async function () {
      const totalYield = ethers.parseEther("20");
      await treeFarmFactory
        .connect(farmOwner)
        .recordFarmActualYield(farm1.farmId, totalYield);

      // Check farm data
      const farmInfo = await treeFarmFactory.getFarmInfo(farm1.farmId);
      expect(farmInfo.totalLifetimeYield).to.equal(totalYield);

      // Each tree should get half the total yield
      const treeData1 = await treeFarmFactory.getTreeData(farm1.farmId, 1);
      const treeData2 = await treeFarmFactory.getTreeData(farm1.farmId, 2);

      const expectedYieldPerTree = totalYield / 2n;
      expect(treeData1.lastYield).to.equal(expectedYieldPerTree);
      expect(treeData2.lastYield).to.equal(expectedYieldPerTree);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete farm lifecycle", async function () {
      // 1. Admin creates farm
      await treeFarmFactory
        .connect(admin)
        .addFarm(farm1.farmId, farm1.info, farm1.certifications, farm1.owner);

      // 2. Farm owner adds an operator
      await treeFarmFactory
        .connect(farmOwner)
        .setFarmOperator(farm1.farmId, await operator.getAddress(), true);

      // 3. Operator adds trees
      await treeFarmFactory
        .connect(operator)
        .batchAddTrees(farm1.farmId, [tree1, tree2]);

      // 4. Owner updates tree health
      await treeFarmFactory
        .connect(farmOwner)
        .updateTreeHealth(farm1.farmId, 1, "Needs Attention");

      // 5. Operator records yield for one tree
      const firstYield = ethers.parseEther("5");
      await treeFarmFactory
        .connect(operator)
        .recordTreeYield(farm1.farmId, 2, firstYield, false);

      // 6. Admin records yield for the entire farm
      const farmYield = ethers.parseEther("15");
      await treeFarmFactory
        .connect(admin)
        .recordFarmActualYield(farm1.farmId, farmYield);

      // 7. Check final state
      const farmInfo = await treeFarmFactory.getFarmInfo(farm1.farmId);
      expect(farmInfo.totalLifetimeYield).to.equal(firstYield + farmYield);

      // Verify permission checks still work
      await expect(
        treeFarmFactory
          .connect(user)
          .updateTreeHealth(farm1.farmId, 1, "Healthy")
      ).to.be.revertedWith("Not authorized for farm");
    });
  });
});
