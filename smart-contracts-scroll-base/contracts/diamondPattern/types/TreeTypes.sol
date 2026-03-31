// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library TreeTypes {
    struct FarmInfo {
        string name;
        string location;
        //GeoPoint coordinates;
        string area;
        string soilType;
        /* string ownership;
        string waterSource;
        uint256 yieldPotential;
        uint256 lastSurveyDate; */
    }

    struct GeoPoint {
        int256 latitude; // Scaled to 9 decimals for precision (-0.484664799 -> -484664799)
        int256 longitude; // Scaled to 9 decimals for precision (37.46943669 -> 37469436690)
        uint256 altitude; // In meters, scaled to 3 decimals (1522.507 -> 1522507)
    }

    struct LocationMetadata {
        string pointName; // e.g., "CFC453"
        GeoPoint coordinates; // Stored as scaled integers
        uint256 timestamp; // Unix timestamp of data collection
        uint256 accuracy; // HRMS in millimeters (0.001 -> 1)
        uint8 satelliteCount; // Number of satellites used
        uint16 pdop; // PDOP scaled by 1000 (1.1 -> 1100)
        string baseStationId; // Base station identifier
    }
    // Updated TreeMetadata to include enhanced location data
    struct TreeMetadata {
        string species;
        LocationMetadata location;
        uint256 plantingDate;
        string healthStatus;
        uint256 lastYield;
        uint256 lastUpdateTimestamp;
    }

    struct FarmMetadata {
        // Basic farm info
        uint256 farmId;
        uint256 treeCount;
        bool isActive;
        uint256[] treeIds;
        // Farm management
        address farmWalletAddress; // Current farmIdsOwner mapping
        address farmManager; // From farmManagersFarms mapping
        uint256 treePrice; // From farmTreePrice mapping
        uint256 nextTreeId; // From nextTreeId mapping
        // Yield tracking
        uint256 lastYieldAmount; // Last recorded total farm yield
        uint256 lastYieldTimestamp; // Timestamp of last yield recording
        uint256 totalLifetimeYield; // Cumulative yield tracking
        uint256 activeTreeCount; // Number of stakeable/healthy trees
        // Farm status
        FarmInfo farmInfo;
        uint256 establishedDate; // When the farm was added to the system
        string certifications; // Any relevant certifications
    }

    // Updated TreeInput for batch operations
    struct TreeInput {
        string species;
        string pointName;
        int256 latitude;
        int256 longitude;
        uint256 altitude;
        uint256 accuracy;
        uint8 satelliteCount;
        uint16 pdop;
        string baseStationId;
        uint256 plantingDate;
    }

    struct YieldRecord {
        uint256 timestamp;
        uint256 amount;
        bool tokenized;
    }

    struct TreeSummary {
        uint256 treeId;
        string species;
        uint256 bondAllocation;     // Amount allocated to bonds (replaces totalStaked)
        uint256 availableShares;
        bool isBondable;           // Whether tree can be used as bond collateral (replaces isStakeable)
        uint256 lastYield;
    }

    // Legacy staking structs and enums removed - functionality replaced by Multi-Tranche Vault System

    // Constants
    uint256 public constant SHARES_PER_TREE = 1000;
    uint256 public constant DECIMAL_POINTS = 10 ** 18;

    uint256 public constant DAYS_TO_SECONDS = 86400;
    uint256 public constant BASIS_POINTS = 10000;

    // Helper function to convert degrees to scaled integers
    function scaleCoordinate(int256 coordinate) internal pure returns (int256) {
        return coordinate * 1e9;
    }

    // Helper function to descale coordinates for external use
    function descaleCoordinate(
        int256 scaledCoordinate
    ) internal pure returns (int256) {
        return scaledCoordinate / 1e9;
    }
}
