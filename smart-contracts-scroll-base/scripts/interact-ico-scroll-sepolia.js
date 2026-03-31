const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Usage examples:
//   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia
//   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-eth 0.1
//   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-usdt 100
//   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-usdc 100

function getCliArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

async function loadDeploymentInfo() {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentFile = path.join(deploymentsDir, "scrollSepolia-ico-deployment.json");
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`❌ Deployment file not found: ${deploymentFile}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  return deployment;
}

async function getCurrentPrices(ico) {
  console.log("📊 Getting current asset prices...");
  
  try {
    const prices = await ico.getCurrentPrices();
    console.log(`   ETH/USD: $${ethers.formatUnits(prices.ethPrice, 8)}`);
    console.log(`   USDT/USD: $${ethers.formatUnits(prices.usdtPrice, 8)}`);
    console.log(`   USDC/USD: $${ethers.formatUnits(prices.usdcPrice, 8)}`);
    console.log(`   BTC/USD: $${ethers.formatUnits(prices.btcPrice, 8)}`);
    console.log(`   SCR/USD: $${ethers.formatUnits(prices.scrPrice, 8)}`);
  } catch (error) {
    console.log(`   ⚠️  Error getting prices: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

async function testIndividualPriceFeeds(ico) {
  console.log("\n🔬 Testing individual price feed functions...");
  
  const testAmounts = {
    ETH: ethers.parseEther("1"),
    USDT: ethers.parseUnits("1", 6),
    USDC: ethers.parseUnits("1", 6),
    WBTC: ethers.parseUnits("1", 8),
    SCR: ethers.parseEther("1")
  };
  
  for (const [asset, amount] of Object.entries(testAmounts)) {
    console.log(`\n   Testing ${asset} price feed...`);
    try {
      let usdValue;
      switch (asset) {
        case "ETH":
          usdValue = await ico.getEthUsdPrice(amount);
          break;
        case "USDT":
          usdValue = await ico.getUsdtUsdPrice(amount);
          break;
        case "USDC":
          usdValue = await ico.getUsdcUsdPrice(amount);
          break;
        case "WBTC":
          usdValue = await ico.getBtcUsdPrice(amount);
          break;
        case "SCR":
          usdValue = await ico.getScrUsdPrice(amount);
          break;
      }
      
      console.log(`   ✅ ${asset}: ${ethers.formatUnits(amount, asset === "USDT" || asset === "USDC" ? 6 : asset === "WBTC" ? 8 : 18)} ${asset} = $${ethers.formatEther(usdValue)}`);
      
    } catch (error) {
      console.log(`   ❌ ${asset} price feed failed:`);
      console.log(`      Error: ${error.message}`);
      console.log(`      Code: ${error.code || 'N/A'}`);
      console.log(`      Reason: ${error.reason || 'N/A'}`);
      if (error.data) {
        console.log(`      Data: ${error.data}`);
      }
      console.log(`      Stack: ${error.stack}`);
      
      // Try to decode custom errors
      try {
        if (error.data && error.data.length > 2) {
          const errorSig = error.data.slice(0, 10);
          console.log(`      Error Signature: ${errorSig}`);
          
          // Common ICO custom errors
          const customErrors = {
            "0x4e6f74466f756e64": "OracleCallFailed",
            "0x4e6f74466f756e64": "OracleInvalidPrice", 
            "0x4e6f74466f756e64": "OraclePriceStale",
            "0x4e6f74466f756e64": "OraclePriceTooOld",
            "0x4e6f74466f756e64": "OracleRoundIncomplete"
          };
          
          if (customErrors[errorSig]) {
            console.log(`      Decoded Error: ${customErrors[errorSig]}`);
          }
        }
      } catch (decodeError) {
        console.log(`      Could not decode error: ${decodeError.message}`);
      }
    }
  }
}

async function previewPurchase(ico, paymentMethod, amount) {
  console.log(`\n🔍 Previewing ${paymentMethod} purchase...`);
  
  try {
    console.log(`   Calling previewTokenPurchase("${paymentMethod}", ${amount.toString()})...`);
    const [tokensToReceive, usdValue] = await ico.previewTokenPurchase(paymentMethod, amount);
    console.log(`   Input: ${ethers.formatUnits(amount, paymentMethod === "ETH" ? 18 : 
      paymentMethod === "USDT" || paymentMethod === "USDC" ? 6 : 
      paymentMethod === "WBTC" ? 8 : 18)} ${paymentMethod}`);
    console.log(`   USD Value: $${ethers.formatEther(usdValue)}`);
    console.log(`   MBT Tokens: ${ethers.formatEther(tokensToReceive)}`);
    console.log(`   Rate: $${(usdValue / tokensToReceive)} per MBT`);
    return { tokensToReceive, usdValue };
  } catch (error) {
    console.log(`   ❌ Preview failed for ${paymentMethod}:`);
    console.log(`      Error: ${error.message}`);
    console.log(`      Code: ${error.code || 'N/A'}`);
    console.log(`      Reason: ${error.reason || 'N/A'}`);
    if (error.data) {
      console.log(`      Data: ${error.data}`);
    }
    console.log(`      Stack: ${error.stack}`);
    
    // Try to decode custom errors
    try {
      if (error.data && error.data.length > 2) {
        const errorSig = error.data.slice(0, 10);
        console.log(`      Error Signature: ${errorSig}`);
        
        // Common ICO custom errors
        const customErrors = {
          "0x4e6f74466f756e64": "OracleCallFailed",
          "0x4e6f74466f756e64": "OracleInvalidPrice", 
          "0x4e6f74466f756e64": "OraclePriceStale",
          "0x4e6f74466f756e64": "OraclePriceTooOld",
          "0x4e6f74466f756e64": "OracleRoundIncomplete",
          "0x4e6f74466f756e64": "InvalidPaymentMethod"
        };
        
        if (customErrors[errorSig]) {
          console.log(`      Decoded Error: ${customErrors[errorSig]}`);
        }
      }
    } catch (decodeError) {
      console.log(`      Could not decode error: ${decodeError.message}`);
    }
    
    return null;
  }
}

async function buyWithEth(ico, amount, recipient) {
  console.log(`\n💰 Buying MBT with ETH...`);
  console.log(`   📊 Transaction Details:`);
  console.log(`      Amount: ${ethers.formatEther(amount)} ETH`);
  console.log(`      Recipient: ${recipient}`);
  console.log(`      Contract: ${await ico.getAddress()}`);
  
  try {
    // Get initial balances
    const initialEthBalance = await ethers.provider.getBalance(recipient);
    console.log(`   💳 Initial ETH Balance: ${ethers.formatEther(initialEthBalance)}`);
    
    // Preview first
    console.log(`   🔍 Previewing purchase...`);
    const preview = await previewPurchase(ico, "ETH", amount);
    if (!preview) {
      console.log(`   ❌ Preview failed, aborting purchase`);
      return;
    }
    
    // Calculate slippage protection (5% tolerance)
    const slippageTolerance = 500; // 5% in basis points
    const minTokensExpected = (preview.tokensToReceive * (10000n - BigInt(slippageTolerance))) / 10000n;
    
    console.log(`   📈 Purchase Preview:`);
    console.log(`      Expected tokens: ${ethers.formatEther(preview.tokensToReceive)} MBT`);
    console.log(`      USD value: $${ethers.formatEther(preview.usdValue)}`);
    console.log(`      Min tokens (5% slippage): ${ethers.formatEther(minTokensExpected)} MBT`);
    console.log(`      Effective rate: $${(Number(ethers.formatEther(preview.usdValue)) / Number(ethers.formatEther(preview.tokensToReceive))).toFixed(2)} per MBT`);
    
    // Check minimum purchase requirements
    const minEthPurchase = await ico.minEthPurchase();
    if (amount < minEthPurchase) {
      console.log(`   ❌ Amount below minimum purchase: ${ethers.formatEther(amount)} < ${ethers.formatEther(minEthPurchase)} ETH`);
      return;
    }
    
    // Estimate gas
    console.log(`   ⛽ Estimating gas...`);
    const gasEstimate = await ico.buyTokensWithEth.estimateGas(recipient, minTokensExpected, { value: amount });
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);
    
    // Get current gas price
    const gasPrice = await ethers.provider.getFeeData();
    const estimatedCost = gasEstimate * gasPrice.gasPrice;
    console.log(`      Estimated gas cost: ${ethers.formatEther(estimatedCost)} ETH`);
    console.log(`      Total cost (purchase + gas): ${ethers.formatEther(amount + estimatedCost)} ETH`);
    
    // Check if user has enough ETH
    if (initialEthBalance < amount + estimatedCost) {
      console.log(`   ❌ Insufficient ETH balance. Need: ${ethers.formatEther(amount + estimatedCost)}, Have: ${ethers.formatEther(initialEthBalance)}`);
      return;
    }
    
    console.log(`   🚀 Executing purchase transaction...`);
    const tx = await ico.buyTokensWithEth(recipient, minTokensExpected, { 
      value: amount,
      gasLimit: gasEstimate * 120n / 100n // 20% buffer
    });
    console.log(`   📝 Transaction sent: ${tx.hash}`);
    console.log(`   🔗 Explorer: https://sepolia.scrollscan.com/tx/${tx.hash}`);
    
    console.log(`   ⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`   ✅ Purchase successful!`);
    console.log(`      Block: ${receipt.blockNumber}`);
    console.log(`      Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`      Gas price: ${ethers.formatUnits(receipt.gasPrice, 'gwei')} gwei`);
    console.log(`      Actual gas cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
    
    // Parse events
    console.log(`   📋 Parsing transaction events...`);
    const events = receipt.logs.map(log => {
      try {
        return ico.interface.parseLog(log);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    const purchaseEvent = events.find(e => e.name === "TokensPurchased");
    if (purchaseEvent) {
      console.log(`   🎉 Purchase Event Details:`);
      console.log(`      Purchaser: ${purchaseEvent.args.purchaser}`);
      console.log(`      Beneficiary: ${purchaseEvent.args.beneficiary}`);
      console.log(`      Payment Method: ${purchaseEvent.args.paymentMethod}`);
      console.log(`      Payment Amount: ${ethers.formatEther(purchaseEvent.args.paymentAmount)} ETH`);
      console.log(`      Tokens Received: ${ethers.formatEther(purchaseEvent.args.tokensReceived)} MBT`);
      console.log(`      USD Value: $${ethers.formatEther(purchaseEvent.args.usdValue)}`);
    }
    
    // Check for slippage protection events
    const slippageEvent = events.find(e => e.name === "SlippageProtectionTriggered");
    if (slippageEvent) {
      console.log(`   ⚠️  Slippage Protection Triggered:`);
      console.log(`      Expected: ${ethers.formatEther(slippageEvent.args.expectedTokens)} MBT`);
      console.log(`      Actual: ${ethers.formatEther(slippageEvent.args.actualTokens)} MBT`);
      console.log(`      Slippage: ${slippageEvent.args.slippageBps.toString()} bps (${(Number(slippageEvent.args.slippageBps) / 100).toFixed(2)}%)`);
    }
    
    // Get final balances
    const finalEthBalance = await ethers.provider.getBalance(recipient);
    console.log(`   💳 Final ETH Balance: ${ethers.formatEther(finalEthBalance)}`);
    console.log(`   📊 ETH Spent: ${ethers.formatEther(initialEthBalance - finalEthBalance)}`);
    
  } catch (error) {
    console.log(`   ❌ ETH purchase failed:`);
    console.log(`      Error: ${error.message}`);
    console.log(`      Code: ${error.code || 'N/A'}`);
    console.log(`      Reason: ${error.reason || 'N/A'}`);
    if (error.data) {
      console.log(`      Data: ${error.data}`);
    }
    
    // Try to decode custom errors
    await decodeCustomError(error, "ETH");
    
    console.log(`      Stack: ${error.stack}`);
  }
}

async function buyWithErc20(ico, tokenAddress, amount, recipient, paymentMethod) {
  console.log(`\n💰 Buying MBT with ${paymentMethod}...`);
  console.log(`   📊 Transaction Details:`);
  console.log(`      Amount: ${ethers.formatUnits(amount, paymentMethod === "USDT" || paymentMethod === "USDC" ? 6 : paymentMethod === "WBTC" ? 8 : 18)} ${paymentMethod}`);
  console.log(`      Recipient: ${recipient}`);
  console.log(`      Token Contract: ${tokenAddress}`);
  console.log(`      ICO Contract: ${await ico.getAddress()}`);
  
  try {
    // Get token contract
    const token = await ethers.getContractAt("contracts/test/MockERC20.sol:MockERC20", tokenAddress);
    const decimals = await token.decimals();
    const symbol = await token.symbol();
    
    console.log(`   🪙 Token Info:`);
    console.log(`      Symbol: ${symbol}`);
    console.log(`      Decimals: ${decimals}`);
    console.log(`      Address: ${tokenAddress}`);
    
    // Get initial balances
    const initialTokenBalance = await token.balanceOf(recipient);
    const initialEthBalance = await ethers.provider.getBalance(recipient);
    console.log(`   💳 Initial Balances:`);
    console.log(`      ${paymentMethod}: ${ethers.formatUnits(initialTokenBalance, decimals)}`);
    console.log(`      ETH: ${ethers.formatEther(initialEthBalance)}`);
    
    // Preview first
    console.log(`   🔍 Previewing purchase...`);
    const preview = await previewPurchase(ico, paymentMethod, amount);
    if (!preview) {
      console.log(`   ❌ Preview failed, aborting purchase`);
      return;
    }
    
    // Calculate slippage protection (5% tolerance)
    const slippageTolerance = 500; // 5% in basis points
    const minTokensExpected = (preview.tokensToReceive * (10000n - BigInt(slippageTolerance))) / 10000n;
    
    console.log(`   📈 Purchase Preview:`);
    console.log(`      Expected tokens: ${ethers.formatEther(preview.tokensToReceive)} MBT`);
    console.log(`      USD value: $${ethers.formatEther(preview.usdValue)}`);
    console.log(`      Min tokens (5% slippage): ${ethers.formatEther(minTokensExpected)} MBT`);
    console.log(`      Effective rate: $${(Number(ethers.formatEther(preview.usdValue)) / Number(ethers.formatEther(preview.tokensToReceive))).toFixed(2)} per MBT`);
    
    // Check minimum purchase requirements
    let minPurchase;
    if (paymentMethod === "USDT") {
      minPurchase = await ico.minUsdtPurchase();
    } else if (paymentMethod === "USDC") {
      minPurchase = await ico.minUsdcPurchase();
    } else if (paymentMethod === "WBTC") {
      minPurchase = await ico.minWbtcPurchase();
    } else if (paymentMethod === "SCR") {
      minPurchase = await ico.minScrPurchase();
    }
    
    if (amount < minPurchase) {
      console.log(`   ❌ Amount below minimum purchase: ${ethers.formatUnits(amount, decimals)} < ${ethers.formatUnits(minPurchase, decimals)} ${paymentMethod}`);
      return;
    }
    
    // Check balance
    if (initialTokenBalance < amount) {
      console.log(`   ❌ Insufficient ${paymentMethod} balance. Have: ${ethers.formatUnits(initialTokenBalance, decimals)}, Need: ${ethers.formatUnits(amount, decimals)}`);
      return;
    }
    
    // Check current allowance
    const currentAllowance = await token.allowance(recipient, await ico.getAddress());
    console.log(`   🔐 Current allowance: ${ethers.formatUnits(currentAllowance, decimals)} ${paymentMethod}`);
    
    // Approve ICO contract to spend tokens if needed
    if (currentAllowance < amount) {
      console.log(`   📝 Approving ${ethers.formatUnits(amount, decimals)} ${paymentMethod}...`);
      
      // Estimate approval gas
      const approveGasEstimate = await token.approve.estimateGas(await ico.getAddress(), amount);
      console.log(`      Approval gas estimate: ${approveGasEstimate.toString()}`);
      
      const approveTx = await token.approve(await ico.getAddress(), amount, {
        gasLimit: approveGasEstimate * 120n / 100n // 20% buffer
      });
      console.log(`      Approval tx: ${approveTx.hash}`);
      
      const approveReceipt = await approveTx.wait();
      console.log(`   ✅ Approval successful! Gas used: ${approveReceipt.gasUsed.toString()}`);
    } else {
      console.log(`   ✅ Sufficient allowance already exists`);
    }
    
    // Estimate purchase gas
    console.log(`   ⛽ Estimating purchase gas...`);
    let gasEstimate;
    if (paymentMethod === "USDT") {
      gasEstimate = await ico.buyTokensWithUsdt.estimateGas(amount, minTokensExpected);
    } else if (paymentMethod === "USDC") {
      gasEstimate = await ico.buyTokensWithUsdc.estimateGas(amount, minTokensExpected);
    } else if (paymentMethod === "WBTC") {
      gasEstimate = await ico.buyTokensWithWbtc.estimateGas(amount, minTokensExpected);
    } else if (paymentMethod === "SCR") {
      gasEstimate = await ico.buyTokensWithScr.estimateGas(amount, minTokensExpected);
    }
    
    console.log(`      Purchase gas estimate: ${gasEstimate.toString()}`);
    
    // Get current gas price
    const gasPrice = await ethers.provider.getFeeData();
    const estimatedGasCost = gasEstimate * gasPrice.gasPrice;
    console.log(`      Estimated gas cost: ${ethers.formatEther(estimatedGasCost)} ETH`);
    
    // Check if user has enough ETH for gas
    if (initialEthBalance < estimatedGasCost) {
      console.log(`   ❌ Insufficient ETH for gas. Need: ${ethers.formatEther(estimatedGasCost)}, Have: ${ethers.formatEther(initialEthBalance)}`);
      return;
    }
    
    console.log(`   🚀 Executing purchase transaction...`);
    
    // Make purchase
    let tx;
    if (paymentMethod === "USDT") {
      tx = await ico.buyTokensWithUsdt(amount, minTokensExpected, {
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
      });
    } else if (paymentMethod === "USDC") {
      tx = await ico.buyTokensWithUsdc(amount, minTokensExpected, {
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
      });
    } else if (paymentMethod === "WBTC") {
      tx = await ico.buyTokensWithWbtc(amount, minTokensExpected, {
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
      });
    } else if (paymentMethod === "SCR") {
      tx = await ico.buyTokensWithScr(amount, minTokensExpected, {
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
      });
    }
    
    console.log(`   📝 Transaction sent: ${tx.hash}`);
    console.log(`   🔗 Explorer: https://sepolia.scrollscan.com/tx/${tx.hash}`);
    
    console.log(`   ⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`   ✅ Purchase successful!`);
    console.log(`      Block: ${receipt.blockNumber}`);
    console.log(`      Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`      Gas price: ${ethers.formatUnits(receipt.gasPrice, 'gwei')} gwei`);
    console.log(`      Actual gas cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
    
    // Parse events
    console.log(`   📋 Parsing transaction events...`);
    const events = receipt.logs.map(log => {
      try {
        return ico.interface.parseLog(log);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    const purchaseEvent = events.find(e => e.name === "TokensPurchased");
    if (purchaseEvent) {
      console.log(`   🎉 Purchase Event Details:`);
      console.log(`      Purchaser: ${purchaseEvent.args.purchaser}`);
      console.log(`      Beneficiary: ${purchaseEvent.args.beneficiary}`);
      console.log(`      Payment Method: ${purchaseEvent.args.paymentMethod}`);
      console.log(`      Payment Amount: ${ethers.formatUnits(purchaseEvent.args.paymentAmount, decimals)} ${paymentMethod}`);
      console.log(`      Tokens Received: ${ethers.formatEther(purchaseEvent.args.tokensReceived)} MBT`);
      console.log(`      USD Value: $${ethers.formatEther(purchaseEvent.args.usdValue)}`);
    }
    
    // Check for slippage protection events
    const slippageEvent = events.find(e => e.name === "SlippageProtectionTriggered");
    if (slippageEvent) {
      console.log(`   ⚠️  Slippage Protection Triggered:`);
      console.log(`      Expected: ${ethers.formatEther(slippageEvent.args.expectedTokens)} MBT`);
      console.log(`      Actual: ${ethers.formatEther(slippageEvent.args.actualTokens)} MBT`);
      console.log(`      Slippage: ${slippageEvent.args.slippageBps.toString()} bps (${(Number(slippageEvent.args.slippageBps) / 100).toFixed(2)}%)`);
    }
    
    // Get final balances
    const finalTokenBalance = await token.balanceOf(recipient);
    const finalEthBalance = await ethers.provider.getBalance(recipient);
    console.log(`   💳 Final Balances:`);
    console.log(`      ${paymentMethod}: ${ethers.formatUnits(finalTokenBalance, decimals)}`);
    console.log(`      ETH: ${ethers.formatEther(finalEthBalance)}`);
    console.log(`   📊 Tokens Spent: ${ethers.formatUnits(initialTokenBalance - finalTokenBalance, decimals)} ${paymentMethod}`);
    console.log(`   📊 ETH Spent (gas): ${ethers.formatEther(initialEthBalance - finalEthBalance)}`);
    
  } catch (error) {
    console.log(`   ❌ ${paymentMethod} purchase failed:`);
    console.log(`      Error: ${error.message}`);
    console.log(`      Code: ${error.code || 'N/A'}`);
    console.log(`      Reason: ${error.reason || 'N/A'}`);
    if (error.data) {
      console.log(`      Data: ${error.data}`);
    }
    
    // Try to decode custom errors
    await decodeCustomError(error, paymentMethod);
    
    console.log(`      Stack: ${error.stack}`);
  }
}



async function decodeCustomError(error, asset) {
  try {
    if (error.data && error.data.length > 2) {
      const errorSig = error.data.slice(0, 10);
      console.log(`      Error Signature: ${errorSig}`);
      
      // Common ICO custom errors with their signatures
      const customErrors = {
        "0x4e6f74466f756e64": "OracleCallFailed",
        "0x496e76616c696441": "InvalidAddress", 
        "0x496e76616c696442": "InvalidBeneficiary",
        "0x496e76616c696441": "InvalidAmount",
        "0x416d6f756e744265": "AmountBelowMinimum",
        "0x546f6b656e547261": "TokenTransferFailed",
        "0x5a65726f4d696e74": "ZeroMint",
        "0x4f7261636c65496e": "OracleInvalidPrice",
        "0x4f7261636c655072": "OraclePriceStale",
        "0x4f7261636c655072": "OraclePriceTooOld",
        "0x4f7261636c65526f": "OracleRoundIncomplete",
        "0x5072696365446576": "PriceDeviationTooHigh",
        "0x536c697070616765": "SlippageExceeded",
        "0x44656661756c7453": "DefaultSlippageExceeded",
        "0x4e6f457468546f57": "NoEthToWithdraw",
        "0x4e6f546f6b656e73": "NoTokensToWithdraw",
        "0x496e737566666963": "InsufficientBalance",
        "0x496e76616c696450": "InvalidPaymentMethod",
        "0x536c697070616765": "SlippageToleranceTooHigh",
        "0x5072696365446576": "PriceDeviationToleranceTooHigh"
      };
      
      if (customErrors[errorSig]) {
        console.log(`      Decoded Error: ${customErrors[errorSig]}`);
      } else {
        console.log(`      Unknown custom error signature: ${errorSig}`);
      }
    }
  } catch (decodeError) {
    console.log(`      Could not decode error: ${decodeError.message}`);
  }
}

async function checkBalances(ico, deployment, recipient) {
  console.log("\n💳 Checking balances...");
  
  try {
    // Check MBT balance
    console.log(`   🪙 MBT Token Balance:`);
    const mbt = await ethers.getContractAt("contracts/tokens/MochaBeanToken.sol:MochaBeanToken", deployment.contracts.token);
    const mbtBalance = await mbt.balanceOf(recipient);
    const mbtDecimals = await mbt.decimals();
    console.log(`      Address: ${deployment.contracts.token}`);
    console.log(`      Balance: ${ethers.formatUnits(mbtBalance, mbtDecimals)} MBT`);
    
    // Check payment token balances
    console.log(`   💰 Payment Token Balances:`);
    const tokens = deployment.contracts.tokens;
    for (const [symbol, address] of Object.entries(tokens)) {
      try {
        const token = await ethers.getContractAt("contracts/test/MockERC20.sol:MockERC20", address);
        const balance = await token.balanceOf(recipient);
        const decimals = await token.decimals();
        const symbolFromContract = await token.symbol();
        console.log(`      ${symbol} (${symbolFromContract}): ${ethers.formatUnits(balance, decimals)}`);
        console.log(`         Address: ${address}`);
      } catch (tokenError) {
        console.log(`      ❌ Error checking ${symbol} balance: ${tokenError.message}`);
      }
    }
    
    // Check ETH balance
    console.log(`   ⛽ ETH Balance:`);
    const ethBalance = await ethers.provider.getBalance(recipient);
    console.log(`      Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Check ICO contract balances
    console.log(`   🏦 ICO Contract Balances:`);
    const icoEthBalance = await ethers.provider.getBalance(await ico.getAddress());
    console.log(`      ETH: ${ethers.formatEther(icoEthBalance)}`);
    
    for (const [symbol, address] of Object.entries(tokens)) {
      try {
        const token = await ethers.getContractAt("contracts/test/MockERC20.sol:MockERC20", address);
        const balance = await token.balanceOf(await ico.getAddress());
        const decimals = await token.decimals();
        console.log(`      ${symbol}: ${ethers.formatUnits(balance, decimals)}`);
      } catch (tokenError) {
        console.log(`      ❌ Error checking ICO ${symbol} balance: ${tokenError.message}`);
      }
    }
    
  } catch (error) {
    console.log(`   ⚠️  Error checking balances: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

async function displayICOStatistics(ico) {
  console.log("\n📊 ICO Statistics...");
  
  try {
    // Get basic ICO info
    const tokenRate = await ico.TOKEN_RATE_USD();
    const totalTokensSold = await ico.totalTokensSold();
    
    console.log(`   🎯 ICO Configuration:`);
    console.log(`      Token Rate: $${ethers.formatEther(tokenRate)} per MBT`);
    console.log(`      Total Tokens Sold: ${ethers.formatEther(totalTokensSold)} MBT`);
    console.log(`      Total USD Raised: $${ethers.formatEther(totalTokensSold * tokenRate)}`);
    
    // Get minimum purchase amounts
    const minEth = await ico.minEthPurchase();
    const minUsdt = await ico.minUsdtPurchase();
    const minUsdc = await ico.minUsdcPurchase();
    const minWbtc = await ico.minWbtcPurchase();
    const minScr = await ico.minScrPurchase();
    
    console.log(`   💰 Minimum Purchase Amounts:`);
    console.log(`      ETH: ${ethers.formatEther(minEth)}`);
    console.log(`      USDT: ${ethers.formatUnits(minUsdt, 6)}`);
    console.log(`      USDC: ${ethers.formatUnits(minUsdc, 6)}`);
    console.log(`      WBTC: ${ethers.formatUnits(minWbtc, 8)}`);
    console.log(`      SCR: ${ethers.formatEther(minScr)}`);
    
    // Get purchase statistics
    const stats = await ico.getPurchaseStatistics();
    console.log(`   📈 Purchase Statistics by Asset:`);
    console.log(`      ETH: $${ethers.formatEther(stats.totalUsdValueEth)} (${ethers.formatEther(stats.totalVolumeEth)} ETH)`);
    console.log(`      USDT: $${ethers.formatEther(stats.totalUsdValueUsdt)} (${ethers.formatUnits(stats.totalVolumeUsdt, 6)} USDT)`);
    console.log(`      USDC: $${ethers.formatEther(stats.totalUsdValueUsdc)} (${ethers.formatUnits(stats.totalVolumeUsdc, 6)} USDC)`);
    console.log(`      WBTC: $${ethers.formatEther(stats.totalUsdValueWbtc)} (${ethers.formatUnits(stats.totalVolumeWbtc, 8)} WBTC)`);
    console.log(`      SCR: $${ethers.formatEther(stats.totalUsdValueScr)} (${ethers.formatEther(stats.totalVolumeScr)} SCR)`);
    
    // Calculate totals
    const totalUsdRaised = stats.totalUsdValueEth + stats.totalUsdValueUsdt + stats.totalUsdValueUsdc + stats.totalUsdValueWbtc + stats.totalUsdValueScr;
    console.log(`   🎯 Total USD Raised: $${ethers.formatEther(totalUsdRaised)}`);
    
  } catch (error) {
    console.log(`   ⚠️  Error getting ICO statistics: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

async function displayNetworkInfo() {
  console.log("🌐 Network Information:");
  const network = await ethers.provider.getNetwork();
  const blockNumber = await ethers.provider.getBlockNumber();
  const gasPrice = await ethers.provider.getFeeData();
  
  console.log(`   Network: ${network.name} (${network.chainId})`);
  console.log(`   Current Block: ${blockNumber}`);
  console.log(`   Gas Price: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei`);
  if (gasPrice.maxFeePerGas) {
    console.log(`   Max Fee Per Gas: ${ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei')} gwei`);
  }
  if (gasPrice.maxPriorityFeePerGas) {
    console.log(`   Max Priority Fee: ${ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei')} gwei`);
  }
  console.log("");
}

async function main() {
  console.log("🚀 ICO Contract Interaction Script - Scroll Sepolia\n");
  
  // Display network information
  await displayNetworkInfo();
  
  // Load deployment info
  const deployment = await loadDeploymentInfo();
  console.log(`📡 Deployment Information:`);
  console.log(`   Network: ${deployment.network} (Chain ID: ${deployment.chainId})`);
  console.log(`   ICO Contract: ${deployment.contracts.ico}`);
  console.log(`   MBT Token: ${deployment.contracts.token}`);
  console.log(`   Deployment Date: ${deployment.timestamp || 'Unknown'}`);
  console.log(`   Payment Tokens:`);
  for (const [symbol, address] of Object.entries(deployment.contracts.tokens)) {
    console.log(`      ${symbol}: ${address}`);
  }
  console.log("");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  const recipient = getCliArg("to") || signer.address;
  console.log(`👤 Account Information:`);
  console.log(`   Signer: ${signer.address}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   Signer Balance: ${ethers.formatEther(await ethers.provider.getBalance(signer.address))} ETH`);
  console.log("");
  
  // Get ICO contract
  const ico = await ethers.getContractAt("contracts/ICO/ICO.sol:ICO", deployment.contracts.ico);
  
  // Display ICO statistics
  await displayICOStatistics(ico);
  
  // Get current prices
  await getCurrentPrices(ico);
  
  // Test individual price feeds
  await testIndividualPriceFeeds(ico);
  
  // Check initial balances
  await checkBalances(ico, deployment, recipient);
  
  // Handle purchase commands
  const buyEthAmount = "0.002";
  const buyUsdtAmount = "1";
  const buyUsdcAmount = "1";
  const buyWbtcAmount = "0.0001";
  const buyScrAmount = "0.00025";
  
  let purchaseExecuted = false;
  
  if (buyEthAmount) {
    const amount = ethers.parseEther(buyEthAmount);
    await buyWithEth(ico, amount, recipient);
    purchaseExecuted = true;
  }
  
  if (buyUsdtAmount) {
    const amount = ethers.parseUnits(buyUsdtAmount, 6); // USDT has 6 decimals
    await buyWithErc20(ico, deployment.contracts.tokens.USDT, amount, recipient, "USDT");
    purchaseExecuted = true;
  }
  
  if (buyUsdcAmount) {
    const amount = ethers.parseUnits(buyUsdcAmount, 6); // USDC has 6 decimals
    await buyWithErc20(ico, deployment.contracts.tokens.USDC, amount, recipient, "USDC");
    purchaseExecuted = true;
  }
  
  if (buyWbtcAmount) {
    const amount = ethers.parseUnits(buyWbtcAmount, 8); // WBTC has 8 decimals
    await buyWithErc20(ico, deployment.contracts.tokens.WBTC, amount, recipient, "WBTC");
    purchaseExecuted = true;
  }
  
  if (buyScrAmount) {
    const amount = ethers.parseEther(buyScrAmount); // SCR has 18 decimals
    await buyWithErc20(ico, deployment.contracts.tokens.SCR, amount, recipient, "SCR");
    purchaseExecuted = true;
  }
  
  // If no purchase commands, show preview examples
  if (!purchaseExecuted) {
    console.log("\n📋 Preview Examples:");
    console.log("   These are preview calculations - no actual purchases will be made\n");
    
    await previewPurchase(ico, "ETH", ethers.parseEther("0.1"));
    await previewPurchase(ico, "USDT", ethers.parseUnits("100", 6));
    await previewPurchase(ico, "USDC", ethers.parseUnits("100", 6));
    await previewPurchase(ico, "WBTC", ethers.parseUnits("1", 8));
    await previewPurchase(ico, "SCR", ethers.parseEther("1000"));
    
    console.log("\n💡 Usage Examples:");
    console.log("   # Buy with ETH");
    console.log("   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-eth 0.1");
    console.log("   ");
    console.log("   # Buy with USDT");
    console.log("   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-usdt 100");
    console.log("   ");
    console.log("   # Buy with USDC");
    console.log("   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-usdc 100");
    console.log("   ");
    console.log("   # Buy with WBTC");
    console.log("   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-wbtc 0.01");
    console.log("   ");
    console.log("   # Buy with SCR");
    console.log("   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-scr 1000");
    console.log("   ");
    console.log("   # Send tokens to different address");
    console.log("   npx hardhat run scripts/interact-ico-scroll-sepolia.js --network scrollSepolia --buy-eth 0.1 --to 0x...");
  }
  
  // Check final balances if a purchase was made
  if (purchaseExecuted) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 POST-TRANSACTION SUMMARY");
    console.log("=".repeat(60));
    await checkBalances(ico, deployment, recipient);
    await displayICOStatistics(ico);
  }
  
  console.log("\n✅ Interaction complete!");
}

main().catch((err) => {
  console.error("❌ Interaction script failed:", err);
  process.exit(1);
});
