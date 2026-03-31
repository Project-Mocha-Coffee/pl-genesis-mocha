const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

// Comprehensive integration tests for the TreeFarm system.
// NOTE: This file was cleaned up to remove a duplicated, malformed block
// that was causing SyntaxError. The structure below matches the main
// describe("TreeFarm System Tests") block used previously.

describe("TreeFarm System Tests", function () {
  // Contract instances
  let treeTypes;
  let mockMTTToken;
  let mockMLTToken;
  let mockMBTToken;
  let mockYieldManager;
  let mockStakingContract;
  let treeFarmStorage;
  let farmManagement;
  let treeManagement;
  let yieldManagement;
  let treeFarmProxy;

  // Test accounts
  let owner;
  let admin;
  let farmManager1;
  let farmManager2;
  let operator1;
  let operator2;
  let user1;
  let user2;

  // Test data
  const FARM_ID_1 = 1n;
  const FARM_ID_2 = 2n;
  const TREE_PRICE = ethers.parseUnits("100", 18);
  const DECIMAL_POINTS = ethers.parseUnits("1", 18);
  const SHARES_PER_TREE = ethers.parseUnits("1", 18);
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));

  before(async function () {
    // Get signers
    [
      owner,
      admin,
      farmManager1,
      farmManager2,
      operator1,
      operator2,
      user1,
      user2,
    ] = await ethers.getSigners();

    // Deploy TreeTypes library
    const TreeTypes = await ethers.getContractFactory("TreeTypes");
    treeTypes = await TreeTypes.deploy();
    await treeTypes.waitForDeployment();

    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockToken");
    mockMTTToken = await MockToken.deploy("Mock MTT Token", "MTT");
    mockMLTToken = await MockToken.deploy("Mock MLT Token", "MLT");
    mockMBTToken = await MockToken.deploy("Mock MBT Token", "MBT");
    await mockMTTToken.waitForDeployment();
    await mockMLTToken.waitForDeployment();
    await mockMBTToken.waitForDeployment();

    // Deploy mock external contracts
    const MockYieldManager =
      await ethers.getContractFactory("MockYieldManager");
    mockYieldManager = await MockYieldManager.deploy();
    await mockYieldManager.waitForDeployment();

    const MockStakingContract = await ethers.getContractFactory(
      "MockStakingContract"
    );
    mockStakingContract = await MockStakingContract.deploy();
    await mockStakingContract.waitForDeployment();

    // Deploy TreeFarmStorage first
    const TreeFarmStorage = await ethers.getContractFactory("TreeFarmStorage");
    treeFarmStorage = await TreeFarmStorage.deploy();
    await treeFarmStorage.waitForDeployment();

    // Link libraries (kept as comments for potential future linking)
    const FarmManagement = await ethers.getContractFactory("FarmManagement", {
      /*   libraries: {
        TreeTypes: await treeTypes.getAddress(),
      }, */
    });

    const TreeManagement = await ethers.getContractFactory("TreeManagement", {
      /*   libraries: {
        TreeTypes: await treeTypes.getAddress(),
      }, */
    });

    const YieldManagement = await ethers.getContractFactory("YieldManagement", {
      /*   libraries: {
        TreeTypes: await treeTypes.getAddress(),
      }, */
    });

    // Deploy implementation contracts
    farmManagement = await FarmManagement.deploy();
    treeManagement = await TreeManagement.deploy();
    yieldManagement = await YieldManagement.deploy();

    await farmManagement.waitForDeployment();
    await treeManagement.waitForDeployment();
    await yieldManagement.waitForDeployment();

    // Deploy TreeFarmProxy using upgrades plugin
    const TreeFarmProxy = await ethers.getContractFactory("TreeFarmProxy");
    treeFarmProxy = await upgrades.deployProxy(
      TreeFarmProxy,
      [
        await mockMTTToken.getAddress(),
        await mockMLTToken.getAddress(),
        await mockMBTToken.getAddress(),
        await farmManagement.getAddress(),
        await treeManagement.getAddress(),
        await yieldManagement.getAddress(),
      ],
      { initializer: "initialize" }
    );
    await treeFarmProxy.waitForDeployment();

    // Set up the external contract references
    await treeFarmProxy.setYieldManagerContract(
      await mockYieldManager.getAddress()
    );
    await treeFarmProxy.setStakingContract(
      await mockStakingContract.getAddress()
    );

    // Give admin role to admin account
    await treeFarmProxy.grantRole(ADMIN_ROLE, admin.address);

    // Set proxy contract in implementations for backward compatibility
    await farmManagement.setProxyContract(await treeFarmProxy.getAddress());
    await treeManagement.setProxyContract(await treeFarmProxy.getAddress());
    await yieldManagement.setProxyContract(await treeFarmProxy.getAddress());
  });

  // Helper function to create a farm
  async function createTestFarm(farmId, farmManager, farmWalletAddress) {
    const farmInfo = {
      name: `Farm ${farmId}`,
      location: "Test Location",
      area: "Nairobi",
      soilType: "loam",
    };

    const certifications = "Organic, Fair Trade";

    await treeFarmProxy
      .connect(owner)
      .addFarm(
        farmId,
        farmInfo,
        certifications,
        farmWalletAddress,
        farmManager.address
      );
  }

  // Helper function to create a tree
  async function createTestTree(farmId, signer) {
    const treeData = {
      pointName: "Tree Point",
      baseStationId: "BS001",
      plantingDate: BigInt(Math.floor(Date.now() / 1000) - 86400), // yesterday
      latitude: 123456789n,
      longitude: 987654321n,
      altitude: 100n,
      accuracy: 5n,
      satelliteCount: 8n,
      pdop: 2n,
      species: "Oak",
    };

    await treeFarmProxy.connect(signer).addTree(farmId, treeData);
  }

  // --- Farm Management Tests (subset kept, mirroring original behaviour) ---
  describe("Farm Management Tests", function () {
    it("should allow owner to add a new farm", async function () {
      const farmInfo = {
        name: `Farm `,
        location: "Test Location",
        area: "Nairobi",
        soilType: "loam",
      };

      const certifications = "Organic, Fair Trade";

      await expect(
        treeFarmProxy
          .connect(owner)
          .addFarm(
            FARM_ID_1,
            farmInfo,
            certifications,
            farmManager1.address,
            farmManager1.address
          )
      )
        .to.emit(treeFarmProxy, "FarmAdded")
        .withArgs(FARM_ID_1);

      const farmData = await treeFarmProxy.getFarmInfo(FARM_ID_1);
      expect(farmData.farmId).to.equal(FARM_ID_1);
      expect(farmData.isActive).to.be.true;
      expect(farmData.farmWalletAddress).to.equal(farmManager1.address);
      expect(farmData.farmManager).to.equal(farmManager1.address);
      expect(farmData.farmInfo.name).to.equal(farmInfo.name);
      expect(farmData.certifications).to.equal(certifications);
    });
  });

  // --- Yield Management sanity test (subset) ---
  describe("Yield Management Tests", function () {
    beforeEach(async function () {
      // Reset speculative yield flags in the mock
      await mockYieldManager.resetSpeculativeYield(FARM_ID_1, 1n);
    });

    it("should record actual yield for a single tree", async function () {
      await createTestFarm(FARM_ID_1, farmManager1, farmManager1.address);
      await createTestTree(FARM_ID_1, farmManager1);

      const yieldAmount = ethers.parseUnits("5", 18);

      await expect(
        treeFarmProxy.connect(farmManager1).recordTreeYield(
          FARM_ID_1,
          1n,
          yieldAmount,
          false // actual yield
        )
      ).to.emit(treeFarmProxy, "YieldRecorded");

      const treeInfo = await treeFarmProxy.getTreeData(FARM_ID_1, 1n);
      expect(treeInfo.lastYield).to.equal(yieldAmount);
    });
  });
});
