
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Search, Filter, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Info, MoreHorizontal, RefreshCw, Coffee, AlertTriangle, TrendingUp, Shield, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAccount, useReadContract, useReadContracts, useWriteContract, useBalance, usePublicClient, useWatchContractEvent, useChainId } from "wagmi"
import { useQueryClient } from "@tanstack/react-query"
import { formatEther, parseUnits, formatUnits } from "viem"
import dynamic from "next/dynamic"
import { useStarknet } from "@/context/StarknetContext"
import { useAppKit } from "@reown/appkit/react"

// Dynamically import Header with SSR disabled since it uses Reown hooks
const Header = dynamic(() => import("@/components/@shared-components/header"), {
  ssr: false,
  loading: () => (
    <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"></div>
  ),
});
import StatCard from "@/components/@shared-components/statCard"
import { TREE_CONTRACT_ABI, eventsAbi } from "@/config/constants"
import { useContractAddresses } from "@/hooks/useContractAddresses"
import Link from "next/link"
import { Toaster, toast } from "sonner"
import { FarmsTable } from "@/components/@shared-components/FarmsTable"
import { StarknetDashboard } from "@/components/@shared-components/StarknetDashboard"
import { ChartLineDefault } from "@/components/@shared-components/charts/chart-line"
import { ChartRadialShape } from "@/components/@shared-components/charts/chat-radial"
import { SwapToMBTComponent } from "@/components/@shared-components/swapToMBT"
import { ChainrailsPaymentModal } from "@/chainrails"
import { TransactionSuccess } from "@/components/@shared-components/TransactionSuccess"
import { TransactionsTable } from "@/components/@shared-components/TransactionsTable"
import { InvestmentAgreementModal } from "@/components/@shared-components/InvestmentAgreementModal"
import { useUserTransactions } from "@/hooks/useUserTransactions"
import { useInvestmentAgreement } from "@/hooks/useInvestmentAgreement"
import { useNextStep } from 'nextstepjs';
import { motion } from 'framer-motion';
import { CoffeeGardenVisualization } from "@/components/@shared-components/CoffeeGardenVisualization";
import { RiskDisclaimer } from "@/components/@shared-components/RiskDisclaimer";
// import { KYCVerification } from "@/components/@shared-components/KYCVerification"; // Temporarily disabled - awaiting API credentials
// import { UnlimitOnramp } from "@/components/@shared-components/UnlimitOnramp"; // Temporarily disabled - awaiting API credentials
import { getCurrentCycleInfo, getTimeUntil } from "@/config/investmentCycles";
import { Clock, Calendar } from "lucide-react";

const MOCHA_TREE_CONTRACT_ABI = TREE_CONTRACT_ABI;
const BOND_PRICE_USD = 100;
const MBT_PRICE_USD = 25;
const BOND_MBT = BOND_PRICE_USD / MBT_PRICE_USD; // 4 MBT per full Tree
const MBT_DECIMALS = 18;
const MIN_INVESTMENT_MBT = 0.04; // $1 minimum investment (0.04 MBT = $1 at $25/MBT)
const TOUR_KEY = "mainTourCompleted";

// MBT Token ABI
const MBT_TOKEN_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "success", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    type: "function",
  },
] as const;

export default function Dashboard() {
  const { isStarknetMode } = useStarknet()
  const { startNextStep } = useNextStep();
  const { address: userAddress, isConnected } = useAccount()
  const { open: openSignInModal } = useAppKit()
  const chainId = useChainId();
  const { mttrVault, mbtToken } = useContractAddresses();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  /** Opens Reown AppKit (email / social / wallet). Prefer Openfort when embedded. */
  const handleConnectWallet = useCallback(() => {
    if (typeof (window as unknown as { openfort?: { connect: () => void } }).openfort !== "undefined") {
      (window as unknown as { openfort: { connect: () => void } }).openfort.connect()
    } else {
      void openSignInModal().catch((err: unknown) => {
        console.error("Sign-in modal error:", err)
        toast.error("Sign in failed. Please try again.")
      })
    }
  }, [openSignInModal])
  
  // Reset previous values when network changes
  useEffect(() => {
    setPreviousTotalBonds(0);
    setPreviousAnnualInterest(0);
    setPreviousCumulativeReturn(0);
  }, [chainId]);
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [selectedFarmId, setSelectedFarmId] = useState("")
  const [selectedFarmName, setSelectedFarmName] = useState("")
  const [mbtAmount, setMbtAmount] = useState("")
  const [purchaseError, setPurchaseError] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [approvalTxHash, setApprovalTxHash] = useState("")
  const [purchaseSuccessDetails, setPurchaseSuccessDetails] = useState<{ Trees: number; farmName: string; txHash: string } | null>(null)
  
  // Fetch user transactions
  const { transactions, isLoading: isLoadingTransactions, error: transactionsError, refetch: refetchTransactions, isRetrying, retryCount } = useUserTransactions();
  
  // Agreement state
  const { hasAgreed, recordAgreement, clearAgreement, isLoading: isLoadingAgreement } = useInvestmentAgreement();
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [pendingInvestAction, setPendingInvestAction] = useState<{farmId: string, farmName: string, minInvestment: any} | null>(null);
  
  // KYC and Onramp state - Temporarily disabled - awaiting API credentials
  // const [showKYCModal, setShowKYCModal] = useState(false);
  // const [showOnrampModal, setShowOnrampModal] = useState(false);
  
  // Investment cycle countdown state - optimized to update less frequently
  const [cycleInfo, setCycleInfo] = useState(getCurrentCycleInfo());
  const [timeUntilClose, setTimeUntilClose] = useState(getTimeUntil(cycleInfo.closeDate));
  const [timeUntilYield, setTimeUntilYield] = useState(getTimeUntil(cycleInfo.firstYieldDate));
  
  // Update countdown every 5 seconds (reduced from 1 second for better performance)
  useEffect(() => {
    const interval = setInterval(() => {
      const info = getCurrentCycleInfo();
      setCycleInfo(info);
      setTimeUntilClose(getTimeUntil(info.closeDate));
      setTimeUntilYield(getTimeUntil(info.firstYieldDate));
    }, 5000); // Changed from 1000ms to 5000ms
    return () => clearInterval(interval);
  }, []);
  
  // Initialization flag to prevent flash of content
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [previousTotalBonds, setPreviousTotalBonds] = useState(0);
  const [previousAnnualInterest, setPreviousAnnualInterest] = useState(0);
  const [previousCumulativeReturn, setPreviousCumulativeReturn] = useState(0);

  // Fetch contract data (current chain: Scroll or Base)
  const { data: activeFarmIds, isLoading: isLoadingActiveFarmIds, error: activeFarmIdsError } = useReadContract({
    address: mttrVault as `0x${string}`,
    abi: MOCHA_TREE_CONTRACT_ABI,
    functionName: 'getActiveFarmIds',
    chainId,
    query: { enabled: !!mttrVault },
  });

  // Batch fetch farm configurations (current chain)
  const farmConfigContracts = activeFarmIds && mttrVault
    ? activeFarmIds.map((farmId: any) => ({
      address: mttrVault as `0x${string}`,
      abi: MOCHA_TREE_CONTRACT_ABI,
      functionName: 'getFarmConfig',
      args: [farmId],
      chainId,
    }))
    : [];

  const { data: farmConfigsData, isLoading: isLoadingFarmConfigs, error: farmConfigsError } = useReadContracts({
    contracts: farmConfigContracts,
  });

  // Fetch user balances for each farm's share token (MABB) on current chain
  const balanceContracts = farmConfigsData && mttrVault
    ? farmConfigsData.map((result: { status: string; result: { shareTokenAddress: any } }, index: any) => ({
      address: result.status === 'success' ? result.result.shareTokenAddress : mttrVault as `0x${string}`,
      abi: MOCHA_TREE_CONTRACT_ABI,
      functionName: 'balanceOf',
      args: userAddress ? [userAddress] : undefined,
      chainId,
      query: { enabled: !!userAddress },
    }))
    : [];

  const { data: balanceData, isLoading: isLoadingBalances, error: balanceError } = useReadContracts({
    contracts: balanceContracts,
  });

  // MBT Token balance and allowance (current chain: Scroll or Base)
  const { data: mbtBalance, refetch: refetchMbtBalance, isLoading: isLoadingMbtBalance } = useReadContract({
    address: mbtToken as `0x${string}`,
    abi: MBT_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId,
    query: { enabled: isConnected && !!mbtToken && !!userAddress },
  });

  const { data: mbtAllowance, refetch: refetchAllowance } = useReadContract({
    address: mbtToken as `0x${string}`,
    abi: MBT_TOKEN_ABI,
    functionName: 'allowance',
    args: userAddress && mttrVault ? [userAddress, mttrVault as `0x${string}`] : undefined,
    chainId,
    query: { enabled: isConnected && !!mbtToken && !!mttrVault && !!userAddress },
  });

  // Process farm and balance data
  const farms = farmConfigsData
    ? farmConfigsData.map((result: { status: string; result: any; error: any }, index: string | number) => ({
      farmId: activeFarmIds[index],
      config: result.status === 'success' ? result.result : null,
      balance: balanceData && balanceData[index]?.status === 'success' ? balanceData[index].result : BigInt(0),
      error: result.status === 'failure' ? result.error : null,
    }))
    : [];

  const firstAvailableFarm = farms.find(
    (farm: { config: { active: any; treeCount: number } }) => farm.config?.active && farm.config?.treeCount > 0
  );

  // Enhanced logging for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log("Farm availability check:", {
      activeFarmIds: activeFarmIds,
      farmsCount: farms.length,
      farms: farms.map((f: { farmId: any; config: { active: any; treeCount: number; name: string } }) => ({
        farmId: f.farmId,
        name: f.config?.name || 'Unknown',
        active: f.config?.active ?? 'undefined',
        treeCount: f.config?.treeCount ?? 'undefined',
        hasConfig: !!f.config
      })),
      firstAvailableFarm: firstAvailableFarm ? {
        farmId: firstAvailableFarm.farmId,
        name: firstAvailableFarm.config?.name,
        active: firstAvailableFarm.config?.active,
        treeCount: firstAvailableFarm.config?.treeCount
      } : null
    });
  }

  // Calculate total Trees owned and interest (network-aware)
  // Only calculate if we have farms data loaded for the current network
  const totalBondsOwned = (!isLoadingBalances && !isLoadingFarmConfigs && farms.length > 0)
    ? farms.reduce((sum: number, { balance }: any) => sum + Number(balance || 0), 0)
    : 0;
  const totalBondsOwnedBigInt = totalBondsOwned > 0 ? BigInt(Math.floor(totalBondsOwned)) : BigInt(0);
  const annualInterestUSD = totalBondsOwned > 0 
    ? formatUnits(totalBondsOwnedBigInt * BigInt(10), MBT_DECIMALS) // 10% of $100 per Tree
    : "0";
  const annualInterestMBT = totalBondsOwned > 0 
    ? Number(annualInterestUSD) * 0.04 // $1 = 0.04 MBT
    : 0;
  const cumulativeReturnUSD = totalBondsOwned > 0 
    ? Number(annualInterestUSD) * 5 // 5-year term
    : 0;
  const cumulativeReturnMBT = totalBondsOwned > 0 
    ? cumulativeReturnUSD * 0.04 // $1 = 0.04 MBT
    : 0;

  // Write contract hooks
  const { writeContractAsync: writeApprove, isPending: isApprovePending, isSuccess: isApproveSuccess } = useWriteContract();
  const { writeContractAsync: writePurchase, isPending: isPurchasePending, isSuccess: isPurchaseSuccess } = useWriteContract();

  // Pagination calculations
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentTxs = transactions.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(transactions.length / rowsPerPage);

  // Handle MBT token approval
  const approveTokens = async (amount: bigint) => {
    if (!isConnected) {
      setPurchaseError("Please sign in to continue");
      return false;
    }

    try {
      setIsApproving(true);
      setPurchaseError("");

      if (!mbtToken || !mttrVault) {
        setPurchaseError("Contract addresses not available for current network");
        return false;
      }
      
      const txHash = await writeApprove({
        address: mbtToken as `0x${string}`,
        abi: MBT_TOKEN_ABI,
        functionName: 'approve',
        args: [mttrVault as `0x${string}`, amount],
      });

      setApprovalTxHash(txHash);
      return true;
    } catch (err: any) {
      setPurchaseError(`Approval failed: ${err.message || err.toString()}`);
      return false;
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Tree purchase
  const handlePurchase = async () => {
    if (!isConnected) {
      setPurchaseError("Please sign in to continue");
      return;
    }

    if (!publicClient) {
      setPurchaseError("Public client not available");
      return;
    }

    setPurchaseError("");
    const amount = mbtAmountNum;

    // Validation
    if (!selectedFarmId) {
      setPurchaseError("No farm selected");
      return;
    }

    const contractMinInvestmentNum = Number(formatUnits(minInvestment, MBT_DECIMALS));
    const effectiveMinInvestmentNum = Math.max(MIN_INVESTMENT_MBT, contractMinInvestmentNum);
    const maxInvestmentNum = Number(formatUnits(maxInvestment, MBT_DECIMALS));

    if (amount < effectiveMinInvestmentNum) {
      setPurchaseError(`MBT amount must be at least ${effectiveMinInvestmentNum.toFixed(2)} MBT ($1 minimum)`);
      return;
    }
    if (amount > maxInvestmentNum) {
      setPurchaseError(`MBT amount must not exceed ${maxInvestmentNum.toFixed(2)} MBT`);
      return;
    }

    const totalCost = parseUnits(amount.toString(), MBT_DECIMALS);

    if (!mbtBalance || BigInt(mbtBalance as bigint) < totalCost) {
      setPurchaseError(`Insufficient MBT balance. You need ${formatUnits(totalCost, MBT_DECIMALS)} MBT`);
      return;
    }

    try {
      if (!mttrVault) {
        setPurchaseError("Contract address not available for current network");
        return;
      }
      
      // Purchase Trees
      const txHash = await writePurchase({
        address: mttrVault as `0x${string}`,
        abi: MOCHA_TREE_CONTRACT_ABI,
        functionName: 'purchaseBond',
        args: [totalCost],
      });

      const Trees = mbtAmountNum / BOND_MBT;
      setPurchaseSuccessDetails({ Trees, farmName: selectedFarmName, txHash });
      setPurchaseError("");
      toast.success(`Successfully purchased ${Trees.toFixed(2)} Trees for ${selectedFarmName}! Transaction: ${txHash}`);

      // Force recalculation of trends by updating previous values
      setPreviousTotalBonds(totalBondsOwned);
      setPreviousAnnualInterest(annualInterestMBT);
      setPreviousCumulativeReturn(cumulativeReturnMBT);
    } catch (err: any) {
      setPurchaseError(`Transaction failed: ${err.message || err.toString()}`);
    }
  };

  // Handle approve click
  const handleApprove = async () => {
    const totalCost = parseUnits(mbtAmountNum.toString(), MBT_DECIMALS);
    await approveTokens(totalCost);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await refetchAllowance();
  };

  // Handle buy more click (from table)
  const handleBuyMoreClick = (farmId: string, farmName: string, minInvestment: bigint) => {
    if (!isConnected) {
      handleConnectWallet();
    } else {
      // Check if user has agreed to terms
      if (!hasAgreed) {
        setPendingInvestAction({ farmId, farmName, minInvestment });
        setShowAgreementModal(true);
        return;
      }
      
      setSelectedFarmId(farmId);
      setSelectedFarmName(farmName);
      // Use the $1 minimum (0.04 MBT) instead of contract minimum
      const contractMinNum = Number(formatUnits(minInvestment, MBT_DECIMALS));
      const effectiveMin = Math.max(MIN_INVESTMENT_MBT, contractMinNum);
      setMbtAmount(effectiveMin.toFixed(2));
      setIsPurchaseModalOpen(true);
    }
  };

  const handleQuickBuyClick = () => {
    // Check if farms are still loading
    if (isLoadingFarmConfigs || isLoadingBalances || isLoadingActiveFarmIds) {
      toast.info("Loading farms, please wait...");
      return;
    }
    
    // Check for errors loading farm data
    if (activeFarmIdsError || farmConfigsError) {
      toast.error("Error loading farm data. Please refresh the page.");
      console.error("Farm loading errors:", { activeFarmIdsError, farmConfigsError });
      return;
    }
    
    // Check if no active farms exist
    if (!activeFarmIds || activeFarmIds.length === 0) {
      toast.error("No active farms found. Please check back later.");
      return;
    }
    
    // Check if farms exist but none are available
    if (farms.length === 0) {
      toast.error("Farm data not loaded. Please refresh the page.");
      return;
    }
    
    // Use the already calculated firstAvailableFarm
    if (!firstAvailableFarm) {
      // Provide more helpful error message
      const inactiveFarms = farms.filter((farm: { config: { active: any } }) => !farm.config?.active);
      const noTreeFarms = farms.filter((farm: { config: { treeCount: number } }) => farm.config?.active && farm.config?.treeCount === 0);
      
      if (inactiveFarms.length > 0) {
        toast.error("All farms are currently inactive. Please check back later.");
      } else if (noTreeFarms.length > 0) {
        toast.error("No farms have available trees. Please check back later.");
    } else {
        toast.error("No farms available for investment. Please check back later.");
      }
      console.log("Farm availability check:", {
        totalFarms: farms.length,
        activeFarms: farms.filter((f: { config: { active: any } }) => f.config?.active).length,
        farmsWithTrees: farms.filter((f: { config: { treeCount: number } }) => f.config?.treeCount > 0).length,
        farms: farms.map((f: { farmId: any; config: { active: any; treeCount: number; name: string } }) => ({
          farmId: f.farmId,
          name: f.config?.name,
          active: f.config?.active,
          treeCount: f.config?.treeCount
        }))
      });
      return;
    }
    
    // Check if user has agreed to terms
    if (!hasAgreed) {
      setPendingInvestAction({
        farmId: firstAvailableFarm.farmId.toString(),
        farmName: firstAvailableFarm.config?.name || "Unknown Farm",
        minInvestment: firstAvailableFarm.config?.minInvestment || BigInt(0)
      });
      setShowAgreementModal(true);
      return;
    }
    
    // Set farm selection BEFORE opening modal
    setSelectedFarmId(firstAvailableFarm.farmId.toString());
    setSelectedFarmName(firstAvailableFarm.config?.name || "Unknown Farm");
    // Use the $1 minimum (0.04 MBT) instead of contract minimum
    const contractMinFromFarm = firstAvailableFarm.config?.minInvestment || BigInt(0);
    const contractMinNum = Number(formatUnits(contractMinFromFarm, MBT_DECIMALS));
    const effectiveMin = Math.max(MIN_INVESTMENT_MBT, contractMinNum);
    setMbtAmount(effectiveMin.toFixed(2));
      setIsPurchaseModalOpen(true);
  };
  
  // Handle agreement completion
  const handleAgreementComplete = (email: string) => {
    recordAgreement(email);
    setShowAgreementModal(false);
    
    // If there's a pending action, execute it
    if (pendingInvestAction) {
      const { farmId, farmName, minInvestment } = pendingInvestAction;
      setSelectedFarmId(farmId);
      setSelectedFarmName(farmName);
      setMbtAmount(Number(formatUnits(minInvestment, MBT_DECIMALS)).toFixed(2));
      setIsPurchaseModalOpen(true);
      setPendingInvestAction(null);
    }
  };

  // Refresh balances without full page reload
  const handleRefreshBalances = async () => {
    try {
      // Refetch MBT balance
      await refetchMbtBalance();
      // Refetch allowance
      await refetchAllowance();
      // Invalidate all wagmi queries to refresh contract data
      await queryClient.invalidateQueries();
      toast.success("Balances refreshed!");
    } catch (error) {
      console.error("Error refreshing balances:", error);
      toast.error("Failed to refresh balances");
    }
  };


  // Effects
  useEffect(() => {
    if (isPurchaseSuccess) {
      setMbtAmount("");
      setSelectedFarmId("");
      setSelectedFarmName("");
      refetchMbtBalance();
      refetchAllowance();
    }
  }, [isPurchaseSuccess, refetchMbtBalance, refetchAllowance]);

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode")
    if (savedMode !== null) {
      setDarkMode(savedMode === "true")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setDarkMode(prefersDark)
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

  const truncateAddress = (address: string | any[]) => {
    if (!address) return "N/A"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  // Handle initialization - prevent flash of content by waiting for critical data
  useEffect(() => {
    // If not connected, mark as initialized immediately
    if (!isConnected) {
      setIsInitialized(true);
      return;
    }

    // Check if all critical data has finished loading
    const criticalDataLoaded = !isLoadingAgreement && !isLoadingMbtBalance && !isLoadingBalances;
    
    // Also check that the actual data we need is available (not undefined)
    // This prevents the banner from flashing while data transitions from undefined to actual values
    const dataAvailable = mbtBalance !== undefined && balanceData !== undefined;

    if (criticalDataLoaded && dataAvailable) {
      // Add a small delay to ensure smooth rendering
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 100); // 100ms delay to prevent flash

      return () => clearTimeout(timer);
    }
  }, [isConnected, isLoadingAgreement, isLoadingMbtBalance, isLoadingBalances, mbtBalance, balanceData]);

  const formatMbtBalance = (): string => {
    if (!mbtBalance) return "0.00";
    return Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS)).toFixed(2);
  };

  // Purchase calculations
  const selectedFarm = farms.find((farm: { farmId: { toString: () => string } }) => farm.farmId.toString() === selectedFarmId);
  const minInvestment = selectedFarm?.config?.minInvestment || BigInt(0);
  const maxInvestment = selectedFarm?.config?.maxInvestment || BigInt(0);
  // Override minimum to ensure it's at least $1 (0.04 MBT) for our $1 entry narrative
  const contractMinInvestmentNum = Number(formatUnits(minInvestment, MBT_DECIMALS));
  const minInvestmentNum = Math.max(MIN_INVESTMENT_MBT, contractMinInvestmentNum);
  const maxInvestmentNum = Number(formatUnits(maxInvestment, MBT_DECIMALS));
  const mbtAmountNum = parseFloat(mbtAmount || "0");
  
  // Max allowed is the MINIMUM of: user's wallet balance OR contract cap (80 MBT)
  // But for display/input purposes, we show the cap even if balance is low
  const userMbtBalance = mbtBalance ? Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS)) : 0;
  const maxMbtAllowed = Math.min(userMbtBalance, maxInvestmentNum);
  const maxMbtDisplayed = maxInvestmentNum; // Always show the cap for "Max" button
  const isValidAmount = mbtAmountNum >= minInvestmentNum && mbtAmountNum <= maxMbtAllowed;
  const totalCost = parseUnits(mbtAmountNum.toString(), MBT_DECIMALS);
  const bondCount = mbtAmountNum / BOND_MBT;
  // Check balance with small tolerance for rounding differences
  // Compare: actual balance (in wei) vs required cost (in wei)
  // Add a small buffer (0.001 MBT = 1000000000000000 wei) to account for display rounding
  const balanceBuffer = parseUnits("0.001", MBT_DECIMALS);
  const hasSufficientBalance = mbtBalance ? BigInt(mbtBalance as bigint) + balanceBuffer >= totalCost : false;
  const needsApproval = mbtAllowance ? BigInt(mbtAllowance as bigint) < totalCost : true;
  const canProceed = isValidAmount && hasSufficientBalance;

  useEffect(() => {
    // Update stat cards when data is loaded (including when totalBondsOwned is 0)
    if (!isLoadingBalances && !isLoadingFarmConfigs) {
      // Calculate percentage changes
      const totalBondsChange = previousTotalBonds > 0
        ? ((totalBondsOwned - previousTotalBonds) / previousTotalBonds) * 100
        : 0;

      const annualInterestChange = previousAnnualInterest > 0
        ? ((annualInterestMBT - previousAnnualInterest) / previousAnnualInterest) * 100
        : 0;

      const cumulativeReturnChange = previousCumulativeReturn > 0
        ? ((cumulativeReturnMBT - previousCumulativeReturn) / previousCumulativeReturn) * 100
        : 0;

      const totalBondsOwnedMBT = totalBondsOwned > 0 
        ? Number(formatUnits(BigInt(Math.floor(totalBondsOwned)), MBT_DECIMALS))
        : 0;

      setStatCards([
        {
          title: "Staked MBTs",
          value: `${totalBondsOwnedMBT.toFixed(2)} MBT`,
          isLoading: isLoadingBalances || isLoadingFarmConfigs,
          iconColor: totalBondsChange >= 0 ? "green" : "red",
          icon: "Coffee",
          trend: {
            value: `${totalBondsChange >= 0 ? '+' : ''}${totalBondsChange.toFixed(1)}%`,
            isPositive: totalBondsChange >= 0
          },
          footerLine1: "Your locked investment",
          footerLine2: "Earning returns over time"
        },
        {
          title: "Annual Interest",
          value: `${annualInterestMBT.toFixed(2)} MBT`,
          isLoading: isLoadingBalances || isLoadingFarmConfigs,
          iconColor: annualInterestChange >= 0 ? "green" : "red",
          icon: "DollarSign",
          trend: {
            value: `${annualInterestChange >= 0 ? '+' : ''}${annualInterestChange.toFixed(1)}%`,
            isPositive: annualInterestChange >= 0
          },
          footerLine1: "Claimable yearly earnings",
          footerLine2: "Fixed annual yield accrued"
        },
        {
          title: "Total Returns (5Y)",
          value: `${cumulativeReturnMBT.toFixed(2)} MBT`,
          isLoading: isLoadingBalances || isLoadingFarmConfigs,
          iconColor: cumulativeReturnChange >= 0 ? "green" : "red",
          icon: "TrendingUp",
          trend: {
            value: `${cumulativeReturnChange >= 0 ? '+' : ''}${cumulativeReturnChange.toFixed(1)}%`,
            isPositive: cumulativeReturnChange >= 0
          },
          footerLine1: "Total interest at maturity",
          footerLine2: "5-year projection with compounding"
        },
      ]);

      // Update previous values
      setPreviousTotalBonds(totalBondsOwned);
      setPreviousAnnualInterest(annualInterestMBT);
      setPreviousCumulativeReturn(cumulativeReturnMBT);
    }
  }, [totalBondsOwned, annualInterestMBT, cumulativeReturnMBT, isLoadingBalances, isLoadingFarmConfigs, previousTotalBonds, previousAnnualInterest, previousCumulativeReturn]);

  const [statCards, setStatCards] = useState([
    {
      title: "Staked MBTs",
      value: "0.00 MBT",
      isLoading: true,
      iconColor: "green",
      icon: "Coffee",
      trend: {
        value: "+0.0%",
        isPositive: true
      },
      footerLine1: "Your locked investment",
      footerLine2: "Earning returns over time"
    },
    {
      title: "Annual Interest",
      value: "0.00 MBT",
      isLoading: true,
      iconColor: "green",
      icon: "DollarSign",
      trend: {
        value: "+0.0%",
        isPositive: true
      },
      footerLine1: "Claimable yearly earnings",
      footerLine2: "Fixed annual yield accrued"
    },
    {
      title: "Total Returns (5Y)",
      value: "0.00 MBT",
      isLoading: true,
      iconColor: "green",
      icon: "TrendingUp",
      trend: {
        value: "+0.0%",
        isPositive: true
      },
      footerLine1: "Total interest at maturity",
      footerLine2: "5-year projection with compounding"
    },
  ]);

  // Handle MBT amount change
  const handleMbtAmountChange = (value: string) => {
    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0 && parseFloat(value) <= maxMbtAllowed)) {
      setMbtAmount(value);
      setPurchaseError("");
    } else if (parseFloat(value) < minInvestmentNum) {
      setPurchaseError(`MBT amount must be at least ${minInvestmentNum.toFixed(2)} MBT`);
    } else if (parseFloat(value) > maxInvestmentNum) {
      setPurchaseError(`MBT amount must not exceed ${maxInvestmentNum.toFixed(2)} MBT`);
    }
  };

  // Handle decrement - decrement by minimum investment amount (0.04 MBT = $1)
  const decrementAmount = () => {
    const decrementStep = MIN_INVESTMENT_MBT;
    const newAmount = Math.max(minInvestmentNum, mbtAmountNum - decrementStep).toFixed(2);
    setMbtAmount(newAmount);
    setPurchaseError("");
  };

  // Handle increment - increment by minimum investment amount (0.04 MBT = $1)
  const incrementAmount = () => {
    if (!mbtBalance) {
      setMbtAmount(minInvestmentNum.toFixed(2));
      setPurchaseError("");
      return;
    }
    
    // Increment by minimum investment amount (0.04 MBT = $1)
    const incrementStep = MIN_INVESTMENT_MBT;
    const newAmountRaw = mbtAmountNum + incrementStep;
    
    // Get fresh balance to ensure accuracy
    const currentBalanceRaw = Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS));
    
    // Cap at the actual balance (floored to 2 decimals) or max investment, whichever is lower
    const maxAllowedRaw = Math.min(currentBalanceRaw, maxInvestmentNum);
    const maxAllowed = Math.floor(maxAllowedRaw * 100) / 100; // Floor to 2 decimals
    
    // Ensure we don't exceed the actual balance
    const newAmount = Math.min(maxAllowed, newAmountRaw);
    
    // Ensure it's at least the minimum
    const finalAmount = Math.max(minInvestmentNum, newAmount);
    
    setMbtAmount(finalAmount.toFixed(2));
    setPurchaseError("");
  };

  // Handle max - show what user CAN invest (balance or cap, whichever is lower)
  const setMaxAmount = () => {
    // Get current balance fresh to ensure accuracy
    if (!mbtBalance) {
      setMbtAmount(minInvestmentNum.toFixed(2));
      setPurchaseError("");
      return;
    }
    
    const currentBalanceRaw = Number(formatUnits(mbtBalance as bigint, MBT_DECIMALS));
    
    // Always use the actual user balance (up to cap) - never exceed what they have
    if (currentBalanceRaw > 0) {
      const maxAmountRaw = Math.min(currentBalanceRaw, maxInvestmentNum);
      // Round down to 2 decimals to ensure we never exceed actual balance
      // This handles cases like 0.0456 -> 0.04 (safe) instead of 0.05 (would fail)
      const maxAmountRounded = Math.floor(maxAmountRaw * 100) / 100;
      // Ensure it's at least the minimum
      const finalAmount = Math.max(minInvestmentNum, maxAmountRounded);
      setMbtAmount(finalAmount.toFixed(2));
    } else {
      // If no balance, set to minimum so user knows they need to swap first
      setMbtAmount(minInvestmentNum.toFixed(2));
    }
    setPurchaseError("");
  };

  // Tour should only show once for first-time users
  useEffect(() => {
    // Only run on client-side and if tour hasn't been completed
    if (typeof window !== "undefined") {
      const hasCompletedTour = localStorage.getItem(TOUR_KEY);
      
      console.log("Tour check:", { hasCompletedTour, stored: localStorage.getItem(TOUR_KEY) });
      
      // Only start tour if never completed before
      if (!hasCompletedTour || hasCompletedTour !== "true") {
        console.log("Starting tour for first-time user");
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
      startNextStep("mainTour");
        }, 500);
        
        return () => clearTimeout(timer);
      } else {
        console.log("Tour already completed, skipping");
    }
    }
  }, []); // Empty dependency array - only run once on mount

  // Farm name map
  const farmNameMap = new Map(farms.map((farm: { farmId: { toString: () => any }; config: { name: any } }) => [farm.farmId.toString(), farm.config?.name || 'Unknown']))


  return (
    <>
          {/* Only render modal after initialization is complete */}
          {isInitialized && (
            <>
              <InvestmentAgreementModal
                isOpen={showAgreementModal}
                onClose={() => {
                  setShowAgreementModal(false);
                  setPendingInvestAction(null);
                }}
                onAgree={handleAgreementComplete}
              />
              {/* KYC and Onramp modals - Temporarily disabled - awaiting API credentials */}
              {/* <KYCVerification
                isOpen={showKYCModal}
                onClose={() => setShowKYCModal(false)}
                onVerified={(status) => {
                  if (status === "approved") {
                    toast.success("KYC verification approved!");
                  }
                }}
              />
              <UnlimitOnramp
                isOpen={showOnrampModal}
                onClose={() => setShowOnrampModal(false)}
                onSuccess={() => {
                  queryClient.invalidateQueries();
                  toast.success("Wallet funded successfully!");
                }}
              /> */}
            </>
          )}
      
      {/* Reset Agreement Button - Visible but subtle, positioned near header with Project Mocha branding */}
      {typeof window !== 'undefined' && isInitialized && !isLoadingAgreement && hasAgreed && isConnected && (
        <div className="fixed top-20 right-4 z-50">
          <button
            onClick={() => {
              clearAgreement();
              toast.success('Agreement reset', { duration: 2000 });
            }}
            className="opacity-70 hover:opacity-100 transition-all text-xs px-3 py-1.5 rounded-md border border-[#7A5540]/40 dark:border-amber-600/40 bg-gradient-to-r from-[#7A5540]/30 to-[#8B6650]/30 dark:from-amber-700/30 dark:to-amber-600/30 backdrop-blur-sm shadow-md hover:shadow-lg hover:from-[#7A5540]/40 hover:to-[#8B6650]/40 dark:hover:from-amber-700/40 dark:hover:to-amber-600/40"
            title="Reset agreement (for testing)"
          >
            <span className="text-[10px] font-medium text-[#283C09] dark:text-green-400">🔄 Reset Agreement</span>
          </button>
        </div>
      )}
      
      {/* Reset Agreement Button - Always show if connected, even if not agreed (for testing) */}
      {typeof window !== 'undefined' && isInitialized && !isLoadingAgreement && isConnected && (
        <div className="fixed top-20 right-4 z-50">
          <button
            onClick={() => {
              if (hasAgreed) {
                clearAgreement();
                toast.success('Agreement reset', { duration: 2000 });
              } else {
                // If not agreed, show current state
                const key = `mocha_agreement_${userAddress}`;
                const stored = localStorage.getItem(key);
                if (stored) {
                  console.log('Found agreement in localStorage:', stored);
                  toast.info('Agreement found but not detected. Clearing...');
                  clearAgreement();
                } else {
                  toast.info('No agreement to reset. Sign the agreement first.');
                }
              }
            }}
            className={`opacity-70 hover:opacity-100 transition-all text-xs px-3 py-1.5 rounded-md border backdrop-blur-sm shadow-md hover:shadow-lg ${
              hasAgreed 
                ? 'border-[#7A5540]/40 dark:border-amber-600/40 bg-gradient-to-r from-[#7A5540]/30 to-[#8B6650]/30 dark:from-amber-700/30 dark:to-amber-600/30'
                : 'border-gray-400/40 dark:border-gray-500/40 bg-gradient-to-r from-gray-400/20 to-gray-500/20 dark:from-gray-600/20 dark:to-gray-500/20'
            }`}
            title={hasAgreed ? "Reset agreement (for testing)" : "Check agreement status"}
          >
            <span className={`text-[10px] font-medium ${hasAgreed ? 'text-[#283C09] dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
              🔄 {hasAgreed ? 'Reset Agreement' : 'Check Agreement'}
            </span>
          </button>
        </div>
      )}
      
    <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Toaster richColors position="bottom-right" />
      <Header />
      <main className="pt-[72px] min-h-[calc(100vh-72px)]">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
          {/* Header Section */}
          <div className="pt-6 mb-6">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">MOCHA ASSET-BACKED INVESTMENTS</div>
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">Dashboard</h1>
            <div className="mt-3 max-w-2xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                <span className="font-semibold text-[#522912] dark:text-amber-400">MBT (Mocha Bean Token)</span> is a blockchain token representing your investment of real coffee trees. Each tree equals 4 MBTs, and your tokens are securely stored on the Scroll blockchain, providing transparent proof of your investment.
              </p>
            </div>
          </div>

          {/* Starknet mode: show Starknet-specific dashboard instead of EVM one */}
          {isStarknetMode && (
            <div className="mb-6">
              <StarknetDashboard />
            </div>
          )}

          {/* Main Content Grid — hidden when Starknet is active */}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-2 ${isStarknetMode ? "hidden" : ""}`}>
            {/* Left Column (Stats + Tables) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Cards - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {statCards.map((card, index) => (
                  <StatCard
                    key={index}
                    id={
                      card.title === "Staked MBTs"
                        ? "statcard-staked-mbts"
                        : card.title === "Annual Interest"
                          ? "statcard-annual-interest"
                          : card.title === "Total Returns (5Y)"
                            ? "statcard-total-returns"
                            : undefined
                    }
                    title={card.title}
                    value={card.value}
                    isLoading={card.isLoading}
                    iconColor={card.iconColor}
                    icon={card.icon}
                    trend={card.trend}
                    footerLine1={card.footerLine1}
                    footerLine2={card.footerLine2}
                  />
                ))
                }
              </div>


              {/* Tabs for Trees and Transactions */}
              <Tabs defaultValue="Trees" className="space-y-4">
                <TabsList className="rounded-full bg-white dark:bg-gray-800 p-1">
                  <TabsTrigger
                    value="Trees"
                    className="rounded-full data-[state=active]:bg-[#522912] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#522912]"
                  >
                    Investments
                  </TabsTrigger>
                  <TabsTrigger
                    value="transactions"
                    className="rounded-full data-[state=active]:bg-[#522912] data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-[#522912]"
                  >
                    Transactions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="Trees" className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold dark:text-white">Your Investments</h2>
                    <p className="text-gray-500 dark:text-gray-400">Manage your MBT holdings</p>
                  </div>
                  <div className="bg-white dark:bg-[#283C09] rounded-lg border border-gray-200 dark:border-[#1A5D1A] shadow-sm overflow-x-auto">
                    {!isConnected ? (
                      <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                        Sign in to view your Trees
                      </div>
                    ) : farms.filter(({ balance }) => balance > 0).length === 0 ? (
                      <div className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                        No Trees yet. <button onClick={handleQuickBuyClick} className="text-[#7A5540] dark:text-amber-600 hover:underline">Buy Trees</button>
                      </div>
                    ) : (
                      <FarmsTable
                        data={farms
                          .filter(({ balance }) => balance > 0)
                          .map(({ farmId, config, balance }) => ({
                            id: farmId.toString(),
                            name: config?.name || "N/A",
                            farmOwner: truncateAddress(config?.farmOwner),
                            bondsOwned: formatEther(balance),
                            annualInterest: `${(Number(formatEther(balance)) * 0.4).toFixed(2)} MBT`,
                            status: config?.active ? "Active" : "Inactive",
                          }))}
                        onBuyMore={(farmId, farmName) => {
                          const farm = farms.find((f: { farmId: { toString: () => string } }) => f.farmId.toString() === farmId);
                          if (farm && farm.config) {
                            handleBuyMoreClick(farmId, farmName, farm.config.minInvestment);
                          }
                        }}
                        isLoading={isLoadingBalances || isLoadingFarmConfigs}
                        showCheckbox={false}
                        showActions={false}
                        showBuyMoreLink={true}
                        showTabs={false}
                        showFilter={false}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-6">
                  <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-xl font-bold dark:text-white">Recent Transactions</h2>
                      <p className="text-gray-500 dark:text-gray-400">
                        {isConnected 
                          ? isLoadingTransactions
                            ? isRetrying
                              ? `Retrying... (attempt ${retryCount}/2) - RPC may still be indexing events`
                              : 'Loading transactions...'
                            : transactions.length > 0
                              ? `Your swaps, investments, and transfers (${transactions.length} found, up to 6 months)`
                              : transactionsError
                                ? transactionsError.includes('RPC') || transactionsError.includes('indexing')
                                  ? 'RPC indexing may be delayed. Transactions will appear once indexed (usually within a few minutes).'
                                  : `Error: ${transactionsError}`
                                : 'No transactions found (checking up to 6 months of history)'
                          : 'Sign in to view your transaction history'
                        }
                      </p>
                    </div>
                    {isConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          refetchTransactions();
                          toast.info("Refreshing transactions...");
                        }}
                        disabled={isLoadingTransactions}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    )}
                  </div>
                  {transactionsError && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            {transactionsError.includes('RPC') || transactionsError.includes('indexing') 
                              ? 'RPC Indexing Delay' 
                              : 'Transaction Fetch Notice'}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            {transactionsError}
                          </p>
                          {(transactionsError.includes('RPC') || transactionsError.includes('indexing')) && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                              <p>• Blockchain events may take a few minutes to be indexed</p>
                              <p>• Try refreshing in 2-3 minutes</p>
                              <p>• Transactions will appear automatically once indexed</p>
                            </div>
                          )}
                          {!transactionsError.includes('RPC') && !transactionsError.includes('indexing') && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              Check browser console (F12) for detailed logs.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700 overflow-x-auto">
                    {!isConnected ? (
                      <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Sign in to view your transactions
                      </div>
                    ) : (
                      <>
                        <TransactionsTable 
                          transactions={transactions.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)} 
                        isLoading={isLoadingTransactions}
                      />
                    {/* Pagination */}
                        {transactions.length > rowsPerPage && (
                          <div className="flex justify-between items-center p-4 border-t dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        >
                          <ChevronLeft className="h-4 w-4" />
                              Previous
                        </Button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                              Page {currentPage} of {Math.ceil(transactions.length / rowsPerPage)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                              disabled={currentPage >= Math.ceil(transactions.length / rowsPerPage)}
                          onClick={() => setCurrentPage(p => p + 1)}
                              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        >
                              Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Coffee Garden Visualization - Below Investments/Transactions */}
              {isConnected && (
                <div className="mt-6">
                  <CoffeeGardenVisualization
                    totalBondsOwned={BigInt(totalBondsOwned)}
                    annualInterest={annualInterestMBT}
                    cumulativeReturn={cumulativeReturnMBT}
                    isLoading={isLoadingBalances || isLoadingFarmConfigs}
                    MBT_DECIMALS={MBT_DECIMALS}
                  />
                </div>
              )}
            </div>

            {/* Right Column (Quick Actions) - Sticky */}
            <div className="lg:col-span-1 sticky top-[72px] self-start space-y-6">
              {/* Swap to MBT - Most Important, Keep at Top */}
              <div id="SwapToMbt" className="space-y-3">
                <SwapToMBTComponent 
                  onTransactionComplete={async () => {
                    // Wait a bit longer for transaction to be fully indexed
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    refetchTransactions();
                  }}
                />
              </div>

              {/* Standalone crypto checkout (Chainrails) — decoupled from Swap MBT amounts */}
              <div className="rounded-xl border-2 border-dashed border-[#283C09]/30 bg-white/50 p-4 dark:border-amber-700/40 dark:bg-gray-800/40">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  Treasury payment (USDC)
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Choose amount and network — independent of the swap panel above.
                </p>
                <ChainrailsPaymentModal />
              </div>

              {/* Account Services - Temporarily disabled - awaiting API credentials */}
              {/* {isConnected && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border-2 border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Account Services</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setShowKYCModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2"
                      variant="default"
                      size="sm"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      KYC
                    </Button>
                    <Button
                      onClick={() => setShowOnrampModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs py-2"
                      variant="default"
                      size="sm"
                    >
                      <CreditCard className="w-3 h-3 mr-1" />
                      Fund
                    </Button>
                </div>
                </div>
              )} */}

              <motion.div 
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 space-y-6 border-2 dark:border-gray-700 shadow-lg relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* Animated gradient background */}
                <motion.div
                  className="absolute inset-0 opacity-5"
                  animate={{
                    background: [
                      'radial-gradient(circle at 0% 0%, #7A5540 0%, transparent 50%)',
                      'radial-gradient(circle at 100% 100%, #7A5540 0%, transparent 50%)',
                      'radial-gradient(circle at 0% 0%, #7A5540 0%, transparent 50%)',
                    ]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />

                <div className="flex justify-between items-center relative z-10">
                  <motion.div 
                    className="text-xs font-bold tracking-wider text-gray-600 dark:text-gray-300"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    QUICK ACTIONS
                  </motion.div>
                  <motion.div 
                    className="bg-gradient-to-r from-[#7A5540] to-[#8B6650] dark:from-amber-700 dark:to-amber-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-md"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  >
                    1/1
                  </motion.div>
                    </div>


                <motion.div 
                  className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-750 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-5 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.01 }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                  />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex-1 space-y-4">
                      {/* Investment Cycle Status */}
                      {cycleInfo.isOpen ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                          className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            >
                              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </motion.div>
                            <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                              Investment Cycle Open
                            </span>
                    </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Closes in:</span>
                            <div className="flex items-center gap-1">
                              <motion.span
                                key={timeUntilClose.days}
                                initial={{ scale: 1.3, color: "#22c55e" }}
                                animate={{ scale: 1, color: "inherit" }}
                                className="text-sm font-bold text-green-600 dark:text-green-400"
                              >
                                {timeUntilClose.days}
                              </motion.span>
                              <span className="text-xs text-gray-500">d</span>
                              <motion.span
                                key={timeUntilClose.hours}
                                initial={{ scale: 1.3, color: "#22c55e" }}
                                animate={{ scale: 1, color: "inherit" }}
                                className="text-sm font-bold text-green-600 dark:text-green-400"
                              >
                                {timeUntilClose.hours}
                              </motion.span>
                              <span className="text-xs text-gray-500">h</span>
                              <motion.span
                                key={timeUntilClose.minutes}
                                initial={{ scale: 1.3, color: "#22c55e" }}
                                animate={{ scale: 1, color: "inherit" }}
                                className="text-sm font-bold text-green-600 dark:text-green-400"
                              >
                                {timeUntilClose.minutes}
                              </motion.span>
                              <span className="text-xs text-gray-500">m</span>
                  </div>
                  </div>
                        </motion.div>
                      ) : cycleInfo.isClosed ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800"
                        >
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                            Cycle Closed - Next opens {cycleInfo.openDate.toLocaleDateString()}
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800"
                        >
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            Opens: {cycleInfo.openDate.toLocaleDateString()}
                          </span>
                        </motion.div>
                      )}
                      
                      {/* Next Yield Date - Enhanced Clock Design */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border-2 border-amber-200 dark:border-amber-800 relative overflow-hidden"
                      >
                        {/* Animated background pulse */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-orange-400/10 to-amber-400/10"
                          animate={{
                            x: ['-100%', '200%'],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        />
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <motion.div
                              animate={{ 
                                rotate: [0, 360],
                                scale: [1, 1.1, 1]
                              }}
                              transition={{ 
                                rotate: { duration: 60, repeat: Infinity, ease: "linear" },
                                scale: { duration: 2, repeat: Infinity }
                              }}
                              className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-2 shadow-lg"
                            >
                              <Clock className="w-5 h-5 text-white" />
                            </motion.div>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                              {timeUntilYield.isPast ? '🎉 Yield Available Now!' : 'First Yield Countdown'}
                            </span>
                </div>

                          {timeUntilYield.isPast ? (
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-center"
                            >
                              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 dark:from-green-400 dark:via-emerald-300 dark:to-green-400 bg-clip-text text-transparent">
                                Available Now
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Claim your returns!
                              </div>
                            </motion.div>
                          ) : (
                            <>
                              {/* Large Countdown Display */}
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                <motion.div
                                  key={timeUntilYield.days}
                                  initial={{ scale: 1.2, y: -10 }}
                                  animate={{ scale: 1, y: 0 }}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border-2 border-amber-300 dark:border-amber-700 shadow-md"
                                >
                                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {String(timeUntilYield.days).padStart(2, '0')}
                                  </div>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                                    Days
                                  </div>
                                </motion.div>
                                <motion.div
                                  key={timeUntilYield.hours}
                                  initial={{ scale: 1.2, y: -10 }}
                                  animate={{ scale: 1, y: 0 }}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border-2 border-amber-300 dark:border-amber-700 shadow-md"
                                >
                                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {String(timeUntilYield.hours).padStart(2, '0')}
                                  </div>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                                    Hours
                                  </div>
                                </motion.div>
                                <motion.div
                                  key={timeUntilYield.minutes}
                                  initial={{ scale: 1.2, y: -10 }}
                                  animate={{ scale: 1, y: 0 }}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border-2 border-amber-300 dark:border-amber-700 shadow-md"
                                >
                                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {String(timeUntilYield.minutes).padStart(2, '0')}
                                  </div>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                                    Minutes
                                  </div>
                                </motion.div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Available on {cycleInfo.firstYieldDate.toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    </div>
                    <motion.button
                      className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 p-3 rounded-xl shadow-sm hover:shadow-md"
                      whileHover={{ scale: 1.1, rotate: 180 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      onClick={handleRefreshBalances}
                    >
                      <RefreshCw className="w-5 h-5 text-[#7A5540] dark:text-amber-400" />
                    </motion.button>
                  </div>

                  <motion.div 
                    className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 dark:border-gray-600"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="flex justify-between items-baseline">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Interest</div>
                      <motion.div 
                        className="text-2xl font-bold text-[#283C09] dark:text-green-400"
                        key={annualInterestMBT}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        {annualInterestMBT.toFixed(2)} MBT
                      </motion.div>
                  </div>
                    <motion.div 
                      className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Annual yield accruing</span>
                    </motion.div>
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                <Button
                  id="InvestNowButton"
                    className="w-full bg-gradient-to-r from-[#283C09] to-[#1A5D1A] hover:from-[#1A5D1A] hover:to-[#283C09] text-white rounded-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                  onClick={handleQuickBuyClick}
                >
                    {/* Button shimmer effect */}
                    <motion.div
                      className="absolute inset-0 w-full h-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    />
                    <span className="relative z-10 flex items-center justify-center">
                      <Coffee className="mr-2 h-5 w-5" />
                  Invest Now
                      <motion.span
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.span>
                    </span>
                </Button>
                </motion.div>

                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {/* <Link href="/farm-reports" className="text-sm text-[#7A5540] dark:text-amber-600 font-medium flex items-center justify-center w-full hover:underline">
                    View Farm Reports
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link> */}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Purchase Trees Modal */}
        <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
          <DialogContent className="bg-gray-50 dark:bg-gray-800 border-none p-6 text-gray-500 sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold dark:text-white">
                {/* Purchase Trees for {selectedFarmName || "Selected Farm"} */}
                Invest in a Tree
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
              {!isConnected ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Please sign in to purchase Trees (email, social, or wallet).
                  </p>
                  <Button
                    className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                    onClick={handleConnectWallet}
                  >
                    Sign in
                  </Button>
                </div>
              ) : purchaseSuccessDetails ? (
                <TransactionSuccess
                  txHash={purchaseSuccessDetails.txHash}
                  title="Investment Successful!"
                  description={`You have successfully invested in ${purchaseSuccessDetails.Trees.toFixed(2)} Tree(s) for ${purchaseSuccessDetails.farmName}.`}
                  onRefresh={async () => {
                    setPurchaseSuccessDetails(null);
                    setIsPurchaseModalOpen(false);
                    await handleRefreshBalances();
                  }}
                  showRefresh={true}
                  shareData={{
                    trees: purchaseSuccessDetails.Trees,
                    farmName: purchaseSuccessDetails.farmName,
                  }}
                />
              ) : selectedFarmId ? (
                <>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Your MBT Balance:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{formatMbtBalance()} MBT</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Min Investment:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{minInvestmentNum.toFixed(2)} MBT</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Max Investment:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{maxInvestmentNum.toFixed(2)} MBT</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">
                      MBT Amount ({minInvestmentNum.toFixed(2)}–{maxInvestmentNum.toFixed(2)} MBT)
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={decrementAmount}
                        disabled={mbtAmountNum <= minInvestmentNum}
                        className="bg-white dark:bg-gray-800 border-none"
                      >
                        -
                      </Button>
                      <Input
                        type="text"
                        value={mbtAmount}
                        onChange={(e) => handleMbtAmountChange(e.target.value)}
                        className="bg-white dark:bg-gray-800 border-none text-center"
                        placeholder={minInvestmentNum.toFixed(2)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={incrementAmount}
                        disabled={mbtAmountNum >= maxMbtAllowed}
                        className="bg-white dark:bg-gray-800 border-none"
                      >
                        +
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={setMaxAmount}
                        disabled={false}
                        className="text-sm text-[#7A5540] dark:text-[#A57A5F]"
                        title={`Set to ${maxMbtAllowed.toFixed(2)} MBT (${userMbtBalance >= maxInvestmentNum ? 'contract cap' : 'your available balance'})`}
                      >
                        Max
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Tree Cost:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">{BOND_MBT} MBT per Tree ( ${BOND_MBT * 25})</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total MBT Cost:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {mbtAmountNum.toFixed(2)} MBT ( ${mbtAmountNum * 25})
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Tree(s) to invest in:</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {bondCount.toFixed(2)} trees
                      </span>
                    </div>
                    {/*  <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">USD Equivalent:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        ${(mbtAmountNum * MBT_PRICE_USD).toLocaleString()}
                      </span>
                    </div> */}
                  </div>

                  {!hasSufficientBalance && mbtAmount && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                      <p className="text-red-600 dark:text-red-400 text-sm">Insufficient MBT balance</p>
                    </div>
                  )}

                  {needsApproval && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2 text-yellow-800 dark:text-yellow-200" />
                        <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                          Approval required: Approve {mbtAmountNum.toFixed(2)} MBT for spending
                        </div>
                      </div>
                    </div>
                  )}

                  {purchaseError && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400 text-sm">{purchaseError}</p>
                    </div>
                  )}

                  {isApproving && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-blue-600 dark:text-blue-400 text-sm">Approving MBT tokens...</p>
                    </div>
                  )}

                  {isApprovePending && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">Approval transaction pending...</p>
                    </div>
                  )}

                  {isPurchasePending && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-blue-800">
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm">Purchase transaction pending...</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="mb-1">
                      <strong>Important:</strong> By proceeding, you agree to:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Complete KYC/AML verification if required</li>
                      <li>Receive digital Tree tokens upon successful payment</li>
                      <li>Terms and conditions of the Tree purchase agreement</li>
                    </ul>
                    <p className="mt-2">
                      Note: 1 Tree is equivalent to $100 and requires {BOND_MBT} MBT (since 1 MBT = 1kg roasted coffee ≈ $25). Fractional ownership is supported, with minimum $1 investment ({MIN_INVESTMENT_MBT} MBT for 0.01 Tree or 1% of a full Tree). This enables micro-investing in agricultural assets starting at just $1.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      No farm selected. Please select a farm from your Trees list or the marketplace.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isConnected && (
              <DialogFooter className="mt-4 flex justify-end space-x-2 flex-shrink-0">
                <Button
                  variant="outline"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 border-none"
                  onClick={() => {
                    setIsPurchaseModalOpen(false);
                    setPurchaseSuccessDetails(null);
                    setSelectedFarmId("");
                    setSelectedFarmName("");
                    setMbtAmount("");
                    setPurchaseError("");
                  }}
                  disabled={isApprovePending || isPurchasePending || isApproving}
                >
                  {purchaseSuccessDetails ? "Close" : "Cancel"}
                </Button>
                {!purchaseSuccessDetails && selectedFarmId && (
                  <>
                    {needsApproval ? (
                      <Button
                        className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                        onClick={handleApprove}
                        disabled={!canProceed || isApproving || isApprovePending || isPurchasePending}
                      >
                        {isApproving || isApprovePending ? "Approving..." : `Approve ${mbtAmountNum.toFixed(2)} MBT`}
                      </Button>
                    ) : (
                      <Button
                        className="bg-[#7A5540] hover:bg-[#6A4A36] text-white border-none"
                        onClick={handlePurchase}
                        disabled={!canProceed || isApproving || isApprovePending || isPurchasePending}
                      >
                        {isPurchasePending ? "Purchasing..." : `Invest in ${bondCount.toFixed(2)} Trees`}
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </main>
      </div>
    </>
  )
}
