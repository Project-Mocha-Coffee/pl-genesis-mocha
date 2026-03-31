"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useStarknet } from "@/context/StarknetContext"
import { STARKNET_ADDRESSES } from "@/lib/starknet-config"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  ChevronLeft,
  Info,
  Loader2,
  Wallet,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

// ETH ERC20 token address on Starknet mainnet
const ETH_TOKEN_ADDRESS =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"

const ETH_DECIMALS = 18

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toU256(amount: bigint): [string, string] {
  const low = "0x" + (amount & ((1n << 128n) - 1n)).toString(16)
  const high = "0x" + (amount >> 128n).toString(16)
  return [low, high]
}

function parseEth(value: string): bigint {
  if (!value || isNaN(Number(value))) return 0n
  try {
    const [whole, frac = ""] = value.split(".")
    const fracPadded = frac.slice(0, 18).padEnd(18, "0")
    return BigInt(whole) * 10n ** 18n + BigInt(fracPadded)
  } catch {
    return 0n
  }
}

function fmt(n: number, dp = 4) {
  return n.toFixed(dp).replace(/\.?0+$/, "")
}

// ─── Price hook ───────────────────────────────────────────────────────────────

interface PriceData {
  ethPriceUsd: number
  mbtPriceUsd: number
  mbtPerEth: number
}

function usePriceData() {
  const [price, setPrice] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/starknet/price")
      const json = await res.json()
      if (!isMounted.current) return
      if ("error" in json) throw new Error(json.error)
      setPrice(json as PriceData)
    } catch (err) {
      if (!isMounted.current) return
      setError(err instanceof Error ? err.message : "Price fetch failed")
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    refresh()
    const interval = setInterval(refresh, 60_000)
    return () => {
      isMounted.current = false
      clearInterval(interval)
    }
  }, [refresh])

  return { price, loading, error, refresh }
}

// ─── Transaction success screen ───────────────────────────────────────────────

function PurchaseSuccess({
  txHash,
  mbtAmount,
  ethAmount,
  onReset,
  autoMinted = false,
}: {
  txHash: string
  mbtAmount: string
  ethAmount: string
  onReset: () => void
  autoMinted?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {autoMinted ? "Purchase complete!" : "Purchase submitted!"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your payment of <span className="font-semibold">{ethAmount} ETH</span> has been sent.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {autoMinted ? (
            <>
              <span className="font-semibold text-[#EC796B]">{mbtAmount} MBT</span> has been minted
              to your wallet. Your balance will update above.
            </>
          ) : (
            <>
              <span className="font-semibold text-[#EC796B]">{mbtAmount} MBT</span> will be minted to
              your address shortly.
            </>
          )}
        </p>
      </div>

      <div className="w-full bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-left space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">Transaction hash</p>
        <a
          href={`https://starkscan.co/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-[#EC796B] hover:underline flex items-center gap-1 break-all"
        >
          {txHash.slice(0, 16)}…{txHash.slice(-12)}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      </div>

      {!autoMinted && (
        <div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-left">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              MBT tokens will be minted to your Starknet address within 24 hours. You&apos;ll see
              your balance update in the dashboard above.
            </p>
          </div>
        </div>
      )}

      <Button onClick={onReset} variant="outline" size="sm" className="w-full">
        Make another purchase
      </Button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StarknetSwap({ onTransactionComplete }: { onTransactionComplete?: () => void }) {
  const { starknetAddress, connectStarknet, isConnecting } = useStarknet()
  const { price, loading: priceLoading, error: priceError, refresh: refreshPrice } = usePriceData()

  const [amount, setAmount] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [autoMinted, setAutoMinted] = useState(false)

  const useIco = Boolean(STARKNET_ADDRESSES.icoAddress)

  // Derived values
  const amountNum = Math.max(0, parseFloat(amount) || 0)
  const mbtToReceive =
    price && amountNum > 0 ? fmt(amountNum * price.mbtPerEth, 2) : "0.00"
  const usdValue =
    price && amountNum > 0 ? fmt(amountNum * price.ethPriceUsd, 2) : "0.00"

  const MIN_ETH = 0.001
  const isValidAmount = amountNum >= MIN_ETH

  const feeUsd = price ? amountNum * price.ethPriceUsd * 0.007 : 0
  const netUsd = price ? amountNum * price.ethPriceUsd - feeUsd : 0

  // ── Purchase: ICO (auto mint) or manual transfer ─────────────────────────────

  const handleConfirmPurchase = async () => {
    if (!starknetAddress || !price) return
    setSendError(null)
    setIsSending(true)

    try {
      const {
        getLastConnectedWallet,
        getAvailableWallets,
        enable,
      } = await import("get-starknet-core")

      let wallet = await getLastConnectedWallet()
      if (!wallet) {
        const wallets = await getAvailableWallets()
        wallet =
          wallets.find((w) => /braavos/i.test(w.id) || /braavos/i.test(w.name)) ??
          wallets.find((w) => /argent/i.test(w.id) || /argent/i.test(w.name)) ??
          wallets[0]
      }

      if (!wallet) throw new Error("No Starknet wallets detected")

      const connected = await enable(wallet, { starknetVersion: "v5" })
      const account = connected.account
      if (!account) throw new Error("Wallet did not expose an account")

      const amountWei = parseEth(amount)
      if (amountWei === 0n) throw new Error("Invalid amount")
      const [amountLow, amountHigh] = toU256(amountWei)

      if (useIco) {
        // ICO flow: approve ETH to ICO, then buy_with_eth → MBT minted in same tx
        const icoAddr = STARKNET_ADDRESSES.icoAddress
        const minMbtWei = BigInt(Math.floor(parseFloat(mbtToReceive) * 0.95 * 1e18))
        const [minLow, minHigh] = toU256(minMbtWei)

        const calls = [
          {
            contractAddress: ETH_TOKEN_ADDRESS,
            entrypoint: "approve",
            calldata: [icoAddr, amountLow, amountHigh],
          },
          {
            contractAddress: icoAddr,
            entrypoint: "buy_with_eth",
            calldata: [starknetAddress, amountLow, amountHigh, minLow, minHigh],
          },
        ]
        const result = await account.execute(calls)
        const hash = result.transaction_hash
        setTxHash(hash)
        setAutoMinted(true)
        toast.success("MBT has been minted to your wallet.")
      } else {
        // Manual flow: transfer ETH to protocol address; admin mints later
        const result = await account.execute({
          contractAddress: ETH_TOKEN_ADDRESS,
          entrypoint: "transfer",
          calldata: [STARKNET_ADDRESSES.ownerAddress, amountLow, amountHigh],
        })
        const hash = result.transaction_hash
        setTxHash(hash)
        toast.success("Payment sent! MBT will be minted to your address.")
        fetch("/api/starknet/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerAddress: starknetAddress,
            txHash: hash,
            ethAmount: amount,
            mbtExpected: mbtToReceive,
            usdValue: usdValue,
          }),
        }).catch(console.error)
      }

      onTransactionComplete?.()
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("User abort") || err.message.includes("rejected")
            ? "Transaction rejected by wallet"
            : err.message
          : "Transaction failed"
      setSendError(msg)
      toast.error(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleReset = () => {
    setAmount("")
    setShowPreview(false)
    setTxHash(null)
    setSendError(null)
    setAutoMinted(false)
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (txHash) {
    return (
      <PurchaseSuccess
        txHash={txHash}
        mbtAmount={mbtToReceive}
        ethAmount={amount}
        onReset={handleReset}
        autoMinted={autoMinted}
      />
    )
  }

  // ── Confirm screen ─────────────────────────────────────────────────────────

  if (showPreview) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowPreview(false)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <h3 className="font-semibold text-gray-900 dark:text-white">Confirm purchase</h3>

        {/* You pay */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">You pay</span>
            <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
              {amount} ETH
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">You receive</span>
            <span className="font-bold text-[#EC796B] flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              {mbtToReceive} MBT
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>USD value</span><span>${usdValue}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>ETH price</span>
              <span>${price ? price.ethPriceUsd.toLocaleString() : "—"} / ETH</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>MBT price</span><span>$25.00 / MBT</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Protocol fee (0.7%)</span><span>-${feeUsd.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
              <span>Net value</span><span>${netUsd.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Destination / flow */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              {useIco ? (
                <p>
                  You will approve ETH to the ICO contract, then buy MBT in one transaction. MBT will be minted directly to your wallet.
                </p>
              ) : (
                <>
                  <p>
                    ETH will be transferred to the Project Mocha protocol address on Starknet.
                  </p>
                  <p className="font-mono text-[10px] break-all">
                    {STARKNET_ADDRESSES.ownerAddress}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {sendError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400">{sendError}</p>
          </div>
        )}

        <Button
          className="w-full bg-[#EC796B] hover:bg-[#d96a5c] text-white border-0"
          onClick={handleConfirmPurchase}
          disabled={isSending}
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending via wallet…
            </>
          ) : (
            "Complete Purchase"
          )}
        </Button>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">Swap to MBT</h3>
        <div className="flex items-center gap-1.5">
          {priceLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
          <button
            onClick={refreshPrice}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Refresh price"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {price && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ETH = ${price.ethPriceUsd.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {priceError && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
          Price feed unavailable — try refreshing.
        </div>
      )}

      {/* Payment method pill — crypto only on Starknet */}
      <div className="grid grid-cols-3 gap-2">
        {(["Crypto", "Card", "M-Pesa"] as const).map((m) => (
          <button
            key={m}
            disabled={m !== "Crypto"}
            className={`py-2 rounded-lg text-xs font-medium transition-colors border ${
              m === "Crypto"
                ? "bg-[#EC796B]/10 border-[#EC796B] text-[#EC796B]"
                : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {m}
            {m !== "Crypto" && (
              <span className="block text-[9px] mt-0.5 font-normal opacity-70">Soon</span>
            )}
          </button>
        ))}
      </div>

      {/* You pay */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">You pay</span>
          {starknetAddress && (
            <span className="text-xs text-gray-400">
              Balance: — ETH {/* live balance via starknet.js would go here */}
            </span>
          )}
        </div>
        <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center px-4 h-14">
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setSendError(null)
            }}
            className="flex-1 bg-transparent text-xl font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
          <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
            <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px] font-bold">
              Ξ
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">ETH</span>
          </div>
        </div>
        <div className="flex justify-end mt-1 gap-2">
          {["0.01", "0.05", "0.1"].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <ArrowDownLeft className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* You receive */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">You receive</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center px-4 h-14">
          <span
            className={`flex-1 text-xl font-bold ${
              amountNum > 0 ? "text-[#EC796B]" : "text-gray-300 dark:text-gray-600"
            }`}
          >
            {mbtToReceive}
          </span>
          <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20">
            <div className="w-4 h-4 rounded-full bg-[#EC796B] flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z"
                  fill="white"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#EC796B]">MBT</span>
          </div>
        </div>
        {amountNum > 0 && price && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
            ≈ ${usdValue} · at ${price.mbtPriceUsd}/MBT
          </p>
        )}
      </div>

      {/* Connect or Buy */}
      {!starknetAddress ? (
        <Button
          className="w-full bg-[#EC796B] hover:bg-[#d96a5c] text-white border-0"
          onClick={connectStarknet}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Connect Braavos / Argent X
            </>
          )}
        </Button>
      ) : (
        <Button
          className="w-full bg-[#EC796B] hover:bg-[#d96a5c] text-white border-0 disabled:opacity-50"
          disabled={!isValidAmount || priceLoading || !price}
          onClick={() => {
            if (!isValidAmount) {
              toast.error(`Minimum purchase is ${MIN_ETH} ETH`)
              return
            }
            setShowPreview(true)
          }}
        >
          {!isValidAmount && amountNum > 0
            ? `Min ${MIN_ETH} ETH`
            : priceLoading
            ? "Loading price…"
            : "Preview Swap →"}
        </Button>
      )}

      {/* Min purchase note */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        Minimum purchase: {MIN_ETH} ETH · Price fixed at $25/MBT
      </p>
    </div>
  )
}
