// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ITreeFarmManager.sol";
import "../types/TreeTypes.sol";

/**
 * @title MockTreeFarmManager
 * @dev Mock implementation of ITreeFarmManager for testing
 */
contract MockTreeFarmManager is ITreeFarmManager {
    struct Farm {
        TreeTypes.FarmInfo farmInfo;
        string certifications;
        address tokenBoundAccount;
        address owner;
        bool isActive;
    }

    mapping(uint256 => Farm) public farms;
    uint256 public farmCount;

    function addFarm(
        uint256 farmId,
        TreeTypes.FarmInfo memory farmInfo,
        string memory certifications,
        address tokenBoundAccount,
        address to
    ) external override {
        farms[farmId] = Farm({
            farmInfo: farmInfo,
            certifications: certifications,
            tokenBoundAccount: tokenBoundAccount,
            owner: to,
            isActive: true
        });
        farmCount++;
        emit FarmAdded(farmId, farmInfo, certifications, tokenBoundAccount, to);
    }

    function getFarm(uint256 farmId) external view override returns (
        TreeTypes.FarmInfo memory farmInfo,
        string memory certifications,
        address tokenBoundAccount,
        address owner,
        bool isActive
    ) {
        Farm storage farm = farms[farmId];
        return (
            farm.farmInfo,
            farm.certifications,
            farm.tokenBoundAccount,
            farm.owner,
            farm.isActive
        );
    }

    function farmExists(uint256 farmId) external view override returns (bool) {
        return farms[farmId].isActive;
    }

    function getFarmOwner(uint256 farmId) external view override returns (address) {
        return farms[farmId].owner;
    }

    function getFarmCount() external view override returns (uint256) {
        return farmCount;
    }
}
