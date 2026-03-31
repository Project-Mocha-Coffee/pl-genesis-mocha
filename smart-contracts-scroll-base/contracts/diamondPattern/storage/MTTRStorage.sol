// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library MTTRStorage {
    // keccak256("mocha.storage.mttr") - 1 to reduce collision risk
    bytes32 internal constant STORAGE_SLOT = bytes32(uint256(keccak256("mocha.storage.mttr")) - 1);

    uint256 internal constant BPS_DENOMINATOR = 10000;
    uint256 internal constant TREE_VALUATION_MBT = 4 * 1e18; // 4 MBT per tree default valuation

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
        uint256 minTimeInvested; // minimum time before early redemption allowed (in seconds)
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

    struct Layout {
        // Storage management
        address customStorageAddress; // Custom storage address for upgrades

        // Token Integration
        address mochaLandToken;
        address mochaTreeToken;

        // Farm management
        mapping(uint256 => FarmConfig) farms;
        mapping(address => uint256) farmOwnerToId;
        uint256 totalFarms;
        // Ordered list of farm ids and pointer to current farm for bond purchases
        uint256[] vaultFarmIds;
        uint256 currentFarmIndex; // global index into vaultFarmIds (for sold-out tracking)
        
        // Per-user farm tracking
        mapping(address => uint256) userCurrentFarmIndex; // per-user index into vaultFarmIds
        mapping(uint256 => bool) farmSoldOut; // track which farms are completely sold out

        // Bond positions
        mapping(address => mapping(uint256 => BondPosition)) bondPositions;
        mapping(address => uint256) userBondCount;

        // Collateral tracking
        mapping(uint256 => CollateralInfo) farmCollateral;

        // Yield tracking
        mapping(uint256 => YieldDistribution) farmYields;

        // Vault statistics
        uint256 totalValueLocked;
        uint256 totalShareTokens;
        uint256 totalActiveBonds;

        // Risk management
        uint256 defaultCollateralRatio; // default 12000
        uint256 minimumMaturityPeriod;  // default 36
        uint256 maximumMaturityPeriod;  // default 60
        uint256 earlyRedemptionPenaltyBps; // early redemption penalty in basis points (default 500 = 5%)
    }

    function layout() internal view returns (Layout storage l) {
        // First, get the default storage layout to check for custom storage address
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
        
        // Check if custom storage address is set
        address customAddr = l.customStorageAddress;
        if (customAddr != address(0)) {
            // Use custom storage address
            assembly {
                l.slot := customAddr
            }
        }
    }
    
    function layoutPure() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}

