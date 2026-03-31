// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

//import "../types/TreeTypes.sol";

/**
 * @title ITreeManagementFacet
 * @dev Interface for tree management operations
 */
interface ITreeManagementFacet {
    // Events
    event TreeAdded(uint256 indexed farmId, uint256 indexed treeId);
    event TreesBatchAdded(uint256 indexed farmId, uint256 count);
    event TreeHealthUpdated(
        uint256 indexed farmId,
        uint256 indexed treeId,
        string status,
        uint256 timestamp
    );

    // Tree Management Functions
    /*   function addTree(
        uint256 farmId,
        TreeTypes.TreeInput calldata treeData
    ) external returns (bool, uint256);

    function batchAddTrees(
        uint256 farmId,
        TreeTypes.TreeInput[] calldata treesData
    ) external returns (bool, uint256); */

    function updateTreeHealth(
        uint256 farmId,
        uint256 treeId,
        string memory healthStatus
    ) external returns (bool, uint256);

    /*   function updateTreeMetadata(
        uint256 farmId,
        uint256 treeId,
        TreeTypes.TreeMetadata memory updatedMetadata
    ) external returns (bool);

    // View Functions
    function getTreeData(
        uint256 farmId,
        uint256 treeId
    ) external view returns (TreeTypes.TreeMetadata memory); */

    function isTreeEligibleForYield(
        uint256 farmId,
        uint256 treeId
    ) external view returns (bool);
}
