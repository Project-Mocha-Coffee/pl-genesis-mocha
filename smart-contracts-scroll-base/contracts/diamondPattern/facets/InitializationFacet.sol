// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibDiamond.sol";
import "../libraries/LibAppStorage.sol";
import "../libraries/LibAccess.sol";

/**
 * @title InitializationFacet
 * @dev Handles initialization of the TreeFarm Diamond
 */
contract InitializationFacet {
    // Application storage with shared state across facets
    LibAppStorage.AppStorage internal s;

    // Events
    event SystemInitialized(
        address mttToken,
        address mltToken,
        address mbtToken
    );

    /**
     * @notice Initialize the TreeFarm Diamond with token addresses and vault system
     * @param _mttToken MTT token address
     * @param _mltToken MLT token address
     * @param _mbtToken MBT token address
     */
    function initialize(
        address _mttToken,
        address _mltToken,
        address _mbtToken
    ) external {
        LibDiamond.enforceIsContractOwner();

        // Initialize only if not already initialized
        require(s.MTTToken == address(0), "Already initialized");

        // Validate input addresses
        require(_mttToken != address(0), "Invalid MTT token address");
        require(_mltToken != address(0), "Invalid MLT token address");
        require(_mbtToken != address(0), "Invalid MBT token address");

        // Set token addresses
        s.MTTToken = _mttToken;
        s.MLTToken = _mltToken;
        s.MBTToken = _mbtToken;
        s.ADMIN_ROLE = keccak256("ADMIN_ROLE");

        // Setup roles - owner is automatically an admin
        LibAccess.grantRole(LibAccess.ADMIN_ROLE, LibDiamond.contractOwner());

        // Initialize vault system settings
        s.vaultInitialized = false; // Vault will be initialized separately via MultiTrancheVaultFacet
        s.totalVaultFarms = 0;
        s.totalActiveBonds = 0;
        s.emergencyPaused = false;

        emit SystemInitialized(
            _mttToken,
            _mltToken,
            _mbtToken
        );
    }

    /**
     * @notice Get the system initialization status and token addresses
     * @return initialized Whether the system is initialized
     * @return mttToken MTT token address
     * @return mltToken MLT token address
     * @return mbtToken MBT token address
     * @return vaultInitialized Whether the vault system is initialized
     */
    function getInitializationInfo()
        external
        view
        returns (
            bool initialized,
            address mttToken,
            address mltToken,
            address mbtToken,
            bool vaultInitialized
        )
    {
        initialized = s.MTTToken != address(0);
        mttToken = s.MTTToken;
        mltToken = s.MLTToken;
        mbtToken = s.MBTToken;
        vaultInitialized = s.vaultInitialized;
    }
}
