// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MochaBeanToken
 * @dev Implementation of the Mocha Bean Token (MBT)
 * A liquidity token for bond investments and yield distribution in the tokenized coffee ecosystem
 * 
 * INTEGRATION WITH DIAMOND PATTERN:
 * - Role-based access control for Diamond facets
 * - Vault integration for bond investments
 * - Yield distribution to farm share token holders
 * - Diamond management functions
 */
contract MochaBeanToken is ERC20, AccessControl, Pausable, ERC20Burnable, ReentrancyGuard {
    
    /* ========== CONSTANTS ========== */
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant YIELD_DISTRIBUTOR_ROLE = keccak256("YIELD_DISTRIBUTOR_ROLE");
    
    /* ========== STATE VARIABLES ========== */
    
    string public description;
    string public externalUrl;
    address public diamondContract;
    
    // Yield distribution tracking
    uint256 public totalYieldDistributed;
    uint256 public totalYieldMinted;
    mapping(address => uint256) public userYieldReceived;
    
    // Bond investment tracking
    uint256 public totalBondInvestments;
    mapping(address => uint256) public userBondInvestments;
    
    /* ========== EVENTS ========== */
    
    event DiamondContractUpdated(address indexed oldDiamond, address indexed newDiamond);
    event YieldDistributed(address indexed recipient, uint256 amount, uint256 timestamp);
    event BondInvestment(address indexed investor, uint256 amount, uint256 timestamp);
    event YieldMinted(address indexed recipient, uint256 amount, uint256 timestamp);
    
    /* ========== CONSTRUCTOR ========== */
    
    constructor() ERC20("Mocha Bean Token", "MBT") {
        description = "MBT is a blockchain-based liquidity token used for bond investments, trading, and yield incentives in the tokenized coffee ecosystem.";
        externalUrl = "https://projectmocha.com";
        
        // Grant roles to deployer initially
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(VAULT_MANAGER_ROLE, msg.sender);
        _grantRole(YIELD_DISTRIBUTOR_ROLE, msg.sender);
    }
    
    /* ========== DIAMOND INTEGRATION ========== */
    
    /**
     * @dev Set the Diamond contract address
     * @param _diamondContract New Diamond contract address
     */
    function setDiamondContract(address _diamondContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_diamondContract != address(0), "Invalid Diamond address");
        address oldDiamond = diamondContract;
        diamondContract = _diamondContract;
        
        // Grant roles to Diamond contract
        _grantRole(MINTER_ROLE, _diamondContract);
        _grantRole(BURNER_ROLE, _diamondContract);
        _grantRole(VAULT_MANAGER_ROLE, _diamondContract);
        _grantRole(YIELD_DISTRIBUTOR_ROLE, _diamondContract);
        
        emit DiamondContractUpdated(oldDiamond, _diamondContract);
    }
    
    /**
     * @dev Update description and external URL
     * @param _description New description
     * @param _externalUrl New external URL
     */
    function updateMetadata(string memory _description, string memory _externalUrl) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        description = _description;
        externalUrl = _externalUrl;
    }
    
    /* ========== MINTING AND BURNING ========== */
    
    /**
     * @dev Mint tokens to an address (only authorized roles)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be > 0");
        
        _mint(to, amount);
    }
    
    /**
     * @dev Mint yield tokens to a recipient: to be called externally by the yield distributor e.g oracle
     * @param recipient Address to mint yield tokens to
     * @param amount Amount of yield tokens to mint
     */
    function mintYield(address recipient, uint256 amount) 
        external 
        onlyRole(YIELD_DISTRIBUTOR_ROLE) 
        whenNotPaused 
        nonReentrant 
    {
        require(recipient != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be > 0");
        
        _mint(recipient, amount);
        
        // Update yield tracking
        totalYieldMinted += amount;
        userYieldReceived[recipient] += amount;
        
        emit YieldMinted(recipient, amount, block.timestamp);
    }
    
    /**
     * @dev Burn tokens from an address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) whenNotPaused {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
    }
    
    /**
     * @dev Burn tokens from caller
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public override whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance to burn");
        
        _burn(msg.sender, amount);
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
    
    /* ========== TRANSFER FUNCTIONS ========== */
    
    /**
     * @dev Transfer tokens to another address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) 
        public 
        virtual 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Transfer tokens from one address to another
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        virtual 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Approve spender to spend tokens
     * @param spender Address to approve
     * @param amount Amount to approve
     */
    function approve(address spender, uint256 amount) 
        public 
        virtual 
        override 
        returns (bool) 
    {
        address owner = _msgSender();
        _approve(owner, spender, amount);
        emit Approval(owner, spender, amount);
        return true;
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get comprehensive token information
     * @return tokenName Token name
     * @return tokenSymbol Token symbol
     * @return totalSupply_ Total supply
     * @return description_ Token description
     * @return externalUrl_ External URL
     * @return diamondContract_ Diamond contract address
     * @return totalYieldDistributed_ Total yield distributed
     * @return totalYieldMinted_ Total yield minted
    
     */
    function getTokenInfo() external view returns (
        string memory tokenName,
        string memory tokenSymbol,
        uint256 totalSupply_,
        string memory description_,
        string memory externalUrl_,
        address diamondContract_,
        uint256 totalYieldDistributed_,
        uint256 totalYieldMinted_
    ) {
        return (
            name(),
            symbol(),
            totalSupply(),
            description,
            externalUrl,
            diamondContract,
            totalYieldDistributed,
            totalYieldMinted
        );
    }
    
 
    
    
}
