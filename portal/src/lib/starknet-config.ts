// Starknet Mainnet configuration for Project Mocha
// Contracts deployed: MBTToken + FarmRegistry

export const STARKNET_CHAIN_KEY = "SN_MAIN"

export const STARKNET_RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
  "https://free-rpc.nethermind.io/mainnet-juno/rpc/v0_7"

export const STARKNET_ADDRESSES = {
  mbtToken: "0x04a91f423a6f8795820e35784d6fbd94cca7dc4250b7721ec3c9d8ff761047ec",
  farmRegistry: "0x01f260921259669dd5660e9ea52c8745f537c3c250303478c4c4a933d4be7278",
  ownerAddress: "0x069a1e085682601c67c0aaad1b2396dbd9729f10d71651832de2483429ea7b22",
  /** When set, portal uses ICO flow (approve + buy_with_eth) for automatic MBT mint. */
  icoAddress: process.env.NEXT_PUBLIC_STARKNET_ICO_ADDRESS ?? "",
}

// Minimal ABI fragments for starknet.js Contract reads
export const MBT_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "core::starknet::contract_address::ContractAddress" }],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
  {
    name: "total_supply",
    type: "function",
    inputs: [],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
] as const

export const FARM_REGISTRY_ABI = [
  {
    name: "get_farm_total_trees",
    type: "function",
    inputs: [{ name: "id", type: "core::integer::u128" }],
    outputs: [{ type: "core::integer::u128" }],
    state_mutability: "view",
  },
  {
    name: "get_farm_allocated_trees",
    type: "function",
    inputs: [{ name: "id", type: "core::integer::u128" }],
    outputs: [{ type: "core::integer::u128" }],
    state_mutability: "view",
  },
  {
    name: "get_farm_apy_bps",
    type: "function",
    inputs: [{ name: "id", type: "core::integer::u128" }],
    outputs: [{ type: "core::integer::u16" }],
    state_mutability: "view",
  },
  {
    name: "get_farm_is_active",
    type: "function",
    inputs: [{ name: "id", type: "core::integer::u128" }],
    outputs: [{ type: "core::bool" }],
    state_mutability: "view",
  },
  {
    name: "total_investors",
    type: "function",
    inputs: [],
    outputs: [{ type: "core::integer::u64" }],
    state_mutability: "view",
  },
] as const

export interface StarknetFarmData {
  totalTrees: number
  allocatedTrees: number
  apyBps: number
  isActive: boolean
  totalInvestors: number
}

export interface StarknetPortfolioData {
  mbtBalance: string      // formatted, e.g. "1000.00"
  mbtTotalSupply: string
  farm: StarknetFarmData | null
}
