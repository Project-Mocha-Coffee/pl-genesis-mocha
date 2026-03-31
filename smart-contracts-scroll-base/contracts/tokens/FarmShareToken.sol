// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FarmShareToken
 * @dev Individual ERC20 token for each farm in the multi-tranche vault system
 * Each farm has its own share token (e.g., FarmA_ShareToken, FarmB_ShareToken)
 * These tokens represent ownership in specific farm bonds with independent yield distribution

 */
contract FarmShareToken is ERC20, ERC20Burnable, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /* ========== CONSTANTS ========== */
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");
    
    /* ========== STATE VARIABLES ========== */
    
    // Vault contract that manages this farm share token
    address public vaultContract;
    
    // Asset token (MBT) for yield distribution
    address public assetToken;
    
    // Native token wrapper for unwrapping native tokens
    address public nativeTokenWrapper;
    
    // Reward token balance tracking
    uint256 public rewardTokenBalance;
    
    // Farm information
    uint256 public farmId;
    string public farmName;
    
    // Tree information for this farm
    struct TreeInfo {
        uint256 treeCount;              // Number of trees (from MTT tokens)
        uint256[] treeIds;              // Array of tree IDs (from MTT subIds)
        uint256 lastTreeInfoUpdate;     // Last time tree info was updated
    }
    
    TreeInfo public treeInfo;
    
    // Yield tracking for this specific farm
    struct YieldInfo {
        uint256 totalYieldUnclaimed;     // Cumulative yield 
        uint256 lastYieldUpdate;        // Timestamp of last yield update
        uint256 totalYieldDistributed;  // Total yield distributed to date
        uint256 currentEpoch;           // Current epoch ID
    }
    
    YieldInfo public yieldInfo;

    // Supply caps
    uint256 public maxSupply;         // total cap in wei (trees * 1e18)
    uint256 public maxPerWallet;      // per-wallet cap in wei (default 20 * 1e18)
    
    // Track claimed yield per user per epoch
    mapping(address => mapping(uint256 => bool)) public userClaimedEpoch;
    mapping(address => uint256) public userLastClaimedEpoch;
    mapping(address => uint256) public pendingYield;
    
    /* ========== EVENTS ========== */
    
    event YieldUpdated(
        uint256 totalYieldUnclaimed,
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
    
    /* ========== CONSTRUCTOR ========== */
    
    /**
     * @dev Constructor for FarmShareToken
     * @param name Token name (e.g., "Farm A Highland Arabica Shares")
     * @param symbol Token symbol (e.g., "FARM-A")
     * @param vaultAddress Address of the main vault contract
     * @param assetTokenAddress Address of the asset token (MBT)
     */
    constructor(
        string memory name,
        string memory symbol,
        address vaultAddress,
        address assetTokenAddress
    ) ERC20(name, symbol) {
        require(vaultAddress != address(0), "Invalid vault address");
        require(assetTokenAddress != address(0), "Invalid asset token address");
        
        vaultContract = vaultAddress;
        assetToken = assetTokenAddress;
        
        // Grant roles to the vault contract
        _grantRole(DEFAULT_ADMIN_ROLE, vaultAddress);
        _grantRole(MINTER_ROLE, vaultAddress);
        _grantRole(PAUSER_ROLE, vaultAddress);
        _grantRole(VAULT_MANAGER_ROLE, vaultAddress);
        _grantRole(REWARD_MANAGER_ROLE, vaultAddress);
        
        // Initialize yield info
        yieldInfo = YieldInfo({
            totalYieldUnclaimed: 0,
            lastYieldUpdate: block.timestamp,
            totalYieldDistributed: 0,
            currentEpoch: 0
        });

        // Defaults; vault should explicitly set via setSupplyCaps
        maxSupply = type(uint256).max;
        maxPerWallet = 20 * 1e18;
    }
    
    /* ========== STAKING REWARDS FUNCTIONS ========== */
    
    /// @dev Lets the contract receive ether to unwrap native tokens.
    receive() external payable virtual {
        require(msg.sender == nativeTokenWrapper, "caller not native token wrapper.");
    }
    
   
    
    /// @dev Admin can withdraw excess reward tokens.
    function withdrawRewardTokens(uint256 _amount) external virtual nonReentrant {
        _withdrawRewardTokens(_amount); 
    }
    
    /// @notice View total rewards available in the staking contract.
    function getRewardTokenBalance() external view virtual returns (uint256) {
        uint256 balance = IERC20(assetToken).balanceOf(address(this));
        return balance;
    }
    

    
    /**
     * @dev Internal function to withdraw reward tokens in scenarios where reward is excess
     * @param _amount Amount of reward tokens to withdraw
     */
    function _withdrawRewardTokens(uint256 _amount) internal virtual {
        require(_amount > 0, "Amount must be > 0");
        require(_amount <= rewardTokenBalance, "Insufficient reward token balance");
        require(hasRole(REWARD_MANAGER_ROLE, msg.sender), "Caller not authorized");
        
        
        IERC20(assetToken).safeTransfer(msg.sender, _amount);
        
        emit RewardTokensWithdrawn(msg.sender, _amount, block.timestamp);
    }
    
    /**
     * @dev Set the native token wrapper address
     * @param _nativeTokenWrapper Address of the native token wrapper
     */
    function setNativeTokenWrapper(address _nativeTokenWrapper) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_nativeTokenWrapper != address(0), "Invalid wrapper address");
        address oldWrapper = nativeTokenWrapper;
        nativeTokenWrapper = _nativeTokenWrapper;
        
        emit NativeTokenWrapperUpdated(oldWrapper, _nativeTokenWrapper);
    }
    
    /* ========== MINTING AND BURNING ========== */
    
    /**
     * @dev Mint tokens to a user (only vault can call)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be > 0");
        // Enforce caps
        require(totalSupply() + amount <= maxSupply, "max supply exceeded");
        require(balanceOf(to) + amount <= maxPerWallet, "wallet cap exceeded");
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from a user
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public override whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
       
        
        super.burn(amount);
    }
    
    /**
     * @dev Burn tokens from a user (with allowance)
     * @param account Account to burn tokens from
     * @param amount Amount of tokens to burn
     * This needs to be called by the vault contract, not the user
     */
    function burnFrom(address account, uint256 amount) public override whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(account) >= amount, "Insufficient balance");
        
      
        
        super.burnFrom(account, amount);
    }
    
    /* ========== YIELD DISTRIBUTION ========== */
    
    /**
     * @dev Update yield to be distributed(unclaimed) (only vault can call)
     * @param additionalYield Additional yield to distribute
     */
    function updateTotalYieldUnclaimed(uint256 additionalYield) 
        external 
        onlyRole(VAULT_MANAGER_ROLE) 
    {
        require(additionalYield > 0, "Yield must be > 0");
        
        // Increment epoch when new yield is added
        yieldInfo.currentEpoch += 1;
        
        yieldInfo.totalYieldUnclaimed += additionalYield;
        yieldInfo.lastYieldUpdate = block.timestamp;
        yieldInfo.totalYieldDistributed += additionalYield;
        
        emit YieldUpdated(
            yieldInfo.totalYieldUnclaimed,
            additionalYield,
            block.timestamp
        );
    }
    
    
    
    /**
     * @dev Claim pending yield for the current epoch
     */
    function claimYield() external returns (uint256 yieldAmount) {
        return _claimYield(msg.sender);
    }
    
    /**
     * @dev Internal function to claim yield for the current epoch
     * @param user Address of the user
     */
    function _claimYield(address user) internal returns (uint256 yieldAmount) {
        uint256 currentEpoch = yieldInfo.currentEpoch;
        
        // Check if user has already claimed for this epoch
        if (userClaimedEpoch[user][currentEpoch]) {
            return 0;
        }
        
        uint256 userBalance = balanceOf(user);
        if (userBalance == 0) {
            return 0;
        }
        
        // Calculate yield for this epoch
        yieldAmount = userBalance * yieldInfo.totalYieldUnclaimed / totalSupply();
        
        if (yieldAmount > 0) {
            // Mark this epoch as claimed for the user
            userClaimedEpoch[user][currentEpoch] = true;
            userLastClaimedEpoch[user] = currentEpoch;
            
            // Transfer yield tokens to the user
            IERC20(assetToken).safeTransfer(user, yieldAmount);
            
            emit YieldClaimed(user, yieldAmount, block.timestamp);
        }
    }
    
    /**
     * @dev Get pending yield for a user for the current epoch
     * @param user Address of the user
     */
    function getPendingYield(address user) external view returns (uint256) {
        uint256 currentEpoch = yieldInfo.currentEpoch;
        uint256 userBalance = balanceOf(user);
        
        if (userBalance == 0 || userClaimedEpoch[user][currentEpoch]) {
            return 0;
        }
        
        return userBalance * yieldInfo.totalYieldUnclaimed / totalSupply();
    }
    
    /**
     * @dev Get the balance of asset tokens held by this contract
     */
    function getAssetBalance() external view returns (uint256) {
        return IERC20(assetToken).balanceOf(address(this));
    }
    
    /* ========== FARM INFORMATION ========== */
    
    /**
     * @dev Set farm information (only vault can call)
     * @param _farmId ID of the farm
     * @param _farmName Name of the farm
     */
    function setFarmInfo(uint256 _farmId, string memory _farmName) 
        external 
        onlyRole(VAULT_MANAGER_ROLE) 
    {
        farmId = _farmId;
        farmName = _farmName;
        
        emit FarmInfoUpdated(_farmId, _farmName);
    }
    
    /**
     * @dev Set tree information for this farm (only vault can call)
     * @param _treeCount Number of trees from MTT tokens
     * @param _treeIds Array of tree IDs from MTT tokens
     */
    function setTreeInfo(
        uint256 _treeCount,
        uint256[] memory _treeIds
    ) external onlyRole(VAULT_MANAGER_ROLE) {
        treeInfo.treeCount = _treeCount;
        treeInfo.treeIds = _treeIds;
        treeInfo.lastTreeInfoUpdate = block.timestamp;
        
        emit TreeInfoUpdated(farmId, _treeCount, block.timestamp);
    }

    /**
     * @dev Set supply caps for this farm's share token (only vault)
     * @param _maxSupply Total supply cap in wei (trees * 1e18)
     * @param _maxPerWallet Per-wallet cap in wei
     */
    function setSupplyCaps(uint256 _maxSupply, uint256 _maxPerWallet) external onlyRole(VAULT_MANAGER_ROLE) {
        require(_maxSupply > 0, "invalid maxSupply");
        require(_maxPerWallet > 0, "invalid maxPerWallet");
        maxSupply = _maxSupply;
        maxPerWallet = _maxPerWallet;
    }
    
    /**
     * @dev Update tree information (refresh from MTT tokens)
     * @param _treeCount Updated tree count
     * @param _treeIds Updated tree IDs array
     */
    function updateTreeInfo(
        uint256 _treeCount,
        uint256[] memory _treeIds
    ) external onlyRole(VAULT_MANAGER_ROLE) {
        treeInfo.treeCount = _treeCount;
        treeInfo.treeIds = _treeIds;
        treeInfo.lastTreeInfoUpdate = block.timestamp;
        
        emit TreeInfoUpdated(farmId, _treeCount, block.timestamp);
    }
    
    /**
     * @dev Get tree information for this farm
     */
    function getTreeInfo() external view returns (
        uint256 _treeCount,
        uint256[] memory _treeIds,
        uint256 _lastUpdate
    ) {
        return (
            treeInfo.treeCount,
            treeInfo.treeIds,
            treeInfo.lastTreeInfoUpdate
        );
    }
    
    /* ========== TRANSFER HOOKS ========== */
    
  //TODO: add a hook to update pending yield for both sender and receiver: there is a risk of double counting yield if the same user is both sender and receiver:
  //

    /**
     * @dev Hook that is called before any transfer of tokens
     * Transfers are disabled - farm share tokens are non-transferable
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        // Disable all transfers except minting and burning
        if (from != address(0) && to != address(0)) {
            revert("FarmShareToken: transfers disabled - use vault for bond management");
        }
        super._update(from, to, amount);
    }
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @dev Pause the contract (emergency only)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get comprehensive farm share token information
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
    ) {
        return (
            name(),
            symbol(),
            totalSupply(),
            farmId,
            farmName,
            vaultContract,
            yieldInfo.totalYieldUnclaimed,
            yieldInfo.totalYieldDistributed,
            yieldInfo.lastYieldUpdate
        );
    }
    
    /**
     * @dev Get user position information
     * @param user Address of the user
     */
    function getUserPosition(address user) external view returns (
        uint256 balance,
        uint256 pendingYield_,
        uint256 lastClaimedEpoch
    ) {
        uint256 userBalance = balanceOf(user);
        uint256 currentEpoch = yieldInfo.currentEpoch;
        
        // Calculate pending yield for current epoch
        uint256 pendingYieldAmount = 0;
        if (userBalance > 0 && !userClaimedEpoch[user][currentEpoch]) {
            pendingYieldAmount = userBalance * yieldInfo.totalYieldUnclaimed / totalSupply();
        }
        
        return (
            userBalance,
            pendingYieldAmount,
            userLastClaimedEpoch[user]
        );
    }
}