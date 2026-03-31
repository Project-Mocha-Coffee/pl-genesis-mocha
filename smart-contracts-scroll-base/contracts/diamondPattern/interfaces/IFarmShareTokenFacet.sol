// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFarmShareTokenFacet
 * @dev Interface for the Farm Share Token Facet that manages individual farm share tokens
 */
interface IFarmShareTokenFacet {
    
    /* ========== STRUCTS ========== */
    
    struct ShareTokenAnalytics {
        uint256 farmId;                    // ID of the farm
        address shareTokenAddress;         // Address of the share token
        string tokenName;                  // Name of the token
        string tokenSymbol;                // Symbol of the token
        uint256 totalSupply;               // Total supply of tokens
        uint256 totalYieldPerShare;        // Cumulative yield per share
        uint256 totalYieldDistributed;     // Total yield distributed
        uint256 lastYieldUpdate;           // Last yield update timestamp
        uint256 sharePrice;                // Current share price
        uint256 marketCap;                 // Total market capitalization
        uint256 yieldAPY;                  // Annualized yield percentage
        uint256 performanceScore;          // Performance score (0-10000)
    }
    
    struct UserSharePosition {
        uint256 farmId;                    // ID of the farm
        address userAddress;               // Address of the user
        uint256 shareBalance;              // Number of shares held
        uint256 pendingYield;              // Pending yield to claim
        uint256 claimedYieldPerShare;      // Yield per share already claimed
        uint256 totalClaimedYield;         // Total yield claimed to date
        uint256 shareValue;                // Current value of shares
        uint256 yieldValue;                // Total yield value (pending + claimed)
    }
    
    /* ========== EVENTS ========== */
    
    event FarmShareTokenDeployed(
        uint256 indexed farmId,
        address indexed shareTokenAddress,
        string tokenName,
        string tokenSymbol
    );
    
    event FarmInfoUpdated(
        uint256 indexed farmId,
        address indexed shareTokenAddress,
        string newFarmName
    );
    
    event YieldDistributedToShareHolders(
        uint256 indexed farmId,
        address indexed shareTokenAddress,
        uint256 yieldAmount,
        uint256 yieldPerShare,
        uint256 totalSupply
    );
    
    event BatchYieldDistributed(
        uint256[] farmIds,
        uint256[] yieldAmounts
    );
    
    event ShareTokenPauseStatusChanged(
        uint256 indexed farmId,
        address indexed shareTokenAddress,
        bool paused
    );
    
    event EmergencyMint(
        uint256 indexed farmId,
        address indexed shareTokenAddress,
        address indexed to,
        uint256 amount
    );
    
    event EmergencyBurn(
        uint256 indexed farmId,
        address indexed shareTokenAddress,
        address indexed from,
        uint256 amount
    );
    
    event BulkYieldClaimed(
        uint256 indexed farmId,
        address indexed shareTokenAddress,
        address[] users,
        uint256 totalClaimed
    );
    
    /* ========== SHARE TOKEN DEPLOYMENT AND MANAGEMENT FUNCTIONS ========== */
    
    function deployFarmShareToken(
        uint256 farmId,
        string memory tokenName,
        string memory tokenSymbol
    ) external returns (address shareTokenAddress);
    
    function updateFarmInfo(
        uint256 farmId,
        string memory newFarmName
    ) external;
    
    /* ========== YIELD DISTRIBUTION FUNCTIONS ========== */
    
    function distributeYieldToShareHolders(
        uint256 farmId,
        uint256 yieldAmount
    ) external;
    
    function batchDistributeYield(
        uint256[] memory farmIds,
        uint256[] memory yieldAmounts
    ) external;
    
    /* ========== ANALYTICS FUNCTIONS ========== */
    
    function getShareTokenAnalytics(uint256 farmId) external view returns (
        ShareTokenAnalytics memory analytics
    );
    
    function getUserSharePosition(
        uint256 farmId,
        address user
    ) external view returns (
        UserSharePosition memory position
    );
    
    /* ========== GOVERNANCE FUNCTIONS ========== */
    
    function setShareTokenPauseStatus(
        uint256 farmId,
        bool paused
    ) external;
    
    function emergencyMint(
        uint256 farmId,
        address to,
        uint256 amount
    ) external;
    
    function emergencyBurn(
        uint256 farmId,
        address from,
        uint256 amount
    ) external;
    
    /* ========== UTILITY FUNCTIONS ========== */
    
    function bulkClaimYield(
        uint256 farmId,
        address[] memory users
    ) external;
    
    function getShareHolderCount(uint256 farmId) external view returns (uint256);
    
    function getTopShareHolders(
        uint256 farmId,
        uint256 limit
    ) external view returns (
        address[] memory holders,
        uint256[] memory balances
    );
    
    /* ========== VIEW FUNCTIONS ========== */
    
    function getAllShareTokens() external view returns (
        uint256[] memory farmIds,
        address[] memory shareTokenAddresses
    );
    
    function isShareTokenRegistered(address shareTokenAddress) external view returns (bool);
    
    function getFarmIdFromShareToken(address shareTokenAddress) external view returns (uint256);
    
    function getShareTokenFromFarmId(uint256 farmId) external view returns (address);
}