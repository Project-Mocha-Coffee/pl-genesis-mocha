const { ethers } = require("hardhat");

/**
 * ICO Deployment Configuration
 * 
 * This file contains network-specific configurations for deploying the ICO contract.
 * Update the addresses below with the actual contract addresses for each network.
 */

module.exports = {
  // Scroll Mainnet Configuration
  scroll: {
    name: "Scroll Mainnet",
    chainId: 534352,
    // Chainlink Price Feeds on Scroll Mainnet
    priceFeeds: {
      ETH_USD: "0x6bF14CB0A831078629D993FDeBcB182b21A8774C", // ETH/USD
      USDT_USD: "0x0000000000000000000000000000000000000000", // USDT/USD - NEED ACTUAL ADDRESS
      USDC_USD: "0x0000000000000000000000000000000000000000", // USDC/USD - NEED ACTUAL ADDRESS
      BTC_USD: "0x0000000000000000000000000000000000000000", // BTC/USD - NEED ACTUAL ADDRESS
      SCR_USD: "0x0000000000000000000000000000000000000000", // SCR/USD - NEED ACTUAL ADDRESS
    },
    // Token addresses on Scroll Mainnet
    tokens: {
      USDT: "0x0000000000000000000000000000000000000000", // USDT - NEED ACTUAL ADDRESS
      USDC: "0x0000000000000000000000000000000000000000", // USDC - NEED ACTUAL ADDRESS
      WBTC: "0x0000000000000000000000000000000000000000", // WBTC - NEED ACTUAL ADDRESS
      SCR: "0x0000000000000000000000000000000000000000", // SCR - NEED ACTUAL ADDRESS
    },
    // Deployment parameters
    parameters: {
      minEthPurchase: ethers.parseEther("0.001"), // 0.001 ETH
      minUsdtPurchase: ethers.parseUnits("1", 6), // 1 USDT
      minUsdcPurchase: ethers.parseUnits("1", 6), // 1 USDC
      minWbtcPurchase: ethers.parseUnits("0.0001", 8), // 0.0001 WBTC
      minScrPurchase: ethers.parseEther("1"), // 1 SCR
      maxSlippageBps: 500, // 5%
      maxPriceDeviationBps: 1000, // 10%
    },
  },

  // Scroll Sepolia Testnet Configuration
  scrollSepolia: {
    name: "Scroll Sepolia Testnet",
    chainId: 534351,
    // Chainlink Price Feeds on Scroll Sepolia
    priceFeeds: {
      ETH_USD: "0x6bF14CB0A831078629D993FDeBcB182b21A8774C", // ETH/USD
      USDT_USD: "0x0000000000000000000000000000000000000000", // USDT/USD - NEED ACTUAL ADDRESS
      USDC_USD: "0x0000000000000000000000000000000000000000", // USDC/USD - NEED ACTUAL ADDRESS
      BTC_USD: "0x0000000000000000000000000000000000000000", // BTC/USD - NEED ACTUAL ADDRESS
      SCR_USD: "0x0000000000000000000000000000000000000000", // SCR/USD - NEED ACTUAL ADDRESS
    },
    // Token addresses on Scroll Sepolia
    tokens: {
      USDT: "0x0000000000000000000000000000000000000000", // USDT - NEED ACTUAL ADDRESS
      USDC: "0x0000000000000000000000000000000000000000", // USDC - NEED ACTUAL ADDRESS
      WBTC: "0x0000000000000000000000000000000000000000", // WBTC - NEED ACTUAL ADDRESS
      SCR: "0x0000000000000000000000000000000000000000", // SCR - NEED ACTUAL ADDRESS
    },
    // Deployment parameters
    parameters: {
      minEthPurchase: ethers.parseEther("0.001"), // 0.001 ETH
      minUsdtPurchase: ethers.parseUnits("1", 6), // 1 USDT
      minUsdcPurchase: ethers.parseUnits("1", 6), // 1 USDC
      minWbtcPurchase: ethers.parseUnits("0.0001", 8), // 0.0001 WBTC
      minScrPurchase: ethers.parseEther("1"), // 1 SCR
      maxSlippageBps: 500, // 5%
      maxPriceDeviationBps: 1000, // 10%
    },
  },

  // Local development configuration
  localhost: {
    name: "Local Development",
    chainId: 31337,
    // Mock addresses for local development (will be deployed automatically)
    priceFeeds: {
      ETH_USD: "0x0000000000000000000000000000000000000000", // Will be deployed
      USDT_USD: "0x0000000000000000000000000000000000000000", // Will be deployed
      USDC_USD: "0x0000000000000000000000000000000000000000", // Will be deployed
      BTC_USD: "0x0000000000000000000000000000000000000000", // Will be deployed
      SCR_USD: "0x0000000000000000000000000000000000000000", // Will be deployed
    },
    tokens: {
      USDT: "0x0000000000000000000000000000000000000000", // Will be deployed
      USDC: "0x0000000000000000000000000000000000000000", // Will be deployed
      WBTC: "0x0000000000000000000000000000000000000000", // Will be deployed
      SCR: "0x0000000000000000000000000000000000000000", // Will be deployed
    },
    // Deployment parameters
    parameters: {
      minEthPurchase: ethers.parseEther("0.001"), // 0.001 ETH
      minUsdtPurchase: ethers.parseUnits("1", 6), // 1 USDT
      minUsdcPurchase: ethers.parseUnits("1", 6), // 1 USDC
      minWbtcPurchase: ethers.parseUnits("0.0001", 8), // 0.0001 WBTC
      minScrPurchase: ethers.parseEther("1"), // 1 SCR
      maxSlippageBps: 500, // 5%
      maxPriceDeviationBps: 1000, // 10%
    },
  },
};

/**
 * Helper function to get configuration for a specific network
 * @param {string} networkName - The name of the network
 * @returns {object} Network configuration
 */
function getNetworkConfig(networkName) {
  const config = module.exports[networkName];
  if (!config) {
    throw new Error(`No configuration found for network: ${networkName}`);
  }
  return config;
}

/**
 * Helper function to validate network configuration
 * @param {string} networkName - The name of the network
 * @returns {boolean} True if configuration is valid
 */
function validateNetworkConfig(networkName) {
  const config = getNetworkConfig(networkName);
  
  // Check if all required fields are present
  const requiredFields = ['priceFeeds', 'tokens', 'parameters'];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Check if all price feeds are configured
  const requiredPriceFeeds = ['ETH_USD', 'USDT_USD', 'USDC_USD', 'BTC_USD', 'SCR_USD'];
  for (const feed of requiredPriceFeeds) {
    if (!config.priceFeeds[feed]) {
      throw new Error(`Missing price feed: ${feed}`);
    }
  }
  
  // Check if all tokens are configured
  const requiredTokens = ['USDT', 'USDC', 'WBTC', 'SCR'];
  for (const token of requiredTokens) {
    if (!config.tokens[token]) {
      throw new Error(`Missing token: ${token}`);
    }
  }
  
  return true;
}

module.exports.getNetworkConfig = getNetworkConfig;
module.exports.validateNetworkConfig = validateNetworkConfig;
