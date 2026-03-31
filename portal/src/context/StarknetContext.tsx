"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  STARKNET_ADDRESSES,
  STARKNET_CHAIN_KEY,
  STARKNET_RPC_URL,
  type StarknetPortfolioData,
} from "@/lib/starknet-config"

// ─── Types ────────────────────────────────────────────────────────────────────

interface StarknetContextState {
  /** Whether the user has selected Starknet as their active chain */
  isStarknetMode: boolean
  setStarknetMode: (active: boolean) => void

  /** Connected Starknet wallet address (hex) or null */
  starknetAddress: string | null

  /** Opens Braavos / Argent X wallet selector */
  connectStarknet: () => Promise<void>
  disconnectStarknet: () => void

  isConnecting: boolean
  connectError: string | null

  /** On-chain data from Starknet mainnet */
  portfolio: StarknetPortfolioData | null
  isLoadingPortfolio: boolean
  refreshPortfolio: () => void
}

const StarknetContext = createContext<StarknetContextState | null>(null)

// ─── Utility: format u256 felt pair → human-readable string ──────────────────

function formatU256(low: bigint, high: bigint, decimals = 18): string {
  const raw = low + high * (1n << 128n)
  if (raw === 0n) return "0.00"
  const divisor = 10n ** BigInt(decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 2)
  return `${whole.toString()}.${fracStr}`
}

// ─── Starknet JS helpers (dynamic import to avoid SSR issues) ─────────────────

async function getProvider() {
  const { RpcProvider } = await import("starknet")
  return new RpcProvider({ nodeUrl: STARKNET_RPC_URL })
}

async function getContract(abi: readonly object[], address: string, providerOrAccount?: unknown) {
  const { Contract, RpcProvider } = await import("starknet")
  const p = providerOrAccount ?? new RpcProvider({ nodeUrl: STARKNET_RPC_URL })
  return new Contract(abi as object[], address, p as Parameters<typeof Contract>[2])
}

async function fetchPortfolio(address: string | null): Promise<StarknetPortfolioData> {
  const { RpcProvider, Contract } = await import("starknet")
  const {
    MBT_ABI,
    FARM_REGISTRY_ABI,
  } = await import("@/lib/starknet-config")

  const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL })

  // ── MBT balance ──────────────────────────────────────────────────────────
  const mbtContract = new Contract(MBT_ABI as object[], STARKNET_ADDRESSES.mbtToken, provider)

  let mbtBalance = "0.00"
  if (address) {
    try {
      const balResult = await mbtContract.call("balanceOf", [address])
      // starknet.js returns u256 as { low, high } or just a bigint depending on version
      if (typeof balResult === "object" && balResult !== null && "low" in balResult) {
        const r = balResult as { low: bigint; high: bigint }
        mbtBalance = formatU256(r.low, r.high)
      } else if (typeof balResult === "bigint") {
        mbtBalance = formatU256(balResult, 0n)
      }
    } catch {
      mbtBalance = "0.00"
    }
  }

  let mbtTotalSupply = "0.00"
  try {
    const supplyResult = await mbtContract.call("total_supply", [])
    if (typeof supplyResult === "object" && supplyResult !== null && "low" in supplyResult) {
      const r = supplyResult as { low: bigint; high: bigint }
      mbtTotalSupply = formatU256(r.low, r.high)
    } else if (typeof supplyResult === "bigint") {
      mbtTotalSupply = formatU256(supplyResult, 0n)
    }
  } catch {
    mbtTotalSupply = "0.00"
  }

  // ── Farm data ────────────────────────────────────────────────────────────
  const farmContract = new Contract(
    FARM_REGISTRY_ABI as object[],
    STARKNET_ADDRESSES.farmRegistry,
    provider,
  )

  let farm = null
  try {
    const FARM_ID = "1"
    const [totalTrees, allocatedTrees, apyBps, isActive, totalInvestors] = await Promise.all([
      farmContract.call("get_farm_total_trees", [FARM_ID]),
      farmContract.call("get_farm_allocated_trees", [FARM_ID]),
      farmContract.call("get_farm_apy_bps", [FARM_ID]),
      farmContract.call("get_farm_is_active", [FARM_ID]),
      farmContract.call("total_investors", []),
    ])

    const toNum = (v: unknown) => {
      if (typeof v === "bigint") return Number(v)
      if (typeof v === "number") return v
      return 0
    }

    farm = {
      totalTrees: toNum(totalTrees),
      allocatedTrees: toNum(allocatedTrees),
      apyBps: toNum(apyBps),
      isActive: Boolean(isActive),
      totalInvestors: toNum(totalInvestors),
    }
  } catch {
    farm = null
  }

  return { mbtBalance, mbtTotalSupply, farm }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StarknetProvider({ children }: { children: ReactNode }) {
  const [isStarknetMode, setIsStarknetMode] = useState(false)
  const [starknetAddress, setStarknetAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [portfolio, setPortfolio] = useState<StarknetPortfolioData | null>(null)
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false)
  const fetchRef = useRef(0)

  // Restore persisted address on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = sessionStorage.getItem("starknet_address")
    if (saved) setStarknetAddress(saved)
  }, [])

  // Auto-fetch portfolio when entering Starknet mode
  useEffect(() => {
    if (!isStarknetMode) return
    refreshPortfolio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarknetMode, starknetAddress])

  const refreshPortfolio = useCallback(() => {
    const id = ++fetchRef.current
    setIsLoadingPortfolio(true)
    fetchPortfolio(starknetAddress)
      .then((data) => {
        if (id !== fetchRef.current) return
        setPortfolio(data)
      })
      .catch(console.error)
      .finally(() => {
        if (id === fetchRef.current) setIsLoadingPortfolio(false)
      })
  }, [starknetAddress])

  const connectStarknet = useCallback(async () => {
    setIsConnecting(true)
    setConnectError(null)
    try {
      // get-starknet-core: discover + enable a wallet (Braavos / Argent X)
      const {
        getLastConnectedWallet,
        getAvailableWallets,
        enable,
      } = await import("get-starknet-core")

      let wallet = await getLastConnectedWallet()
      if (!wallet) {
        const wallets = await getAvailableWallets()
        // Prefer Braavos / Argent if present, otherwise first wallet
        wallet =
          wallets.find((w) => /braavos/i.test(w.id) || /braavos/i.test(w.name)) ??
          wallets.find((w) => /argent/i.test(w.id) || /argent/i.test(w.name)) ??
          wallets[0]
      }

      if (!wallet) {
        setConnectError("No Starknet wallets detected in this browser")
        return
      }

      const connected = await enable(wallet, { starknetVersion: "v5" })
      const addr = connected.selectedAddress || connected.account?.address
      if (!addr) {
        setConnectError("Wallet did not return an address")
        return
      }

      setStarknetAddress(addr)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("starknet_address", addr)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed"
      setConnectError(msg)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectStarknet = useCallback(async () => {
    try {
      const { disconnect } = await import("get-starknet-core")
      await disconnect({ clearLastWallet: true })
    } catch {
      // ignore
    }
    setStarknetAddress(null)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("starknet_address")
    }
  }, [])

  const setStarknetMode = useCallback((active: boolean) => {
    setIsStarknetMode(active)
  }, [])

  return (
    <StarknetContext.Provider
      value={{
        isStarknetMode,
        setStarknetMode,
        starknetAddress,
        connectStarknet,
        disconnectStarknet,
        isConnecting,
        connectError,
        portfolio,
        isLoadingPortfolio,
        refreshPortfolio,
      }}
    >
      {children}
    </StarknetContext.Provider>
  )
}

export function useStarknet(): StarknetContextState {
  const ctx = useContext(StarknetContext)
  if (!ctx) throw new Error("useStarknet must be used within StarknetProvider")
  return ctx
}
