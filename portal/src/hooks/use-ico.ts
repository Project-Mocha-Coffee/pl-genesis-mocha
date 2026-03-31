import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi';
import { ICO_ABI } from '@/config/constants';
import { useContractAddresses } from './useContractAddresses';

function usePreviewTokenPurchase(paymentMethod: string, amount: bigint) {
  const chainId = useChainId();
  const { icoAddress } = useContractAddresses();
  
  // Only enable if both params valid
  const enabled =
    typeof paymentMethod === "string" &&
    paymentMethod.length > 0 &&
    amount !== undefined &&
    amount > BigInt(0) &&
    !!icoAddress;

  const hookArgs = enabled ? [paymentMethod, amount] : undefined;
  
  const result = useReadContract({
    address: icoAddress as `0x${string}`,
    abi: ICO_ABI,
    functionName: "previewTokenPurchase",
    args: Array.isArray(hookArgs) ? hookArgs : [], 
    chainId,
    query: { enabled },
  });

  return {
    ...result,
    data: Array.isArray(result.data) && result.data.length === 2
      ? (result.data as [bigint, bigint])
      : [BigInt(0), BigInt(0)] as [bigint, bigint],
  };
}


// Minimal ERC20 ABI for approval and balance checks
const ERC20_MIN_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
];

function useSwapTokens(functionName: string, args: any[], value?: bigint | undefined, erc20TokenAddress?: `0x${string}`) {
  const chainId = useChainId();
  const { icoAddress } = useContractAddresses();
  const publicClient = usePublicClient({ chainId });
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  async function swap() {
    if (!icoAddress) {
      throw new Error("ICO contract address not available for current network");
    }
    
    console.group("useSwapTokens");
    try {
      console.log("swap params", {
        icoAddress,
        functionName,
        args,
        valueIncluded: value !== undefined && value > 0,
        value: value !== undefined ? value.toString() : undefined,
        erc20TokenAddress,
      });

      // If ERC20 token is specified (e.g., USDC/SCR), approve spending first and wait for confirmation before buying
      if (erc20TokenAddress) {
        const amountArg = args?.[0] as bigint | undefined; // expected to be _amount
        if (!amountArg || amountArg <= BigInt(0)) {
          console.warn("Approval skipped: invalid amount", { amountArg });
        } else {
          console.group("erc20.approve");
          console.log("approve params", {
            token: erc20TokenAddress,
            spender: icoAddress,
            amount: amountArg.toString(),
          });
          try {
            const approveHash = await writeContract({
              address: erc20TokenAddress,
              abi: ERC20_MIN_ABI as any,
              functionName: 'approve',
              args: [icoAddress as `0x${string}`, amountArg],
              chainId,
            });
            console.log("approve tx hash", approveHash);
            // Wait for approval to be mined on the same chain so the ICO's transferFrom succeeds
            if (approveHash && publicClient) {
              await publicClient.waitForTransactionReceipt({ hash: approveHash });
              console.log("approve confirmed");
            }
          } catch (approveErr) {
            console.error("approve error", approveErr);
            throw approveErr;
          } finally {
            console.groupEnd();
          }
        }
      }

      const result = await writeContract({
        address: icoAddress as `0x${string}`,
        abi: ICO_ABI,
        functionName,
        args,
        chainId,
        ...(value !== undefined && value > 0 ? { value } : {}), // Include value only for ETH
      });

      console.log("swap writeContract returned", result);
      console.log("hook hash state", hash);
    } catch (err) {
      console.error("swap error", err);
      throw err;
    } finally {
      console.groupEnd();
    }
  }

  return { swap, hash, error, isPending, isConfirming, isConfirmed };
}

function useMinPurchases() {
  const chainId = useChainId();
  const { icoAddress } = useContractAddresses();
  const enabled = !!icoAddress;

  const minEth = useReadContract({
    address: icoAddress as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'minEthPurchase',
    chainId,
    query: { enabled },
  });
  const minUsdt = useReadContract({
    address: icoAddress as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'minUsdtPurchase',
    chainId,
    query: { enabled },
  });
  const minUsdc = useReadContract({
    address: icoAddress as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'minUsdcPurchase',
    chainId,
    query: { enabled },
  });
  const minScr = useReadContract({
    address: icoAddress as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'minScrPurchase',
    chainId,
    query: { enabled },
  });
  const minWbtc = useReadContract({
    address: icoAddress as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'minWbtcPurchase',
    chainId,
    query: { enabled },
  });

  return {
    minEth: minEth.data as bigint | undefined,
    minUsdt: minUsdt.data as bigint | undefined,
    minUsdc: minUsdc.data as bigint | undefined,
    minScr: minScr.data as bigint | undefined,
    minWbtc: minWbtc.data as bigint | undefined,
  };
}

function useIcoPaused() {
  const chainId = useChainId();
  const { icoAddress } = useContractAddresses();
  const result = useReadContract({
    address: icoAddress as `0x${string}`,
    abi: ICO_ABI,
    functionName: 'paused',
    chainId,
    query: { enabled: !!icoAddress },
  });
  return { isPaused: result.data === true, isLoading: result.isLoading };
}

export { usePreviewTokenPurchase, useSwapTokens, useMinPurchases, useIcoPaused };