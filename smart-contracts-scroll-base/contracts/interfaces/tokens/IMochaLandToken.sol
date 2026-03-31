// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../../types/TreeTypes.sol";

/**
 * @title IMochaLandToken
 * @dev Interface for the Mocha Land Token (MLT)
 * ERC721 token representing individual farms in the Mocha ecosystem
 */
interface IMochaLandToken is IERC721 {
    
    /* ========== STRUCTS ========== */
    
    struct LandMetadata {
        string name;
        string description;
        TreeTypes.FarmInfo farmInfo;
        string imageURI;
        string externalURL;
    }
    
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
    
    /* ========== EVENTS ========== */
    
    event MetadataUpdated(
        uint256 indexed tokenId,
        string name,
        string description,
        TreeTypes.FarmInfo farmInfo,
        string imageURI,
        string externalURL
    );
    
    event TokenCreated(
        uint256 indexed tokenId,
        LandMetadata metadata,
        address tokenBoundAccount
    );
    
    event TreeManagerUpdated(address indexed oldManager, address indexed newManager);
    
    /* ========== STATE VARIABLES ========== */
    
    function registry() external view returns (address);
    function implementation() external view returns (address);
    function treeManager() external view returns (address);
    function nextFarmId() external view returns (uint256);
    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @dev Set the tree manager address
     * @param treeManagerAddress New tree manager address
     */
    function setTreeManagerAddress(address treeManagerAddress) external;
    
    /* ========== MINTING FUNCTIONS ========== */
    
    /**
     * @dev Mint a new farm token
     * @param to Recipient address
     * @param metadata Land metadata
     * @param certifications Farm certifications
     * @return tokenId The ID of the minted token
     */
    function mint(
        address to,
        LandMetadata memory metadata,
        string memory certifications
    ) external returns (uint256);
    
    /* ========== METADATA FUNCTIONS ========== */
    
    /**
     * @dev Update metadata for a token
     * @param tokenId Token ID to update
     * @param newMetadata New metadata
     */
    function updateMetadata(uint256 tokenId, LandMetadata memory newMetadata) external;
    
    /**
     * @dev Get land metadata for a token
     * @param tokenId Token ID
     * @return metadata Land metadata
     */
    function getLandMetadata(uint256 tokenId) external view returns (LandMetadata memory);
    
    /**
     * @dev Create metadata struct from input
     * @param input Metadata input
     * @return metadata Created metadata struct
     */
    function createMetadata(MetadataInput memory input) external pure returns (LandMetadata memory);
    
    /**
     * @dev Generate token URI for a token
     * @param tokenId Token ID
     * @return uri Token URI
     */
    function generateTokenURI(uint256 tokenId) external view returns (string memory);
} 