// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { MTTRStorage } from "../storage/MTTRStorage.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { FarmShareToken } from "../../tokens/FarmShareToken.sol";

library MTTRYieldLib {
    using MTTRStorage for MTTRStorage.Layout;

    function distributeYield(uint256 farmId, uint256 yieldAmount, address payer, address asset) public {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(yieldAmount > 0, "yield > 0");
        require(l.farms[farmId].farmOwner != address(0), "farm !exist");

        IERC20(asset).transferFrom(payer, address(this), yieldAmount);

        MTTRStorage.YieldDistribution storage yd = l.farmYields[farmId];
        yd.totalYield += yieldAmount;
        yd.pendingYield += yieldAmount;
        yd.lastDistribution = block.timestamp;

        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        FarmShareToken share = FarmShareToken(payable(farm.shareTokenAddress));

        uint256 totalShares = share.totalSupply();
        if (totalShares > 0) {
            yd.distributedYield += yieldAmount;
            yd.pendingYield = 0;

            share.updateTotalYieldUnclaimed(yieldAmount);
            IERC20(asset).transfer(farm.shareTokenAddress, yieldAmount);
        }
    }
}

