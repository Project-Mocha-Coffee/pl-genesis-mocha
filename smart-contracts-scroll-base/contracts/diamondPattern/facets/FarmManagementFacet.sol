// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IFarmManagementFacet.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibAccess.sol";
import "../libraries/LibDiamond.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title FarmManagementFacet
 * @dev Manages farm-level operations integrated with MochaLandToken (MLT)
 * Implements ITreeFarmManager to bridge MLT tokens with Diamond storage
 * 
 * ARCHITECTURE:
 * - Farms are represented as MLT (ERC721) tokens
 * - This facet acts as the bridge between MLT and Diamond storage
 * - Farm operations validate MLT token ownership
 * - Trees are owned by farm's token-bound account (hierarchical ownership)
 */
contract FarmManagementFacet is IFarmManagementFacet {
    // Application storage with shared state across facets
    LibAppStorage.AppStorage internal s;

    /* ========== MLT TOKEN VALIDATION ========== */

    /**
     * @dev Validates that a farm exists as an MLT token
     */
    modifier farmTokenExists(uint256 farmId) {
        require(s.MLTToken != address(0), "MLT token not initialized");
        require(farmId > 0, "Invalid farm ID");
        // Check if the MLT token exists
        try IERC721(s.MLTToken).ownerOf(farmId) returns (address) {
            // Token exists
        } catch {
            revert("Farm does not exist as MLT token");
        }
        _;
    }

    /**
     * @dev Gets the owner of a farm MLT token
     */
    function _getFarmOwner(uint256 farmId) internal view returns (address) {
        require(s.MLTToken != address(0), "MLT token not initialized");
        return IERC721(s.MLTToken).ownerOf(farmId);
    }

    /* ========== ITREEFARMMANAGER IMPLEMENTATION ========== */

    /**
     * @dev Called by MochaLandToken when a new farm token is minted
     * Bridges MLT token data to Diamond storage
     */
    function addFarm(
        uint256 farmId,
        TreeTypes.FarmInfo memory farmInfo,
        string memory certifications,
        address tokenBoundAccount,
        address to
    ) external override {
        // Only MLT token can call this function
        require(msg.sender == s.MLTToken, "Only MLT token can add farms");
        require(s.farmsMetadata[farmId].farmId == 0, "Farm already exists in storage");

        // Create farm metadata in Diamond storage
        s.farmsMetadata[farmId] = TreeTypes.FarmMetadata({
            farmId: farmId,
            treeCount: 0,
            isActive: true,
            treeIds: new uint256[](0),
            farmWalletAddress: tokenBoundAccount, // Use token-bound account as farm wallet
            farmManager: to, // Initial farm manager is the MLT token recipient
            treePrice: 100 * TreeTypes.DECIMAL_POINTS,
            nextTreeId: 1,
            lastYieldAmount: 0,
            lastYieldTimestamp: 0,
            totalLifetimeYield: 0,
            activeTreeCount: 0,
            farmInfo: farmInfo,
            establishedDate: block.timestamp,
            certifications: certifications
        });

        s.activeFarmIds.push(farmId);
        
        emit FarmAdded(farmId, farmInfo, certifications, tokenBoundAccount, to);
    }

    /**
     * @dev Check if a farm exists in both MLT token and Diamond storage
     */
    function farmExists(uint256 farmId) external view override returns (bool) {
        if (s.MLTToken == address(0)) return false;
        
        try IERC721(s.MLTToken).ownerOf(farmId) returns (address) {
            return s.farmsMetadata[farmId].isActive;
        } catch {
            return false;
        }
    }

    /**
     * @dev Get farm information combining MLT and Diamond storage
     */
    function getFarm(uint256 farmId) external view override farmTokenExists(farmId) returns (
        TreeTypes.FarmInfo memory farmInfo,
        string memory certifications,
        address tokenBoundAccount,
        address owner,
        bool isActive
    ) {
        TreeTypes.FarmMetadata memory metadata = s.farmsMetadata[farmId];
        return (
            metadata.farmInfo,
            metadata.certifications,
            metadata.farmWalletAddress,
            _getFarmOwner(farmId),
            metadata.isActive
        );
    }

    /**
     * @dev Get the owner of a farm (MLT token holder)
     */
    function getFarmOwner(uint256 farmId) external view override farmTokenExists(farmId) returns (address) {
        return _getFarmOwner(farmId);
    }

    /**
     * @dev Get total number of active farms
     */
    function getFarmCount() external view override returns (uint256) {
        return s.activeFarmIds.length;
    }

    /* ========== EXISTING FARM MANAGEMENT (UPDATED WITH MLT VALIDATION) ========== */

    function setFarmManager(
        address manager,
        bool status,
        uint256 farmId
    ) external override farmTokenExists(farmId) {
        LibAccess.enforceIsFactoryOrAdmin();
        require(manager != address(0), "Invalid address");
        require(s.farmsMetadata[farmId].isActive, "Farm is not active");

        s.farmsMetadata[farmId].farmManager = status ? manager : address(0);

        emit FarmManagerSet(manager, status, farmId);
    }

    function setFarmOperator(
        address operator,
        bool status,
        uint256 farmId
    ) external override farmTokenExists(farmId) {
        LibAccess.enforceIsFactoryOrAdmin();
        require(operator != address(0), "Invalid address");
        require(s.farmsMetadata[farmId].isActive, "Farm is not active");

        s.authorizedFarmsOperators[farmId][operator] = status;

        emit FarmOperatorSet(operator, status, farmId);
    }

    function setFarmWalletAddress(
        address wallet,
        uint256 farmId
    ) external override farmTokenExists(farmId) {
        LibAccess.enforceIsFactoryOrAdmin();
        require(wallet != address(0), "Invalid wallet address");
        require(s.farmsMetadata[farmId].isActive, "Farm is not active");

        s.farmsMetadata[farmId].farmWalletAddress = wallet;
        emit FarmMetadataUpdated(farmId);
    }

    function setFarmTreePrice(
        uint256 farmId,
        uint256 pricePerShare
    ) external override farmTokenExists(farmId) {
        LibAccess.enforceIsFactoryOrAdmin();
        require(pricePerShare > 0, "Price must be greater than 0");
        require(s.farmsMetadata[farmId].isActive, "Farm is not active");

        s.farmsMetadata[farmId].treePrice = pricePerShare;
        emit FarmPriceSet(farmId, pricePerShare);
    }

    /* ========== REMOVED DUPLICATE addFarm FUNCTION ========== */
    // Farm creation is now handled by ITreeFarmManager.addFarm() above
    // which is called by MochaLandToken when new farm tokens are minted

    function isFarmManagerOrOperator(
        address account,
        uint256 farmId
    ) external view override returns (bool) {
        // Skip MLT validation for efficiency in access control checks
        // This function is used internally and farmId validity is typically already confirmed
        return
            account == s.farmsMetadata[farmId].farmManager ||
            s.authorizedFarmsOperators[farmId][account] ||
            LibAccess.hasRole(LibAccess.ADMIN_ROLE, account) ||
            account == LibDiamond.contractOwner();
    }

    function updateFarmMetadata(
        uint256 farmId,
        TreeTypes.FarmMetadata memory updatedMetadata
    ) external farmTokenExists(farmId) returns (bool) {
        // Require the caller to be authorized
        require(
            LibAccess.hasRole(LibAccess.ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "Caller not authorized to update farm metadata"
        );

        // Ensure farm ID remains the same
        require(updatedMetadata.farmId == farmId, "Farm ID mismatch");

        // Preserve certain administrator-only fields
        address currentWallet = s.farmsMetadata[farmId].farmWalletAddress;
        address currentManager = s.farmsMetadata[farmId].farmManager;

        // Update the farm metadata
        s.farmsMetadata[farmId] = updatedMetadata;

        // Restore administrator-only fields if the caller is not admin
        if (
            !LibAccess.hasRole(LibAccess.ADMIN_ROLE, msg.sender) &&
            msg.sender != LibDiamond.contractOwner()
        ) {
            s.farmsMetadata[farmId].farmWalletAddress = currentWallet;
            s.farmsMetadata[farmId].farmManager = currentManager;
        }

        emit FarmMetadataUpdated(farmId);
        return true;
    }

    // View Functions for farms
    function getActiveFarms()
        external
        view
        returns (TreeTypes.FarmMetadata[] memory)
    {
        uint256 activeCount = s.activeFarmIds.length;
        TreeTypes.FarmMetadata[]
            memory activeFarms = new TreeTypes.FarmMetadata[](activeCount);

        for (uint256 i = 0; i < activeCount; i++) {
            activeFarms[i] = s.farmsMetadata[s.activeFarmIds[i]];
        }

        return activeFarms;
    }

    function getFarmWalletAddress(
        address farmerAddress
    ) external view override returns (address) {
        for (uint256 i = 0; i < s.activeFarmIds.length; i++) {
            uint256 farmId = s.activeFarmIds[i];
            if (s.farmsMetadata[farmId].farmManager == farmerAddress) {
                return s.farmsMetadata[farmId].farmWalletAddress;
            }
        }

        revert("Farmer does not own a farm");
    }

    function getFarmInfo(
        uint256 farmId
    ) external view farmTokenExists(farmId) returns (TreeTypes.FarmMetadata memory) {
        require(s.farmsMetadata[farmId].isActive, "Farm is not active");
        return s.farmsMetadata[farmId];
    }

    function getFarmIdOwner(
        uint256 farmId
    ) external view override farmTokenExists(farmId) returns (address) {
        require(
            s.farmsMetadata[farmId].farmWalletAddress != address(0),
            "Farm wallet not initialized"
        );
        return s.farmsMetadata[farmId].farmWalletAddress;
    }
}
