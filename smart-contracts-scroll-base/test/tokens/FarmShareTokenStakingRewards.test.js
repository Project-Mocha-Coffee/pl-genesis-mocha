const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FarmShareToken Staking Rewards", function () {
    let farmShareToken;
    let mochaBeanToken;
    let owner;
    let vaultManager;
    let rewardManager;
    let user1;
    let user2;
    let nativeTokenWrapper;

    beforeEach(async function () {
        [owner, vaultManager, rewardManager, user1, user2, nativeTokenWrapper] = await ethers.getSigners();

        // Deploy MBT token
        const MochaBeanToken = await ethers.getContractFactory("MochaBeanToken");
        mochaBeanToken = await MochaBeanToken.deploy();
        await mochaBeanToken.deployed();

        // Deploy FarmShareToken
        const FarmShareToken = await ethers.getContractFactory("FarmShareToken");
        farmShareToken = await FarmShareToken.deploy(
            "Test Farm Shares",
            "TFS",
            vaultManager.address,
            mochaBeanToken.address
        );
        await farmShareToken.deployed();

        // Set up roles
        await farmShareToken.grantRole(await farmShareToken.REWARD_MANAGER_ROLE(), rewardManager.address);
        await farmShareToken.setNativeTokenWrapper(nativeTokenWrapper.address);

        // Mint some MBT tokens to users for testing
        await mochaBeanToken.mint(user1.address, ethers.utils.parseEther("1000"));
        await mochaBeanToken.mint(user2.address, ethers.utils.parseEther("1000"));
        await mochaBeanToken.mint(rewardManager.address, ethers.utils.parseEther("10000"));
    });

    describe("Native Token Wrapper", function () {
        it("Should allow native token wrapper to send ETH", async function () {
            const initialBalance = await ethers.provider.getBalance(farmShareToken.address);
            
            // Send ETH from native token wrapper
            await nativeTokenWrapper.sendTransaction({
                to: farmShareToken.address,
                value: ethers.utils.parseEther("1")
            });

            const finalBalance = await ethers.provider.getBalance(farmShareToken.address);
            expect(finalBalance).to.equal(initialBalance.add(ethers.utils.parseEther("1")));
        });

        it("Should reject ETH from non-wrapper address", async function () {
            await expect(
                user1.sendTransaction({
                    to: farmShareToken.address,
                    value: ethers.utils.parseEther("1")
                })
            ).to.be.revertedWith("caller not native token wrapper.");
        });

        it("Should allow admin to update native token wrapper", async function () {
            const newWrapper = user1.address;
            await farmShareToken.setNativeTokenWrapper(newWrapper);
            expect(await farmShareToken.nativeTokenWrapper()).to.equal(newWrapper);
        });
    });

    describe("Reward Token Management", function () {
        it("Should allow reward manager to deposit reward tokens", async function () {
            const depositAmount = ethers.utils.parseEther("100");
            
            // Approve transfer
            await mochaBeanToken.connect(rewardManager).approve(farmShareToken.address, depositAmount);
            
            // Deposit reward tokens
            await expect(farmShareToken.connect(rewardManager).depositRewardTokens(depositAmount))
                .to.emit(farmShareToken, "RewardTokensDeposited")
                .withArgs(rewardManager.address, depositAmount, await time());

            expect(await farmShareToken.getRewardTokenBalance()).to.equal(depositAmount);
            expect(await mochaBeanToken.balanceOf(farmShareToken.address)).to.equal(depositAmount);
        });

        it("Should allow reward manager to withdraw excess reward tokens", async function () {
            const depositAmount = ethers.utils.parseEther("100");
            const withdrawAmount = ethers.utils.parseEther("50");
            
            // Deposit first
            await mochaBeanToken.connect(rewardManager).approve(farmShareToken.address, depositAmount);
            await farmShareToken.connect(rewardManager).depositRewardTokens(depositAmount);
            
            // Withdraw
            await expect(farmShareToken.connect(rewardManager).withdrawRewardTokens(withdrawAmount))
                .to.emit(farmShareToken, "RewardTokensWithdrawn")
                .withArgs(rewardManager.address, withdrawAmount, await time());

            expect(await farmShareToken.getRewardTokenBalance()).to.equal(depositAmount.sub(withdrawAmount));
        });

        it("Should prevent non-authorized users from withdrawing reward tokens", async function () {
            const depositAmount = ethers.utils.parseEther("100");
            const withdrawAmount = ethers.utils.parseEther("50");
            
            // Deposit first
            await mochaBeanToken.connect(rewardManager).approve(farmShareToken.address, depositAmount);
            await farmShareToken.connect(rewardManager).depositRewardTokens(depositAmount);
            
            // Try to withdraw as unauthorized user
            await expect(
                farmShareToken.connect(user1).withdrawRewardTokens(withdrawAmount)
            ).to.be.revertedWith("Caller not authorized");
        });

        it("Should prevent withdrawing more than available balance", async function () {
            const depositAmount = ethers.utils.parseEther("100");
            const withdrawAmount = ethers.utils.parseEther("150");
            
            // Deposit first
            await mochaBeanToken.connect(rewardManager).approve(farmShareToken.address, depositAmount);
            await farmShareToken.connect(rewardManager).depositRewardTokens(depositAmount);
            
            // Try to withdraw more than available
            await expect(
                farmShareToken.connect(rewardManager).withdrawRewardTokens(withdrawAmount)
            ).to.be.revertedWith("Insufficient reward token balance");
        });

        it("Should reject zero amount deposits", async function () {
            await expect(
                farmShareToken.connect(rewardManager).depositRewardTokens(0)
            ).to.be.revertedWith("Amount must be > 0");
        });

        it("Should reject zero amount withdrawals", async function () {
            await expect(
                farmShareToken.connect(rewardManager).withdrawRewardTokens(0)
            ).to.be.revertedWith("Amount must be > 0");
        });
    });

    describe("Integration with Yield Distribution", function () {
                 it("Should integrate reward tokens with yield distribution", async function () {
             const depositAmount = ethers.utils.parseEther("100");
             const mintAmount = ethers.utils.parseEther("10");
             
             // Deposit reward tokens
             await mochaBeanToken.connect(rewardManager).approve(farmShareToken.address, depositAmount);
             await farmShareToken.connect(rewardManager).depositRewardTokens(depositAmount);
             
             // Mint tokens to user
             await farmShareToken.connect(vaultManager).mint(user1.address, mintAmount);
             
             // Update yield (this creates epoch 1)
             await farmShareToken.connect(vaultManager).updateTotalYieldUnclaimed(ethers.utils.parseEther("50"));
             
             // Claim yield
             await expect(farmShareToken.connect(user1).claimYield())
                 .to.emit(farmShareToken, "YieldClaimed")
                 .withArgs(user1.address, ethers.utils.parseEther("50"), await time());
             
             // Check balances
             expect(await mochaBeanToken.balanceOf(user1.address)).to.be.gt(0);
             
             // Verify user cannot claim the same epoch twice
             const yieldAmount = await farmShareToken.connect(user1).claimYield();
             expect(yieldAmount).to.equal(0);
                  });
         
         it("Should handle multiple epochs correctly", async function () {
             const mintAmount = ethers.utils.parseEther("10");
             
             // Mint tokens to user
             await farmShareToken.connect(vaultManager).mint(user1.address, mintAmount);
             
             // First epoch
             await farmShareToken.connect(vaultManager).updateTotalYieldUnclaimed(ethers.utils.parseEther("50"));
             
             // User claims from first epoch
             const firstClaim = await farmShareToken.connect(user1).claimYield();
             expect(firstClaim).to.be.gt(0);
             
             // Second epoch
             await farmShareToken.connect(vaultManager).updateTotalYieldUnclaimed(ethers.utils.parseEther("30"));
             
             // User can claim from second epoch
             const secondClaim = await farmShareToken.connect(user1).claimYield();
             expect(secondClaim).to.be.gt(0);
             
             // User cannot claim from first epoch again
             const userPosition = await farmShareToken.getUserPosition(user1.address);
             expect(userPosition.lastClaimedEpoch).to.equal(2);
         });
         
         it("Should calculate pending yield correctly for current epoch only", async function () {
             const mintAmount = ethers.utils.parseEther("10");
             
             // Mint tokens to user
             await farmShareToken.connect(vaultManager).mint(user1.address, mintAmount);
             
             // Update yield to create epoch 1
             await farmShareToken.connect(vaultManager).updateTotalYieldUnclaimed(ethers.utils.parseEther("50"));
             
             // Check pending yield before claiming
             let pendingYield = await farmShareToken.getPendingYield(user1.address);
             expect(pendingYield).to.be.gt(0);
             
             // Claim yield
             await farmShareToken.connect(user1).claimYield();
             
             // Check pending yield after claiming (should be 0 for this epoch)
             pendingYield = await farmShareToken.getPendingYield(user1.address);
             expect(pendingYield).to.equal(0);
         });
     });
 
     // Helper function to get current timestamp
     async function time() {
         const blockNum = await ethers.provider.getBlockNumber();
         const block = await ethers.provider.getBlock(blockNum);
         return block.timestamp;
     }
 });  