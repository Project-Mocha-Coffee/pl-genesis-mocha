// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../types/TreeTypes.sol";
import "../../interfaces/ITreeFarmManager.sol";

/**
 * @title IFarmManagementFacet
 * @dev Interface for farm management operations integrated with MochaLandToken (MLT)
 * Implements ITreeFarmManager to bridge MLT tokens with Diamond storage
 */
interface IFarmManagementFacet is ITreeFarmManager {
    // Events
    event FarmAdded(uint256 indexed farmId);
    event FarmManagerSet(
        address indexed manager,
        bool status,
        uint256 indexed farmId
    );
    event FarmOperatorSet(
        address indexed operator,
        bool status,
        uint256 indexed farmId
    );
    event FarmMetadataUpdated(uint256 indexed farmId);
    event FarmPriceSet(uint256 indexed farmId, uint256 price);

    // Farm Management Functions
    function setFarmManager(
        address manager,
        bool status,
        uint256 farmId
    ) external;

    function setFarmOperator(
        address operator,
        bool status,
        uint256 farmId
    ) external;

    function setFarmWalletAddress(address wallet, uint256 farmId) external;

    function setFarmTreePrice(uint256 farmId, uint256 pricePerShare) external;

    /*   function addFarm(
        uint256 farmId,
        TreeTypes.FarmInfo memory farmInfo,
        string memory certifications,
        address farmWalletAddress,
        address farmOwner
    ) external returns (uint256);

    function updateFarmMetadata(
        uint256 farmId,
        TreeTypes.FarmMetadata memory updatedMetadata
    ) external returns (bool); */

    // View Functions
    /*  function getActiveFarms()
        external
        view
        returns (TreeTypes.FarmMetadata[] memory);

    function getFarmInfo(
        uint256 farmId
    ) external view returns (TreeTypes.FarmMetadata memory);
 */
    function getFarmWalletAddress(
        address farmerAddress
    ) external view returns (address);

    function getFarmIdOwner(uint256 farmId) external view returns (address);

    function isFarmManagerOrOperator(
        address account,
        uint256 farmId
    ) external view returns (bool);
}
