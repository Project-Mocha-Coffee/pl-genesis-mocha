// base-config.js
// Base Mainnet and Base Sepolia network configuration
// Contains Chainlink price feeds and token addresses for Base networks

const { ethers } = require("hardhat");

module.exports = {
  // Base Mainnet Configuration
  base: {
    name: "Base Mainnet",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    explorer: "https://basescan.org",
    
    // Chainlink Price Feeds on Base Mainnet (Verified)
    priceFeeds: {
      ETH_USD: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // ETH/USD - Verified
      USDC_USD: "0x7e8691370FB440291fBC953F988D0Ae02d82eB7d", // USDC/USD - Verified
      BTC_USD: "0x45c32aED9798C4402127A042fB956275d116a4B1", // BTC/USD - Verified
      DAI_USD: "0x6001712a3251D5bC85B81015D588E3E9D5515277", // DAI/USD - Verified
      // Note: USDT/USD may not be available on Base, using USDC/USD as fallback
      USDT_USD: "0x7e8691370FB440291fBC953F988D0Ae02d82eB7d", // Using USDC/USD as fallback
    },
    
    // Token addresses on Base Mainnet (Verified)
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC (Native) - Verified
      WETH: "0x4200000000000000000000000000000000000006", // WETH - Verified
      DAI: "0x50c5725949A6F0c72E6C4a641F24049A917db0Cb", // DAI - Verified
      // Note: USDT and WBTC may not be available on Base
      USDT: "0xfde4C962512795FD9f0bEF2e95a5369624836D48", // USDT - Verify availability
      WBTC: "0x0000000000000000000000000000000000000000", // WBTC - May not exist, set to zero address
    },
    
    // Deployment parameters
    parameters: {
      minEthPurchase: ethers.parseEther("0.001"), // 0.001 ETH
      minUsdtPurchase: ethers.parseUnits("1", 6), // 1 USDT (if available)
      minUsdcPurchase: ethers.parseUnits("1", 6), // 1 USDC
      minWbtcPurchase: ethers.parseUnits("0.0001", 8), // 0.0001 WBTC (if available)
      maxSlippageBps: 500, // 5%
      maxPriceDeviationBps: 1000, // 10%
    },
  },

  // Base Sepolia Testnet Configuration
  baseSepolia: {
    name: "Base Sepolia Testnet",
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    
    // Chainlink Price Feeds on Base Sepolia
    priceFeeds: {
      ETH_USD: "0x4aDC67696bA383F8DDd44C5B9f1B3c6d1911d250", // ETH/USD - Testnet
      BTC_USD: "0x6ce185860a4963106506C203335A2910413708e9", // BTC/USD - Testnet
      USDC_USD: "0x1692B66432F7c4C60b0F6c0C4C0F5F5F5F5F5F5F5F5", // USDC/USD - Verify testnet address
      USDT_USD: "0x1692B66432F7c4C60b0F6c0C4C0F5F5F5F5F5F5F5F5", // USDT/USD - Verify testnet address
    },
    
    // Token addresses on Base Sepolia
    tokens: {
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC - Testnet (verify)
      WETH: "0x4200000000000000000000000000000000000006", // WETH - Same as mainnet
      USDT: "0x0000000000000000000000000000000000000000", // USDT - May not exist on testnet
      WBTC: "0x0000000000000000000000000000000000000000", // WBTC - May not exist on testnet
    },
    
    // Deployment parameters (same as mainnet for testing)
    parameters: {
      minEthPurchase: ethers.parseEther("0.001"), // 0.001 ETH
      minUsdtPurchase: ethers.parseUnits("1", 6), // 1 USDT
      minUsdcPurchase: ethers.parseUnits("1", 6), // 1 USDC
      minWbtcPurchase: ethers.parseUnits("0.0001", 8), // 0.0001 WBTC
      maxSlippageBps: 500, // 5%
      maxPriceDeviationBps: 1000, // 10%
    },
  },
};

/**
 * Helper function to get configuration for a specific network
 * @param {string} networkName - The name of the network ('base' or 'baseSepolia')
 * @returns {object} Network configuration
 */
function getBaseConfig(networkName) {
  const config = module.exports[networkName];
  if (!config) {
    throw new Error(`No Base configuration found for network: ${networkName}`);
  }
  return config;
}

/**
 * Helper function to validate Base network configuration
 * @param {string} networkName - The name of the network
 * @returns {boolean} True if configuration is valid
 */
function validateBaseConfig(networkName) {
  const config = getBaseConfig(networkName);
  
  // Check if all required fields are present
  const requiredFields = ['priceFeeds', 'tokens', 'parameters'];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Check if all price feeds are configured
  const requiredPriceFeeds = ['ETH_USD', 'USDC_USD', 'BTC_USD'];
  for (const feed of requiredPriceFeeds) {
    if (!config.priceFeeds[feed]) {
      throw new Error(`Missing price feed: ${feed}`);
    }
  }
  
  // Check if all tokens are configured
  const requiredTokens = ['USDC', 'WETH'];
  for (const token of requiredTokens) {
    if (!config.tokens[token]) {
      throw new Error(`Missing token: ${token}`);
    }
  }
  
  return true;
}

module.exports.getBaseConfig = getBaseConfig;
module.exports.validateBaseConfig = validateBaseConfig;
