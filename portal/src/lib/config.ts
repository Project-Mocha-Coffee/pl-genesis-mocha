// lib/config.ts
import { createConfig, http } from 'wagmi';
import { scroll, base, baseSepolia } from 'wagmi/chains';
import type { ContractAddresses } from "./types"

// Network-specific contract addresses
// Chain IDs: Scroll = 534352, Base = 8453, Base Sepolia = 84532
export const CONTRACT_ADDRESSES_BY_CHAIN: Record<number, ContractAddresses> = {
  // Scroll Mainnet (Chain ID: 534352)
  534352: {
    mttrVault: "0x3BE94b5CcfDd92bBE2e08E43D01900F36eeB3100",
    diamond: "0x31058580845A8ed67F404fF5863b30f1b8CF7412",
    mbtToken: "0xA5ea95B787629Feb727D25A7c6bFb01f0eE2cBD1",
    mltToken: "0x53815508558bF029ecBE190A4631876783ac27e6",
    mttToken: "0x52cEf0a50A38AD9468C5fde0292E7c2FbB0AaDb5",
    vaultFacet: "0xE617C8Dcc75604E86826eBdDc0352b7D3eb120CC",
    diamondCutFacet: "0x4322ec4FbA74e17dd4f7600b7aAdD6025F612917",
    bondLib: "0xb9D9A6F6c3517861A5aa672B54d3E384A31Ce830",
    farmLib: "0x7021819f84009935C25D60165A90e934046C2bbb",
    yieldLib: "0x96c0Fb5F1f4668e5Ce80A486a6aA50D93E1EFA9d",
  },
  // Base Sepolia Testnet (Chain ID: 84532)
  84532: {
    mttrVault: "0xD41D556d69BbDd8a1e0d4fCE4F95674D74d127B8",
    diamond: "0xaf1804E92BAfC44e4BC212Dc8204C96684FD6f15",
    mbtToken: "0xdb56AF2092C1e162e0cb503CeC5500ba16bfb8e8",
    mltToken: "0x26B28FB75cd0184E816e447e56Cfc3D4658d0C29",
    mttToken: "0xb28b4DB5C7Ce83C67596105558c348E0c2e88108",
    vaultFacet: "0x9Ae75B51E239e6b748e9E6D52b08c10abB810f70",
    diamondCutFacet: "0x4475AA786AD802B70092e9B43B40C5ed8fCA099c",
    bondLib: "0x8FF07116603Cf11208F3285Ea3083d32D25baCED",
    farmLib: "0x3Bd5C6a9de23512bB1810ff3168f002b5eF252Da",
    yieldLib: "0x65D71DfE058D716FE7e56a819559723B828F3cB6",
  },
  // Base Mainnet (Chain ID: 8453)
  8453: {
    mttrVault: "0x770b76236191E777705149635Df7cB5e9D7bb487",
    diamond: "0xc2fDefAbe80eD7d9e19DF9f48C5A3c9F40059660",
    mbtToken: "0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a",
    mltToken: "0xeE74c3c275046a73079C52D418E524696127d4Eb",
    mttToken: "0xE2D3A75dDC776BA4e4D91b1660F7806836Dec33d",
    vaultFacet: "0x995Dd1842Ac0C6cC00A244c082A36dD7522c5678", // MultiTrancheVaultFacet
    diamondCutFacet: "0x438bB93A41D06B44f4345C860c782e6EA72eFC47",
    bondLib: "0x0da2a09Cb3eF631c144267688C74C309822bb717",
    farmLib: "0xf770E6fF0b8623e59C98020c6B025aa36ad89833",
    yieldLib: "0x8dB8F76861DC7779F8B61751705C4a40D3729b52",
  },
}

// ICO Contract addresses by chain
export const ICO_ADDRESSES_BY_CHAIN: Record<number, string> = {
  534352: "0x86532F0F0BEA64Bd3902d865729Cd988E560c165", // Scroll Mainnet
  84532: "0x8732f0080B549f6ECCeceFF5744734278fD0E8a2", // Base Sepolia
  8453: "0x01Ea048190830F5264e860f06687d6ADFDb33847", // Base Mainnet
}

// Helper function to get contract addresses for a specific chain
export function getContractAddresses(chainId: number): ContractAddresses {
  const addresses = CONTRACT_ADDRESSES_BY_CHAIN[chainId];
  if (!addresses) {
    console.warn(`No contract addresses found for chain ID ${chainId}, falling back to Scroll`);
    return CONTRACT_ADDRESSES_BY_CHAIN[534352]; // Fallback to Scroll
  }
  return addresses;
}

// Helper function to get ICO address for a specific chain.
// Scroll and Base use their own ICO; fallback to Scroll only for unknown chain IDs.
export function getICOAddress(chainId: number): string {
  const address = ICO_ADDRESSES_BY_CHAIN[chainId];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    console.warn(`No ICO address found for chain ID ${chainId}, falling back to Scroll`);
    return ICO_ADDRESSES_BY_CHAIN[534352]; // Fallback to Scroll for unsupported chains only
  }
  return address;
}

// Legacy export for backward compatibility (defaults to Scroll)
export const CONTRACT_ADDRESSES: ContractAddresses = CONTRACT_ADDRESSES_BY_CHAIN[534352];

// Admin addresses by chain
export const ADMIN_ADDRESSES_BY_CHAIN: Record<number, string> = {
  534352: "0x6ed208C1E6a012118194C4457fE8Dc3215ea971a", // Scroll
  84532: "0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795", // Base Sepolia
  8453: "0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795", // Base Mainnet
}

export const ADMIN_ADDRESS = ADMIN_ADDRESSES_BY_CHAIN[534352]; // Default to Scroll

const isProd = process.env.NODE_ENV === 'production'

export const config = createConfig({
  chains: isProd ? [scroll, base] : [scroll, base, baseSepolia],
  transports: {
      [scroll.id]: http(),
    [base.id]: http(),
    ...(isProd ? {} : { [baseSepolia.id]: http() }),
  },
});

export const SUPPORTED_CHAINS = isProd ? [scroll, base] : [scroll, base, baseSepolia];

// Determine default chain based on environment
// Multi-chain: Users can choose their preferred network
// Priority: Environment variable > First available network
function getDefaultChain() {
  const envDefaultChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID
  if (envDefaultChain) {
    const chainId = parseInt(envDefaultChain, 10)
    if (chainId === 8453) return base // Base mainnet
    if (chainId === 84532) return baseSepolia // Base Sepolia
    if (chainId === 534352) return scroll // Scroll
  }
  
  // Multi-chain: Return first available network as default
  // Users can switch to any supported network via NetworkSelector
  return scroll || base || baseSepolia
}

export const SUPPORTED_CHAIN = getDefaultChain(); // Initial default (users can choose any network)

// Explorer URLs by chain
export const EXPLORER_URLS_BY_CHAIN: Record<number, string> = {
  534352: "https://scrollscan.com/tx/", // Scroll Mainnet
  84532: "https://sepolia.basescan.org/tx/", // Base Sepolia
  8453: "https://basescan.org/tx/", // Base Mainnet
}

// Explorer names by chain
export const EXPLORER_NAMES_BY_CHAIN: Record<number, string> = {
  534352: "Scroll Explorer",
  84532: "BaseScan",
  8453: "BaseScan",
}

// Helper function to get explorer URL for a transaction
export function getExplorerUrl(chainId: number, txHash: string): string {
  const baseUrl = EXPLORER_URLS_BY_CHAIN[chainId] || EXPLORER_URLS_BY_CHAIN[534352]; // Fallback to Scroll
  return `${baseUrl}${txHash}`;
}

// Helper function to get explorer name for a chain
export function getExplorerName(chainId: number): string {
  return EXPLORER_NAMES_BY_CHAIN[chainId] || EXPLORER_NAMES_BY_CHAIN[534352]; // Fallback to Scroll
}