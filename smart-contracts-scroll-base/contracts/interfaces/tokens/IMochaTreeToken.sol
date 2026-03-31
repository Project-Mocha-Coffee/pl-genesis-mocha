// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title IMochaTreeToken
 * @dev Interface for the Mocha Tree Token (MTT)
 * Defines the external interface for tokenizing trees in the Mocha ecosystem
 */
interface IMochaTreeToken {
    // Events
    event TreeManagerUpdated(address indexed newTreeManager);

    // Core Management Functions
    function setTreeManagerAddress(address newAddress) external;

    // DLT Token Operations
    function thirdPartyApprove(
        address owner,
        address spender,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external;

    function transfer(
        address sender,
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external;

    function allow(
        address sender,
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external;

    function mint(
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external;

    function burn(
        address account,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external;
}