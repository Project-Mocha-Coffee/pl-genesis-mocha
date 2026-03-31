import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { scroll, base, baseSepolia } from "wagmi/chains"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Normalize hex tx hash to 0x-prefixed 66-char form when valid */
export function normalizeTxHashForExplorer(hash: string): string | null {
  const trimmed = hash.trim()
  if (!trimmed) return null
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) return null
  return `0x${hex.toLowerCase()}`
}

/** Block explorer /tx URL for supported chains (Scroll, Base, Base Sepolia) */
export function getTxExplorerUrl(chainId: number, txHash: string): string | null {
  const normalized = normalizeTxHashForExplorer(txHash)
  if (!normalized) return null
  const map: Record<number, string | undefined> = {
    [scroll.id]: scroll.blockExplorers?.default?.url,
    [base.id]: base.blockExplorers?.default?.url,
    [baseSepolia.id]: baseSepolia.blockExplorers?.default?.url,
  }
  const baseUrl = map[chainId]
  if (!baseUrl) return null
  return `${baseUrl}/tx/${normalized}`
}

/** Display Kenyan numbers as +254 7XX XXX XXX when possible */
export function formatKenyaPhoneDisplay(input: string): string {
  const d = input.replace(/\D/g, "")
  if (d.length === 12 && d.startsWith("254")) {
    return `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
  }
  if (d.length === 10 && d.startsWith("0")) {
    return `+254 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  }
  if (d.length === 9 && d.startsWith("7")) {
    return `+254 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  }
  if (d.length >= 10) {
    return `+${d}`
  }
  return input.trim() || "—"
}
