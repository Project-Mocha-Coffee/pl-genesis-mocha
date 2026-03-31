// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../types/TreeTypes.sol";

/**
 * @title LibAppStorage
 * @dev Shared storage layout for TreeFarm Diamond with Multi-Tranche Vault support
 */
library LibAppStorage {
    
    // =========== SHARED CONSTANTS ============
    uint256 internal constant BPS_DENOMINATOR = 10000; // 100% in basis points (1 basis point = 0.01%)
    // This struct contains all the state variables used across facets
    struct AppStorage {
        // Token addresses
        address MTTToken;
        address MLTToken;
        address MBTToken;
        // Legacy contract references removed - functionality now handled by vault system
        // Role management
        mapping(bytes32 => mapping(address => bool)) roles;
        bytes32 ADMIN_ROLE;
        // Farm management mappings
        uint256[] activeFarmIds;
        mapping(uint256 => TreeTypes.FarmMetadata) farmsMetadata;
        mapping(uint256 => mapping(address => bool)) authorizedFarmsOperators;
        mapping(address => uint256[]) farmersFarmsList;
        // Tree specific storage
        mapping(uint256 => mapping(uint256 => TreeTypes.TreeMetadata)) treeMetadata;
        mapping(uint256 => mapping(uint256 => bool)) isTreeStakeable;
        // Yield specific storage
        mapping(uint256 => mapping(uint256 => TreeTypes.YieldRecord[])) treeYieldHistory;
        // System establishment timestamp
        uint256 establishedTimestamp;
        
        // =========== Legacy Staking Storage Removed ============
        // All staking functionality is now handled by the Multi-Tranche Vault System
        // No migration needed as this system has no live data
        
        // =========== Multi-Tranche Vault Storage ============
        
        // Vault system core
        address mttrVault;                    // Address of the MTTR multi-tranche vault contract
        address mbtToken;                     // Address of the MBT token (vault's underlying asset)
        bool vaultInitialized;                // Whether the vault system has been initialized
        
        // Farm-to-vault mappings
        mapping(address => uint256) farmToVaultId;        // Farm owner address => Vault farm ID
        mapping(uint256 => address) vaultIdToFarm;        // Vault farm ID => Farm owner address
        uint256 totalVaultFarms;                          // Total number of farms in the vault
        
        // Tree-to-vault mappings
        mapping(uint256 => uint256) treeToVaultFarm;      // Tree ID => Vault farm ID
        mapping(uint256 => uint256[]) vaultFarmTrees;     // Vault farm ID => Array of tree IDs
        
        // Bond tracking
        mapping(address => uint256) userBondCount;        // User => Number of bonds owned
        uint256 totalActiveBonds;                         // Total active bonds across all farms
        
        // Yield accumulation for vault farms
        mapping(uint256 => uint256) farmPendingYield;     // Farm ID => Pending yield amount
        mapping(uint256 => uint256) farmTotalYield;       // Farm ID => Total lifetime yield
        mapping(uint256 => uint256) farmLastYieldUpdate;  // Farm ID => Last yield update timestamp
        
        // Farm share token tracking
        mapping(uint256 => address) farmShareTokens;      // Farm ID => Share token address
        mapping(address => uint256) shareTokenToFarm;     // Share token address => Farm ID
        
        // Bond maturity tracking
        mapping(uint256 => uint256[]) farmBondIds;        // Farm ID => Array of bond IDs
        mapping(uint256 => uint256) bondMaturityTime;     // Bond ID => Maturity timestamp
        mapping(uint256 => bool) bondRedeemed;            // Bond ID => Redemption status
        
        // Collateral management
        mapping(uint256 => uint256) farmCollateralValue;  // Farm ID => Current collateral value
        mapping(uint256 => uint256) farmCoverageRatio;    // Farm ID => Current coverage ratio
        mapping(uint256 => uint256) farmLiquidationThreshold; // Farm ID => Liquidation threshold
        
        // Removed migration tracking (not needed for fresh implementation)
        
        // Performance metrics
        uint256 totalVaultTVL;                            // Total value locked in vault system
        uint256 totalYieldDistributed;                    // Total yield distributed through vault
        uint256 totalBondsIssued;                         // Total number of bonds ever issued
        uint256 totalFarmsSettled;                        // Total number of farms that have matured
        
        // Risk management
        mapping(uint256 => uint256) farmRiskScore;        // Farm ID => Risk assessment score
        mapping(uint256 => bool) farmLiquidated;          // Farm ID => Whether farm was liquidated
        uint256 globalRiskThreshold;                      // Global risk threshold for farms
        
        // Payment integration
        address swyptProcessor;                            // Swypt payment processor address
        address elementPayProcessor;                       // ElementPay processor address
        mapping(address => bool) authorizedPaymentProcessors; // Authorized payment processors
        
        // Oracle integration
        address priceOracle;                              // Coffee price oracle address
        address iotOracle;                                // IoT data oracle address
        mapping(address => bool) authorizedOracles;       // Authorized oracle addresses
        
        // Governance integration
        address governanceToken;                          // Governance token address
        uint256 proposalThreshold;                        // Minimum tokens needed to create proposal
        uint256 votingDelay;                             // Delay before voting starts
        uint256 votingPeriod;                            // Duration of voting period
        
        // Insurance integration
        address insuranceManager;                         // Insurance manager contract
        mapping(uint256 => uint256) farmInsurancePremium; // Farm ID => Insurance premium
        mapping(uint256 => bool) farmInsured;             // Farm ID => Insurance status
        
        // Analytics and ML integration
        address analyticsEngine;                          // Analytics engine contract
        mapping(uint256 => uint256) farmPerformanceScore; // Farm ID => AI-calculated performance score
        mapping(uint256 => uint256) farmYieldPrediction;  // Farm ID => Predicted yield
        
        // Cross-chain bridge
        address bridgeContract;                           // Cross-chain bridge contract
        mapping(uint256 => bool) farmCrossChainEnabled;   // Farm ID => Cross-chain availability
        
        // Emergency controls
        bool emergencyPaused;                             // Global emergency pause
        uint256 emergencyPauseTimestamp;                  // When emergency pause was activated
        address emergencyManager;                         // Emergency manager address
    }
}

// Returns the app storage
function appStorage() pure returns (LibAppStorage.AppStorage storage ds) {
    assembly {
        ds.slot := 0
    }
}
