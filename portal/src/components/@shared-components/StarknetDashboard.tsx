"use client"

import React from "react"
import { useStarknet } from "@/context/StarknetContext"
import { STARKNET_ADDRESSES } from "@/lib/starknet-config"
import {
  Loader2,
  Wallet,
  TreePine,
  TrendingUp,
  Users,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { StarknetSwap } from "@/components/@shared-components/StarknetSwap"

// ─── Small helpers ────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "green",
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: "green" | "orange" | "blue" | "purple"
}) {
  const colors = {
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StarknetDashboard() {
  const {
    starknetAddress,
    connectStarknet,
    disconnectStarknet,
    isConnecting,
    connectError,
    portfolio,
    isLoadingPortfolio,
    refreshPortfolio,
  } = useStarknet()

  const [copied, setCopied] = useState(false)

  const copyAddress = () => {
    if (!starknetAddress) return
    navigator.clipboard.writeText(starknetAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const farm = portfolio?.farm

  return (
    <div className="w-full animate-in fade-in duration-300">
    {/* Two-column layout: left = stats, right = swap */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {/* ── Left column (stats + farm + table) ── */}
    <div className="lg:col-span-2 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#EC796B] flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z"
                  fill="white"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Starknet — Mainnet
            </h2>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              Cairo
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Project Mocha on Starknet Mainnet — MBT token, ICO and Farm Registry (live)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshPortfolio}
            disabled={isLoadingPortfolio}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPortfolio ? "animate-spin" : ""}`} />
          </button>

          {starknetAddress ? (
            <div className="flex items-center gap-2">
              <button
                onClick={copyAddress}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-mono hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {shortAddr(starknetAddress)}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectStarknet}
                className="text-xs"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={connectStarknet}
              disabled={isConnecting}
              className="bg-[#EC796B] hover:bg-[#d96a5c] text-white border-0"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5 mr-1.5" />
                  Connect Braavos / Argent X
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {connectError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {connectError}
        </div>
      )}

      {/* ── Stats grid ── */}
      {isLoadingPortfolio && !portfolio ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Reading on-chain data…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="MBT Balance"
            value={portfolio ? `${portfolio.mbtBalance} MBT` : "—"}
            sub={starknetAddress ? "Your Starknet wallet" : "Sign in to view"}
            icon={Wallet}
            accent="orange"
          />
          <StatCard
            label="Total Supply"
            value={portfolio ? `${portfolio.mbtTotalSupply} MBT` : "—"}
            sub="Starknet mainnet"
            icon={TrendingUp}
            accent="purple"
          />
          <StatCard
            label="Farm Trees"
            value={farm ? `${farm.totalTrees}` : "—"}
            sub={farm ? `${farm.allocatedTrees} allocated` : undefined}
            icon={TreePine}
            accent="green"
          />
          <StatCard
            label="Farm APY"
            value={farm ? `${(farm.apyBps / 100).toFixed(0)}%` : "—"}
            sub={farm ? `${farm.totalInvestors} investor${farm.totalInvestors !== 1 ? "s" : ""}` : undefined}
            icon={Users}
            accent="blue"
          />
        </div>
      )}

      {/* ── Farm card ── */}
      {farm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TreePine className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Starknet Farm v1
              </h3>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  farm.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {farm.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <a
              href={`https://starkscan.co/contract/${STARKNET_ADDRESSES.farmRegistry}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              View on Starkscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Progress bar */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Trees Allocated</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {farm.allocatedTrees} / {farm.totalTrees}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: farm.totalTrees > 0
                    ? `${Math.min(100, (farm.allocatedTrees / farm.totalTrees) * 100).toFixed(1)}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">APY</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {(farm.apyBps / 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Maturity</p>
              <p className="font-semibold text-gray-900 dark:text-white">5 years</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Investors</p>
              <p className="font-semibold text-gray-900 dark:text-white">{farm.totalInvestors}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Contract links ── */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Contract Addresses
        </p>
        <div className="space-y-2">
          {[
            { label: "MBT Token", addr: STARKNET_ADDRESSES.mbtToken },
            { label: "Farm Registry", addr: STARKNET_ADDRESSES.farmRegistry },
          ].map(({ label, addr }) => (
            <div key={addr} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[90px]">
                {label}
              </span>
              <a
                href={`https://starkscan.co/contract/${addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[#EC796B] hover:underline flex items-center gap-1 truncate"
              >
                {shortAddr(addr)}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cross-chain summary ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Cross-Chain MBT Summary
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/40">
              {["Chain", "Trees", "MBT Minted", "Status"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {[
              { chain: "Scroll", trees: "2,000", mbt: "2,000 MBT", status: "Live", dot: "bg-green-500" },
              { chain: "Base", trees: "TBC", mbt: "TBC", status: "Live", dot: "bg-green-500" },
              { chain: "Starknet ✦", trees: "500", mbt: "1,000 MBT", status: "Live", dot: "bg-green-500" },
            ].map((row) => (
              <tr key={row.chain} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {row.chain}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.trees}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.mbt}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
                    <span className="text-gray-600 dark:text-gray-400">{row.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>{/* end left column */}

    {/* ── Right column: Swap panel ── */}
    <div className="lg:col-span-1">
      <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <StarknetSwap onTransactionComplete={refreshPortfolio} />
      </div>
    </div>

    </div>{/* end grid */}
    </div>
  )
}
