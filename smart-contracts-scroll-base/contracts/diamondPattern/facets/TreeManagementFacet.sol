// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ITreeManagementFacet.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibAccess.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title TreeManagementFacet
 * @dev Manages tree-level operations with MLT token integration
 * Validates farm ownership through MochaLandToken (MLT) before tree operations
 * Implements hierarchical ownership: Farm (MLT) → Trees (MTT)
 */
contract TreeManagementFacet is ITreeManagementFacet {
    // Application storage with shared state across facets
    LibAppStorage.AppStorage internal s;

    /* ========== MLT TOKEN VALIDATION ========== */

    /**
     * @dev Validates that a farm exists as an MLT token and is active in Diamond storage
     */
    modifier validFarm(uint256 farmId) {
        require(s.MLTToken != address(0), "MLT token not initialized");
        require(farmId > 0, "Invalid farm ID");
        
        // Check if the MLT token exists
        try IERC721(s.MLTToken).ownerOf(farmId) returns (address) {
            // Token exists, now check Diamond storage
            require(s.farmsMetadata[farmId].isActive, "Farm is not active in Diamond storage");
        } catch {
            revert("Farm does not exist as MLT token");
        }
        _;
    }

    /**
     * @dev Gets the owner of a farm MLT token (used for hierarchical ownership)
     */
    function _getFarmOwner(uint256 farmId) internal view returns (address) {
        require(s.MLTToken != address(0), "MLT token not initialized");
        return IERC721(s.MLTToken).ownerOf(farmId);
    }

    /**
     * @dev Gets the farm's token-bound account address (where trees should be minted)
     */
    function _getFarmTokenBoundAccount(uint256 farmId) internal view returns (address) {
        return s.farmsMetadata[farmId].farmWalletAddress;
    }

    /* ========== TREE MANAGEMENT FUNCTIONS (UPDATED WITH MLT VALIDATION) ========== */

    function addTree(
        uint256 farmId,
        TreeTypes.TreeInput calldata treeData
    ) external validFarm(farmId) returns (bool, uint256) {
        LibAccess.enforceIsFactoryOrAdmin();

        uint256 treeId = s.farmsMetadata[farmId].nextTreeId;

        // Increment the nextTreeId in farm metadata
        s.farmsMetadata[farmId].nextTreeId++;

        TreeTypes.LocationMetadata memory location = TreeTypes
            .LocationMetadata({
                pointName: treeData.pointName,
                coordinates: TreeTypes.GeoPoint({
                    latitude: treeData.latitude,
                    longitude: treeData.longitude,
                    altitude: treeData.altitude
                }),
                timestamp: block.timestamp,
                accuracy: treeData.accuracy,
                satelliteCount: treeData.satelliteCount,
                pdop: treeData.pdop,
                baseStationId: treeData.baseStationId
            });

        s.treeMetadata[farmId][treeId] = TreeTypes.TreeMetadata({
            species: treeData.species,
            location: location,
            plantingDate: treeData.plantingDate,
            healthStatus: "Healthy",
            lastYield: 0,
            lastUpdateTimestamp: block.timestamp
        });

        // Update farm metadata
        if (s.farmsMetadata[farmId].treeIds.length <= treeId) {
            // Resize the array if needed
            uint256[] memory newTreeIds = new uint256[](treeId + 1);
            for (
                uint256 i = 0;
                i < s.farmsMetadata[farmId].treeIds.length;
                i++
            ) {
                newTreeIds[i] = s.farmsMetadata[farmId].treeIds[i];
            }
            s.farmsMetadata[farmId].treeIds = newTreeIds;
        }

        s.farmsMetadata[farmId].treeIds[treeId] = treeId;
        s.farmsMetadata[farmId].treeCount++;
        s.farmsMetadata[farmId].activeTreeCount++;

        s.isTreeStakeable[farmId][treeId] = true;

        // Hierarchical Ownership: Mint MTT tokens to farm's token-bound account
        // This establishes Farm (MLT) → Trees (MTT) ownership hierarchy
        address farmTokenBoundAccount = _getFarmTokenBoundAccount(farmId);
        require(farmTokenBoundAccount != address(0), "Farm token-bound account not set");

        (bool mintSuccess, ) = s.MTTToken.call(
            abi.encodeWithSignature(
                "mint(address,uint256,uint256,uint256)",
                farmTokenBoundAccount, // Trees owned by farm's token-bound account
                farmId,                // mainId = farmId (hierarchical structure)
                treeId,               // subId = treeId 
                TreeTypes.SHARES_PER_TREE
            )
        );
        require(mintSuccess, "MTT mint failed - hierarchical ownership not established");

        // Tree collateral is now managed by the Multi-Tranche Vault System
        // MTT tokens represent tree ownership and are automatically included in vault collateral calculations
        // No additional approvals needed - vault system handles collateral management directly

        emit TreeAdded(farmId, treeId);
        return (true, treeId);
    }

    function batchAddTrees(
        uint256 farmId,
        TreeTypes.TreeInput[] calldata treesData
    ) external validFarm(farmId) returns (bool, uint256) {
        LibAccess.enforceIsFactoryOrAdmin();
        require(treesData.length > 0, "No trees provided");

        // Resize the treeIds array if needed
        uint256 nextTreeId = s.farmsMetadata[farmId].nextTreeId;
        uint256 endTreeId = nextTreeId + treesData.length - 1;

        if (s.farmsMetadata[farmId].treeIds.length <= endTreeId) {
            uint256[] memory newTreeIds = new uint256[](endTreeId + 1);
            for (
                uint256 i = 0;
                i < s.farmsMetadata[farmId].treeIds.length;
                i++
            ) {
                newTreeIds[i] = s.farmsMetadata[farmId].treeIds[i];
            }
            s.farmsMetadata[farmId].treeIds = newTreeIds;
        }

        for (uint256 i = 0; i < treesData.length; i++) {
            uint256 treeId = nextTreeId + i;

            TreeTypes.LocationMetadata memory location = TreeTypes
                .LocationMetadata({
                    pointName: treesData[i].pointName,
                    coordinates: TreeTypes.GeoPoint({
                        latitude: treesData[i].latitude,
                        longitude: treesData[i].longitude,
                        altitude: treesData[i].altitude
                    }),
                    timestamp: block.timestamp,
                    accuracy: treesData[i].accuracy,
                    satelliteCount: treesData[i].satelliteCount,
                    pdop: treesData[i].pdop,
                    baseStationId: treesData[i].baseStationId
                });

            s.treeMetadata[farmId][treeId] = TreeTypes.TreeMetadata({
                species: treesData[i].species,
                location: location,
                plantingDate: treesData[i].plantingDate,
                healthStatus: "Healthy",
                lastYield: 0,
                lastUpdateTimestamp: block.timestamp
            });

            // Update farm metadata
            s.farmsMetadata[farmId].treeIds[treeId] = treeId;
            s.isTreeStakeable[farmId][treeId] = true;

            // Using low-level call for mint instead of direct call
            (bool mintSuccess, ) = s.MTTToken.call(
                abi.encodeWithSignature(
                    "mint(address,uint256,uint256,uint256)",
                    s.farmsMetadata[farmId].farmWalletAddress,
                    farmId,
                    treeId,
                    TreeTypes.SHARES_PER_TREE
                )
            );
            require(mintSuccess, "MTT mint failed");

            // Tree collateral is now managed by the Multi-Tranche Vault System
            // MTT tokens represent tree ownership and are automatically included in vault collateral calculations
            // No additional approvals needed - vault system handles collateral management directly

            emit TreeAdded(farmId, treeId);
        }

        // Update total tree counts
        s.farmsMetadata[farmId].nextTreeId = endTreeId + 1;
        s.farmsMetadata[farmId].treeCount += treesData.length;
        s.farmsMetadata[farmId].activeTreeCount += treesData.length;

        emit TreesBatchAdded(farmId, treesData.length);
        return (true, treesData.length);
    }

    function updateTreeHealth(
        uint256 farmId,
        uint256 treeId,
        string memory healthStatus
    ) external override validFarm(farmId) returns (bool, uint256) {
        LibAccess.enforceIsFactoryOrAdmin();
        require(
            s.treeMetadata[farmId][treeId].plantingDate != 0,
            "Tree does not exist"
        );
        require(
            bytes(healthStatus).length > 0,
            "Health status cannot be empty"
        );

        TreeTypes.TreeMetadata storage tree = s.treeMetadata[farmId][treeId];
        bool wasCritical = keccak256(bytes(tree.healthStatus)) ==
            keccak256(bytes("Critical"));
        bool isCritical = keccak256(bytes(healthStatus)) ==
            keccak256(bytes("Critical"));

        tree.healthStatus = healthStatus;
        tree.lastUpdateTimestamp = block.timestamp;

        if (!wasCritical && isCritical) {
            s.isTreeStakeable[farmId][treeId] = false;
            s.farmsMetadata[farmId].activeTreeCount--;
        } else if (wasCritical && !isCritical) {
            s.isTreeStakeable[farmId][treeId] = true;
            s.farmsMetadata[farmId].activeTreeCount++;
        }

        emit TreeHealthUpdated(farmId, treeId, healthStatus, block.timestamp);
        return (true, block.timestamp);
    }

    function getTreeData(
        uint256 farmId,
        uint256 treeId
    ) external view validFarm(farmId) returns (TreeTypes.TreeMetadata memory) {
        require(
            s.treeMetadata[farmId][treeId].plantingDate != 0,
            "Tree does not exist"
        );
        return s.treeMetadata[farmId][treeId];
    }

    function isTreeEligibleForYield(
        uint256 farmId,
        uint256 treeId
    ) external view override returns (bool) {
        return
            s.isTreeStakeable[farmId][treeId] &&
            keccak256(bytes(s.treeMetadata[farmId][treeId].healthStatus)) !=
            keccak256(bytes("Critical"));
    }

    // Function to update tree metadata (called by YieldManagement through factory)
    function updateTreeMetadata(
        uint256 farmId,
        uint256 treeId,
        TreeTypes.TreeMetadata memory updatedMetadata
    ) external validFarm(farmId) returns (bool) {
        // Only allow calls from authorized roles
        LibAccess.enforceIsFactoryOrAdmin();

        // Ensure basic validation
        require(
            bytes(updatedMetadata.species).length > 0,
            "Species cannot be empty"
        );

        // Update the tree metadata
        s.treeMetadata[farmId][treeId] = updatedMetadata;
        return true;
    }
}
