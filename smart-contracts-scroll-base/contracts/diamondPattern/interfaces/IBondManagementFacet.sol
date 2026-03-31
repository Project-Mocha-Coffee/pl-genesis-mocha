// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBondManagementFacet
 * @dev Interface for the Bond Management Facet that handles advanced asset-backed bond operations
 */
interface IBondManagementFacet {
    
    /* ========== STRUCTS ========== */
    
    struct RolloverTerms {
        uint256 newAPY;              // New annual percentage yield
        uint256 newMaturityMonths;   // New maturity period in months
        uint256 bonusMultiplier;     // Bonus multiplier for rollover (in basis points)
    }
    
    struct BondAnalytics {
        uint256 farmId;                    // ID of the farm
        uint256 totalBondValue;            // Total value of bonds issued
        uint256 currentCollateralValue;    // Current collateral value
        uint256 coverageRatio;             // Current coverage ratio
        uint256 totalYieldGenerated;       // Total yield generated to date
        uint256 maturityTimestamp;         // Bond maturity timestamp
        bool isLiquidated;                 // Whether farm has been liquidated
        uint256 numberOfBondHolders;       // Number of bond holders
        uint256 averageBondSize;           // Average bond size
        uint256 riskScore;                 // Current risk score
    }
    
    /* ========== EVENTS ========== */
    
    event BondIssuanceCreated(
        uint256 indexed farmId,
        uint256 indexed bondId,
        uint256 bondAmount,
        uint256 maturityTimestamp,
        uint256 targetAPY,
        uint256 collateralRatio
    );
    
    event BondTermsUpdated(
        uint256 indexed farmId,
        uint256 newTargetAPY,
        uint256 newCollateralRatio
    );
    
    event BondMaturityProcessed(
        uint256 indexed farmId,
        uint256 totalCollateralValue,
        uint256 totalYield,
        uint256 totalRedemptionPool,
        uint256 numberOfBonds
    );
    
    event CollateralValuationUpdated(
        uint256 indexed farmId,
        uint256 oldValuation,
        uint256 newValuation,
        uint256 newCoverageRatio
    );
    
    event LiquidationTriggered(
        uint256 indexed farmId,
        uint256 coverageRatio,
        uint256 timestamp
    );
    
    event LiquidationExecuted(
        uint256 indexed farmId,
        address indexed liquidator,
        uint256 liquidationPrice,
        uint256 liquidatorBonus
    );
    
    event LiquidationProceedsDistributed(
        uint256 indexed farmId,
        uint256 proceedsAmount,
        uint256 totalShares
    );
    
    event RolloverOptionCreated(
        uint256 indexed oldFarmId,
        uint256 indexed newFarmId,
        uint256 newAPY,
        uint256 newMaturityMonths,
        uint256 bonusMultiplier
    );
    
    event BondRolloverExecuted(
        address indexed investor,
        uint256 indexed oldBondId,
        uint256 indexed newBondId,
        uint256 newFarmId
    );
    
    event FarmRiskScoreUpdated(
        uint256 indexed farmId,
        uint256 oldRiskScore,
        uint256 newRiskScore
    );
    
    event GlobalRiskThresholdUpdated(
        uint256 oldThreshold,
        uint256 newThreshold
    );
    
    event RiskThresholdExceeded(
        uint256 indexed farmId,
        uint256 riskScore,
        uint256 threshold
    );
    
    event BondTradingStatusChanged(
        uint256 indexed farmId,
        bool enabled
    );
    
    /* ========== BOND LIFECYCLE MANAGEMENT FUNCTIONS ========== */
    
    function createBondIssuance(
        uint256 farmId,
        uint256 bondAmount,
        uint256 maturityMonths,
        uint256 targetAPY,
        uint256 collateralRatio
    ) external;
    
    function updateBondTerms(
        uint256 farmId,
        uint256 newTargetAPY,
        uint256 newCollateralRatio
    ) external;
    
    function processBondMaturity(uint256 farmId) external;
    
    /* ========== COLLATERAL MANAGEMENT FUNCTIONS ========== */
    
    function updateCollateralValuation(
        uint256 farmId,
        uint256 newValuation
    ) external;
    
    function executeLiquidation(
        uint256 farmId,
        uint256 liquidationPrice
    ) external;
    
    /* ========== BOND ROLLOVER FUNCTIONS ========== */
    
    function createRolloverOption(
        uint256 oldFarmId,
        uint256 newFarmId,
        RolloverTerms memory rolloverTerms
    ) external;
    
    function executeRollover(
        uint256 oldBondId,
        uint256 newFarmId
    ) external returns (uint256 newBondId);
    
    /* ========== ANALYTICS FUNCTIONS ========== */
    
    function calculateBondPerformance(uint256 farmId) external view returns (
        uint256 currentYield,
        uint256 targetYield,
        uint256 performanceRatio,
        uint256 timeToMaturity,
        uint256 riskScore
    );
    
    function getBondAnalytics(uint256 farmId) external view returns (
        BondAnalytics memory analytics
    );
    
    /* ========== RISK MANAGEMENT FUNCTIONS ========== */
    
    function updateFarmRiskScore(
        uint256 farmId,
        uint256 newRiskScore
    ) external;
    
    function setGlobalRiskThreshold(uint256 newThreshold) external;
    
    /* ========== SECONDARY MARKET FUNCTIONS ========== */
    
    function setBondTradingStatus(
        uint256 farmId,
        bool enabled
    ) external;
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getBondMaturityInfo(uint256 farmId) external view returns (
        uint256 maturityTimestamp,
        uint256 timeToMaturity,
        bool isMatured,
        bool isSettled
    );
    
    function getLiquidationStatus(uint256 farmId) external view returns (
        bool isLiquidated,
        uint256 currentCoverageRatio,
        uint256 liquidationThreshold,
        uint256 collateralValue
    );
}