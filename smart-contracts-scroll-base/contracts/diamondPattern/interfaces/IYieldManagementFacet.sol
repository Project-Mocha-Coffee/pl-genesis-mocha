// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYieldManagementFacet
 * @dev Interface for yield recording and analytics operations
 * 
 * RESPONSIBILITIES:
 * - Record speculative and actual yield amounts
 * - Track yield variance (predicted vs actual)
 * - Maintain yield history and analytics
 * - Update farm metadata
 * 
 * YIELD DISTRIBUTION FLOW (handled by other facets):
 * 1. This facet records yield metadata
 * 2. IMultiTrancheVaultFacet.distributeFarmYield() handles distribution routing
 * 3. IFarmShareTokenFacet.distributeYieldToShareHolders() distributes to bond holders
 */
interface IYieldManagementFacet {
    
    /* ========== STRUCTS ========== */
    
    struct YieldRecord {
        uint256 farmId;                    // Farm that generated the yield
        uint256 yieldAmount;               // Yield amount recorded
        uint256 recordTimestamp;           // When yield was recorded
        bool isSpeculative;                // Whether this was speculative or actual yield
        int256 variance;                   // Variance from speculative (0 if not applicable)
    }
    
    struct FarmYieldSummary {
        uint256 farmId;                    // Farm ID
        uint256 totalLifetimeYield;        // Total yield generated to date
        uint256 lastYieldAmount;           // Last yield recorded amount
        uint256 lastYieldTimestamp;        // Last yield recorded timestamp
        uint256 recordCount;               // Number of yield records
        uint256 averageYieldPerRecord;     // Average yield per record
        uint256 speculativeTotal;          // Total speculative yield recorded
        uint256 actualTotal;               // Total actual yield recorded
        int256 totalVariance;              // Total variance (actual - speculative)
    }
    
    /* ========== EVENTS ========== */
    
    event FarmYieldRecorded(
        uint256 indexed farmId,
        uint256 yieldAmount,
        uint256 timestamp,
        bool isSpeculative
    );
    
    event YieldMetadataUpdated(
        uint256 indexed farmId,
        uint256 newLifetimeTotal,
        uint256 distributionCount
    );
    
    event SpeculativeYieldConverted(
        uint256 indexed farmId,
        uint256 speculativeAmount,
        uint256 actualAmount,
        int256 variance
    );
    
    /* ========== YIELD RECORDING FUNCTIONS ========== */
    
    /**
     * @dev Record speculative yield for a farm (yield prediction)
     * @param farmId The farm ID
     * @param estimatedYieldAmount The estimated yield amount
     * @return success Whether the operation succeeded
     */
    function recordSpeculativeYield(
        uint256 farmId,
        uint256 estimatedYieldAmount
    ) external returns (bool success);
    
    /**
     * @dev Record actual yield and convert from speculative if needed
     * NOTE: This only records yield metadata. Use IMultiTrancheVaultFacet.distributeFarmYield() for distribution.
     * @param farmId The farm ID
     * @param actualYieldAmount The actual yield amount harvested
     * @return success Whether the operation succeeded
     * @return variance The difference between speculative and actual yield
     */
    function recordActualYield(
        uint256 farmId,
        uint256 actualYieldAmount
    ) external returns (bool success, int256 variance);
    
    /**
     * @dev Record yield for tracking purposes (updates farm metadata and history)
     * @param farmId The farm that generated the yield
     * @param yieldAmount The yield amount to record
     * @param isSpeculative Whether this is speculative or actual yield
     * @return success Whether the operation succeeded
     */
    function recordYieldMetadata(
        uint256 farmId,
        uint256 yieldAmount,
        bool isSpeculative
    ) external returns (bool success);
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get yield summary for a farm
     * @param farmId The farm ID
     * @return summary Complete yield summary for the farm
     */
    function getFarmYieldSummary(uint256 farmId) external view returns (
        FarmYieldSummary memory summary
    );
    
    /**
     * @dev Get pending yield amount for a farm
     * @param farmId The farm ID
     * @return pendingAmount Amount of yield pending distribution
     */
    function getPendingYield(uint256 farmId) external view returns (uint256 pendingAmount);
    
    /**
     * @dev Check if farm has recorded speculative yield
     * @param farmId The farm ID
     * @return hasSpeculative Whether farm has speculative yield recorded
     * @return speculativeAmount The speculative yield amount
     */
    function getSpeculativeYieldStatus(uint256 farmId) external view returns (
        bool hasSpeculative,
        uint256 speculativeAmount
    );
    
    /**
     * @dev Get yield recording history for a farm
     * @param farmId The farm ID
     * @param limit Maximum number of records to return
     * @return records Array of historical yield records
     */
    function getYieldRecordHistory(
        uint256 farmId,
        uint256 limit
    ) external view returns (YieldRecord[] memory records);
}
