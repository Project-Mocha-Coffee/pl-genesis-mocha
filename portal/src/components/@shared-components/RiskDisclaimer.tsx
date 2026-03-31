"use client"

import { AlertTriangle, Info } from "lucide-react"
import { motion } from "framer-motion"

interface RiskDisclaimerProps {
  variant?: "default" | "compact" | "inline"
  className?: string
}

export function RiskDisclaimer({ variant = "default", className = "" }: RiskDisclaimerProps) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1 text-sm">
            Investment Risk Warning
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            Investing in coffee farms involves risk. Returns are not guaranteed and depend on harvest yields, 
            market conditions, weather patterns, and other factors beyond our control. Past performance does not 
            guarantee future results. Please invest only what you can afford to lose. This platform does not 
            provide financial advice. Consult with a qualified financial advisor before making investment decisions.
          </p>
        </div>
      </div>
    </>
  )

  if (variant === "compact") {
    return (
      <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 ${className}`}>
        {content}
      </div>
    )
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 ${className}`}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Risk Warning:</strong> Investments involve risk. Returns are not guaranteed. 
          Invest only what you can afford to lose.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}
    >
      {content}
    </motion.div>
  )
}
