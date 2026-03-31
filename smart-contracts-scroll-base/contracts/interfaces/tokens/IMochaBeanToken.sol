// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IMochaBeanToken
 * @dev Interface for the Mocha Bean Token (MBT)
 * A liquidity token for the tokenized coffee ecosystem
 */
interface IMochaBeanToken is IERC20 {
    
    /* ========== EVENTS ========== */
    
    event TreeContractUpdated(address indexed oldContract, address indexed newContract);
    
    /* ========== STATE VARIABLES ========== */
    
    function description() external view returns (string memory);
    function externalUrl() external view returns (string memory);
    function treeContract() external view returns (address);
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @dev Set the tree contract address
     * @param _treeContract New tree contract address
     */
    function setTreeContract(address _treeContract) external;
    
    /**
     * @dev Pause the contract
     */
    function pause() external;
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external;
    
    /* ========== MINTING AND BURNING ========== */
    
    /**
     * @dev Mint tokens to an address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;
    
    /**
     * @dev Burn tokens from an address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external;
    
    /* ========== TRANSFER FUNCTIONS ========== */
    
    /**
     * @dev Transfer tokens to another address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) external returns (bool);
    
    /**
     * @dev Transfer tokens from one address to another
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    
    /**
     * @dev Approve spender to spend tokens
     * @param spender Address to approve
     * @param amount Amount to approve
     */
    function approve(address spender, uint256 amount) external returns (bool);
} 