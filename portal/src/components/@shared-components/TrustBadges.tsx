"use client"

import { Shield, Lock, ExternalLink, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useChainId } from "wagmi"
import { getExplorerUrl } from "@/lib/config"

interface TrustBadgeProps {
  icon: React.ReactNode
  label: string
  href?: string
  onClick?: () => void
}

function TrustBadge({ icon, label, href, onClick }: TrustBadgeProps) {
  const content = (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-600 transition-colors group">
      <div className="text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
        {label}
      </span>
      {href && (
        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="block">
        {content}
      </button>
    )
  }

  return content
}

export function TrustBadges() {
  const chainId = useChainId()
  const diamondAddress = "0xc2fDefAbe80eD7d9e19DF9f48C5A3c9F40059660" // Base Mainnet diamond contract
  const explorerUrl = getExplorerUrl(chainId, diamondAddress)

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <TrustBadge
        icon={<Shield className="w-4 h-4" />}
        label="Smart Contracts Audited"
        href={explorerUrl}
      />
      <TrustBadge
        icon={<Lock className="w-4 h-4" />}
        label="Secured by Base"
        href="https://base.org"
      />
      <TrustBadge
        icon={<CheckCircle className="w-4 h-4" />}
        label="Verified on BaseScan"
        href={explorerUrl}
      />
    </div>
  )
}
