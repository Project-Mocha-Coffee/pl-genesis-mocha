// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockToken
 * @dev A simple ERC20 token for testing
 */
contract MockERC20AccessControl is ERC20, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

/**
 * @title MockYieldManager
 * @dev Mock contract to handle yield-related operations for testing
 */
contract MockYieldManager is Ownable {
    // Mapping to track speculative yields
    mapping(uint256 => mapping(uint256 => uint256)) public speculativeYields; // farmId => treeId => yield amount
    mapping(uint256 => mapping(uint256 => uint256)) public actualYields; // farmId => treeId => yield amount

    constructor() Ownable(msg.sender) {}

    function recordSpeculativeYield(
        uint256 farmId,
        uint256 treeId,
        uint256 yieldAmount,
        address farmWallet
    ) external returns (bool) {
        speculativeYields[farmId][treeId] = yieldAmount;
        return true;
    }

    function recordActualYield(
        uint256 farmId,
        uint256 treeId,
        uint256 yieldAmount,
        address farmWallet
    ) external returns (bool) {
        actualYields[farmId][treeId] = yieldAmount;
        return true;
    }

    function hasTreeSpeculativeYield(
        uint256 farmId,
        uint256 treeId
    ) external view returns (bool) {
        return speculativeYields[farmId][treeId] > 0;
    }

    function getTreeSpeculativeYield(
        uint256 farmId,
        uint256 treeId
    ) external view returns (uint256) {
        return speculativeYields[farmId][treeId];
    }

    function getTreeActualYield(
        uint256 farmId,
        uint256 treeId
    ) external view returns (uint256) {
        return actualYields[farmId][treeId];
    }
}

/**
 * @title MockStakingContract
 * @dev A mock staking contract for testing
 */
contract MockStakingContract {
    struct Stake {
        uint256 farmId;
        uint256 treeId;
        uint256 amount;
        address staker;
    }

    mapping(address => Stake[]) public stakes;

    function stake(uint256 farmId, uint256 treeId, uint256 amount) external {
        stakes[msg.sender].push(
            Stake({
                farmId: farmId,
                treeId: treeId,
                amount: amount,
                staker: msg.sender
            })
        );
    }

    function unstake(uint256 farmId, uint256 treeId) external {
        // Implementation would remove the stake
    }

    function getStakedAmount(
        address staker,
        uint256 farmId,
        uint256 treeId
    ) external view returns (uint256) {
        for (uint256 i = 0; i < stakes[staker].length; i++) {
            if (
                stakes[staker][i].farmId == farmId &&
                stakes[staker][i].treeId == treeId
            ) {
                return stakes[staker][i].amount;
            }
        }
        return 0;
    }
}

// Mock MTT Token contract
contract MockMTTToken {
    // Mock functions to match the ones called in the TreeManagement contract
    function mint(address, uint256, uint256, uint256) external returns (bool) {
        return true;
    }

    function thirdPartyApprove(
        address,
        address,
        uint256,
        uint256,
        uint256
    ) external returns (bool) {
        return true;
    }
}

/**
 * @title MockMLTToken
 * @dev Mock token for testing the TreeFarm system
 */
contract MockMLTToken is ERC20, Ownable {
    constructor() ERC20("Mock Land Token", "MLT") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title MockMBTToken
 * @dev Mock token for testing the TreeFarm system
 */
contract MockMBTToken is ERC20, Ownable {
    constructor() ERC20("Mock Boean Token", "MBT") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
