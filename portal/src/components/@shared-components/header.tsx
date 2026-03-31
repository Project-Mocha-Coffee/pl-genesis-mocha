"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Menu, X, LayoutDashboard, Coins, TrendingUp, Loader2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppKit, useAppKitAccount } from "@reown/appkit/react"
import { StatRectangle } from "./stat-rectangle"
import { NetworkSelector } from "./NetworkSelector"
import { StyledAppKitButton } from "./StyledAppKitButton"
import { useAccount, useReadContract, useChainId } from "wagmi"
import { formatUnits } from "viem"
import { MBT_TOKEN_ABI, MBT_DECIMALS, TREE_CONTRACT_ABI } from "@/config/constants"
import { useContractAddresses } from "@/hooks/useContractAddresses"
import { isAdminAddress } from "@/lib/admin"
import { useStarknet } from "@/context/StarknetContext"

// ─── Starknet wallet button ────────────────────────────────────────────────────

function StarknetWalletButton({ compact = false }: { compact?: boolean }) {
  const { starknetAddress, connectStarknet, disconnectStarknet, isConnecting } = useStarknet()

  const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  if (starknetAddress) {
    return (
      <button
        onClick={disconnectStarknet}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EC796B]/10 border border-[#EC796B]/30 text-[#EC796B] hover:bg-[#EC796B]/20 transition-colors font-mono text-xs ${compact ? "px-2" : ""}`}
        title="Disconnect Starknet"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#EC796B] flex-shrink-0" />
        {short(starknetAddress)}
      </button>
    )
  }

  return (
    <button
      onClick={connectStarknet}
      disabled={isConnecting}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EC796B] hover:bg-[#d96a5c] text-white text-xs font-medium transition-colors disabled:opacity-60"
    >
      {isConnecting ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          {!compact && "Connecting…"}
        </>
      ) : (
        <>
          <Wallet className="w-3 h-3" />
          {!compact && "Connect Starknet"}
        </>
      )}
    </button>
  )
}

const USER_LINKS = [
  // { label: "Dashboard", href: "/", enabled: true, icon: LayoutDashboard },
]

const ADMIN_LINKS = [
  { label: "Admin", href: "/admin", enabled: true, icon: Coins },
  { label: "Farms", href: "/farms", enabled: true, icon: Coins },
  { label: "Events Log", href: "/logs", enabled: true, icon: Coins },
]

export default function Header() {
  const { isConnected, address } = useAppKitAccount()
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const { mbtToken, mttrVault } = useContractAddresses()
  const { isStarknetMode, portfolio, isLoadingPortfolio, starknetAddress } = useStarknet()
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isAdmin = isConnected && isAdminAddress(address)
  const NAV_LINKS = isAdmin ? ADMIN_LINKS : USER_LINKS

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode")
    if (savedMode !== null) {
      setDarkMode(savedMode === "true")
    }
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    localStorage.setItem("darkMode", darkMode.toString())
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(!darkMode)
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)

  const { data: mbtBalance, error: mbtError, isLoading: mbtLoading } = useReadContract({
    address: mbtToken as `0x${string}`,
    abi: MBT_TOKEN_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    chainId,
    query: { enabled: isConnected && !!userAddress && !!mbtToken, retry: 3 },
  })

  const { data: totalActiveBonds, error: bondsError, isLoading: bondsLoading } = useReadContract({
    address: mttrVault as `0x${string}`,
    abi: TREE_CONTRACT_ABI,
    functionName: "totalActiveBonds",
    chainId,
    query: { enabled: isConnected && !!mttrVault, retry: 3 },
  })

  const { data: totalValueLocked, error: tvlError, isLoading: tvlLoading } = useReadContract({
    address: mttrVault as `0x${string}`,
    abi: TREE_CONTRACT_ABI,
    functionName: "totalValueLocked",
    chainId,
    query: { enabled: isConnected && !!mttrVault, retry: 3 },
  })

  const formatMbtBalance = () => {
    if (mbtLoading) return "Loading..."
    if (mbtError) return "Error"
    if (!mbtBalance) return "0.0000"
    return Number(formatUnits(mbtBalance, MBT_DECIMALS)).toFixed(4)
  }

  const formatTotalValueLocked = () => {
    if (tvlLoading) return "Loading..."
    if (tvlError) return "Error"
    if (!totalValueLocked) return "0.0000"
    return Number(formatUnits(totalValueLocked, MBT_DECIMALS)).toFixed(4)
  }

  const formatTotalActiveBonds = () => {
    if (bondsLoading) return "Loading..."
    if (bondsError) return "Error"
    if (!totalActiveBonds) return "0"
    return totalActiveBonds.toString()
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#E6E6E6]/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 h-[72px]">
        {/* Logo and stats, navigation */}
        <div className="mx-auto flex items-center justify-between h-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16">
              <Image
                src={darkMode ? "/Brand/mocha-white.svg" : "/Brand/mocha-brown.png"}
                alt="Project Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 lg:gap-3 text-xs lg:text-sm">
              {isStarknetMode ? (
                <>
                  <StatRectangle
                    label="MBT Balance (SN)"
                    value={isLoadingPortfolio ? "…" : `${portfolio?.mbtBalance ?? "0.00"} MBT`}
                    valueColor="text-orange-400"
                    index={0}
                  />
                  <StatRectangle
                    label="MBT Supply (SN)"
                    value={isLoadingPortfolio ? "…" : `${portfolio?.mbtTotalSupply ?? "0.00"} MBT`}
                    valueColor="text-orange-400"
                    index={1}
                  />
                  <StatRectangle
                    label="Farm Trees"
                    value={isLoadingPortfolio ? "…" : `${portfolio?.farm?.totalTrees ?? "—"}`}
                    valueColor="text-green-400"
                    index={2}
                  />
                </>
              ) : (
                <>
                  <StatRectangle label="MBT Balance" value={`${formatMbtBalance()} MBT`} valueColor="text-green-400" index={0} />
                  <StatRectangle label="TVL" value={`${formatTotalValueLocked()} MBT`} valueColor="text-green-400" index={1} />
                  <StatRectangle label="Total Active Investments" value={`${formatTotalActiveBonds()}`} valueColor="text-green-400" index={2} />
                </>
              )}
            </div>
          </div>
          {/* Desktop navigation, unchanged */}
          <div className="hidden lg:flex items-center space-x-3 lg:space-x-4">
            <nav className="border dark:border-gray-800 bg-white dark:bg-gray-800 rounded-full px-2 lg:px-2 py-1 lg:py-1">
              <div className="flex items-center space-x-1 lg:space-x-2">
                {NAV_LINKS.filter(link => link.enabled).map((link) => (
                  <Link key={link.label} href={link.href}>
                    <button
                      className={`px-3 lg:px-4 py-1 lg:py-1.5 rounded-full flex items-center transition-colors text-xs lg:text-sm
                        ${pathname === link.href ? "bg-[#522912] text-white dark:bg-white dark:text-[#522912] font-semibold" : "text-gray-400 hover:text-[#522912] dark:hover:text-white"}`}
                    >
                      {link.label}
                    </button>
                  </Link>
                ))}
              </div>
            </nav>
            <div className="flex items-center space-x-2 lg:space-x-3">
              <NetworkSelector />
              <Button
                variant="outline"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 w-8 lg:h-10 lg:w-10"
              >
                {darkMode ? <Sun className="h-4 w-4 lg:h-5 lg:w-5" /> : <Moon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-700" />}
              </Button>
              <div className="scale-90 lg:scale-100">
                {isStarknetMode ? (
                  <StarknetWalletButton />
                ) : (
                  <StyledAppKitButton />
                )}
              </div>
            </div>
          </div>
          {/* Tablet & Mobile controls */}
          <div className="flex lg:hidden items-center space-x-2">
            <NetworkSelector />
            <div className="scale-90">
              {isStarknetMode ? (
                <StarknetWalletButton compact />
              ) : (
                <StyledAppKitButton />
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 w-8"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-gray-700" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMobileMenu}
              className="rounded-full bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 h-8 w-8"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* PILL-Shaped Navigation Bar for ALL non-desktop screens */}
      <div className={
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden mx-4 mb-4 bg-white dark:bg-gray-900 rounded-full shadow-xl border border-gray-200 dark:border-gray-800 flex justify-center overflow-x-auto"
      }>
        <nav className="flex justify-around w-full px-2 py-2">
          {NAV_LINKS.filter(link => link.enabled).map((link) => {
            const IconComponent = link.icon
            const isActive = pathname === link.href
            return (
              <Link key={link.label} href={link.href}>
                <button
                  className={`
                    flex items-center justify-center
                    rounded-full
                    p-2 mx-1 transition-colors
                    min-w-[48px] min-h-[48px]
                    ${isActive 
                      ? "bg-[#522912] dark:bg-gray-700 text-white font-semibold" 
                      : "text-gray-500 dark:text-gray-400 hover:text-[#522912] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                  aria-label={link.label}
                >
                  <IconComponent className={`h-6 w-6`} />
                  {/* Label hidden on screens below desktop */}
                  <span className="hidden">{link.label}</span>
                </button>
              </Link>
            )
          })}
        </nav>
      </div>
      {/* Bottom padding */}
      <div className="h-20 lg:hidden" />
    </>
  )
}
