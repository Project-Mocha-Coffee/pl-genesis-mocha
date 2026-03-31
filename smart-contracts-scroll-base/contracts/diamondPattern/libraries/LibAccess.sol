// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LibDiamond.sol";
import "./LibAppStorage.sol";

/**
 * @title LibAccess
 * @dev Library for access control functionality in the TreeFarm diamond with Multi-Tranche Vault support
 */
library LibAccess {
    // Events
    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );

    // Core role constants
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FARM_MANAGER_ROLE = keccak256("FARM_MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // Multi-Tranche Vault role constants
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant BOND_MANAGER_ROLE = keccak256("BOND_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant YIELD_PROVIDER_ROLE = keccak256("YIELD_PROVIDER_ROLE");
    
    // Payment and integration roles
    bytes32 public constant PAYMENT_PROCESSOR_ROLE = keccak256("PAYMENT_PROCESSOR_ROLE");
    bytes32 public constant INSURANCE_MANAGER_ROLE = keccak256("INSURANCE_MANAGER_ROLE");
    bytes32 public constant ANALYTICS_ROLE = keccak256("ANALYTICS_ROLE");
    
    // Governance roles
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Legacy access control modifier-like functions
    function enforceIsAdmin() internal view {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not authorized as admin"
        );
    }

    function enforceIsFarmManager(uint256 farmId) internal view {
        LibAppStorage.AppStorage storage s = appStorage();
        require(
            s.farmsMetadata[farmId].farmManager == msg.sender ||
                s.authorizedFarmsOperators[farmId][msg.sender] ||
                hasRole(ADMIN_ROLE, msg.sender) ||
                hasRole(FARM_MANAGER_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not authorized for farm"
        );
    }

    function enforceIsFactoryOrAdmin() internal view {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not factory or admin"
        );
    }
    
    // New vault-specific access control functions
    function enforceIsVaultManager() internal view {
        require(
            hasRole(VAULT_MANAGER_ROLE, msg.sender) ||
                hasRole(ADMIN_ROLE, msg.sender) ||
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not authorized as vault manager"
        );
    }
    
    function enforceIsBondManager() internal view {
        require(
            hasRole(BOND_MANAGER_ROLE, msg.sender) ||
                hasRole(VAULT_MANAGER_ROLE, msg.sender) ||
                hasRole(ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not authorized as bond manager"
        );
    }
    
    function enforceIsOracle() internal view {
        require(
            hasRole(ORACLE_ROLE, msg.sender) ||
                hasRole(ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not authorized as oracle"
        );
    }
    
    function enforceIsYieldProvider() internal view {
        require(
            hasRole(YIELD_PROVIDER_ROLE, msg.sender) ||
                hasRole(VAULT_MANAGER_ROLE, msg.sender) ||
                hasRole(ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not authorized as yield provider"
        );
    }
    
    function enforceIsPaymentProcessor() internal view {
        require(
            hasRole(PAYMENT_PROCESSOR_ROLE, msg.sender) ||
                hasRole(ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not authorized as payment processor"
        );
    }
    
    function enforceIsEmergencyManager() internal view {
        require(
            hasRole(EMERGENCY_ROLE, msg.sender) ||
                hasRole(ADMIN_ROLE, msg.sender) ||
                msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Not authorized for emergency actions"
        );
    }

    // Enhanced contract owner checking
    function enforceIsContractOwner() internal view {
        require(
            msg.sender == LibDiamond.contractOwner(),
            "LibAccess: Must be contract owner"
        );
    }

    // Role management functions
    function hasRole(
        bytes32 role,
        address account
    ) internal view returns (bool) {
        return appStorage().roles[role][account];
    }

    function grantRole(bytes32 role, address account) internal {
        LibAppStorage.AppStorage storage s = appStorage();
        if (!s.roles[role][account]) {
            s.roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function revokeRole(bytes32 role, address account) internal {
        LibAppStorage.AppStorage storage s = appStorage();
        if (s.roles[role][account]) {
            s.roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    // Farm authorization functions (enhanced for vault integration)
    function isAuthorizedForFarm(
        address account,
        uint256 farmId
    ) internal view returns (bool) {
        LibAppStorage.AppStorage storage s = appStorage();
        return
            hasRole(ADMIN_ROLE, account) ||
            hasRole(FARM_MANAGER_ROLE, account) ||
            hasRole(VAULT_MANAGER_ROLE, account) ||
            s.farmsMetadata[farmId].farmManager == account ||
            s.authorizedFarmsOperators[farmId][account] ||
            account == LibDiamond.contractOwner();
    }
    
    // Vault-specific authorization functions
    function isAuthorizedForVaultFarm(
        address account,
        uint256 vaultFarmId
    ) internal view returns (bool) {
        LibAppStorage.AppStorage storage s = appStorage();
        address farmOwner = s.vaultIdToFarm[vaultFarmId];
        return
            hasRole(ADMIN_ROLE, account) ||
            hasRole(VAULT_MANAGER_ROLE, account) ||
            hasRole(BOND_MANAGER_ROLE, account) ||
            account == farmOwner ||
            account == LibDiamond.contractOwner();
    }
    
    function isAuthorizedForBondOperations(address account) internal view returns (bool) {
        return
            hasRole(BOND_MANAGER_ROLE, account) ||
            hasRole(VAULT_MANAGER_ROLE, account) ||
            hasRole(ADMIN_ROLE, account) ||
            account == LibDiamond.contractOwner();
    }
    
    function isAuthorizedForYieldDistribution(address account) internal view returns (bool) {
        return
            hasRole(YIELD_PROVIDER_ROLE, account) ||
            hasRole(VAULT_MANAGER_ROLE, account) ||
            hasRole(ADMIN_ROLE, account) ||
            account == LibDiamond.contractOwner();
    }
    
    // Emergency controls
    function isEmergencyManager(address account) internal view returns (bool) {
        return
            hasRole(EMERGENCY_ROLE, account) ||
            hasRole(ADMIN_ROLE, account) ||
            account == LibDiamond.contractOwner();
    }
    
    // Migration functions removed (not needed for fresh implementation)
}
