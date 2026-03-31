import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { usePreviewTokenPurchase, useSwapTokens, useMinPurchases, useIcoPaused } from "@/hooks/use-ico";
import { formatUnits, parseUnits } from "viem/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, ArrowDownLeft, FileText, AlertTriangle, Info, Zap, Loader2, CheckCircle } from "lucide-react";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { TransactionSuccess } from "./TransactionSuccess";
// import { ChatterPayPayment } from "./ChatterPayPayment"; // Temporarily disabled - awaiting API credentials
import { motion, AnimatePresence } from "framer-motion";
import { RiskDisclaimer } from "./RiskDisclaimer";
import {
  MpesaPaymentFlowModal,
  extractMpesaSmsRefFromStatusPayload,
  extractOnChainTxHashFromStatusPayload,
  normalizeElementPayOrderStatus,
  type MpesaModalPhase,
} from "./MpesaPaymentFlowModal";

// Chain IDs
const CHAIN_ID_SCROLL = 534352;
const CHAIN_ID_BASE = 8453;
const CHAIN_ID_BASE_SEPOLIA = 84532;

function getChainName(chainId: number): string {
  if (chainId === CHAIN_ID_SCROLL) return "Scroll";
  if (chainId === CHAIN_ID_BASE) return "Base";
  if (chainId === CHAIN_ID_BASE_SEPOLIA) return "Base Sepolia";
  return "current network";
}

// Token addresses by chain (Scroll and Base). Used for balance and approve/swap.
const TOKEN_ADDRESSES_BY_CHAIN: Record<number, Record<string, string>> = {
  [CHAIN_ID_SCROLL]: {
    WETH: "0x5300000000000000000000000000000000000004",
    USDC: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
    USDT: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df",
    SCR: "0xd29687c813D741E2F938F4aC377128810E217b1b",
    WBTC: "0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1",
  },
  [CHAIN_ID_BASE]: {
    // Must match Base ICO deployment in smart-contracts-erc4626-scroll-base
    // deployments/deployment-base-chain-8453-*.json → ico.tokens
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0xfde4C962512795FD9f0bEF2e95a5369624836D48",
    WBTC: "0x47265Fdb5fb4ec9EEBAb8E854395e7931Ff4E187",
  },
};

const supportedTokensBase = [
  {
    label: "ETH",
    paymentMethod: "ETH",
    decimals: 18,
    contractFunc: "buyTokensWithEth",
    needsValue: true,
    tokenKey: null as string | null,
  },
  {
    label: "WETH",
    paymentMethod: "WETH",
    decimals: 18,
    contractFunc: "buyTokensWithEth",
    needsValue: false,
    tokenKey: "WETH",
    needsUnwrap: true,
  },
  {
    label: "USDC",
    paymentMethod: "USDC",
    decimals: 6,
    contractFunc: "buyTokensWithUsdc",
    needsValue: false,
    tokenKey: "USDC",
  },
  {
    label: "USDT",
    paymentMethod: "USDT",
    decimals: 6,
    contractFunc: "buyTokensWithUsdt",
    needsValue: false,
    tokenKey: "USDT",
  },
  {
    label: "SCROLL",
    paymentMethod: "SCR",
    decimals: 18,
    contractFunc: "buyTokensWithScr",
    needsValue: false,
    tokenKey: "SCR",
    scrollOnly: true, // Only on Scroll
  },
  {
    label: "WBTC",
    paymentMethod: "WBTC",
    decimals: 8,
    contractFunc: "buyTokensWithWbtc",
    needsValue: false,
    tokenKey: "WBTC",
  },
];

function roundToThree(num: any) {
  if (!num || isNaN(Number(num))) return "0.000";
  return (Math.round(Number(num) * 1000) / 1000).toFixed(3);
}
function roundToWhole(num: any) {
  if (!num || isNaN(Number(num))) return "0";
  return Math.round(Number(num)).toString();
}
function roundToFour(value: any) {
  if (!value || isNaN(Number(value))) return "0";
  return (Math.round(Number(value) * 10000) / 10000).toFixed(4);
}

const USD_DECIMALS = 6;
// Fallback when contract preview returns 0: MBT price in USD for client-side estimate
const MBT_PRICE_USD = 25;

type PaymentMethod = "crypto" | "card" | "mpesa"; // "chatterpay" temporarily removed - awaiting API credentials

interface SwapToMBTComponentProps {
  onTransactionComplete?: () => void | Promise<void>;
}

export function SwapToMBTComponent({ onTransactionComplete }: SwapToMBTComponentProps) {
  const queryClient = useQueryClient();
  const chainId = useChainId();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("crypto");
  const [fromToken, setFromToken] = useState(supportedTokensBase[0].label);
  const [amount, setAmount] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const { minEth, minUsdt, minUsdc, minScr, minWbtc } = useMinPurchases();
  const { isPaused: icoPaused, isLoading: icoPausedLoading } = useIcoPaused();
  const [result, setResult] = useState<string>("");
  const [notifyEmail, setNotifyEmail] = useState<string>("");
  const [notifySent, setNotifySent] = useState<boolean>(false);
  // const [showChatterPay, setShowChatterPay] = useState<boolean>(false); // Temporarily disabled - awaiting API credentials
  const [unwrapStep, setUnwrapStep] = useState<"idle" | "unwrapping" | "unwrapped" | "swapping">("idle");
  const { address } = useAccount();

  // Build supported tokens for current chain. Same flow as Scroll: chain-specific token addresses only (no cross-chain fallback for swap).
  const supportedTokens = useMemo(() => {
    const byChain = TOKEN_ADDRESSES_BY_CHAIN[chainId] ?? TOKEN_ADDRESSES_BY_CHAIN[CHAIN_ID_SCROLL];
    return supportedTokensBase
      .filter((t) => !("scrollOnly" in t && t.scrollOnly && chainId === CHAIN_ID_BASE))
      .map((t) => ({
        ...t,
        tokenAddress: t.tokenKey ? (byChain[t.tokenKey] ?? undefined) : undefined,
      }))
      .filter((t) => !t.tokenKey || t.tokenAddress); // Only include tokens that have an address on this chain
  }, [chainId]);

  // If current fromToken is not in list (e.g. SCROLL on Base), reset to first available
  useEffect(() => {
    if (!supportedTokens.some((t) => t.label === fromToken)) {
      setFromToken(supportedTokens[0]?.label ?? "ETH");
    }
  }, [supportedTokens, fromToken]);

  // M-PESA / ElementPay state
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState<string>("");
  const [mpesaPaymentInitiated, setMpesaPaymentInitiated] = useState<boolean>(false);
  const [mpesaPaymentStatus, setMpesaPaymentStatus] = useState<"idle" | "verifying" | "initiating" | "pending" | "success" | "failed">("idle");
  const [mpesaAmountMode, setMpesaAmountMode] = useState<"KES" | "MBT">("KES");
  const [mpesaAmountKES, setMpesaAmountKES] = useState<string>("");
  const [mpesaAmountMBT, setMpesaAmountMBT] = useState<string>("");
  const [mbtRateKes, setMbtRateKes] = useState<number | null>(null);
  const [mpesaRateLoading, setMpesaRateLoading] = useState<boolean>(false);
  const [mpesaRateError, setMpesaRateError] = useState<string | null>(null);
  const [mpesaTxHash, setMpesaTxHash] = useState<string | null>(null);
  const [mpesaTxStatus, setMpesaTxStatus] = useState<string | null>(null);
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false);
  const [mpesaModalPhase, setMpesaModalPhase] = useState<MpesaModalPhase>("initiating");
  const [mpesaFailureDetail, setMpesaFailureDetail] = useState<string | null>(null);
  const [mpesaReceiptAtIso, setMpesaReceiptAtIso] = useState<string | null>(null);
  const [mpesaOnChainTxHash, setMpesaOnChainTxHash] = useState<string | null>(null);
  const [mpesaSmsRef, setMpesaSmsRef] = useState<string | null>(null);

  // Agreement state
  // Agreement modal removed from swap flow - only appears in Invest flow

  const selected = supportedTokens.find((t) => t.label === fromToken);
  if (!selected) return <div>Unsupported token selected</div>;

  // --- Fully explicit formattedAmount ---
  let roundedAmount: string = "";
  if ((selected.label === "ETH" || selected.label === "WETH") && amount) {
    roundedAmount = roundToFour(amount);
  } else if (amount) {
    roundedAmount = amount;
  }
  let formattedAmount: bigint = BigInt(0);
  try {
    formattedAmount =
      roundedAmount && Number(roundedAmount) > 0
        ? parseUnits(roundedAmount, selected.decimals)
        : BigInt(0);
  } catch (e) {
    formattedAmount = BigInt(0);
  }

  // --- Balances (current chain so Base shows Base USDC, etc.) ---
  const ethBalanceQuery = useBalance({
    address,
    chainId,
    query: { enabled: selected.label === "ETH" && !!address },
  });
  const erc20BalanceQuery = useBalance({
    address,
    token: selected.tokenAddress as `0x${string}` | undefined,
    chainId,
    query: {
      enabled: (selected.label !== "ETH" && selected.label !== "WETH") && !!address && !!selected.tokenAddress,
    },
  });
  const wethBalanceQuery = useBalance({
    address,
    token: selected.tokenAddress as `0x${string}` | undefined,
    chainId,
    query: {
      enabled: selected.label === "WETH" && !!address && !!selected.tokenAddress,
    },
  });
  const rawEthBalance = ethBalanceQuery.data?.formatted ?? "0";
  const tokenBalance =
    selected.label === "ETH"
      ? roundToFour(rawEthBalance)
      : selected.label === "WETH"
      ? roundToFour(wethBalanceQuery.data?.formatted ?? "0")
      : erc20BalanceQuery.data?.formatted ?? "0";

  // --- Preview ---
  // For WETH, use "ETH" as payment method since WETH unwraps to ETH before swap
  const previewPaymentMethod = selected.label === "WETH" ? "ETH" : selected.paymentMethod;
  const { data: preview } = usePreviewTokenPurchase(
    previewPaymentMethod,
    formattedAmount
  );
  // --- never let tokensToReceive be undefined ---
  const [tokensToReceiveRaw, usdValueRaw] = preview ?? [BigInt(0), BigInt(0)];
  let tokensToReceive = tokensToReceiveRaw !== undefined ? tokensToReceiveRaw : BigInt(0);
  let usdValue = usdValueRaw !== undefined ? usdValueRaw : BigInt(0);
  // Client-side fallback when contract returns 0 so user still sees an estimate (e.g. Base ICO not returning preview)
  const amountNum = Number(roundedAmount) || 0;
  if (formattedAmount > BigInt(0) && amountNum > 0 && tokensToReceive === BigInt(0)) {
    const isStablecoin = selected.label === "USDC" || selected.label === "USDT";
    if (isStablecoin) {
      const usdEstimate = amountNum; // 1:1 for USDC/USDC
      const mbtEstimate = usdEstimate / MBT_PRICE_USD;
      tokensToReceive = parseUnits(mbtEstimate.toFixed(18), 18);
      usdValue = parseUnits(usdEstimate.toFixed(18), 18);
    }
    // ETH/WETH: optional future fallback using a price feed; for now rely on contract
  }
  const formattedUsdValue = Number(formatUnits(usdValue, 18));

  // --- Args construction with full checks for contract expectations ---
  const isValidAmount =
    formattedAmount !== undefined && formattedAmount > BigInt(0);
  const isValidTokensToReceive =
    tokensToReceive !== undefined && tokensToReceive >= BigInt(0);

  let swapArgs: any[] = [];
  let swapValue: bigint | undefined = undefined;
  // 1% slippage for _minTokensExpected on all paths (ETH, WETH, USDC, USDT, SCR, WBTC) to avoid reverts from rounding
  const minTokensExpected = isValidTokensToReceive && tokensToReceive > BigInt(0)
    ? (tokensToReceive * BigInt(99)) / BigInt(100)
    : BigInt(0);
  if (selected.label === "ETH") {
    // Native ETH - send value with transaction
    swapArgs = [address, minTokensExpected];
    swapValue = isValidAmount ? formattedAmount : BigInt(0);
  } else if (selected.label === "WETH") {
    // WETH will be unwrapped to ETH first, then use ETH swap
    swapArgs = [address, minTokensExpected];
    swapValue = isValidAmount ? formattedAmount : BigInt(0);
  } else {
    // Other ERC20 tokens (USDC, USDT, SCR, WBTC): same 1% slippage on _minTokensExpected
    swapArgs = [
      isValidAmount ? formattedAmount : BigInt(0),
      minTokensExpected,
    ];
  }

  // --- ICO state: paused and minimum purchase (per-token, chain-aware) ---
  const minAmountForToken = useMemo(() => {
    if (selected.label === "ETH" || selected.label === "WETH") return minEth;
    if (selected.label === "USDC") return minUsdc;
    if (selected.label === "USDT") return minUsdt;
    if (selected.label === "SCROLL") return minScr;
    if (selected.label === "WBTC") return minWbtc;
    return undefined;
  }, [selected.label, minEth, minUsdc, minUsdt, minScr, minWbtc]);
  const belowMinimum =
    !!minAmountForToken &&
    formattedAmount > BigInt(0) &&
    formattedAmount < minAmountForToken;
  const minAmountFormatted =
    minAmountForToken != null
      ? Number(formatUnits(minAmountForToken, selected.decimals)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: selected.decimals })
      : "";

  // --- Swap hook ---

  // WETH address for unwrap (chain-specific)
  const WETH_ADDRESS = (TOKEN_ADDRESSES_BY_CHAIN[chainId]?.WETH ?? TOKEN_ADDRESSES_BY_CHAIN[CHAIN_ID_SCROLL].WETH) as `0x${string}`;
  const WETH_ABI = [
    {
      name: "withdraw",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "wad", type: "uint256" }],
      outputs: [],
    },
  ] as const;

  const { 
    writeContract: writeUnwrap, 
    data: unwrapHash, 
    error: unwrapError, 
    isPending: isUnwrapping 
  } = useWriteContract();
  
  const { 
    isLoading: isUnwrapConfirming, 
    isSuccess: isUnwrapConfirmed 
  } = useWaitForTransactionReceipt({
    hash: unwrapHash,
  });
  
  const {
    swap,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  } = useSwapTokens(
    selected.contractFunc,
    swapArgs,
    swapValue,
    selected.label !== "ETH" && selected.label !== "WETH" ? selected.tokenAddress : undefined
  );

  // --- Fees ---
  const withdrawalFee = 0.005;
  const txFee = 0.002;
  const totalFeePct = withdrawalFee + txFee;
  const feeUsd = formattedUsdValue * totalFeePct;
  const netUsd = formattedUsdValue - feeUsd;
  const netUsdDisplay = netUsd > 0 ? roundToWhole(netUsd) : "0";
  const mbtDisplay =
    tokensToReceive && isValidAmount
      ? `${roundToThree(Number(formatUnits(tokensToReceive, 18)))} MBT ($${roundToWhole(formattedUsdValue)})`
      : "";
  const SHRINK_FONT_LENGTH = 16;
  const isLongValue = mbtDisplay && mbtDisplay.length > SHRINK_FONT_LENGTH;

  // --- Handlers (all explicit) ---
  function handleSetMax() {
    if (selected.label === "ETH" || selected.label === "WETH") {
      const balance = parseFloat(tokenBalance || "0");
      if (balance > 0) {
        const maxAmount = roundToFour(balance);
        setAmount(maxAmount);
        // Trigger preview update by ensuring amount is set
        // The preview will automatically update via usePreviewTokenPurchase hook
      } else {
        setAmount("0");
      }
    } else {
      const balance = parseFloat(tokenBalance || "0");
      if (balance > 0) {
        setAmount(balance.toString());
      } else {
        setAmount("0");
      }
    }
  }
  
  function handleSetHalf() {
    if (selected.label === "ETH" || selected.label === "WETH") {
      const balance = parseFloat(tokenBalance || "0");
      if (balance > 0) {
        const half = balance * 0.5;
        const halfAmount = roundToFour(half);
        setAmount(halfAmount);
        // Trigger preview update
      } else {
        setAmount("0");
      }
    } else {
      const balance = parseFloat(tokenBalance || "0");
      if (balance > 0) {
        const half = balance * 0.5;
        setAmount(half.toString());
      } else {
        setAmount("0");
      }
    }
  }
  
  function handleSetMin() {
    let minValue = "0";
    
    if (selected.label === "ETH" || selected.label === "WETH") {
      // For ETH/WETH, use minEth from contract if available
      // The contract's minEthPurchase should be set to $1 USD equivalent
      if (minEth && minEth > BigInt(0)) {
        const minEthValue = formatUnits(minEth, 18);
        minValue = roundToFour(minEthValue);
      } else {
        // Fallback: $1 USD equivalent in ETH/WETH
        // Conservative estimate: $1 ≈ 0.0003 ETH (assuming ~$3000/ETH)
        // This ensures the minimum is approximately $1 worth
        // Note: This is a fallback - the contract's minEthPurchase should be used when available
        minValue = "0.0003";
      }
    } else if (selected.label === "USDT") {
      if (minUsdt && minUsdt > BigInt(0)) {
      minValue = formatUnits(minUsdt, 6);
      } else {
        minValue = "1"; // $1 USDT minimum
      }
    } else if (selected.label === "USDC") {
      if (minUsdc && minUsdc > BigInt(0)) {
      minValue = formatUnits(minUsdc, 6);
      } else {
        minValue = "1"; // $1 USDC minimum
      }
    } else if (selected.label === "SCROLL") {
      if (minScr && minScr > BigInt(0)) {
      minValue = formatUnits(minScr, 18);
      } else {
        minValue = "0.0001";
      }
    } else {
      // Default minimum for other tokens
      minValue = "1";
    }
    
    // Ensure minimum is not greater than available balance
    const balance = parseFloat(tokenBalance || "0");
    const minNum = parseFloat(minValue);
    
    if (balance > 0 && minNum > balance) {
      // If minimum is greater than balance, use balance instead (can't set more than available)
      if (selected.label === "ETH" || selected.label === "WETH") {
        setAmount(roundToFour(balance));
      } else {
        setAmount(balance.toString());
      }
    } else if (minNum > 0) {
      // Set the minimum value (contract minimum or $1 equivalent)
    setAmount(minValue);
      // Preview will automatically update via usePreviewTokenPurchase hook
    } else {
      // Final fallback to a very small amount if all else fails
      if (selected.label === "ETH" || selected.label === "WETH") {
        setAmount("0.0001");
      } else {
        setAmount("0.01");
      }
    }
  }
  function handleSwap(e: React.FormEvent) {
    e.preventDefault();
    
    // Agreement modal removed from swap flow - only shows in Invest flow
    // Users can swap without signing agreement first
    
    if ((selected.label === "ETH" || selected.label === "WETH") && amount) {
      setAmount(roundToFour(amount));
    }
    setShowPreview(true);
  };
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;
    if ((selected.label === "ETH" || selected.label === "WETH") && value) {
      const parts = value.split(".");
      if (parts.length === 2 && parts[1].length > 4) {
        value = parts[0] + "." + parts[1].slice(0, 4);
      }
    }
    setAmount(value);
  }
  // Handle WETH unwrap
  async function handleUnwrapWETH(amount: bigint) {
    setUnwrapStep("unwrapping");
    try {
      toast.loading("Unwrapping WETH to ETH...", { id: "unwrap-weth" });
      
      const unwrapHash = await writeUnwrap({
        address: WETH_ADDRESS,
        abi: WETH_ABI,
        functionName: "withdraw",
        args: [amount],
      });
      
      toast.loading("Waiting for unwrap confirmation...", { id: "unwrap-weth" });
      // Wait for confirmation is handled by useWaitForTransactionReceipt
      return unwrapHash;
    } catch (error: any) {
      console.error("WETH unwrap error:", error);
      setUnwrapStep("idle");
      toast.error(`Failed to unwrap WETH: ${error.message || "Unknown error"}`, { id: "unwrap-weth" });
      throw error;
    }
  }

  // Effect to handle unwrap confirmation and auto-swap
  useEffect(() => {
    if (isUnwrapConfirmed && unwrapStep === "unwrapping") {
      setUnwrapStep("unwrapped");
      toast.success("WETH unwrapped! Now swapping to MBT...", { id: "unwrap-weth" });
      
      // Refresh ETH balance query
      queryClient.invalidateQueries({ queryKey: ['balance', address, undefined] });
      
      // Small delay to ensure ETH balance is updated, then trigger swap
      setTimeout(() => {
        setUnwrapStep("swapping");
        handleSwapAfterUnwrap();
      }, 1500);
    }
  }, [isUnwrapConfirmed, unwrapStep, address, queryClient]);

  // Handle swap after unwrap
  async function handleSwapAfterUnwrap() {
    try {
      toast.loading("Swapping ETH to MBT...", { id: "swap-after-unwrap" });
      await swap();
      toast.dismiss("swap-after-unwrap");
    } catch (error: any) {
      console.error("Swap after unwrap error:", error);
      setUnwrapStep("idle");
      toast.error(`Swap failed: ${error.message || "Unknown error"}`, { id: "swap-after-unwrap" });
    }
  }

  async function handleConfirmSwap() {
    setResult("");
    setUnwrapStep("idle");

    try {
      // If WETH, unwrap first, then swap
      if (selected.label === "WETH" && formattedAmount > BigInt(0)) {
        await handleUnwrapWETH(formattedAmount);
        // Swap will be triggered automatically after unwrap confirms
        return;
      }
      
      // For other tokens, proceed with normal swap (single call: approve then buy)
      await swap();
    } catch (err) {
      let message = "Swap failed. Please try again.";
      const e = err as { name?: string; code?: number; message?: string; shortMessage?: string; details?: string };
      if (e?.name === "UserRejectedRequestError" || e?.code === 4001) {
        message = "Transaction cancelled in wallet.";
      } else if (e?.shortMessage) {
        message = e.shortMessage;
      } else if (e?.message) {
        message = e.message;
        if (message.includes("ChainMismatchError") || message.includes("chain")) {
          message = "Wrong network. Please switch your wallet to the selected chain (e.g. Base) and try again.";
        }
      }
      toast.error(message, { duration: 8000 });
      setResult(message);
    }
  }

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Transaction error occurred.", {
        duration: 6000,
      });
    }
  }, [error]);

  // Auto-scroll to success section when swap completes
  useEffect(() => {
    if (isConfirmed && hash) {
      // Reset unwrap step on successful swap
      if (selected.label === "WETH") {
        setUnwrapStep("idle");
      }
      setTimeout(() => {
        const successSection = document.getElementById('swap-success-section');
        if (successSection) {
          successSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 300);
    }
  }, [isConfirmed, hash, selected.label]);

  // Handle successful swap - refresh without reload
  const handleRefreshAfterSwap = async () => {
    try {
      setShowPreview(false);
      setAmount("");
      // Invalidate all queries to refresh balances
      await queryClient.invalidateQueries();
      
      // Wait for the transaction to be indexed on the blockchain
      // Then trigger transaction list refresh if callback provided
      if (onTransactionComplete) {
        // Retry logic: try multiple times with increasing delays
        const retryRefresh = async (attempt: number = 1, maxAttempts: number = 3) => {
          const delay = attempt * 2000; // 2s, 4s, 6s
          
          setTimeout(async () => {
            try {
              console.log(`🔄 Refreshing transactions (attempt ${attempt}/${maxAttempts})...`);
              await onTransactionComplete();
              
              if (attempt === 1) {
                toast.success("Transaction list refreshed!");
              } else {
                toast.success(`Transaction found after ${attempt} attempts!`);
              }
            } catch (error) {
              console.error(`Error refreshing transactions (attempt ${attempt}):`, error);
              
              if (attempt < maxAttempts) {
                // Retry with longer delay
                retryRefresh(attempt + 1, maxAttempts);
              } else {
                toast.info("Transaction may take a moment to appear. Please use the Refresh button if needed.");
              }
            }
          }, delay);
        };
        
        // Start retry sequence
        retryRefresh();
      } else {
        toast.success("Balances refreshed!");
      }
    } catch (error) {
      console.error("Error refreshing:", error);
    }
  };
  
  const resetMpesaPaymentFlow = useCallback(() => {
    setMpesaModalOpen(false);
    setMpesaModalPhase("initiating");
    setMpesaFailureDetail(null);
    setMpesaReceiptAtIso(null);
    setMpesaOnChainTxHash(null);
    setMpesaSmsRef(null);
    setMpesaPaymentInitiated(false);
    setMpesaPaymentStatus("idle");
    setMpesaTxHash(null);
    setMpesaTxStatus(null);
  }, []);

  const handleMpesaPayment = async () => {
    if (!mpesaPhoneNumber.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet so we can credit your MBT");
      return;
    }

    if (!mbtRateKes || !Number.isFinite(mbtRateKes)) {
      toast.error("Unable to fetch MBT/KES rate. Please try again.");
      return;
    }

    const kesValue = mpesaAmountMode === "KES"
      ? parseFloat(mpesaAmountKES || "0")
      : parseFloat(mpesaAmountMBT || "0") * mbtRateKes;

    const mbtValue = mpesaAmountMode === "MBT"
      ? parseFloat(mpesaAmountMBT || "0")
      : parseFloat(mpesaAmountKES || "0") / mbtRateKes;

    if (!kesValue || kesValue <= 0 || !mbtValue || mbtValue <= 0) {
      toast.error("Please enter a valid amount in KES or MBT");
      return;
    }

    const amountKES = Math.ceil(kesValue);
    const mbtAmountHuman = roundToThree(mbtValue);

    setMpesaFailureDetail(null);
    setMpesaReceiptAtIso(null);
    setMpesaOnChainTxHash(null);
    setMpesaSmsRef(null);
    setMpesaModalPhase("initiating");
    setMpesaModalOpen(true);
    setMpesaPaymentStatus("initiating");
    setMpesaPaymentInitiated(true);
    setMpesaTxHash(null);
    setMpesaTxStatus(null);

    try {
      const response = await fetch('/api/elementpay/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: mpesaPhoneNumber.trim(),
          amountKES,
          mbtAmount: mbtAmountHuman,
          walletAddress: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment initiation failed');
      }

      if (data.success) {
        const tx = data.txHash as string | undefined;
        if (!tx) {
          setMpesaPaymentStatus("failed");
          setMpesaModalPhase("failed");
          setMpesaReceiptAtIso(new Date().toISOString());
          setMpesaFailureDetail(
            "Order was created but no transaction reference was returned. Please contact support if you were charged."
          );
          return;
        }
        setMpesaPaymentStatus("pending");
        setMpesaTxHash(tx);
        setMpesaTxStatus(data.orderStatus || "submitted");
        setMpesaModalPhase("awaiting_mpesa");
      } else {
        throw new Error(data.message || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('M-PESA payment error:', error);
      setMpesaPaymentStatus("failed");
      setMpesaModalPhase("failed");
      setMpesaReceiptAtIso(new Date().toISOString());
      setMpesaFailureDetail(error.message || "Failed to initiate payment. Please try again.");
    }
  };

  // Poll ElementPay order status (webhooks only hit the server; the browser needs polling for live UX)
  useEffect(() => {
    if (!mpesaTxHash || mpesaModalPhase !== "awaiting_mpesa") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const maxMs = 5 * 60 * 1000;
    const intervalMs = 3500;

    const poll = async () => {
      if (cancelled) return;
      try {
        const r = await fetch(
          `/api/elementpay/status?txHash=${encodeURIComponent(mpesaTxHash)}`
        );
        const data = await r.json();
        if (cancelled) return;

        const raw =
          (typeof data.status === "string" && data.status) ||
          (data.data && typeof data.data.status === "string" && data.data.status) ||
          "";
        const outcome = normalizeElementPayOrderStatus(raw);

        if (outcome === "success") {
          const onChain = extractOnChainTxHashFromStatusPayload(data, mpesaTxHash);
          const smsRef = extractMpesaSmsRefFromStatusPayload(data);
          setMpesaOnChainTxHash(onChain);
          setMpesaSmsRef(smsRef);
          setMpesaReceiptAtIso(new Date().toISOString());
          setMpesaPaymentStatus("success");
          setMpesaModalPhase("success");
          setMpesaTxStatus(typeof raw === "string" ? raw : "completed");
          await queryClient.invalidateQueries();
          if (onTransactionComplete) {
            try {
              await onTransactionComplete();
            } catch (e) {
              console.error("onTransactionComplete after M-PESA:", e);
            }
          }
          return;
        }
        if (outcome === "failed") {
          setMpesaOnChainTxHash(extractOnChainTxHashFromStatusPayload(data, mpesaTxHash));
          setMpesaSmsRef(extractMpesaSmsRefFromStatusPayload(data));
          setMpesaReceiptAtIso(new Date().toISOString());
          setMpesaPaymentStatus("failed");
          setMpesaModalPhase("failed");
          setMpesaFailureDetail(
            data.message || "This payment did not complete. You can try again."
          );
          return;
        }

        if (Date.now() - started >= maxMs) {
          setMpesaReceiptAtIso(new Date().toISOString());
          setMpesaPaymentStatus("failed");
          setMpesaModalPhase("timeout");
          return;
        }

        timer = setTimeout(poll, intervalMs);
      } catch (e) {
        console.error("ElementPay status poll:", e);
        if (Date.now() - started >= maxMs) {
          setMpesaReceiptAtIso(new Date().toISOString());
          setMpesaPaymentStatus("failed");
          setMpesaModalPhase("timeout");
          return;
        }
        timer = setTimeout(poll, intervalMs);
      }
    };

    timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [mpesaTxHash, mpesaModalPhase, queryClient, onTransactionComplete]);

  // Fetch MBT/KES rate from ElementPay when M-Pesa tab is active
  const fetchMbtRate = useCallback(async () => {
    if (paymentMethod !== "mpesa") return;

    setMpesaRateLoading(true);
    setMpesaRateError(null);

    try {
      const resp = await fetch('/api/elementpay/rates');
      const data = await resp.json();

      if (!resp.ok || !data.success || !data.mbtRateKes) {
        throw new Error(data.message || 'Failed to fetch MBT rate from ElementPay');
      }

      setMbtRateKes(data.mbtRateKes);
    } catch (error: any) {
      console.error('Error fetching ElementPay MBT rate:', error);
      setMpesaRateError(error.message || 'Failed to fetch MBT rate');
    } finally {
      setMpesaRateLoading(false);
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (paymentMethod === "mpesa") {
      fetchMbtRate();
    }
  }, [paymentMethod, fetchMbtRate]);

  // Keep rate fresh while user stays on M-Pesa tab
  useEffect(() => {
    if (paymentMethod !== "mpesa") return;
    const id = setInterval(() => {
      fetchMbtRate();
    }, 60000); // 60s
    return () => clearInterval(id);
  }, [paymentMethod, fetchMbtRate]);

  // Keep KES/MBT fields in sync when rate or mode changes
  useEffect(() => {
    if (!mbtRateKes || !Number.isFinite(mbtRateKes)) return;

    if (mpesaAmountMode === "KES" && mpesaAmountKES) {
      const kes = parseFloat(mpesaAmountKES || "0");
      const mbt = kes > 0 ? kes / mbtRateKes : 0;
      setMpesaAmountMBT(mbt > 0 ? roundToThree(mbt) : "");
    } else if (mpesaAmountMode === "MBT" && mpesaAmountMBT) {
      const mbt = parseFloat(mpesaAmountMBT || "0");
      const kes = mbt > 0 ? mbt * mbtRateKes : 0;
      setMpesaAmountKES(kes > 0 ? Math.ceil(kes).toString() : "");
    }
  }, [mbtRateKes, mpesaAmountMode, mpesaAmountKES, mpesaAmountMBT]);

  const handleNotify = async () => {
    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!notifyEmail || !emailRegex.test(notifyEmail)) {
      toast.error("Please enter a valid email address.", { duration: 4000 });
      return;
    }

    try {
      console.log('Submitting email notification:', { email: notifyEmail, paymentMethod });
      
      const response = await fetchWithRetry('/api/save-payment-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: notifyEmail.trim().toLowerCase(),
          paymentMethod: paymentMethod === "card" ? "card" : "mpesa",
          walletAddress: address || null,
        }),
        retries: 3,
        retryDelay: 1000,
        timeout: 10000,
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();

      setNotifySent(true);
      setNotifyEmail(""); // Clear email field
      
      if (data.alreadyExists) {
        toast.success(`You're already on the list! We'll notify you when ${paymentMethod === "card" ? "Card" : "M-Pesa"} payments go live.`, { duration: 6000 });
      } else {
        toast.success(`✅ Email saved! You'll be notified when ${paymentMethod === "card" ? "Card" : "M-Pesa"} payments are live.`, { duration: 6000 });
      }
    } catch (error: any) {
      console.error('Error saving notification:', error);
      const errorMessage = error.message || 'Network error';
      toast.error(`Failed to save email: ${errorMessage}. Please try again.`, { duration: 5000 });
    }
  };

  const mpesaPhoneHint = useMemo(
    () => mpesaPhoneNumber.replace(/\D/g, "").slice(-4),
    [mpesaPhoneNumber]
  );

  // --- Main render (ElementPay-style card: floating, well-proportioned, pill tabs) ---
  return (
    <>
    <MpesaPaymentFlowModal
      open={mpesaModalOpen}
      phase={mpesaModalPhase}
      errorMessage={mpesaFailureDetail}
      kesAmount={mpesaAmountKES || "0"}
      mbtAmount={mpesaAmountMBT || "0.000"}
      phoneInput={mpesaPhoneNumber}
      phoneHint={mpesaPhoneHint.length ? mpesaPhoneHint : undefined}
      orderReference={mpesaTxHash}
      onChainTxHash={mpesaOnChainTxHash}
      receiptAtIso={mpesaReceiptAtIso}
      mpesaSmsRef={mpesaSmsRef}
      connectedWallet={address ?? null}
      chainId={chainId}
      onOpenChange={(open) => {
        if (!open) {
          if (mpesaModalPhase === "initiating" || mpesaModalPhase === "awaiting_mpesa") {
            return;
          }
          resetMpesaPaymentFlow();
        } else {
          setMpesaModalOpen(true);
        }
      }}
      onResultAcknowledged={resetMpesaPaymentFlow}
    />
    <div className="bg-white dark:bg-gray-800/95 rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-4 w-full max-w-xl mx-auto border border-gray-200 dark:border-gray-700 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        {/* Header — compact, like ElementPay "Crypto to Mobile Money" */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl" aria-hidden>☕</span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#522912] dark:text-amber-400 tracking-tight">Swap to MBT</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Acquire Mocha Bean Tokens to invest in coffee trees
            </p>
          </div>
        </div>

        {/* Payment method pills — ElementPay-style tabs (Send | Buy Crypto) */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => setPaymentMethod("crypto")}
            className={`inline-flex items-center gap-2 py-2.5 px-4 rounded-full text-sm font-semibold border-2 transition-colors ${
              paymentMethod === "crypto"
                ? "border-[#522912] dark:border-amber-500 bg-[#522912]/10 dark:bg-amber-500/20 text-[#522912] dark:text-amber-400"
                : "border-gray-200 dark:border-gray-600 bg-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
            }`}
          >
            <span aria-hidden>💰</span>
            <span>Crypto</span>
            <span className="text-[10px] font-medium opacity-80">Active</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`inline-flex items-center gap-2 py-2.5 px-4 rounded-full text-sm font-semibold border-2 transition-colors ${
              paymentMethod === "card"
                ? "border-[#522912] dark:border-amber-500 bg-[#522912]/10 dark:bg-amber-500/20 text-[#522912] dark:text-amber-400"
                : "border-gray-200 dark:border-gray-600 bg-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
            }`}
          >
            <span aria-hidden>💳</span>
            <span>Card</span>
            <span className="text-[10px] font-medium opacity-80">Soon</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("mpesa")}
            className={`inline-flex items-center gap-2 py-2.5 px-4 rounded-full text-sm font-semibold border-2 transition-colors ${
              paymentMethod === "mpesa"
                ? "border-[#522912] dark:border-amber-500 bg-[#522912]/10 dark:bg-amber-500/20 text-[#522912] dark:text-amber-400"
                : "border-gray-200 dark:border-gray-600 bg-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
            }`}
          >
            <span aria-hidden>📱</span>
            <span>M-Pesa</span>
            <span className="text-[10px] font-medium opacity-80">ElementPay</span>
          </button>
        </div>

        {/* Crypto Payment Flow */}
        {paymentMethod === "crypto" && !showPreview && (
          <form onSubmit={handleSwap} className="space-y-5">
          {/* Input Section */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <ArrowUpRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">
                You pay
              </span>
            </div>
              <span className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full font-semibold text-xs border border-gray-200 dark:border-gray-600">
              {tokenBalance} {selected.label} available
            </span>
          </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
            <input
              type="number"
              step="any"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              min={0}
                  className="w-full text-3xl bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-bold placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0"
            />
              </div>
              <div className="flex-shrink-0">
              <Select
                onValueChange={(value) => setFromToken(value)}
                defaultValue={supportedTokens[0].label}
              >
                  <SelectTrigger className="min-w-[100px] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 flex items-center text-sm font-semibold shadow-sm hover:border-amber-500 dark:hover:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedTokens.map((t) => (
                      <SelectItem key={t.label} value={t.label} className="font-medium">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
            <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
                className="rounded-lg px-4 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 font-semibold text-xs transition-all"
              onClick={handleSetMax}
            >
              Max
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
                className="rounded-lg px-4 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 font-semibold text-xs transition-all"
              onClick={handleSetHalf}
            >
              50%
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
                className="rounded-lg px-4 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 font-semibold text-xs transition-all"
              onClick={handleSetMin}
            >
              Min
            </Button>
          </div>
          </div>
          {/* Swap Arrow Indicator */}
          <div className="flex justify-center -my-2 relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-amber-500 via-amber-400 to-emerald-500 rounded-full p-3 shadow-xl border-2 border-white dark:border-white/10"
            >
              <ArrowUpRight className="h-5 w-5 text-white rotate-45" />
            </motion.div>
          </div>

          {/* Output Section */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 border-2 border-emerald-200 dark:border-emerald-800 shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">
                You receive
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
            <input
              type="text"
                  value={mbtDisplay || "0.00 MBT ($0)"}
              disabled
              className={`
                    ${isLongValue ? 'text-lg' : 'text-3xl'}
                    w-full bg-transparent border-none focus:outline-none text-emerald-700 dark:text-emerald-400 font-bold select-none transition-all duration-200
              `}
            />
              </div>
              <div className="flex-shrink-0">
                <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm px-4 py-2 rounded-xl font-bold whitespace-nowrap shadow-md">
              MBT
            </span>
          </div>
            </div>
          </div>

          {/* Information Sections - Collapsible */}
          <div className="space-y-3">
            {/* Token Compatibility Warnings */}
            {selected.label === "ETH" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-amber-800/20 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-amber-200 dark:bg-amber-800 rounded-lg flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1.5">
                      💡 Supported Tokens
                    </div>
                    <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      <strong>Both ETH and WETH are supported.</strong> If you select WETH, it will automatically 
                      unwrap to native ETH before swapping to MBT. You can use either token type seamlessly.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Helpful Tips */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-200 dark:bg-blue-800 rounded-lg flex-shrink-0">
                  <Info className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-2">💡 Quick Tips</div>
                  <ul className="space-y-1.5 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                      <span>ETH and WETH are both supported (WETH unwraps automatically)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                      <span>Check wallet balance before initiating swap</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                      <span>{getChainName(chainId)} transactions complete in seconds</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Loading State Indicator */}
          {(ethBalanceQuery.isLoading || erc20BalanceQuery.isLoading || wethBalanceQuery.isLoading) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
            >
              <Zap className="h-4 w-4 animate-pulse text-amber-500" />
              <span>Loading balance...</span>
            </motion.div>
          )}

          {/* Risk Disclaimer */}
          <RiskDisclaimer variant="compact" className="mb-4" />

          {/* Swap Button */}
          <Button
            className="w-full bg-gradient-to-r from-[#522912] via-[#6A4A36] to-[#522912] hover:from-[#6A4A36] hover:via-[#522912] hover:to-[#6A4A36] text-white rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.01] active:scale-[0.99]"
            disabled={
              !amount ||
              !address ||
              !isValidAmount ||
              !isValidTokensToReceive ||
              ethBalanceQuery.isLoading ||
              erc20BalanceQuery.isLoading ||
              wethBalanceQuery.isLoading ||
              isPending ||
              isConfirming
            }
            type="submit"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="w-5 h-5" />
                <span>Preview Swap</span>
              </>
            )}
          </Button>
        </form>
        )}

        {/* Crypto Swap Preview */}
        {paymentMethod === "crypto" && showPreview && (
        <div>
          {/* WETH Unwrap Progress Indicator */}
          {selected.label === "WETH" && unwrapStep !== "idle" && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    {unwrapStep === "unwrapping" || unwrapStep === "unwrapped" ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-6 h-6 text-purple-600" />
                      </motion.div>
                    ) : unwrapStep === "swapping" ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
                      {unwrapStep === "unwrapping" && "Step 1: Unwrapping WETH → ETH"}
                      {unwrapStep === "unwrapped" && "✅ WETH Unwrapped! Preparing swap..."}
                      {unwrapStep === "swapping" && "Step 2: Swapping ETH → MBT"}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">
                      {unwrapStep === "unwrapping" && (isUnwrapConfirming ? "Waiting for confirmation..." : "Processing unwrap transaction...")}
                      {unwrapStep === "unwrapped" && "ETH balance updated. Starting swap..."}
                      {unwrapStep === "swapping" && (isConfirming ? "Confirming swap transaction..." : "Processing swap...")}
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    initial={{ width: "0%" }}
                    animate={{
                      width: unwrapStep === "unwrapping" ? "50%" : 
                             unwrapStep === "unwrapped" ? "60%" : 
                             unwrapStep === "swapping" ? "100%" : "0%"
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
            {selected.label === "WETH" && unwrapStep !== "idle" ? "Processing..." : "Confirm Swap"}
          </h3>
          <div className="mb-2 p-2 rounded bg-gray-100 dark:bg-gray-800">
            <p>
              You pay: {roundedAmount} {selected.label}
            </p>
            <p>
              You receive:{" "}
              {roundToThree(Number(formatUnits(tokensToReceive, 18)))} MBT
            </p>
            <p>
              Value before fees: ${roundToWhole(formattedUsdValue)}
            </p>
            <p>
              <span className="font-semibold">
                Net after fees: ${netUsdDisplay}
              </span>
            </p>
          </div>
          {!icoPausedLoading && icoPaused && (
            <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Sales are currently paused. Purchases will be enabled again when the ICO is unpaused.
              </p>
            </div>
          )}
          {belowMinimum && minAmountFormatted && (
            <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Minimum purchase for {selected.label} is {minAmountFormatted} {selected.label}. Increase the amount to continue.
              </p>
            </div>
          )}
              <Button
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 text-sm"
            disabled={
              isPending ||
              isConfirming ||
              !isValidAmount ||
              !isValidTokensToReceive ||
              isUnwrapping ||
              isUnwrapConfirming ||
              unwrapStep === "unwrapping" ||
              unwrapStep === "swapping" ||
              icoPaused ||
              belowMinimum
            }
            onClick={handleConfirmSwap}
          >
            {selected.label === "WETH" && (isUnwrapping || isUnwrapConfirming || unwrapStep === "unwrapping") ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Unwrapping WETH...
              </>
            ) : selected.label === "WETH" && unwrapStep === "swapping" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Swapping to MBT...
              </>
            ) : isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Processing...
              </>
            ) : (
              selected.label === "WETH" ? "Unwrap & Swap" : "Complete Purchase"
            )}
              </Button>
          
          {/* WETH Info Banner */}
          {selected.label === "WETH" && unwrapStep === "idle" && (
            <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>⚡ Seamless Two-Step Process:</strong> Your WETH will be automatically unwrapped to ETH, then swapped to MBT. 
                  Both transactions happen automatically - just click "Unwrap & Swap"!
                </div>
              </div>
            </div>
          )}
              <Button
            className="w-full mt-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2"
            onClick={() => setShowPreview(false)}
            variant="ghost"
          >
            Go Back
              </Button>
          {isConfirmed && hash && (
            <div className="mt-2" id="swap-success-section">
              <TransactionSuccess
                txHash={hash}
                title="Swap Successful!"
                description={`You successfully swapped ${roundedAmount} ${selected.label} for ${roundToThree(Number(formatUnits(tokensToReceive, 18)))} MBT`}
                onRefresh={handleRefreshAfterSwap}
                showRefresh={true}
                showNextActionPrompt={true}
                shareData={{
                  amount: roundToThree(Number(formatUnits(tokensToReceive, 18))),
                  tokenSymbol: "MBT",
                }}
                nextAction={{
                  label: "Invest in Trees Now",
                  onClick: () => {
                    // Scroll to Invest Now button and trigger it
                    const investButton = document.getElementById('InvestNowButton');
                    if (investButton) {
                      investButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setTimeout(() => {
                        investButton.click();
                      }, 500);
                    }
                  },
                }}
              />
            </div>
          )}
                </div>
      )}

        {/* Card Payment - Coming Soon */}
        {paymentMethod === "card" && (
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                Card Payments Coming Soon
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We're working on integrating bank card payments to make it even easier to invest in coffee-backed assets.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                Get notified when card payments go live
              </p>
                {notifySent ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-semibold">Thank you! We'll notify you when it's ready.</span>
                </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    className="flex-1 py-2 px-3 rounded border border-gray-300 dark:border-gray-600 focus:outline-none dark:bg-gray-800 text-sm"
                    />
                    <Button
                      onClick={handleNotify}
                    className="bg-[#522912] hover:bg-[#6A4A36] text-white px-6"
                    >
                      Notify Me
                    </Button>
                  </div>
                )}
              </div>

            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                In the meantime, you can use crypto payments
              </p>
              <Button
                onClick={() => setPaymentMethod("crypto")}
                variant="outline"
                className="border-[#522912] text-[#522912] hover:bg-[#522912]/10"
              >
                Switch to Crypto Payment
              </Button>
          </div>
          </div>
        )}

        {/* M-PESA Payment Flow — streamlined, onramp-style UX */}
        {paymentMethod === "mpesa" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-900/20 px-3 py-2">
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                ElementPay Flow: v2 (Step-based + status modal)
              </p>
            </div>
            {/* Step 1: Amount */}
            <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Step 1 · Amount
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {mpesaRateLoading
                    ? "Getting rate…"
                    : mbtRateKes
                    ? `1 MBT ≈ ${mbtRateKes.toFixed(2)} KES`
                    : "Rate unavailable"}
                </span>
                <button
                  type="button"
                  onClick={() => fetchMbtRate()}
                  disabled={mpesaRateLoading}
                  className="text-[11px] font-semibold text-[#522912] dark:text-amber-400 disabled:opacity-40"
                >
                  Refresh
                </button>
              </div>
            </div>

              {mpesaRateError && (
                <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50/70 dark:bg-red-900/20 p-2 text-[11px] text-red-700 dark:text-red-200">
                  {mpesaRateError}
                </div>
              )}

              <div className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-700/30 p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Enter amount
                  </span>
                  <div className="inline-flex p-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => setMpesaAmountMode("KES")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                        mpesaAmountMode === "KES"
                          ? "bg-[#522912] text-white"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      KES
                    </button>
                    <button
                      type="button"
                      onClick={() => setMpesaAmountMode("MBT")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                        mpesaAmountMode === "MBT"
                          ? "bg-[#522912] text-white"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      MBT
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {mpesaAmountMode === "KES" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step="1"
                          placeholder="Enter amount in KES"
                          value={mpesaAmountKES}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMpesaAmountKES(v);
                            if (mbtRateKes && Number(v) > 0) {
                              const kes = parseFloat(v);
                              const mbt = kes / mbtRateKes;
                              setMpesaAmountMBT(mbt > 0 ? roundToThree(mbt) : "");
                            } else {
                              setMpesaAmountMBT("");
                            }
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#522912]/30 dark:focus:ring-amber-500/30 focus:border-[#522912] dark:focus:border-amber-500"
                        />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          KES
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        ≈ {mpesaAmountMBT || "0.000"} MBT
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          placeholder="Enter amount in MBT"
                          value={mpesaAmountMBT}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMpesaAmountMBT(v);
                            if (mbtRateKes && Number(v) > 0) {
                              const mbt = parseFloat(v);
                              const kes = mbt * mbtRateKes;
                              setMpesaAmountKES(kes > 0 ? Math.ceil(kes).toString() : "");
                            } else {
                              setMpesaAmountKES("");
                            }
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#522912]/30 dark:focus:ring-amber-500/30 focus:border-[#522912] dark:focus:border-amber-500"
                        />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          MBT
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        ≈ KES {mpesaAmountKES || "0"}
                      </p>
                    </>
                  )}
                </div>

                {/* Quick summary */}
                <div className="mt-2 flex justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span>You pay</span>
                  <span className="font-semibold">
                    KES {mpesaAmountKES || "0"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span>You receive</span>
                  <span className="font-semibold">
                    {mpesaAmountMBT || "0.000"} MBT
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Phone number */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Step 2 · Phone number
              </span>
              <div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-200 shrink-0">
                    <span aria-hidden>🇰🇪</span>
                    <span>+254</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="7XX XXX XXX"
                    value={mpesaPhoneNumber}
                    onChange={(e) => {
                      setMpesaPhoneNumber(e.target.value);
                    }}
                    disabled={mpesaPaymentInitiated}
                    className="flex-1 py-2.5 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#522912]/30 dark:focus:ring-amber-500/30 focus:border-[#522912] dark:focus:border-amber-500"
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                  Safaricom number for the M-PESA STK push.
                </p>
              </div>
            </div>

            {/* Step 3: Confirm & pay */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Step 3 · Confirm & pay
              </span>
              <Button
                onClick={handleMpesaPayment}
                disabled={
                  !mpesaPhoneNumber.trim() ||
                  !address ||
                  !mpesaAmountKES ||
                  Number(mpesaAmountKES) <= 0 ||
                  mpesaPaymentStatus === "initiating" ||
                  mpesaPaymentStatus === "pending"
                }
                className="w-full bg-[#522912] hover:bg-[#6A4A36] dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl py-3.5 text-sm font-bold disabled:opacity-50"
              >
                {mpesaPaymentStatus === "initiating" || mpesaPaymentStatus === "pending" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mpesaPaymentStatus === "pending" ? "Check your phone" : "Initiating…"}
                  </>
                ) : (
                  <>Pay KES {mpesaAmountKES || "0"} via M-PESA →</>
                )}
              </Button>

              {mpesaPaymentStatus === "pending" && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/20 p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    STK Push sent. Enter your M-PESA PIN on your phone to complete. MBTs will credit automatically.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  <strong>Lipa na M-PESA:</strong> Enter amount → Confirm & Pay → Approve on phone. Powered by ElementPay.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ChatterPay Payment Flow - Temporarily disabled - awaiting API credentials */}
        {/* {paymentMethod === "chatterpay" && (
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                Fund Your Wallet with ChatterPay
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Fund your wallet with crypto through WhatsApp. Fast, secure, and easy - no app download needed!
              </p>
          <Button
                onClick={() => setShowChatterPay(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
              >
                Fund Wallet with ChatterPay
          </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                <span>📋</span>
                Two-Step Process
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                    Step 1: Fund Your Wallet
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>Click "Fund Wallet with ChatterPay" above</li>
                    <li>Scan QR code or open WhatsApp link</li>
                    <li>ChatterPay bot guides you through wallet creation and funding</li>
                    <li>Funds arrive in your wallet on {getChainName(chainId)}</li>
                  </ul>
                </div>
                <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                    Step 2: Swap to MBT
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    After funding, switch to "Crypto" payment method above and use the swap component 
                    to exchange your crypto (ETH/USDT) for MBT tokens. Then you can invest!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                Why ChatterPay?
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-300 space-y-1 list-disc list-inside">
                <li>No app download - works directly in WhatsApp</li>
                <li>Fast and cost-effective transactions</li>
                <li>Instant processing on {getChainName(chainId)}</li>
                <li>Seamless wallet creation and funding</li>
              </ul>
            </div>
          </div>
        )} */}

        {/* M-Pesa "coming soon" notifier removed – live ElementPay flow above */}

      {/* ChatterPay Payment Modal - Temporarily disabled - awaiting API credentials */}
      {/* <ChatterPayPayment
        isOpen={showChatterPay}
        onClose={() => {
          setShowChatterPay(false);
        }}
        onSuccess={async () => {
          // Refresh balances after successful payment
          await queryClient.invalidateQueries();
          if (onTransactionComplete) {
            await onTransactionComplete();
          }
          setShowChatterPay(false);
          // Automatically switch to crypto payment method so user can swap to MBT
          setPaymentMethod("crypto");
          toast.success("Wallet funded! Now swap your crypto to MBT tokens above.", {
            duration: 5000,
          });
        }}
        amount={amount || "100"}
        currency="USD"
      /> */}
    </div>
    </>
  );
}
