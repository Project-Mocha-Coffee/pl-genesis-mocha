"use client"

import { useChainId, useSwitchChain } from 'wagmi'
import { scroll, base, baseSepolia } from 'wagmi/chains'
import { SUPPORTED_CHAINS } from '@/lib/config'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Network, Check, Loader2 } from "lucide-react"
import Image from "next/image"
import { useStarknet } from '@/context/StarknetContext'

// ─── Chain icon helpers ───────────────────────────────────────────────────────

function ScrollLogo() {
  return (
    <div className="w-4 h-4 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-700 p-0.5 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
      <Image
        src="/scroll-logo.png"
        alt="Scroll"
        width={14}
        height={14}
        className="object-contain"
        unoptimized
        priority
      />
    </div>
  )
}

/** Starknet star logo rendered as SVG (no external file needed) */
function StarknetLogo() {
  return (
    <div className="w-4 h-4 rounded-full bg-[#EC796B] flex items-center justify-center flex-shrink-0 shadow-sm">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z"
          fill="white"
          strokeWidth="0"
        />
      </svg>
    </div>
  )
}

function NetworkIcon({ chainId, isStarknet }: { chainId: number; isStarknet?: boolean }) {
  if (isStarknet) return <StarknetLogo />
  if (chainId === scroll.id) return <ScrollLogo />
  if (chainId === base.id || chainId === baseSepolia.id) {
    return (
      <div className="w-4 h-4 rounded-full bg-[#0052FF] flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-white"></div>
      </div>
    )
  }
  return <Network className="w-4 h-4 flex-shrink-0" />
}

// ─── Network list ─────────────────────────────────────────────────────────────

const STARKNET_VALUE = "starknet"

const EVM_NETWORKS = SUPPORTED_CHAINS.map((chain) => {
  if (chain.id === scroll.id) return { id: scroll.id, name: "Scroll", value: String(scroll.id) }
  if (chain.id === base.id) return { id: base.id, name: "Base", value: String(base.id) }
  if (chain.id === baseSepolia.id) return { id: baseSepolia.id, name: "Base Sepolia", value: String(baseSepolia.id) }
  return { id: chain.id, name: chain.name, value: String(chain.id) }
})

const STARKNET_ENTRY = { id: -1, name: "Starknet", value: STARKNET_VALUE }
const ALL_NETWORKS = [...EVM_NETWORKS, STARKNET_ENTRY]

// ─── Component ────────────────────────────────────────────────────────────────

export function NetworkSelector() {
  const evmChainId = useChainId()
  const { switchChain, isPending: isEvmSwitching } = useSwitchChain()
  const {
    isStarknetMode,
    setStarknetMode,
    starknetAddress,
    connectStarknet,
    isConnecting,
  } = useStarknet()

  // The Select value: "starknet" when in Starknet mode, otherwise the EVM chain ID string
  const selectValue = isStarknetMode ? STARKNET_VALUE : String(evmChainId)

  const currentNetwork = isStarknetMode
    ? STARKNET_ENTRY
    : ALL_NETWORKS.find((n) => n.value === String(evmChainId))

  const isPending = isEvmSwitching || isConnecting

  const handleNetworkChange = async (value: string) => {
    if (value === STARKNET_VALUE) {
      // Switch to Starknet mode
      setStarknetMode(true)
      // If not yet connected, open wallet selector
      if (!starknetAddress) {
        await connectStarknet()
      }
    } else {
      // Switch back to EVM
      setStarknetMode(false)
      const chainIdNum = parseInt(value)
      if (chainIdNum !== evmChainId) {
        switchChain({ chainId: chainIdNum })
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectValue}
        onValueChange={handleNetworkChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 [&>span]:text-gray-900 [&>span]:dark:text-gray-100">
          <div className="flex items-center gap-2">
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            ) : (
              <NetworkIcon
                chainId={isStarknetMode ? -1 : evmChainId}
                isStarknet={isStarknetMode}
              />
            )}
            <SelectValue className="text-gray-900 dark:text-gray-100 font-medium">
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {isPending ? "Switching…" : (currentNetwork?.name ?? `Chain ${evmChainId}`)}
              </span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
          {ALL_NETWORKS.map((network) => {
            const isSelected = isStarknetMode
              ? network.value === STARKNET_VALUE
              : network.value === String(evmChainId)

            return (
              <SelectItem
                key={network.value}
                value={network.value}
                className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <NetworkIcon
                      chainId={network.id}
                      isStarknet={network.value === STARKNET_VALUE}
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {network.name}
                    </span>
                    {network.value === STARKNET_VALUE && (
                      <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 leading-none">
                        Beta
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-4 w-4 ml-2 text-green-500" />}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
