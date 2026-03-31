// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { MTTRStorage } from "../storage/MTTRStorage.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IDLTEnumerable } from "../../ERC6960/interfaces/IDLTEnumerable.sol";
import { FarmShareToken } from "../../tokens/FarmShareToken.sol";

library MTTRFarmLib {
    using MTTRStorage for MTTRStorage.Layout;

    function _getFarmOwner(uint256 farmId) public view returns (address) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.mochaLandToken != address(0), "MLT not set");
        return IERC721(l.mochaLandToken).ownerOf(farmId);
    }

    function getFarmTreeCount(uint256 farmId, address farmTokenBoundAccount) public view returns (uint256) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.mochaTreeToken != address(0), "MTT not set");
        IDLTEnumerable mtt = IDLTEnumerable(l.mochaTreeToken);
        return mtt.subIdBalanceOf(farmTokenBoundAccount, farmId);
    }

    function getFarmTreeIds(uint256 farmId) public view returns (uint256[] memory) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.mochaTreeToken != address(0), "MTT not set");
        IDLTEnumerable mtt = IDLTEnumerable(l.mochaTreeToken);
        return mtt.getSubIds(farmId);
    }

    function addFarm(
        uint256 farmId,
        string memory name,
        address farmTokenBoundAccount,
        uint256 targetAPY,
        uint256 maturityPeriod,
        address vault,
        address asset
    ) public returns (address shareTokenAddress) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();

        require(farmTokenBoundAccount != address(0), "invalid TBA");
        require(targetAPY > 0 && targetAPY <= 3000, "APY 0-30%");
        require(maturityPeriod >= l.minimumMaturityPeriod && maturityPeriod <= l.maximumMaturityPeriod, "Invalid maturity");
        require(l.farms[farmId].farmOwner == address(0), "farm exists");

        address farmOwner = _getFarmOwner(farmId);
        require(l.farmOwnerToId[farmOwner] == 0, "owner has farm");

        uint256 treeCount = getFarmTreeCount(farmId, farmTokenBoundAccount);
        require(treeCount > 0, "no trees");

        uint256 bondValue = treeCount * MTTRStorage.TREE_VALUATION_MBT; 
        

        FarmShareToken shareToken = new FarmShareToken(
            string.concat(name, " Shares"),
            string.concat(name, " Tree Token"),
            vault,
            asset
        );
        shareTokenAddress = address(shareToken);

        uint256[] memory treeIds = getFarmTreeIds(farmId);

        // set farm and tree info (external calls last)
        // prepare state first
        l.farms[farmId] = MTTRStorage.FarmConfig({
            name: name,
            farmOwner: farmOwner,
            treeCount: treeCount,
            targetAPY: targetAPY,
            maturityPeriod: maturityPeriod,
            bondValue: bondValue,
            collateralRatio: l.defaultCollateralRatio,
            minInvestment: 0.04 * 10 ** 18,
            maxInvestment: 80 * 10 ** 18,
            shareTokenAddress: shareTokenAddress,
            minTimeInvested: 30 days,
            active: true,
            createdTimestamp: block.timestamp,
            maturityTimestamp: block.timestamp + (maturityPeriod * 30 days)
        });

        l.farmCollateral[farmId] = MTTRStorage.CollateralInfo({
            totalTrees: treeCount,
            valuationPerTree: MTTRStorage.TREE_VALUATION_MBT,
            totalValue: bondValue,
            coverageRatio: l.defaultCollateralRatio,
            liquidationThreshold: (l.defaultCollateralRatio * 80) / 100,
            lastUpdated: block.timestamp
        });

        l.farmYields[farmId] = MTTRStorage.YieldDistribution({
            totalYield: 0,
            distributedYield: 0,
            pendingYield: 0,
            lastDistribution: block.timestamp
        });

        l.farmOwnerToId[farmOwner] = farmId;
        if (farmId >= l.totalFarms) {
            l.totalFarms = farmId + 1;
        }
        l.totalShareTokens++;

        // track farm order for vault-level current farm selection
        l.vaultFarmIds.push(farmId);

        // external calls after state writes
        shareToken.setFarmInfo(farmId, name);
        shareToken.setTreeInfo(treeCount, treeIds);
        // set supply caps: maxSupply = treeCount * 1e18, maxPerWallet = 20 * 1e18
        shareToken.setSupplyCaps(treeCount * 1e18, 20 * 1e18);
    }
}

