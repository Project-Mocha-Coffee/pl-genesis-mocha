"use client"

import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react"
import { ADMIN_ADDRESSES_BY_CHAIN } from "@/lib/config"
import { useContractAddresses } from "./useContractAddresses"
import { useChainId } from "wagmi"
import { DIAMOND_FACET_ABI } from "@/lib/contract-new"
import type { Farm } from "@/lib/types"
import { useState, useEffect } from "react"
import { Contract } from "ethers"

export function useAdminActions() {
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider("eip155")
  const chainId = useChainId()
  const { diamond } = useContractAddresses()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Check if vault is paused
  useEffect(() => {
    if (!walletProvider || !diamond) return

    const checkPausedStatus = async () => {
      try {
        const contract = new Contract(
          diamond,
          DIAMOND_FACET_ABI,
          walletProvider
        )
        
        const paused = await contract.paused()
        setIsPaused(paused)
      } catch (err) {
        console.error("Error checking pause status:", err)
      }
    }

    checkPausedStatus()
  }, [walletProvider, diamond])

  const createFarm = async (farmData: Partial<Farm>) => {
    if (!walletProvider) {
      throw new Error("Sign in required")
    }

    if (
      !farmData.farmOwner ||
      !farmData.treeCount ||
      !farmData.targetAPY ||
      !farmData.maturityPeriod ||
      !farmData.bondValue ||
      !farmData.collateralRatio ||
      !farmData.minInvestment ||
      !farmData.maxInvestment ||
      !farmData.farmCap ||
      !farmData.name
    ) {
      throw new Error("Missing required farm data")
    }

    try {
      setIsPending(true)
      setError(null)
      
      if (!diamond) {
        throw new Error("Diamond contract address not available for current network")
      }
      
      const contract = new Contract(
        diamond,
        DIAMOND_FACET_ABI,
        walletProvider
      )
      
      const tx = await contract.addFarmToVault(
        farmData.farmOwner,
        BigInt(farmData.treeCount),
        BigInt(farmData.targetAPY),
        BigInt(farmData.maturityPeriod),
        BigInt(farmData.bondValue),
        BigInt(farmData.collateralRatio),
        BigInt(farmData.minInvestment),
        BigInt(farmData.maxInvestment),
        BigInt(farmData.farmCap),
        farmData.name,
        "Farm Share Token", // shareTokenName
        "FST", // shareTokenSymbol
      )
      
      await tx.wait()
      return tx.hash
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsPending(false)
    }
  }

  const updateFarm = async (
    farmId: string,
    newAPY: bigint,
    newMinInvestment: bigint,
    newMaxInvestment: bigint,
    newFarmCap: bigint
  ) => {
    if (!walletProvider) {
      throw new Error("Sign in required")
    }

    try {
      setIsPending(true)
      setError(null)
      
      if (!diamond) {
        throw new Error("Diamond contract address not available for current network")
      }
      
      const contract = new Contract(
        diamond,
        DIAMOND_FACET_ABI,
        walletProvider
      )
      
      const tx = await contract.updateFarm(
        BigInt(farmId),
        newAPY,
        newMinInvestment,
        newMaxInvestment,
        newFarmCap
      )
      
      await tx.wait()
      return tx.hash
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsPending(false)
    }
  }

  const pauseVault = async () => {
    if (!walletProvider) {
      throw new Error("Sign in required")
    }

    try {
      setIsPending(true)
      setError(null)
      
      if (!diamond) {
        throw new Error("Diamond contract address not available for current network")
      }
      
      const contract = new Contract(
        diamond,
        DIAMOND_FACET_ABI,
        walletProvider
      )
      
      const tx = await contract.pause()
      await tx.wait()
      setIsPaused(true)
      return tx.hash
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsPending(false)
    }
  }

  const unpauseVault = async () => {
    if (!walletProvider) {
      throw new Error("Sign in required")
    }

    try {
      setIsPending(true)
      setError(null)
      
      if (!diamond) {
        throw new Error("Diamond contract address not available for current network")
      }
      
      const contract = new Contract(
        diamond,
        DIAMOND_FACET_ABI,
        walletProvider
      )
      
      const tx = await contract.unpause()
      await tx.wait()
      setIsPaused(false)
      return tx.hash
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsPending(false)
    }
  }

  // Check if user is admin (using the actual deployer address for current chain)
  const adminAddress = ADMIN_ADDRESSES_BY_CHAIN[chainId] || ADMIN_ADDRESSES_BY_CHAIN[534352] // Fallback to Scroll
  const isAdmin = address && adminAddress && address.toLowerCase() === adminAddress.toLowerCase()

  return {
    createFarm,
    updateFarm,
    pauseVault,
    unpauseVault,
    isPaused,
    isAdmin,
    isPending,
    error,
  }
}