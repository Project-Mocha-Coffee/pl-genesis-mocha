// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @title IMochaTreeRightsToken
 * @dev Interface for the Mocha Tree Rights Token (MTTR)
 * ERC4626 multi-tranche vault for asset-backed bond investments
 * Trees serve as collateral for bond issuance with independent yield distribution per farm
 */
interface IMochaTreeRightsToken is IERC4626, IAccessControl {
    
    /* ========== STRUCTS ========== */
    
    struct FarmConfig {
        string name;
        address farmOwner;
        uint256 treeCount;
        uint256 targetAPY;
        uint256 maturityPeriod;
        uint256 bondValue;
        uint256 collateralRatio;
        uint256 minInvestment;
        uint256 maxInvestment;
        address shareTokenAddress;
        uint256 minTimeInvested;
        bool active;
        uint256 createdTimestamp;
        uint256 maturityTimestamp;
    }
    
    struct BondPosition {
        uint256 farmId;
        uint256 depositAmount;
        uint256 shareTokenAmount;
        uint256 depositTimestamp;
        uint256 maturityTimestamp;
        bool redeemed;
    }
    
    struct CollateralInfo {
        uint256 totalTrees;
        uint256 valuationPerTree;
        uint256 totalValue;
        uint256 coverageRatio;
        uint256 liquidationThreshold;
        uint256 lastUpdated;
    }
    
    struct YieldDistribution {
        uint256 totalYield;
        uint256 distributedYield;
        uint256 pendingYield;
        uint256 lastDistribution;
    }
    
    /* ========== EVENTS ========== */
    
    event FarmAdded(
        uint256 indexed farmId,
        string name,
        address indexed farmOwner,
        uint256 treeCount,
        uint256 bondValue,
        address shareTokenAddress
    );
    
    event BondPurchased(
        address indexed investor,
        uint256 indexed farmId,
        uint256 indexed bondId,
        uint256 mbtAmount,
        uint256 shareTokenAmount
    );
    
    event YieldDistributed(
        uint256 indexed farmId,
        uint256 yieldAmount,
        uint256 timestamp
    );
    
    event BondRedeemed(
        address indexed investor,
        uint256 indexed bondId,
        uint256 redemptionAmount,
        uint256 timestamp
    );
    
    event CollateralUpdated(
        uint256 indexed farmId,
        uint256 valuationPerTree,
        uint256 coverageRatio,
        uint256 timestamp
    );
    
    event FarmSettled(
        uint256 indexed farmId,
        uint256 totalYield,
        uint256 timestamp
    );
    
    event BondRedeemed(
        address indexed investor,
        uint256 indexed farmId,
        uint256 indexed bondId,
        uint256 principalAmount,
        uint256 yieldAmount
    );
    
    event YieldDistributed(
        uint256 indexed farmId,
        uint256 totalYield,
        uint256 distributedAmount,
        uint256 timestamp
    );
    
  
    
    event FarmMatured(
        uint256 indexed farmId,
        uint256 totalPrincipal,
        uint256 totalYield,
        uint256 timestamp
    );
    
    event FarmInvestmentLimitsUpdated(
        uint256 indexed farmId,
        uint256 newMinInvestment,
        uint256 newMaxInvestment,
        uint256 timestamp
    );
    
    event StorageAddressUpdated(
        address indexed newStorageAddress,
        uint256 timestamp
    );
    /* ========== STATE VARIABLES ========== */
    
    function mochaLandToken() external view returns (address);
    function mochaTreeToken() external view returns (address);
    function totalFarms() external view returns (uint256);
    function totalShareTokens() external view returns (uint256);
    function totalValueLocked() external view returns (uint256);
    function totalActiveBonds() external view returns (uint256);
    function minimumMaturityPeriod() external view returns (uint256);
    function maximumMaturityPeriod() external view returns (uint256);
    function defaultCollateralRatio() external view returns (uint256);
    function getTREE_VALUATION_MBT() external view returns (uint256);
    function getBPS_DENOMINATOR() external view returns (uint256);
    
    /* ========== ROLE CONSTANTS ========== */
    
    function getVAULT_MANAGER_ROLE() external view returns (bytes32);
    function getDEFAULT_ADMIN_ROLE() external view returns (bytes32);
    
    /* ========== FARM MANAGEMENT ========== */
    
    /**
     * @dev Add a new farm as a tranche with its own share token
     * @param farmId ID of the farm (must match MLT token ID)
     * @param name Farm name identifier
     * @param farmTokenBoundAccount The farm's token-bound account that owns MTT tokens
     * @param targetAPY Target annual percentage yield in basis points
     * @param maturityPeriod Bond maturity period in months
     * @param shareTokenName Name for the farm's share token
     * @param shareTokenSymbol Symbol for the farm's share token
     * @return farmId The ID of the added farm
     */
    function addFarm(
        uint256 farmId,
        string memory name,
        address farmTokenBoundAccount,
        uint256 targetAPY,
        uint256 maturityPeriod,
        string memory shareTokenName,
        string memory shareTokenSymbol
    ) external returns (uint256);
    
    /**
     * @dev Update farm configuration
     * @param farmId ID of the farm to update
     * @param targetAPY New target APY in basis points
     * @param active Whether the farm should accept new investments
     */
    function updateFarm(
        uint256 farmId,
        uint256 targetAPY,
        bool active
    ) external;

    /**
     * @dev Update only the target APY for a farm
     */
    function updateFarmTargetAPY(
        uint256 farmId,
        uint256 newTargetAPY
    ) external;

    /**
     * @dev Update the maturity period for a farm (in months) and reset maturity timestamp from now
     */
    function updateFarmMaturityPeriod(
        uint256 farmId,
        uint256 newMaturityPeriod
    ) external;
    
    /**
     * @dev Update farm investment limits
     * @param farmId ID of the farm to update
     * @param newMinInvestment New minimum investment amount in MBT
     * @param newMaxInvestment New maximum investment amount in MBT
     */
    function updateFarmInvestmentLimits(
        uint256 farmId,
        uint256 newMinInvestment,
        uint256 newMaxInvestment
    ) external;
    
    /**
     * @dev Refresh farm tree information from MTT tokens
     * @param farmId ID of the farm
     * @param farmTokenBoundAccount The farm's token-bound account
     */
    function refreshFarmTreeInfo(uint256 farmId, address farmTokenBoundAccount) external;
    
    /* ========== BOND PURCHASE SYSTEM ========== */
    
    /**
     * @dev Purchase bonds on the current farm tranche selected by the vault
     * @param mbtAmount Amount of MBT tokens to invest
     * @return bondId ID of the created bond
     */
    function purchaseBond(uint256 mbtAmount) external returns (uint256 bondId);

    /**
     * @dev Preview share tokens to be minted for a given MBT amount on the current farm
     * @param mbtAmount Amount of MBT tokens to invest
     * @return farmId Current farm id
     * @return shareAmount Expected share tokens minted
     * @return capacityRemaining Remaining capacity in shares on current farm
     */
    function previewMintFarmTokens(uint256 mbtAmount) external view returns (uint256 farmId, uint256 shareAmount, uint256 capacityRemaining);

    /**
     * @dev Get the current farm id used for auto bond purchases
     */
    function getCurrentFarmId() external view returns (uint256);
    
    /* ========== YIELD DISTRIBUTION ========== */
    
    /**
     * @dev Distribute yield for a specific farm
     * @param farmId ID of the farm
     * @param yieldAmount Amount of yield to distribute
     */
    function distributeYield(uint256 farmId, uint256 yieldAmount) external;
    
    /* ========== BOND REDEMPTION ========== */
    
    /**
     * @dev Redeem a matured bond
     * @param bondId ID of the bond to redeem
     * @return redemptionAmount Amount of MBT tokens returned
     */
    function redeemBond(uint256 bondId) external returns (uint256 redemptionAmount);
    
    /**
     * @dev Redeem a bond early with penalty
     * @param bondId ID of the bond to redeem early
     * @return redemptionAmount Amount of MBT tokens returned (with penalty)
     */
    function redeemBondEarly(uint256 bondId) external returns (uint256 redemptionAmount);
    
    /* ========== COLLATERAL MANAGEMENT ========== */
    
    /**
     * @dev Update collateral valuation for a farm
     * @param farmId ID of the farm
     * @param newValuationPerTree New valuation per tree in wei (18 decimals)
     */
    function updateCollateralValuation(uint256 farmId, uint256 newValuationPerTree) external;
    
    /**
     * @dev Settle a matured farm
     * @param farmId ID of the farm that has matured
     */
    function settleMatureFarm(uint256 farmId) external;
    
    /**
     * @dev Rollover a bond to a new farm
     * @param bondId ID of the bond to rollover
     * @param newFarmId ID of the new farm
     */
    function rolloverBond(uint256 bondId, uint256 newFarmId) external returns (uint256 newBondId);
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get farm configuration
     * @param farmId ID of the farm
     * @return config[] Farm configuration
     */
    function getFarmConfig(uint256 farmId) external view returns (FarmConfig memory);

    /**
     * @dev Get all farm IDs
     * @return farmIds Array of farm IDs
     */
    function getActiveFarmIds() external view returns (uint256[] memory);
    
    /**
     * @dev Get bond position
     * @param investor Address of the investor
     * @param bondId ID of the bond
     * @return position Bond position
     */
    function getBondPosition(address investor, uint256 bondId) external view returns (BondPosition memory);
    
    /**
     * @dev Get all bond positions for a user
     * @param investor Address of the investor
     * @return bondPositions Array of all bond positions for the user
     */
    function getUserBonds(address investor) external view returns (BondPosition[] memory bondPositions);
    
    /**
     * @dev Get bond count for a user
     * @param investor Address of the investor
     * @return count Number of bonds owned by the user
     */
    function getUserBondCount(address investor) external view returns (uint256 count);
    
    /**
     * @dev Get active (non-redeemed) bond positions for a user
     * @param investor Address of the investor
     * @return activeBonds Array of active bond positions
     * @return activeBondIds Array of bond IDs for active positions
     */
    function getUserActiveBonds(address investor) external view returns (
        BondPosition[] memory activeBonds,
        uint256[] memory activeBondIds
    );
    
    /**
     * @dev Get farm collateral information
     * @param farmId ID of the farm
     * @return collateral Collateral information
     */
    function getCollateralInfo(uint256 farmId) external view returns (CollateralInfo memory);
    
    /**
     * @dev Get farm yield distribution data
     * @param farmId ID of the farm
     * @return yield Yield distribution data
     */
    function getYieldDistribution(uint256 farmId) external view returns (YieldDistribution memory);
    
    /**
     * @dev Get farm tree count
     * @param farmId ID of the farm
     * @return treeCount Number of trees
     */
    function getFarmTreeCount(uint256 farmId) external view returns (uint256);
    
    /**
     * @dev Get farm tree IDs
     * @param farmId ID of the farm
     * @return treeIds Array of tree IDs
     */
    function getFarmTreeIds(uint256 farmId) external view returns (uint256[] memory);
    
    /**
     * @dev Get farm tree information
     * @param farmId ID of the farm
     * @return treeCount Number of trees
     * @return treeIds Array of tree IDs
     * @return totalTreeShares Total tree shares
     */
    function getFarmTreeInfo(uint256 farmId) external view returns (
        uint256 treeCount,
        uint256[] memory treeIds,
        uint256 totalTreeShares
    );
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @dev Update MochaLandToken address
     * @param newMochaLandToken New MLT token address
     */
    function updateMochaLandToken(address newMochaLandToken) external;
    
    /**
     * @dev Update MochaTreeToken address
     * @param newMochaTreeToken New MTT token address
     */
    function updateMochaTreeToken(address newMochaTreeToken) external;
    
    /**
     * @dev Get current storage address
     * @return storageAddress The current storage address (0x0 if using default)
     */
    function getStorageAddress() external view returns (address storageAddress);
    
    /**
     * @dev Set custom storage address for vault upgrades
     * @param newStorageAddress The address of the new storage contract
     */
    function setStorageAddress(address newStorageAddress) external;
} 