// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @title IFarmShareToken
 * @dev Interface for individual farm share tokens in the multi-tranche vault system
 * Each farm has its own share token representing ownership in specific farm bonds
 */
interface IFarmShareToken is IERC20, IAccessControl {
    
    /* ========== STRUCTS ========== */
    
    struct TreeInfo {
        uint256 treeCount;              // Number of trees (from MTT tokens)
        uint256[] treeIds;              // Array of tree IDs (from MTT subIds)
        uint256 lastTreeInfoUpdate;     // Last time tree info was updated
    }
    
    struct YieldInfo {
        uint256 totalYieldPerShare;     // Cumulative yield per share/bond unit
        uint256 lastYieldUpdate;        // Timestamp of last yield update
        uint256 totalYieldDistributed;  // Total yield distributed to date
        uint256 currentEpoch;           // Current epoch ID
    }
    
    /* ========== EVENTS ========== */
    
    event YieldUpdated(
        uint256 totalYieldPerShare,
        uint256 distributedAmount,
        uint256 timestamp
    );
    
    event YieldClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event FarmInfoUpdated(
        uint256 farmId,
        string farmName
    );
    
    event TreeInfoUpdated(
        uint256 farmId,
        uint256 treeCount,
        uint256 timestamp
    );
    
    event RewardTokensDeposited(
        address indexed depositor,
        uint256 amount,
        uint256 timestamp
    );
    
    event RewardTokensWithdrawn(
        address indexed withdrawer,
        uint256 amount,
        uint256 timestamp
    );
    
    event NativeTokenWrapperUpdated(
        address indexed oldWrapper,
        address indexed newWrapper
    );
    
    /* ========== STATE VARIABLES ========== */
    
    function vaultContract() external view returns (address);
    function assetToken() external view returns (address);
    function nativeTokenWrapper() external view returns (address);
    function rewardTokenBalance() external view returns (uint256);
    function farmId() external view returns (uint256);
    function farmName() external view returns (string memory);
    function treeInfo() external view returns (TreeInfo memory);
    function yieldInfo() external view returns (YieldInfo memory);
    
    /* ========== ROLE CONSTANTS ========== */
    
    function MINTER_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);
    function VAULT_MANAGER_ROLE() external view returns (bytes32);
    function REWARD_MANAGER_ROLE() external view returns (bytes32);
    
    /* ========== STAKING REWARDS FUNCTIONS ========== */
    
    /**
     * @dev Receive function for native token unwrapping
     */
    receive() external payable;
    
    /**
     * @dev Admin deposits reward tokens
     * @param _amount Amount of reward tokens to deposit
     */
    function depositRewardTokens(uint256 _amount) external payable;
    
    /**
     * @dev Admin can withdraw excess reward tokens
     * @param _amount Amount of reward tokens to withdraw
     */
    function withdrawRewardTokens(uint256 _amount) external;
    
    /**
     * @dev View total rewards available in the staking contract
     * @return Total reward token balance
     */
    function getRewardTokenBalance() external view returns (uint256);
    
    /**
     * @dev Set the native token wrapper address
     * @param _nativeTokenWrapper Address of the native token wrapper
     */
    function setNativeTokenWrapper(address _nativeTokenWrapper) external;
    
    /* ========== MINTING AND BURNING ========== */
    
    /**
     * @dev Mint tokens to a user (only vault can call)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;
    
    /**
     * @dev Burn tokens from a user
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external;
    
    /**
     * @dev Burn tokens from a user (with allowance)
     * @param account Account to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) external;
    
    /* ========== YIELD DISTRIBUTION ========== */
    
    /**
     * @dev Update yield per share (only vault can call)
     * @param additionalYieldPerShare Additional yield per share to distribute
     */
    function updateTotalYieldUnclaimed(uint256 additionalYieldPerShare) external;
    
    /**
     * @dev Claim pending yield
     * @return yieldAmount Amount of yield claimed
     */
    function claimYield() external returns (uint256 yieldAmount);
    
    /**
     * @dev Get pending yield for a user
     * @param user Address of the user
     * @return pendingYield Amount of pending yield
     */
    function getPendingYield(address user) external view returns (uint256);
    
    /**
     * @dev Get the balance of asset tokens held by this contract
     * @return Asset token balance
     */
    function getAssetBalance() external view returns (uint256);
    
    /* ========== FARM INFORMATION ========== */
    
    /**
     * @dev Set farm information (only vault can call)
     * @param _farmId ID of the farm
     * @param _farmName Name of the farm
     */
    function setFarmInfo(uint256 _farmId, string memory _farmName) external;
    
    /**
     * @dev Set tree information for this farm (only vault can call)
     * @param _treeCount Number of trees from MTT tokens
     * @param _treeIds Array of tree IDs from MTT tokens
     */
    function setTreeInfo(uint256 _treeCount, uint256[] memory _treeIds) external;
    
    /**
     * @dev Update tree information (refresh from MTT tokens)
     * @param _treeCount Updated tree count
     * @param _treeIds Updated tree IDs array
     */
    function updateTreeInfo(uint256 _treeCount, uint256[] memory _treeIds) external;
    
    /**
     * @dev Get tree information for this farm
     * @return _treeCount Number of trees
     * @return _treeIds Array of tree IDs
     * @return _lastUpdate Last update timestamp
     */
    function getTreeInfo() external view returns (
        uint256 _treeCount,
        uint256[] memory _treeIds,
        uint256 _lastUpdate
    );
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @dev Pause the contract (emergency only)
     */
    function pause() external;
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external;
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get comprehensive farm share token information
     * @return tokenName Token name
     * @return tokenSymbol Token symbol
     * @return totalSupply_ Total supply
     * @return farmId_ Farm ID
     * @return farmName_ Farm name
     * @return vaultContract_ Vault contract address
     * @return totalYieldUnclaimed_ Total yield unclaimed
     * @return totalYieldDistributed_ Total yield distributed
     * @return lastYieldUpdate_ Last yield update timestamp
     */
    function getTokenInfo() external view returns (
        string memory tokenName,
        string memory tokenSymbol,
        uint256 totalSupply_,
        uint256 farmId_,
        string memory farmName_,
        address vaultContract_,
        uint256 totalYieldUnclaimed_,
        uint256 totalYieldDistributed_,
        uint256 lastYieldUpdate_
    );
    
    /**
     * @dev Get user position information
     * @param user Address of the user
     * @return balance User's token balance
     * @return pendingYield_ User's pending yield for current epoch
     * @return lastClaimedEpoch User's last claimed epoch
     */
    function getUserPosition(address user) external view returns (
        uint256 balance,
        uint256 pendingYield_,
        uint256 lastClaimedEpoch
    );
} 