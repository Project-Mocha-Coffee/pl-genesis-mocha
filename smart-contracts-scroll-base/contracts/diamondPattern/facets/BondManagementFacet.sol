// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IBondManagementFacet.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibAccess.sol";
import "../../tokens/MochaTreeRightsToken.sol";
import "../../tokens/FarmShareToken.sol";

/**
 * @title BondManagementFacet
 * @dev Diamond facet for advanced asset-backed bond operations and management
 * Handles maturity tracking, liquidation, rollover options, and bond analytics
 */
contract BondManagementFacet is IBondManagementFacet {
    
    LibAppStorage.AppStorage internal s;
    
    /* ========== CONSTANTS ========== */
    
    // BPS_DENOMINATOR is now defined in LibAppStorage as a shared constant
    uint256 public constant LIQUIDATION_BONUS = 500; // 5% bonus for liquidators
    uint256 public constant MIN_COLLATERAL_RATIO = 8000; // 80% minimum
    uint256 public constant EARLY_REDEMPTION_PENALTY = 500; // 5% penalty
    
    /* ========== MODIFIERS ========== */
    
    modifier onlyBondManager() {
        LibAccess.enforceIsBondManager();
        _;
    }
    
    modifier onlyVaultManager() {
        LibAccess.enforceIsVaultManager();
        _;
    }
    
    modifier onlyOracle() {
        LibAccess.enforceIsOracle();
        _;
    }
    
    modifier validFarm(uint256 farmId) {
        require(farmId < s.totalVaultFarms, "Invalid farm ID");
        _;
    }
    
    modifier validBond(address investor, uint256 bondId) {
        require(bondId < s.userBondCount[investor], "Invalid bond ID");
        _;
    }
    
    /* ========== BOND LIFECYCLE MANAGEMENT ========== */
    
    /**
     * @dev Create a new bond issuance for a farm
     * @param farmId ID of the farm
     * @param bondAmount Total bond amount to issue
     * @param maturityMonths Bond maturity in months
     * @param targetAPY Target annual percentage yield
     * @param collateralRatio Required collateral ratio in basis points
     */
    function createBondIssuance(
        uint256 farmId,
        uint256 bondAmount,
        uint256 maturityMonths,
        uint256 targetAPY,
        uint256 collateralRatio
    ) external onlyBondManager validFarm(farmId) {
        require(bondAmount > 0, "Bond amount must be > 0");
        require(maturityMonths >= 12 && maturityMonths <= 60, "Invalid maturity period");
        require(targetAPY > 0 && targetAPY <= 3000, "Invalid APY");
        require(collateralRatio >= MIN_COLLATERAL_RATIO, "Insufficient collateral ratio");
        
        // Calculate maturity timestamp
        uint256 maturityTimestamp = block.timestamp + (maturityMonths * 30 days);
        
        // Update farm bond tracking
        s.farmBondIds[farmId].push(s.totalBondsIssued);
        s.bondMaturityTime[s.totalBondsIssued] = maturityTimestamp;
        s.farmCollateralValue[farmId] = _calculateCollateralValue(farmId);
        s.farmCoverageRatio[farmId] = collateralRatio;
        s.farmLiquidationThreshold[farmId] = (collateralRatio * 80) / 100; // 80% of required ratio
        
        // Increment total bonds issued
        s.totalBondsIssued++;
        
        emit BondIssuanceCreated(
            farmId,
            s.totalBondsIssued - 1,
            bondAmount,
            maturityTimestamp,
            targetAPY,
            collateralRatio
        );
    }
    
    /**
     * @dev Update bond terms (pre-maturity)
     * @param farmId ID of the farm
     * @param newTargetAPY New target APY
     * @param newCollateralRatio New collateral ratio
     */
    function updateBondTerms(
        uint256 farmId,
        uint256 newTargetAPY,
        uint256 newCollateralRatio
    ) external onlyBondManager validFarm(farmId) {
        require(newTargetAPY > 0 && newTargetAPY <= 3000, "Invalid APY");
        require(newCollateralRatio >= MIN_COLLATERAL_RATIO, "Insufficient collateral ratio");
        
        // Update vault farm configuration
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        vault.updateFarm(farmId, newTargetAPY, true);
        
        // Update collateral requirements
        s.farmCoverageRatio[farmId] = newCollateralRatio;
        s.farmLiquidationThreshold[farmId] = (newCollateralRatio * 80) / 100;
        
        emit BondTermsUpdated(farmId, newTargetAPY, newCollateralRatio);
    }
    
    /**
     * @dev Process bond maturity for a farm
     * @param farmId ID of the farm that has matured
     */
    function processBondMaturity(uint256 farmId) external onlyBondManager validFarm(farmId) {
        require(_isFarmMatured(farmId), "Farm bonds not yet matured");
        require(!_isFarmSettled(farmId), "Farm already settled");
        
        // Calculate final settlement amounts
        uint256 totalCollateralValue = s.farmCollateralValue[farmId];
        uint256 totalYield = s.farmTotalYield[farmId];
        uint256 totalRedemptionPool = totalCollateralValue + totalYield;
        
        // Mark farm bonds as matured
        uint256[] storage bondIds = s.farmBondIds[farmId];
        for (uint256 i = 0; i < bondIds.length; i++) {
            s.bondRedeemed[bondIds[i]] = false; // Mark as ready for redemption
        }
        
        // Update farm status
        s.totalFarmsSettled++;
        
        // Call vault to settle the farm
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        vault.settleMatureFarm(farmId);
        
        emit BondMaturityProcessed(
            farmId,
            totalCollateralValue,
            totalYield,
            totalRedemptionPool,
            bondIds.length
        );
    }
    
    /* ========== COLLATERAL MANAGEMENT ========== */
    
    /**
     * @dev Update collateral valuation for a farm
     * @param farmId ID of the farm
     * @param newValuation New total collateral valuation
     */
    function updateCollateralValuation(
        uint256 farmId,
        uint256 newValuation
    ) external onlyOracle validFarm(farmId) {
        require(newValuation > 0, "Valuation must be > 0");
        
        uint256 oldValuation = s.farmCollateralValue[farmId];
        s.farmCollateralValue[farmId] = newValuation;
        
        // Recalculate coverage ratio
        uint256 newCoverageRatio = _calculateCurrentCoverageRatio(farmId);
        s.farmCoverageRatio[farmId] = newCoverageRatio;
        
        // Check for liquidation trigger
        if (newCoverageRatio < s.farmLiquidationThreshold[farmId]) {
            _triggerLiquidationProcess(farmId);
        }
        
        emit CollateralValuationUpdated(
            farmId,
            oldValuation,
            newValuation,
            newCoverageRatio
        );
    }
    
    /**
     * @dev Trigger liquidation process for undercollateralized farm
     * @param farmId ID of the farm to liquidate
     */
    function _triggerLiquidationProcess(uint256 farmId) internal {
        require(!s.farmLiquidated[farmId], "Farm already liquidated");
        
        // Mark farm as under liquidation
        s.farmLiquidated[farmId] = true;
        
        // Pause new bond purchases for this farm
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        vault.updateFarm(farmId, 0, false); // Set APY to 0 and inactive
        
        emit LiquidationTriggered(farmId, s.farmCoverageRatio[farmId], block.timestamp);
    }
    
    /**
     * @dev Execute liquidation auction for a farm
     * @param farmId ID of the farm to liquidate
     * @param liquidationPrice Price offered by liquidator
     */
    function executeLiquidation(
        uint256 farmId,
        uint256 liquidationPrice
    ) external validFarm(farmId) {
        require(s.farmLiquidated[farmId], "Farm not marked for liquidation");
        require(liquidationPrice > 0, "Invalid liquidation price");
        
        uint256 requiredMinimum = (s.farmCollateralValue[farmId] * 90) / 100; // 90% of collateral value
        require(liquidationPrice >= requiredMinimum, "Liquidation price too low");
        
        // Transfer liquidation payment
        IERC20(s.mbtToken).transferFrom(msg.sender, address(this), liquidationPrice);
        
        // Calculate liquidator bonus
        uint256 liquidatorBonus = (liquidationPrice * LIQUIDATION_BONUS) / LibAppStorage.BPS_DENOMINATOR;
        
        // Distribute liquidation proceeds to bond holders
        _distributeLiquidationProceeds(farmId, liquidationPrice - liquidatorBonus);
        
        // Pay liquidator bonus
        IERC20(s.mbtToken).transfer(msg.sender, liquidatorBonus);
        
        emit LiquidationExecuted(
            farmId,
            msg.sender,
            liquidationPrice,
            liquidatorBonus
        );
    }
    
    /**
     * @dev Distribute liquidation proceeds to bond holders
     * @param farmId ID of the liquidated farm
     * @param proceedsAmount Total proceeds to distribute
     */
    function _distributeLiquidationProceeds(
        uint256 farmId,
        uint256 proceedsAmount
    ) internal {
        // Get farm share token
        address farmShareTokenAddress = s.farmShareTokens[farmId];
        require(farmShareTokenAddress != address(0), "Farm share token not found");
        
        FarmShareToken shareToken = FarmShareToken(payable(farmShareTokenAddress));
        uint256 totalShares = shareToken.totalSupply();
        
        if (totalShares > 0) {
            // Calculate proceeds per share
            uint256 proceeds = proceedsAmount;
            
            // Update yield in share token (this will be distributed to holders)
            shareToken.updateTotalYieldUnclaimed(proceeds);
        }
        
        emit LiquidationProceedsDistributed(farmId, proceedsAmount, totalShares);
    }
    
    /* ========== BOND ROLLOVER SYSTEM ========== */
    
    /**
     * @dev Create rollover options for maturing bonds
     * @param oldFarmId ID of the maturing farm
     * @param newFarmId ID of the new farm for rollover
     * @param rolloverTerms Terms for the new bond
     */
    function createRolloverOption(
        uint256 oldFarmId,
        uint256 newFarmId,
        RolloverTerms memory rolloverTerms
    ) external onlyBondManager {
        require(_isFarmMatured(oldFarmId), "Old farm not matured");
        require(newFarmId < s.totalVaultFarms, "Invalid new farm ID");
        require(rolloverTerms.newAPY > 0 && rolloverTerms.newAPY <= 3000, "Invalid APY");
        require(rolloverTerms.newMaturityMonths >= 12 && rolloverTerms.newMaturityMonths <= 60, "Invalid maturity");
        
        emit RolloverOptionCreated(
            oldFarmId,
            newFarmId,
            rolloverTerms.newAPY,
            rolloverTerms.newMaturityMonths,
            rolloverTerms.bonusMultiplier
        );
    }
    
    /**
     * @dev Execute bond rollover for a user
     * @param oldBondId ID of the matured bond
     * @param newFarmId ID of the new farm
     */
    function executeRollover(
        uint256 oldBondId,
        uint256 newFarmId
    ) external returns (uint256 newBondId) {
        require(oldBondId < s.userBondCount[msg.sender], "Invalid bond ID");
        require(newFarmId < s.totalVaultFarms, "Invalid farm ID");
        
       /*  // Execute rollover through main vault
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        newBondId = vault.rolloverBond(oldBondId, newFarmId);
        
        emit BondRolloverExecuted(
            msg.sender,
            oldBondId,
            newBondId,
            newFarmId
        ); */

        return 0;
    }
    
    /* ========== BOND PERFORMANCE ANALYTICS ========== */
    
    /**
     * @dev Calculate bond performance metrics
     * @param farmId ID of the farm
     */
    function calculateBondPerformance(uint256 farmId) external view validFarm(farmId) returns (
        uint256 currentYield,
        uint256 targetYield,
        uint256 performanceRatio,
        uint256 timeToMaturity,
        uint256 riskScore
    ) {
        // Get farm configuration from vault
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        
        currentYield = s.farmTotalYield[farmId];
        
        // Calculate expected yield based on time elapsed
        uint256 timeElapsed = block.timestamp - config.createdTimestamp;
        uint256 totalDuration = config.maturityTimestamp - config.createdTimestamp;
        
        if (totalDuration > 0) {
            uint256 expectedYield = (config.bondValue * config.targetAPY * timeElapsed) / (totalDuration * LibAppStorage.BPS_DENOMINATOR);
            targetYield = expectedYield;
            
            if (expectedYield > 0) {
                performanceRatio = (currentYield * LibAppStorage.BPS_DENOMINATOR) / expectedYield;
            }
        }
        
        timeToMaturity = config.maturityTimestamp > block.timestamp ? 
            config.maturityTimestamp - block.timestamp : 0;
        
        riskScore = s.farmRiskScore[farmId];
    }
    
    /**
     * @dev Get comprehensive bond analytics
     * @param farmId ID of the farm
     */
    function getBondAnalytics(uint256 farmId) external view validFarm(farmId) returns (
        BondAnalytics memory analytics
    ) {
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        
        analytics.farmId = farmId;
        analytics.totalBondValue = config.bondValue;
        analytics.currentCollateralValue = s.farmCollateralValue[farmId];
        analytics.coverageRatio = s.farmCoverageRatio[farmId];
        analytics.totalYieldGenerated = s.farmTotalYield[farmId];
        analytics.maturityTimestamp = config.maturityTimestamp;
        analytics.isLiquidated = s.farmLiquidated[farmId];
        analytics.numberOfBondHolders = _getBondHolderCount(farmId);
        analytics.averageBondSize = analytics.numberOfBondHolders > 0 ? 
            analytics.totalBondValue / analytics.numberOfBondHolders : 0;
        analytics.riskScore = s.farmRiskScore[farmId];
    }
    
    /* ========== RISK MANAGEMENT ========== */
    
    /**
     * @dev Update risk score for a farm
     * @param farmId ID of the farm
     * @param newRiskScore New risk score (0-10000)
     */
    function updateFarmRiskScore(
        uint256 farmId,
        uint256 newRiskScore
    ) external onlyOracle validFarm(farmId) {
        require(newRiskScore <= LibAppStorage.BPS_DENOMINATOR, "Risk score cannot exceed 100%");
        
        uint256 oldRiskScore = s.farmRiskScore[farmId];
        s.farmRiskScore[farmId] = newRiskScore;
        
        // Check if risk threshold exceeded
        if (newRiskScore > s.globalRiskThreshold) {
            emit RiskThresholdExceeded(farmId, newRiskScore, s.globalRiskThreshold);
        }
        
        emit FarmRiskScoreUpdated(farmId, oldRiskScore, newRiskScore);
    }
    
    /**
     * @dev Set global risk threshold
     * @param newThreshold New global risk threshold
     */
    function setGlobalRiskThreshold(uint256 newThreshold) external onlyBondManager {
        require(newThreshold <= LibAppStorage.BPS_DENOMINATOR, "Threshold cannot exceed 100%");
        
        uint256 oldThreshold = s.globalRiskThreshold;
        s.globalRiskThreshold = newThreshold;
        
        emit GlobalRiskThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /* ========== SECONDARY MARKET OPERATIONS ========== */
    
    /**
     * @dev Enable/disable bond trading on secondary market
     * @param farmId ID of the farm
     * @param enabled Whether trading should be enabled
     */
    function setBondTradingStatus(
        uint256 farmId,
        bool enabled
    ) external onlyBondManager validFarm(farmId) {
        emit BondTradingStatusChanged(farmId, enabled);
    }
    
    /* ========== INTERNAL HELPER FUNCTIONS ========== */
    
    /**
     * @dev Calculate total collateral value for a farm
     * @param farmId ID of the farm
     */
    function _calculateCollateralValue(uint256 farmId) internal view returns (uint256) {
        // Get tree count and valuation
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        
        // Use current tree valuation (800 MBT default, but can be updated)
        uint256 treeValuation = 800 * 10**18; // 800 MBT per tree
        return config.treeCount * treeValuation;
    }
    
    /**
     * @dev Calculate current coverage ratio for a farm
     * @param farmId ID of the farm
     */
    function _calculateCurrentCoverageRatio(uint256 farmId) internal view returns (uint256) {
        uint256 collateralValue = s.farmCollateralValue[farmId];
        
        // Get outstanding bond value
        address farmShareTokenAddress = s.farmShareTokens[farmId];
        if (farmShareTokenAddress == address(0)) return 0;
        
        FarmShareToken shareToken = FarmShareToken(payable(farmShareTokenAddress));
        uint256 outstandingBonds = shareToken.totalSupply();
        
        if (outstandingBonds == 0) return 0;
        
        return (collateralValue * LibAppStorage.BPS_DENOMINATOR) / outstandingBonds;
    }
    
    /**
     * @dev Check if a farm has matured
     * @param farmId ID of the farm
     */
    function _isFarmMatured(uint256 farmId) internal view returns (bool) {
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        return block.timestamp >= config.maturityTimestamp;
    }
    
    /**
     * @dev Check if a farm has been settled
     * @param farmId ID of the farm
     */
    function _isFarmSettled(uint256 farmId) internal view returns (bool) {
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        return !config.active && _isFarmMatured(farmId);
    }
    
    /**
     * @dev Get bond holder count for a farm
     * @param farmId ID of the farm
     */
    function _getBondHolderCount(uint256 farmId) internal view returns (uint256) {
        address farmShareTokenAddress = s.farmShareTokens[farmId];
        if (farmShareTokenAddress == address(0)) return 0;
        
        // This is a simplified count - in practice, you'd track unique holders
        FarmShareToken shareToken = FarmShareToken(payable(farmShareTokenAddress));
        return shareToken.totalSupply() > 0 ? 1 : 0; // Placeholder implementation
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get bond maturity information
     * @param farmId ID of the farm
     */
    function getBondMaturityInfo(uint256 farmId) external view validFarm(farmId) returns (
        uint256 maturityTimestamp,
        uint256 timeToMaturity,
        bool isMatured,
        bool isSettled
    ) {
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        
        maturityTimestamp = config.maturityTimestamp;
        timeToMaturity = config.maturityTimestamp > block.timestamp ? 
            config.maturityTimestamp - block.timestamp : 0;
        isMatured = _isFarmMatured(farmId);
        isSettled = _isFarmSettled(farmId);
    }
    
    /**
     * @dev Get farm liquidation status
     * @param farmId ID of the farm
     */
    function getLiquidationStatus(uint256 farmId) external view validFarm(farmId) returns (
        bool isLiquidated,
        uint256 currentCoverageRatio,
        uint256 liquidationThreshold,
        uint256 collateralValue
    ) {
        isLiquidated = s.farmLiquidated[farmId];
        currentCoverageRatio = s.farmCoverageRatio[farmId];
        liquidationThreshold = s.farmLiquidationThreshold[farmId];
        collateralValue = s.farmCollateralValue[farmId];
    }
}