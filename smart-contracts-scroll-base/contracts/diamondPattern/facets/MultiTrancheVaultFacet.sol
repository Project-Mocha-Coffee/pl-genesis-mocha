// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IMultiTrancheVaultFacet.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibAccess.sol";
import "../../tokens/MochaTreeRightsToken.sol";
import "../../tokens/FarmShareToken.sol";

/**
 * @title MultiTrancheVaultFacet
 * @dev Diamond facet for managing the multi-tranche vault system operations
 * Provides integration between the Diamond pattern and the MTTR vault system
 */
contract MultiTrancheVaultFacet is IMultiTrancheVaultFacet {
    
    LibAppStorage.AppStorage internal s;
    
    /* ========== MODIFIERS ========== */
    
    modifier onlyAdmin() {
        LibAccess.enforceIsContractOwner();
        _;
    }
    
    modifier onlyVaultManager() {
        require(
            LibAccess.hasRole(LibAccess.VAULT_MANAGER_ROLE, msg.sender) ||
            LibAccess.hasRole(LibAccess.DEFAULT_ADMIN_ROLE, msg.sender),
            "Not vault manager"
        );
        _;
    }
    
    /* ========== VAULT MANAGEMENT ========== */
    
    /**
     * @dev Initialize the multi-tranche vault system
     * @param mttrVaultAddress Address of the deployed MTTR vault contract
     * @param mbtTokenAddress Address of the MBT token contract
     */
    function initializeVault(
        address mttrVaultAddress,
        address mbtTokenAddress
    ) external onlyAdmin {
        require(mttrVaultAddress != address(0), "Invalid MTTR vault address");
        require(mbtTokenAddress != address(0), "Invalid MBT token address");
        require(s.mttrVault == address(0), "Vault already initialized");
        
        s.mttrVault = mttrVaultAddress;
        s.mbtToken = mbtTokenAddress;
        s.vaultInitialized = true;
        
        emit VaultInitialized(mttrVaultAddress, mbtTokenAddress);
    }
    
    /**
     * @dev Add a new farm to the multi-tranche vault system
     * @param farmId ID of the farm (must match MLT token ID)
     * @param farmTokenBoundAccount The farm's token-bound account that owns MTT tokens
     * @param targetAPY Target annual percentage yield in basis points
     * @param maturityPeriod Bond maturity period in months
     * @param farmName Name of the farm
     * @param shareTokenName Name for the farm's share token
     * @param shareTokenSymbol Symbol for the farm's share token
     */
    function addFarmToVault(
        uint256 farmId,
        address farmTokenBoundAccount,
        uint256 targetAPY,
        uint256 maturityPeriod,
        string memory farmName,
        string memory shareTokenName,
        string memory shareTokenSymbol
    ) external onlyVaultManager returns (uint256) {
        require(s.vaultInitialized, "Vault not initialized");
        require(farmTokenBoundAccount != address(0), "Invalid token-bound account");
        
        // Call the MTTR vault to add the farm
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        uint256 addedFarmId = vault.addFarm(
            farmId,
            farmName,
            farmTokenBoundAccount,
            targetAPY,
            maturityPeriod,
            shareTokenName,
            shareTokenSymbol
        );
        
        // Store farm information in diamond storage
        s.farmToVaultId[farmTokenBoundAccount] = addedFarmId;
        s.vaultIdToFarm[addedFarmId] = farmTokenBoundAccount;
        s.totalVaultFarms++;
        
        emit FarmAddedToVault(
            addedFarmId,
            farmTokenBoundAccount,
            farmName,
            0, // Tree count will be dynamically retrieved from MTT tokens
            targetAPY,
            maturityPeriod
        );
        
        return addedFarmId;
    }
    
    /**
     * @dev Register trees with a specific farm vault
     * @param farmId ID of the farm in the vault
     * @param treeIds Array of tree token IDs
     */
    function registerTreesWithVault(
        uint256 farmId,
        uint256[] memory treeIds
    ) external onlyVaultManager {
        require(s.vaultInitialized, "Vault not initialized");
        require(treeIds.length > 0, "No trees provided");
        
        address farmTokenBoundAccount = s.vaultIdToFarm[farmId];
        require(farmTokenBoundAccount != address(0), "Farm not found");
        
        // Register each tree with the farm vault
        for (uint256 i = 0; i < treeIds.length; i++) {
            uint256 treeId = treeIds[i];
            s.treeToVaultFarm[treeId] = farmId;
            s.vaultFarmTrees[farmId].push(treeId);
        }
        
        emit TreesRegisteredWithVault(farmId, treeIds);
    }
    
    /* ========== INVESTMENT FUNCTIONS ========== */
    
    /**
     * @dev Purchase bonds for a specific farm through the Diamond
     * @param farmId ID of the farm to invest in
     * @param mbtAmount Amount of MBT tokens to invest
     */
    function purchaseFarmBond(
        uint256 farmId,
        uint256 mbtAmount
    ) external returns (uint256 bondId) {
        require(s.vaultInitialized, "Vault not initialized");
        require(mbtAmount > 0, "Amount must be > 0");
        
        // Transfer MBT tokens to this contract first
        IERC20(s.mbtToken).transferFrom(msg.sender, address(this), mbtAmount);
        
        // Approve the MTTR vault to spend MBT tokens
        IERC20(s.mbtToken).approve(s.mttrVault, mbtAmount);
        
        // Call the MTTR vault to purchase the bond
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        bondId = vault.purchaseBond( mbtAmount);
        
        // Update Diamond storage for tracking
        s.userBondCount[msg.sender]++;
        s.totalActiveBonds++;
        
        emit BondPurchased(msg.sender, farmId, bondId, mbtAmount);
    }
    
    /**
     * @dev Distribute yield to a specific farm
     * @param farmId ID of the farm
     * @param yieldAmount Amount of yield to distribute (in MBT)
     */
    function distributeFarmYield(
        uint256 farmId,
        uint256 yieldAmount
    ) external onlyVaultManager {
        require(s.vaultInitialized, "Vault not initialized");
        require(yieldAmount > 0, "Yield amount must be > 0");
        
        // Transfer yield tokens to this contract first
        IERC20(s.mbtToken).transferFrom(msg.sender, address(this), yieldAmount);
        
        // Approve the MTTR vault to spend MBT tokens
        IERC20(s.mbtToken).approve(s.mttrVault, yieldAmount);
        
        // Call the MTTR vault to distribute yield
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        vault.distributeYield(farmId, yieldAmount);
        
        emit YieldDistributed(farmId, yieldAmount);
    }
    
    /* ========== BOND REDEMPTION ========== */
    
    /**
     * @dev Redeem a matured bond through the Diamond
     * @param bondId ID of the bond to redeem
     */
    function redeemMatureBond(uint256 bondId) external returns (uint256 redemptionAmount) {
        require(s.vaultInitialized, "Vault not initialized");
        
        // Call the MTTR vault to redeem the bond
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        redemptionAmount = vault.redeemBond(bondId);
        
        // Update Diamond storage
        s.userBondCount[msg.sender]--;
        s.totalActiveBonds--;
        
        emit BondRedeemed(msg.sender, bondId, redemptionAmount);
    }
    
    /**
     * @dev Redeem a bond early with penalty
     * @param bondId ID of the bond to redeem early
     */
    function redeemBondEarly(uint256 bondId) external returns (uint256 redemptionAmount) {
        require(s.vaultInitialized, "Vault not initialized");
        
        // Call the MTTR vault to redeem the bond early
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        redemptionAmount = vault.redeemBondEarly(bondId);
        
        // Update Diamond storage
        s.userBondCount[msg.sender]--;
        s.totalActiveBonds--;
        
        emit BondRedeemedEarly(msg.sender, bondId, redemptionAmount);
    }
    
    /* ========== COLLATERAL MANAGEMENT ========== */
    
    /**
     * @dev Update tree collateral valuation for a farm
     * @param farmId ID of the farm
     * @param newValuationPerTree New valuation per tree in wei (18 decimals)
     */
    function updateFarmCollateralValuation(
        uint256 farmId,
        uint256 newValuationPerTree
    ) external onlyVaultManager {
        require(s.vaultInitialized, "Vault not initialized");
        require(newValuationPerTree > 0, "Valuation must be > 0");
        
        // Call the MTTR vault to update collateral valuation
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        vault.updateCollateralValuation(farmId, newValuationPerTree);
        
        emit CollateralUpdated(farmId, newValuationPerTree);
    }
    
    /**
     * @dev Settle a matured farm
     * @param farmId ID of the farm that has matured
     */
    function settleMatureFarm(uint256 farmId) external onlyVaultManager {
        require(s.vaultInitialized, "Vault not initialized");
        
        // Call the MTTR vault to settle the farm
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        vault.settleMatureFarm(farmId);
        
        emit FarmSettled(farmId);
    }
    
    /* ========== INTEGRATION WITH EXISTING SYSTEMS ========== */
    
    /**
     * @dev Link tree yield to vault farm for automatic distribution
     * @param treeId ID of the tree
     * @param yieldAmount Amount of yield generated
     */
    function linkTreeYieldToVault(
        uint256 treeId,
        uint256 yieldAmount
    ) external onlyVaultManager {
        require(s.vaultInitialized, "Vault not initialized");
        
        uint256 farmId = s.treeToVaultFarm[treeId];
        require(farmId > 0, "Tree not registered with vault");
        
        // Accumulate yield for the farm
        s.farmPendingYield[farmId] += yieldAmount;
        
        emit TreeYieldLinked(treeId, farmId, yieldAmount);
    }
    
    /**
     * @dev Process accumulated yield for a farm
     * @param farmId ID of the farm
     */
    function processAccumulatedYield(uint256 farmId) external onlyVaultManager {
        require(s.vaultInitialized, "Vault not initialized");
        
        uint256 pendingYield = s.farmPendingYield[farmId];
        if (pendingYield > 0) {
            // Reset pending yield
            s.farmPendingYield[farmId] = 0;
            
            // Distribute the yield
            this.distributeFarmYield(farmId, pendingYield);
            
            emit AccumulatedYieldProcessed(farmId, pendingYield);
        }
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get vault configuration information
     */
    function getVaultInfo() external view returns (
        address mttrVault,
        address mbtToken,
        bool initialized,
        uint256 totalFarms,
        uint256 totalActiveBonds
    ) {
        return (
            s.mttrVault,
            s.mbtToken,
            s.vaultInitialized,
            s.totalVaultFarms,
            s.totalActiveBonds
        );
    }
    
    /**
     * @dev Get vault-specific farm information
     * @param farmId ID of the farm
     */
    function getVaultFarmInfo(uint256 farmId) external view returns (
        string memory name,
        address farmOwner,
        uint256 treeCount,
        uint256 targetAPY,
        uint256 maturityPeriod,
        address shareTokenAddress,
        bool active
    ) {
        require(s.vaultInitialized, "Vault not initialized");
        
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        
        return (
            config.name,
            config.farmOwner,
            config.treeCount,
            config.targetAPY,
            config.maturityPeriod,
            config.shareTokenAddress,
            config.active
        );
    }
    
    /**
     * @dev Get bond position information
     * @param investor Address of the investor
     * @param bondId ID of the bond
     */
    function getBondInfo(
        address investor,
        uint256 bondId
    ) external view returns (
        uint256 farmId,
        uint256 depositAmount,
        uint256 shareTokenAmount,
        uint256 depositTimestamp,
        uint256 maturityTimestamp,
        bool redeemed
    ) {
        require(s.vaultInitialized, "Vault not initialized");
        
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.BondPosition memory position = vault.getBondPosition(investor, bondId);
        
        return (
            position.farmId,
            position.depositAmount,
            position.shareTokenAmount,
            position.depositTimestamp,
            position.maturityTimestamp,
            position.redeemed
        );
    }
    
    /**
     * @dev Get trees registered with a farm
     * @param farmId ID of the farm
     */
    function getFarmTrees(uint256 farmId) external view returns (uint256[] memory) {
        return s.vaultFarmTrees[farmId];
    }
    
    /**
     * @dev Get pending yield for a farm
     * @param farmId ID of the farm
     */
    function getFarmPendingYield(uint256 farmId) external view returns (uint256) {
        return s.farmPendingYield[farmId];
    }
    
    /**
     * @dev Get user bond count
     * @param user Address of the user
     */
    function getUserBondCount(address user) external view returns (uint256) {
        return s.userBondCount[user];
    }
    
    /**
     * @dev Get list of all bonds for an investor
     * @param user Address of the investor
     */
    function getUserBonds(address user) external view returns (uint256[] memory) {
        // This would need to be implemented based on the vault's bond tracking
        // For now, return empty array - implementation depends on vault structure
        return new uint256[](0);
    }
    
    /**
     * @dev Get list of all bonds for a farm
     * @param farmId ID of the farm
     */
    function getFarmBonds(uint256 farmId) external view returns (uint256[] memory) {
        // This would need to be implemented based on the vault's bond tracking
        // For now, return empty array - implementation depends on vault structure
        return new uint256[](0);
    }
    
    /**
     * @dev Get list of all farms for a vault
     * @param vault Address of the vault
     */
    function getVaultFarms(address vault) external view returns (uint256[] memory) {
        // This would need to be implemented based on the vault's farm tracking
        // For now, return empty array - implementation depends on vault structure
        return new uint256[](0);
    }
}