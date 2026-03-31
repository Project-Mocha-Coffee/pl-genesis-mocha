// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IFarmShareTokenFacet.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibAccess.sol";
import "../../tokens/FarmShareToken.sol";
import "../../tokens/MochaTreeRightsToken.sol";


/**
 * @title FarmShareTokenFacet
 * @dev Diamond facet for enhanced management of individual farm share tokens
 * Provides advanced functionality for farm share token operations and governance
 */
contract FarmShareTokenFacet is IFarmShareTokenFacet {
    
    LibAppStorage.AppStorage internal s;
    
    /* ========== CONSTANTS ========== */
    
    // BPS_DENOMINATOR is now defined in LibAppStorage as a shared constant
    uint256 public constant MIN_TRANSFER_AMOUNT = 1e15; // 0.001 tokens minimum
    uint256 public constant MAX_YIELD_DISTRIBUTION = 1e24; // 1M tokens maximum per distribution
    
    /* ========== MODIFIERS ========== */
    
    modifier onlyVaultManager() {
        LibAccess.enforceIsVaultManager();
        _;
    }
    
    modifier onlyFarmManager() {
        LibAccess.enforceIsFarmManager(0); // Generic farm manager check
        _;
    }
    
    modifier onlyYieldProvider() {
        LibAccess.enforceIsYieldProvider();
        _;
    }
    
    modifier validFarm(uint256 farmId) {
        require(farmId < s.totalVaultFarms, "Invalid farm ID");
        require(s.farmShareTokens[farmId] != address(0), "Farm share token not deployed");
        _;
    }
    
    modifier validShareToken(address shareTokenAddress) {
        require(shareTokenAddress != address(0), "Invalid share token address");
        require(s.shareTokenToFarm[shareTokenAddress] > 0, "Share token not registered");
        _;
    }
    
    /* ========== SHARE TOKEN DEPLOYMENT AND MANAGEMENT ========== */
    
    /**
     * @dev Deploy a new farm share token and register it with the system
     * @param farmId ID of the farm
     * @param tokenName Name of the share token
     * @param tokenSymbol Symbol of the share token
     */
    function deployFarmShareToken(
        uint256 farmId,
        string memory tokenName,
        string memory tokenSymbol
    ) external onlyVaultManager validFarm(farmId) returns (address shareTokenAddress) {
        require(s.farmShareTokens[farmId] == address(0), "Share token already deployed");
        
        // Deploy new farm share token
        FarmShareToken shareToken = new FarmShareToken(
            tokenName,
            tokenSymbol,
            address(this), // Grant vault manager role to this facet
            s.mbtToken // Asset token address
        );
        
        shareTokenAddress = address(shareToken);
        
        // Register the share token
        s.farmShareTokens[farmId] = shareTokenAddress;
        s.shareTokenToFarm[shareTokenAddress] = farmId;
        
        // Set farm information in the share token
        shareToken.setFarmInfo(farmId, tokenName);
        
        emit FarmShareTokenDeployed(
            farmId,
            shareTokenAddress,
            tokenName,
            tokenSymbol
        );
    }
    
    /**
     * @dev Update farm information in the share token
     * @param farmId ID of the farm
     * @param newFarmName New farm name
     */
    function updateFarmInfo(
        uint256 farmId,
        string memory newFarmName
    ) external onlyVaultManager validFarm(farmId) {
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        shareToken.setFarmInfo(farmId, newFarmName);
        
        emit FarmInfoUpdated(farmId, shareTokenAddress, newFarmName);
    }
    
    /* ========== YIELD DISTRIBUTION MANAGEMENT ========== */
    
    /**
     * @dev Distribute yield to farm share token holders
     * @param farmId ID of the farm
     * @param yieldAmount Amount of yield to distribute
     */
    function distributeYieldToShareHolders(
        uint256 farmId,
        uint256 yieldAmount
    ) external onlyYieldProvider validFarm(farmId) {
        require(yieldAmount > 0, "Yield amount must be > 0");
        require(yieldAmount <= MAX_YIELD_DISTRIBUTION, "Yield amount too large");
        
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        uint256 totalSupply = shareToken.totalSupply();
        require(totalSupply > 0, "No shares to distribute yield to");
        
        // Update farm yield tracking first (before external call)
        s.farmTotalYield[farmId] += yieldAmount;
        s.farmLastYieldUpdate[farmId] = block.timestamp;
        
        // Calculate yield per share
        uint256 yieldPerShare = yieldAmount / totalSupply;
        
        // Update yield in the share token (external call last)
        shareToken.updateTotalYieldUnclaimed(yieldAmount);
        
        emit YieldDistributedToShareHolders(
            farmId,
            shareTokenAddress,
            yieldAmount,
            yieldPerShare,
            totalSupply
        );
    }
    
    /**
     * @dev Batch distribute yield to multiple farms
     * @param farmIds Array of farm IDs
     * @param yieldAmounts Array of yield amounts corresponding to each farm
     */
    function batchDistributeYield(
        uint256[] memory farmIds,
        uint256[] memory yieldAmounts
    ) external onlyYieldProvider {
        require(farmIds.length == yieldAmounts.length, "Arrays length mismatch");
        require(farmIds.length > 0, "No farms provided");
        require(farmIds.length <= 50, "Too many farms in batch"); // Gas limit protection
        
        for (uint256 i = 0; i < farmIds.length; i++) {
            if (farmIds[i] < s.totalVaultFarms && yieldAmounts[i] > 0) {
                this.distributeYieldToShareHolders(farmIds[i], yieldAmounts[i]);
            }
        }
        
        emit BatchYieldDistributed(farmIds, yieldAmounts);
    }
    
    /* ========== SHARE TOKEN ANALYTICS ========== */
    
    /**
     * @dev Get comprehensive share token analytics
     * @param farmId ID of the farm
     */
    function getShareTokenAnalytics(uint256 farmId) external view validFarm(farmId) returns (
        ShareTokenAnalytics memory analytics
    ) {
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        // Get basic token information
        (
            string memory tokenName,
            string memory tokenSymbol,
            uint256 totalSupply_,
            uint256 farmId_,
            string memory farmName_,
            address vaultContract_,
            uint256 totalYieldPerShare_,
            uint256 totalYieldDistributed_,
            uint256 lastYieldUpdate_
        ) = shareToken.getTokenInfo();
        
        analytics.farmId = farmId;
        analytics.shareTokenAddress = shareTokenAddress;
        analytics.tokenName = tokenName;
        analytics.tokenSymbol = tokenSymbol;
        analytics.totalSupply = totalSupply_;
        analytics.totalYieldPerShare = totalYieldPerShare_;
        analytics.totalYieldDistributed = totalYieldDistributed_;
        analytics.lastYieldUpdate = lastYieldUpdate_;
        analytics.sharePrice = _calculateSharePrice(farmId);
        analytics.marketCap = analytics.totalSupply * analytics.sharePrice;
        analytics.yieldAPY = _calculateYieldAPY(farmId);
        analytics.performanceScore = s.farmPerformanceScore[farmId];
    }
    
    /**
     * @dev Get user position in a specific farm share token
     * @param farmId ID of the farm
     * @param user Address of the user
     */
    function getUserSharePosition(
        uint256 farmId,
        address user
    ) external view validFarm(farmId) returns (
        UserSharePosition memory position
    ) {
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        // Get user position from share token
        (
            uint256 balance,
            uint256 pendingYield_,
            uint256 lastClaimedEpoch
        ) = shareToken.getUserPosition(user);
        
        position.farmId = farmId;
        position.userAddress = user;
        position.shareBalance = balance;
        position.pendingYield = pendingYield_;
        position.claimedYieldPerShare = lastClaimedEpoch;
        position.totalClaimedYield = 0; // Not tracked in new implementation
        position.shareValue = balance * _calculateSharePrice(farmId);
        position.yieldValue = pendingYield_;
    }
    
    /* ========== SHARE TOKEN GOVERNANCE ========== */
    
    /**
     * @dev Pause/unpause share token operations
     * @param farmId ID of the farm
     * @param paused Whether to pause the share token
     */
    function setShareTokenPauseStatus(
        uint256 farmId,
        bool paused
    ) external onlyVaultManager validFarm(farmId) {
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        if (paused) {
            shareToken.pause();
        } else {
            shareToken.unpause();
        }
        
        emit ShareTokenPauseStatusChanged(farmId, shareTokenAddress, paused);
    }
    
    /**
     * @dev Emergency mint tokens for a farm (admin only)
     * @param farmId ID of the farm
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function emergencyMint(
        uint256 farmId,
        address to,
        uint256 amount
    ) external onlyVaultManager validFarm(farmId) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be > 0");
        
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        shareToken.mint(to, amount);
        
        emit EmergencyMint(farmId, shareTokenAddress, to, amount);
    }
    
    /**
     * @dev Force burn tokens from an address (emergency only)
     * @param farmId ID of the farm
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function emergencyBurn(
        uint256 farmId,
        address from,
        uint256 amount
    ) external onlyVaultManager validFarm(farmId) {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be > 0");
        
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        // Check if we have approval or if it's the token owner
        require(
            shareToken.allowance(from, address(this)) >= amount ||
            from == address(this),
            "Insufficient allowance for emergency burn"
        );
        
        shareToken.burnFrom(from, amount);
        
        emit EmergencyBurn(farmId, shareTokenAddress, from, amount);
    }
    
    /* ========== SHARE TOKEN UTILITIES ========== */
    
    /**
     * @dev Bulk claim yield for multiple users
     * @param farmId ID of the farm
     * @param users Array of user addresses
     */
    function bulkClaimYield(
        uint256 farmId,
        address[] memory users
    ) external onlyVaultManager validFarm(farmId) {
        require(users.length > 0, "No users provided");
        require(users.length <= 100, "Too many users in bulk operation");
        
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        uint256 totalClaimed = 0;
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (user != address(0)) {
                uint256 claimed = shareToken.getPendingYield(user);
                if (claimed > 0) {
                    // Note: In practice, this would need proper implementation
                    // to actually transfer the yield tokens to users
                    totalClaimed += claimed;
                }
            }
        }
        
        emit BulkYieldClaimed(farmId, shareTokenAddress, users, totalClaimed);
    }
    
    /**
     * @dev Get share token holder count (approximation)
     * @param farmId ID of the farm
     */
    function getShareHolderCount(uint256 farmId) external view validFarm(farmId) returns (uint256) {
        // This is a simplified implementation
        // In practice, you'd track unique holders more efficiently
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        
        uint256 totalSupply = shareToken.totalSupply();
        return totalSupply > 0 ? 1 : 0; // Placeholder
    }
    
    /**
     * @dev Get top share holders (simplified implementation)
     * @param farmId ID of the farm
     * @param limit Maximum number of holders to return
     */
    function getTopShareHolders(
        uint256 farmId,
        uint256 limit
    ) external view validFarm(farmId) returns (
        address[] memory holders,
        uint256[] memory balances
    ) {
        // This is a placeholder implementation
        // In practice, you'd maintain a sorted list of holders
        holders = new address[](limit);
        balances = new uint256[](limit);
        
        // Return empty arrays for now
        return (holders, balances);
    }
    
    /* ========== INTERNAL HELPER FUNCTIONS ========== */
    
    /**
     * @dev Calculate current share price for a farm
     * @param farmId ID of the farm
     */
    function _calculateSharePrice(uint256 farmId) internal view returns (uint256) {
        // Get farm configuration from vault
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        
        address shareTokenAddress = s.farmShareTokens[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(shareTokenAddress));
        uint256 totalSupply = shareToken.totalSupply();
        
        if (totalSupply == 0) return 1e18; // Default price
        
        // Calculate share price based on underlying assets + accumulated yield
        uint256 baseValue = config.bondValue;
        uint256 accumulatedYield = s.farmTotalYield[farmId];
        uint256 totalValue = baseValue + accumulatedYield;
        
        return totalValue / totalSupply;
    }
    
    /**
     * @dev Calculate annualized yield APY for a farm
     * @param farmId ID of the farm
     */
    function _calculateYieldAPY(uint256 farmId) internal view returns (uint256) {
        // Get farm configuration
        MochaTreeRightsToken vault = MochaTreeRightsToken(s.mttrVault);
        MochaTreeRightsToken.FarmConfig memory config = vault.getFarmConfig(farmId);
        
        uint256 timeElapsed = block.timestamp - config.createdTimestamp;
        if (timeElapsed == 0) return 0;
        
        uint256 totalYield = s.farmTotalYield[farmId];
        uint256 initialValue = config.bondValue;
        
        if (initialValue == 0) return 0;
        
        // Calculate annualized yield
        uint256 yieldRatio = (totalYield * LibAppStorage.BPS_DENOMINATOR) / initialValue;
        uint256 annualizedYield = (yieldRatio * 365 days) / timeElapsed;
        
        return annualizedYield;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get all share tokens for farms
     */
    function getAllShareTokens() external view returns (
        uint256[] memory farmIds,
        address[] memory shareTokenAddresses
    ) {
        uint256 totalFarms = s.totalVaultFarms;
        farmIds = new uint256[](totalFarms);
        shareTokenAddresses = new address[](totalFarms);
        
        for (uint256 i = 0; i < totalFarms; i++) {
            farmIds[i] = i;
            shareTokenAddresses[i] = s.farmShareTokens[i];
        }
    }
    
    /**
     * @dev Check if a share token is registered
     * @param shareTokenAddress Address of the share token
     */
    function isShareTokenRegistered(address shareTokenAddress) external view returns (bool) {
        return s.shareTokenToFarm[shareTokenAddress] > 0;
    }
    
    /**
     * @dev Get farm ID from share token address
     * @param shareTokenAddress Address of the share token
     */
    function getFarmIdFromShareToken(address shareTokenAddress) external view returns (uint256) {
        return s.shareTokenToFarm[shareTokenAddress];
    }
    
    /**
     * @dev Get share token address from farm ID
     * @param farmId ID of the farm
     */
    function getShareTokenFromFarmId(uint256 farmId) external view returns (address) {
        return s.farmShareTokens[farmId];
    }
}