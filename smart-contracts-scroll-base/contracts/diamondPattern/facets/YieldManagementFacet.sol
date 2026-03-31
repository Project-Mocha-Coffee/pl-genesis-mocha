// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IYieldManagementFacet.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibAccess.sol";

/**
 * @title YieldManagementFacet
 * @dev Farm yield recording and analytics management
 * 
 * SCOPE: This facet handles yield recording and analytics only.
 * Distribution is handled by IMultiTrancheVaultFacet and IFarmShareTokenFacet.
 */
contract YieldManagementFacet is IYieldManagementFacet {
    // Application storage with shared state across facets
    LibAppStorage.AppStorage internal s;

    // Farm-level yield tracking for analytics
    mapping(uint256 => uint256) private farmSpeculativeYield;
    mapping(uint256 => bool) private farmHasSpeculativeYield;
    mapping(uint256 => IYieldManagementFacet.YieldRecord[]) private farmYieldRecords;
    mapping(uint256 => uint256) private farmTotalSpeculative;
    mapping(uint256 => uint256) private farmTotalActual;
    mapping(uint256 => int256) private farmTotalVariance;

    /* ========== YIELD RECORDING FUNCTIONS ========== */

    /**
     * @dev Record speculative yield for a farm (yield prediction)
     */
    function recordSpeculativeYield(
        uint256 farmId,
        uint256 estimatedYieldAmount
    ) external override returns (bool success) {
        LibAccess.enforceIsFactoryOrAdmin();

        // Validate inputs
        require(s.farmsMetadata[farmId].isActive, "Farm is not active");
        require(estimatedYieldAmount > 0, "Estimated yield must be greater than 0");

        return recordSpeculativeYieldInternal(farmId, estimatedYieldAmount);
    }

    /**
     * @dev Record actual yield and convert from speculative if needed
     */
    function recordActualYield(
        uint256 farmId,
        uint256 actualYieldAmount
    ) external override returns (bool success, int256 variance) {
        LibAccess.enforceIsFactoryOrAdmin();

        // Validate inputs
        require(s.farmsMetadata[farmId].isActive, "Farm is not active");
        require(actualYieldAmount > 0, "Actual yield must be greater than 0");

        return recordActualYieldInternal(farmId, actualYieldAmount);
    }

    /**
     * @dev Record yield for tracking purposes (updates farm metadata and history)
     */
    function recordYieldMetadata(
        uint256 farmId,
        uint256 yieldAmount,
        bool isSpeculative
    ) external override returns (bool success) {
        LibAccess.enforceIsFactoryOrAdmin();

        // Validate inputs
        require(s.farmsMetadata[farmId].isActive, "Farm is not active");
        require(yieldAmount > 0, "Yield amount must be greater than 0");

        if (isSpeculative) {
            return recordSpeculativeYieldInternal(farmId, yieldAmount);
        } else {
            (bool result, ) = recordActualYieldInternal(farmId, yieldAmount);
            return result;
        }
    }

    /* ========== INTERNAL HELPER FUNCTIONS ========== */

    /**
     * @dev Internal function to record speculative yield
     */
    function recordSpeculativeYieldInternal(
        uint256 farmId,
        uint256 estimatedYieldAmount
    ) internal returns (bool success) {
        require(!farmHasSpeculativeYield[farmId], "Farm already has speculative yield");

        // Record speculative yield
        farmSpeculativeYield[farmId] = estimatedYieldAmount;
        farmHasSpeculativeYield[farmId] = true;
        farmTotalSpeculative[farmId] += estimatedYieldAmount;

        // Update farm metadata
        s.farmsMetadata[farmId].lastYieldAmount = estimatedYieldAmount;
        s.farmsMetadata[farmId].lastYieldTimestamp = block.timestamp;

        // Create yield record
        IYieldManagementFacet.YieldRecord memory record = IYieldManagementFacet.YieldRecord({
            farmId: farmId,
            yieldAmount: estimatedYieldAmount,
            recordTimestamp: block.timestamp,
            isSpeculative: true,
            variance: 0
        });

        farmYieldRecords[farmId].push(record);

        emit FarmYieldRecorded(farmId, estimatedYieldAmount, block.timestamp, true);

        return true;
    }

    /**
     * @dev Internal function to record actual yield
     */
    function recordActualYieldInternal(
        uint256 farmId,
        uint256 actualYieldAmount
    ) internal returns (bool success, int256 variance) {
        // Calculate variance if speculative yield exists
        if (farmHasSpeculativeYield[farmId]) {
            uint256 speculativeAmount = farmSpeculativeYield[farmId];
            variance = int256(actualYieldAmount) - int256(speculativeAmount);
            
            farmTotalVariance[farmId] += variance;

            emit SpeculativeYieldConverted(
                    farmId,
                speculativeAmount,
                actualYieldAmount,
                variance
            );

            // Clear speculative yield
            farmHasSpeculativeYield[farmId] = false;
            farmSpeculativeYield[farmId] = 0;
        } else {
            variance = 0;
        }

        // Update farm metadata
        s.farmsMetadata[farmId].totalLifetimeYield += actualYieldAmount;
        s.farmsMetadata[farmId].lastYieldAmount = actualYieldAmount;
        s.farmsMetadata[farmId].lastYieldTimestamp = block.timestamp;

        // Update totals
        farmTotalActual[farmId] += actualYieldAmount;

        // Create yield record
        IYieldManagementFacet.YieldRecord memory record = IYieldManagementFacet.YieldRecord({
            farmId: farmId,
            yieldAmount: actualYieldAmount,
            recordTimestamp: block.timestamp,
            isSpeculative: false,
            variance: variance
        });

        farmYieldRecords[farmId].push(record);

        emit FarmYieldRecorded(farmId, actualYieldAmount, block.timestamp, false);
        emit YieldMetadataUpdated(
            farmId,
            s.farmsMetadata[farmId].totalLifetimeYield, 
            farmYieldRecords[farmId].length
        );

        return (true, variance);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @dev Get yield summary for a farm
     */
    function getFarmYieldSummary(uint256 farmId) external view override returns (
        IYieldManagementFacet.FarmYieldSummary memory summary
    ) {
        uint256 recordCount = farmYieldRecords[farmId].length;
        uint256 totalLifetime = s.farmsMetadata[farmId].totalLifetimeYield;

        summary = IYieldManagementFacet.FarmYieldSummary({
            farmId: farmId,
            totalLifetimeYield: totalLifetime,
            lastYieldAmount: s.farmsMetadata[farmId].lastYieldAmount,
            lastYieldTimestamp: s.farmsMetadata[farmId].lastYieldTimestamp,
            recordCount: recordCount,
            averageYieldPerRecord: recordCount > 0 ? totalLifetime / recordCount : 0,
            speculativeTotal: farmTotalSpeculative[farmId],
            actualTotal: farmTotalActual[farmId],
            totalVariance: farmTotalVariance[farmId]
        });
    }

    /**
     * @dev Get pending yield amount for a farm
     */
    function getPendingYield(uint256 farmId) external view override returns (uint256 pendingAmount) {
        return s.farmPendingYield[farmId];
    }

    /**
     * @dev Check if farm has recorded speculative yield
     */
    function getSpeculativeYieldStatus(uint256 farmId) external view override returns (
        bool hasSpeculative,
        uint256 speculativeAmount
    ) {
        hasSpeculative = farmHasSpeculativeYield[farmId];
        speculativeAmount = hasSpeculative ? farmSpeculativeYield[farmId] : 0;
    }

    /**
     * @dev Get yield recording history for a farm
     */
    function getYieldRecordHistory(
        uint256 farmId,
        uint256 limit
    ) external view override returns (IYieldManagementFacet.YieldRecord[] memory records) {
        IYieldManagementFacet.YieldRecord[] storage farmHistory = farmYieldRecords[farmId];
        uint256 length = farmHistory.length;
        
        if (length == 0) {
            return new IYieldManagementFacet.YieldRecord[](0);
        }

        uint256 returnLength = limit > 0 && limit < length ? limit : length;
        records = new IYieldManagementFacet.YieldRecord[](returnLength);

        // Return most recent records first
        for (uint256 i = 0; i < returnLength; i++) {
            records[i] = farmHistory[length - 1 - i];
        }
    }
}