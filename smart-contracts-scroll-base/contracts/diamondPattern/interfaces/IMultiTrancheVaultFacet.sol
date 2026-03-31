// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMultiTrancheVaultFacet
 * @dev Interface for the Multi-Tranche Vault Facet in the Diamond pattern
 * Defines all functions and events for managing the multi-tranche vault system
 * Simplified system using ERC20 divisibility for proportionality
 */
interface IMultiTrancheVaultFacet {
    
    /* ========== EVENTS ========== */
    
    event VaultInitialized(
        address indexed mttrVault,
        address indexed mbtToken
    );
    
    event FarmAddedToVault(
        uint256 indexed farmId,
        address indexed farmOwner,
        string farmName,
        uint256 treeCount,
        uint256 targetAPY,
        uint256 maturityPeriod
    );
    
    event TreesRegisteredWithVault(
        uint256 indexed farmId,
        uint256[] treeIds
    );
    
    event BondPurchased(
        address indexed investor,
        uint256 indexed farmId,
        uint256 indexed bondId,
        uint256 mbtAmount
    );
    
    event YieldDistributed(
        uint256 indexed farmId,
        uint256 yieldAmount
    );
    
    event BondRedeemed(
        address indexed investor,
        uint256 indexed bondId,
        uint256 redemptionAmount
    );
    
    event BondRedeemedEarly(
        address indexed investor,
        uint256 indexed bondId,
        uint256 redemptionAmount
    );
    
    event CollateralUpdated(
        uint256 indexed farmId,
        uint256 newValuation
    );
    
    event FarmSettled(
        uint256 indexed farmId
    );
    
    event TreeYieldLinked(
        uint256 indexed treeId,
        uint256 indexed farmId,
        uint256 yieldAmount
    );
    
    event AccumulatedYieldProcessed(
        uint256 indexed farmId,
        uint256 yieldAmount
    );
    
    /* ========== VAULT MANAGEMENT FUNCTIONS ========== */
    
    function initializeVault(
        address mttrVaultAddress,
        address mbtTokenAddress
    ) external;
    
    function addFarmToVault(
        uint256 farmId,
        address farmTokenBoundAccount,
        uint256 targetAPY,
        uint256 maturityPeriod,
        string memory farmName,
        string memory shareTokenName,
        string memory shareTokenSymbol
    ) external returns (uint256);
    
    function registerTreesWithVault(
        uint256 farmId,
        uint256[] memory treeIds
    ) external;
    
    /* ========== INVESTMENT FUNCTIONS ========== */
    
    function purchaseFarmBond(
        uint256 farmId,
        uint256 mbtAmount
    ) external returns (uint256 bondId);
    
    function distributeFarmYield(
        uint256 farmId,
        uint256 yieldAmount
    ) external;
    
    /* ========== BOND REDEMPTION FUNCTIONS ========== */
    
    function redeemMatureBond(uint256 bondId) external returns (uint256 redemptionAmount);
    
    function redeemBondEarly(uint256 bondId) external returns (uint256 redemptionAmount);
    
    /* ========== COLLATERAL MANAGEMENT FUNCTIONS ========== */
    
    function updateFarmCollateralValuation(
        uint256 farmId,
        uint256 newValuationPerTree
    ) external;
    
    function settleMatureFarm(uint256 farmId) external;
    
    /* ========== INTEGRATION FUNCTIONS ========== */
    
    function linkTreeYieldToVault(
        uint256 treeId,
        uint256 yieldAmount
    ) external;
    
    function processAccumulatedYield(uint256 farmId) external;
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getVaultInfo() external view returns (
        address mttrVault,
        address mbtToken,
        bool initialized,
        uint256 totalFarms,
        uint256 totalActiveBonds
    );
    
    function getVaultFarmInfo(uint256 farmId) external view returns (
        string memory name,
        address farmOwner,
        uint256 treeCount,
        uint256 targetAPY,
        uint256 maturityPeriod,
        address shareTokenAddress,
        bool active
    );
    
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
    );
    
    function getFarmTrees(uint256 farmId) external view returns (uint256[] memory);
    
    function getFarmPendingYield(uint256 farmId) external view returns (uint256);
    
    function getUserBondCount(address user) external view returns (uint256);

    function getUserBonds(address user) external view returns (uint256[] memory);

    function getFarmBonds(uint256 farmId) external view returns (uint256[] memory);

    function getVaultFarms(address vault) external view returns (uint256[] memory);
}