// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "../interfaces/ITreeFarmManager.sol";
import "../types/TreeTypes.sol";

contract MochaLandToken is ERC721URIStorage, Ownable {
    using Strings for uint256;
    //need to create struct for gps coordinates,

    struct LandMetadata {
        string name;
        string description;
        // Include FarmInfo from TreeTypes
        TreeTypes.FarmInfo farmInfo;
        // Keep imageURI and externalURL
        string imageURI;
        string externalURL;
    }

    // Input struct to reduce local variables
    struct MetadataInput {
        string name;
        string description;
        string farmName;
        string location;
        int256 latitude;
        int256 longitude;
        uint256 altitude;
        string area;
        string soilType;
        string ownership;
        string waterSource;
        uint256 yieldPotential;
        uint256 lastSurveyDate;
        string imageURI;
        string externalURL;
    }

    // Updated event for metadata updates to include FarmInfo fields
    event MetadataUpdated(
        uint256 indexed tokenId,
        string name,
        string description,
        TreeTypes.FarmInfo farmInfo,
        string imageURI,
        string externalURL
    );

    event tokenCreated(
        uint256 indexed tokenId,
        LandMetadata metadata,
        address tokenBoundAccount
    );

    // Mapping from token ID to land metadata
    mapping(uint256 => LandMetadata) public landMetadata;

    // Registry address for ERC-6551
    address public immutable registry;

    // Implementation address for token bound accounts
    address public immutable implementation;

    //address of Farm Manager Address
    address public farmManager = address(0);

    // Counter state variables
    uint256 public nextFarmId = 1;

    constructor(
        address _registry,
        address _implementation
    ) ERC721("Mocha Land Token", "MLT") Ownable(msg.sender) {
        registry = _registry;
        implementation = _implementation;
    }

    //set address of Tree Manager Contract implementation
    function setFarmManagerAddress(
        address farmManagerAddress
    ) public onlyOwner {
        farmManager = farmManagerAddress;
    }

    //adds farm to registry
    function mint(
        address to,
        LandMetadata memory metadata,
        string memory certifications
    ) public onlyOwner returns (uint256) {
        require(farmManager != address(0), "MTT Token Address not set");
        _mint(to, nextFarmId);

        landMetadata[nextFarmId] = metadata;

        // Generate and set token URI
        string memory tokenURI = generateTokenURI(nextFarmId);
        _setTokenURI(nextFarmId, tokenURI);

        // Create token bound account through ERC-6551 registry
        bytes32 salt = bytes32(0); // Use bytes32(0) instead of uint256(0)
        (bool success, bytes memory returnData) = registry.call(
            abi.encodeWithSignature(
                "createAccount(address,bytes32,uint256,address,uint256)",
                implementation, // implementation address
                salt, // salt (bytes32)
                block.chainid, // chainId
                address(this), // tokenContract
                nextFarmId // tokenId
            )
        );
        require(success, "Failed to create token bound account");

        // Decode the returned address
        address tokenBoundAccount = abi.decode(returnData, (address));

        //add farm in tree manager contract
        ITreeFarmManager(farmManager).addFarm(
            nextFarmId,
            metadata.farmInfo,
            certifications,
            tokenBoundAccount,
            to
        );

        //emit token created event
        emit tokenCreated(nextFarmId, metadata, tokenBoundAccount);

        nextFarmId++;

        return (nextFarmId);
    }

    function generateTokenURI(
        uint256 tokenId
    ) internal view returns (string memory) {
        LandMetadata memory metadata = landMetadata[tokenId];

        bytes memory dataURI = abi.encodePacked(
            "{",
            '"name": "',
            metadata.name,
            '",',
            '"description": "',
            metadata.description,
            '",',
            '"image": "',
            metadata.imageURI,
            '",',
            /*   '"attributes": [',
                  '{"trait_type": "Farm Name", "value": "', farmInfo.name, '"},',
            '{"trait_type": "Location", "value": "', farmInfo.location, '"},',
            '{"trait_type": "Area", "value": "', farmInfo.area, '"},',
            '{"trait_type": "Soil Type", "value": "', farmInfo.soilType, '"},',
            '{"trait_type": "Ownership", "value": "', farmInfo.ownership, '"},',
            '{"trait_type": "Water Source", "value": "', farmInfo.waterSource, '"},',
            '{"trait_type": "Yield Potential", "value": "', uint256(farmInfo.yieldPotential).toString(), ' kg per year"},',
            '{"trait_type": "Last Survey Date", "value": "', uint256(farmInfo.lastSurveyDate).toString(), '"},',
            '{"trait_type": "Latitude", "value": "', int256(farmInfo.coordinates.latitude).toString(), '"},',
            '{"trait_type": "Longitude", "value": "', int256(farmInfo.coordinates.longitude).toString(), '"},',
            '{"trait_type": "Altitude", "value": "', uint256(farmInfo.coordinates.altitude).toString(), ' m"}',
            '],', */
            '"external_url": "',
            metadata.externalURL,
            '"',
            "}"
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(dataURI)
                )
            );
    }

    function updateMetadata(
        uint256 tokenId,
        LandMetadata memory newMetadata
    ) public onlyOwner {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        landMetadata[tokenId] = newMetadata;

        // Update token URI
        string memory tokenURI = generateTokenURI(tokenId);
        _setTokenURI(tokenId, tokenURI);

        // Emit metadata update event
        emit MetadataUpdated(
            tokenId,
            newMetadata.name,
            newMetadata.description,
            newMetadata.farmInfo,
            newMetadata.imageURI,
            newMetadata.externalURL
        );
    }

    function getLandMetadata(
        uint256 tokenId
    ) public view returns (LandMetadata memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return landMetadata[tokenId];
    }

    // Helper function to create metadata struct
    function createMetadata(
        MetadataInput memory input
    ) public pure returns (LandMetadata memory) {
        // Create GeoPoint
        TreeTypes.GeoPoint memory coordinates = TreeTypes.GeoPoint({
            latitude: input.latitude,
            longitude: input.longitude,
            altitude: input.altitude
        });

        // Create FarmInfo
        TreeTypes.FarmInfo memory farmInfo = TreeTypes.FarmInfo({
            name: input.farmName,
            location: input.location,
            //coordinates: coordinates,
            area: input.area,
            soilType: input.soilType
            /*   ownership: input.ownership,
            waterSource: input.waterSource,
            yieldPotential: input.yieldPotential,
            lastSurveyDate: input.lastSurveyDate */
        });

        return
            LandMetadata({
                name: input.name,
                description: input.description,
                farmInfo: farmInfo,
                imageURI: input.imageURI,
                externalURL: input.externalURL
            });
    }
}
