require("@nomicfoundation/hardhat-toolbox");
require("hardhat-ignore-warnings");
require("@typechain/hardhat");
require("@nomicfoundation/hardhat-ethers");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    dontOverrideCompile: false,
  },
  warnings: "warn",
  outputSelection: {
    "*": {
      "": ["ast"],
      "*": [
        "abi",
        "metadata",
        "devdoc",
        "userdoc",
        "storageLayout",
        "evm.legacyAssembly",
        "evm.bytecode",
        "evm.deployedBytecode",
        "evm.methodIdentifiers",
        "evm.gasEstimates",
        "evm.assembly",
      ],
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Scroll zkEVM Networks
    scroll: {
      url: process.env.SCROLL_RPC_URL || "https://rpc.scroll.io/",
      chainId: 534352,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
      httpHeaders: {},
    },
    scrollSepolia: {
      url: process.env.SCROLL_SEPOLIA_RPC_URL || "https://sepolia-rpc.scroll.io/",
      chainId: 534351,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto", 
      gas: "auto",
      timeout: 60000,
      httpHeaders: {},
    },
    // Additional RPC options for Scroll mainnet
    scrollAnkr: {
      url: "https://rpc.ankr.com/scroll",
      chainId: 534352,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },
    // Base Networks
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
      httpHeaders: {},
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 120000, // Increased timeout
      httpHeaders: {},
    },
    // Alternative Base RPC endpoints
    baseAnkr: {
      url: "https://rpc.ankr.com/base",
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },
    basePublicNode: {
      url: "https://base-mainnet.public.blastapi.io",
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
    },
  },
  etherscan: {
    apiKey: {
      scroll: process.env.SCROLL_API_KEY || "abc",
      scrollSepolia: process.env.SCROLL_API_KEY || "abc",
      base: process.env.BASE_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      baseSepolia: process.env.BASE_API_KEY || process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "scroll",
        chainId: 534352,
        urls: {
          apiURL: "https://api.scrollscan.com/api",
          browserURL: "https://scrollscan.com",
        },
      },
      {
        network: "scrollSepolia",
        chainId: 534351,
        urls: {
          apiURL: "https://api-sepolia.scrollscan.com/api",
          browserURL: "https://sepolia.scrollscan.com",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  coverage: {
    provider: "hardhat",
    reporter: ["text", "html", "lcov", "json"],
    exclude: [
      "contracts/test/**/*",
      "contracts/mocks/**/*.sol",
      "test/**/*",
      "**/*.t.sol",
      "**/*Mock*.sol",
      "**/interfaces/**",
      "**/types/**",
    ],
    skipFiles: [
      "test/",
      "mocks/",
      "contracts/test/",
      "contracts/mocks/",
      "interfaces/",
      "types/",
    ],
    // Coverage thresholds for audit readiness
    statements: 80,
    branches: 75,
    functions: 85,
    lines: 80,
  },
};
