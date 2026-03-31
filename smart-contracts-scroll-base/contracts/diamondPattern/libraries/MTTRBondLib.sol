// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { MTTRStorage } from "../storage/MTTRStorage.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { FarmShareToken } from "../../tokens/FarmShareToken.sol";
import { IMochaBeanToken } from "../../interfaces/tokens/IMochaBeanToken.sol";

library MTTRBondLib {
    using MTTRStorage for MTTRStorage.Layout;

    function purchaseBond(uint256 /* farmId */, uint256 mbtAmount, address investor, address asset) public returns (uint256 bondId) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(mbtAmount > 0, "amount > 0");
        require(l.vaultFarmIds.length > 0, "no farms");
        

        uint256 remaining = mbtAmount;
        uint256 firstBondId = type(uint256).max;
        
        while (remaining > 0) {
            // Get user's current farm index, initialize to 0 if not set
            uint256 userFarmIndex = l.userCurrentFarmIndex[investor];
            if (userFarmIndex >= l.vaultFarmIds.length) {
                revert("You have maxed out your farm purchases");
            }
            
            uint256 farmId = l.vaultFarmIds[userFarmIndex];
            MTTRStorage.FarmConfig storage farm = l.farms[farmId];
            
            // Skip sold-out farms
            if (l.farmSoldOut[farmId]) {
                l.userCurrentFarmIndex[investor] = userFarmIndex + 1;
                continue;
            }
            
            FarmShareToken shareToken = FarmShareToken(payable(farm.shareTokenAddress));
            uint256 walletBal = shareToken.balanceOf(investor);
            uint256 walletCap = shareToken.maxPerWallet();
            
            if (walletBal >= walletCap) {
                // nothing more can be bought in this farm by this wallet; try next if any
                l.userCurrentFarmIndex[investor] = userFarmIndex + 1;
                continue;
            }
            
            // limit mbt by remaining per-wallet shares on this farm
            MTTRStorage.CollateralInfo storage collateral = l.farmCollateral[farmId];
            uint256 remainingSharesAllowance = walletCap - walletBal;
            uint256 maxMbtByWallet = (remainingSharesAllowance * collateral.valuationPerTree) / 1e18;
            uint256 toSpend = remaining < maxMbtByWallet ? remaining : maxMbtByWallet;
            if (toSpend == 0) {
                l.userCurrentFarmIndex[investor] = userFarmIndex + 1;
                continue;
            }

            (uint256 newBondId, uint256 mbtUsed, , ) = purchaseBondUpToCapacity(toSpend, investor, asset);
            if (firstBondId == type(uint256).max) {
                firstBondId = newBondId;
            }
            if (mbtUsed >= remaining) {
                break;
            }
            remaining -= mbtUsed;
        }
        
        require(firstBondId != type(uint256).max, "no bond purchased");
        return firstBondId;
    }

    // Purchases up to the remaining capacity on the current farm.
    // Returns: bondId created, mbtUsed actually burned, farmId targeted, shareAmount minted.
    function purchaseBondUpToCapacity(uint256 mbtAmount, address investor, address asset)
        public
        returns (uint256 bondId, uint256 mbtUsed, uint256 farmId, uint256 shareAmount)
    {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(mbtAmount > 0, "amount > 0");
        require(l.vaultFarmIds.length > 0, "no farms");

        // Get user's current farm index
        uint256 userFarmIndex = l.userCurrentFarmIndex[investor];
        require(userFarmIndex < l.vaultFarmIds.length, "bad farm index");

        farmId = l.vaultFarmIds[userFarmIndex];
        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        require(farm.farmOwner != address(0), "farm !exist");
        require(farm.active, "farm is inactive");
        require(mbtAmount >= farm.minInvestment, "min investment not met");
        require(mbtAmount <= farm.maxInvestment, "max investment exceeded");
        require(block.timestamp < farm.maturityTimestamp, "farm is matured");

        MTTRStorage.CollateralInfo storage collateral = l.farmCollateral[farmId];
        require(collateral.totalValue > 0, "no collateral");
        require(collateral.valuationPerTree > 0, "bad valuation");

        uint256 totalSupply_ = IERC20(farm.shareTokenAddress).totalSupply();
        uint256 maxShares = farm.treeCount * 1e18;
        require(totalSupply_ < maxShares, "no capacity");
        uint256 capacityRemaining = maxShares - totalSupply_;

        // desired shares from provided mbtAmount
        uint256 desiredShares = (mbtAmount * 1e18) / collateral.valuationPerTree;
        require(desiredShares > 0, "share amount too small");
        shareAmount = desiredShares < capacityRemaining ? desiredShares : capacityRemaining;

        // enforce per-wallet cap (20 trees default, but token may change via caps)
        FarmShareToken shareToken = FarmShareToken(payable(farm.shareTokenAddress));
        uint256 walletBal = shareToken.balanceOf(investor);
        uint256 walletCap = shareToken.maxPerWallet();
        if (walletBal + shareAmount > walletCap) {
            require(walletBal < walletCap, "wallet cap reached");
            uint256 allowed = walletCap - walletBal;
            require(allowed > 0, "no allowance");
            if (shareAmount > allowed) {
                shareAmount = allowed;
            }
        }
        require(shareAmount > 0, "no shares");

        // mbt to consume for the computed share amount (round up minimally to avoid under-collection?)
        // Use exact proportional rounding down to not exceed user's amount
        mbtUsed = (shareAmount * collateral.valuationPerTree) / 1e18;
        require(mbtUsed > 0 && mbtUsed <= mbtAmount, "bad mbtUsed");

        // burn MBT and mint shares
        IMochaBeanToken(payable(asset)).burn(investor, mbtUsed);

        bondId = l.userBondCount[investor]++;
        l.bondPositions[investor][bondId] = MTTRStorage.BondPosition({
            farmId: farmId,
            depositAmount: mbtUsed,
            shareTokenAmount: shareAmount,
            depositTimestamp: block.timestamp,
            maturityTimestamp: farm.maturityTimestamp,
            redeemed: false
        });

        l.totalValueLocked += mbtUsed;
        l.totalActiveBonds++;

        FarmShareToken(payable(farm.shareTokenAddress)).mint(investor, shareAmount);

        // Mark farm as sold out if it's now at capacity
        if (totalSupply_ + shareAmount == maxShares) {
            l.farmSoldOut[farmId] = true;
        }
        
        // Advance user's farm index if they hit per-wallet cap or farm is sold out
        uint256 newWalletBal = shareToken.balanceOf(investor);
        if (newWalletBal >= shareToken.maxPerWallet() || l.farmSoldOut[farmId]) {
            l.userCurrentFarmIndex[investor] = userFarmIndex + 1;
        }
    }
    function redeemBondEarly(uint256 bondId, address investor, address asset) public returns (uint256 redemptionAmount) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(bondId < l.userBondCount[investor], "bad bondId");

        MTTRStorage.BondPosition storage position = l.bondPositions[investor][bondId];
        require(!position.redeemed, "redeemed");
        require(block.timestamp < position.maturityTimestamp, "use redeem");

        MTTRStorage.FarmConfig storage farm = l.farms[position.farmId];
        // Enforce minimum time invested before early redemption is allowed
        if (farm.minTimeInvested > 0) {
            require(block.timestamp >= position.depositTimestamp + farm.minTimeInvested, "min time not met");
        }

        uint256 principal = position.depositAmount;
        uint256 penalty = (principal * l.earlyRedemptionPenaltyBps) / MTTRStorage.BPS_DENOMINATOR;
        redemptionAmount = principal - penalty;

        MTTRStorage.YieldDistribution storage y = l.farmYields[position.farmId];
        y.pendingYield += penalty;

        position.redeemed = true;
        l.totalActiveBonds--;
        l.totalValueLocked -= principal;

        // burn shares via allowance from investor
        FarmShareToken share = FarmShareToken(payable(farm.shareTokenAddress));
        share.burnFrom(investor, position.shareTokenAmount);

        IERC20(asset).transfer(investor, redemptionAmount);
    }
}

