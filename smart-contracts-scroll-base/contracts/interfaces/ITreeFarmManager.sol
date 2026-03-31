// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../types/TreeTypes.sol";

/**
 * @title ITreeFarmManager
 * @dev Interface for the Tree Farm Manager contract
 * Defines the interface for managing farms in the TreeFarm ecosystem
 */
interface ITreeFarmManager {
    // Events
    event FarmAdded(
        uint256 indexed farmId,
        TreeTypes.FarmInfo farmInfo,
        string certifications,
        address indexed tokenBoundAccount,
        address indexed owner
    );

    // Farm Management Functions
    function addFarm(
        uint256 farmId,
        TreeTypes.FarmInfo memory farmInfo,
        string memory certifications,
        address tokenBoundAccount,
        address to
    ) external;

    // Farm Query Functions (optional - commonly needed)
    function getFarm(uint256 farmId) external view returns (
        TreeTypes.FarmInfo memory farmInfo,
        string memory certifications,
        address tokenBoundAccount,
        address owner,
        bool isActive
    );

    function farmExists(uint256 farmId) external view returns (bool);

    function getFarmOwner(uint256 farmId) external view returns (address);

    function getFarmCount() external view returns (uint256);
}