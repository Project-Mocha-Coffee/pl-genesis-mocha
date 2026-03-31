"use client"

import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, Wallet, Loader2, CheckCircle, X, Zap, AlertTriangle } from "lucide-react"
import { useAccount } from "wagmi"
import { motion } from "framer-motion"
import { toast } from "sonner"

interface UnlimitOnrampProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UnlimitOnramp({ isOpen, onClose, onSuccess }: UnlimitOnrampProps) {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState<string>("100")
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!isOpen || !address) return

    // Initialize Unlimit widget
    const initUnlimit = async () => {
      setIsLoading(true)
      try {
        // Get Unlimit session token from backend
        const response = await fetch('/api/onramp/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address,
            amount: parseFloat(amount),
            currency
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to create onramp session' }))
          throw new Error(errorData.error || errorData.details || 'Failed to create onramp session')
        }

        const data = await response.json()
        
        // Check if service is not configured
        if (data.error && data.error.includes('not configured')) {
          toast.error('Onramp service is not yet configured. Please contact support.')
          setIsLoading(false)
          return
        }
        
        // Load Unlimit widget
        if (window.Unlimit) {
          window.Unlimit.init({
            container: '#unlimit-widget',
            sessionId: data.sessionId,
            onSuccess: () => {
              toast.success('Payment successful! Your wallet has been funded.')
              if (onSuccess) onSuccess()
              onClose()
            },
            onError: (error: any) => {
              console.error('Unlimit error:', error)
              toast.error('Payment failed. Please try again.')
            }
          })
        } else {
          // Load Unlimit SDK script
          const script = document.createElement('script')
          script.src = 'https://widget.unlimit.com/v1/unlimit.js'
          script.async = true
          script.onload = () => {
            if (window.Unlimit) {
              window.Unlimit.init({
                container: '#unlimit-widget',
                sessionId: data.sessionId,
                onSuccess: () => {
                  toast.success('Payment successful! Your wallet has been funded.')
                  if (onSuccess) onSuccess()
                  onClose()
                },
                onError: (error: any) => {
                  console.error('Unlimit error:', error)
                  toast.error('Payment failed. Please try again.')
                }
              })
            }
          }
          document.body.appendChild(script)
        }
      } catch (error: any) {
        console.error('Unlimit initialization error:', error)
        const errorMessage = error.message || 'Failed to initialize payment widget'
        toast.error(errorMessage.includes('not configured') 
          ? 'Onramp service is not yet configured. Please contact support.' 
          : errorMessage)
        setIsLoading(false)
      }
    }

    initUnlimit()
  }, [isOpen, address, amount, currency, onSuccess, onClose])

  const presetAmounts = [50, 100, 250, 500, 1000]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <CreditCard className="w-6 h-6 text-green-600" />
            Fund Your Wallet
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Buy cryptocurrency directly with your card or bank account. Fast, secure, and easy.
            <span className="block mt-2 text-sm text-green-600 dark:text-green-400 font-semibold">
              ⚡ No KYC delays - Instant processing on Scroll network
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Amount Selection */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Select Amount
            </label>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset.toString() ? "default" : "outline"}
                  onClick={() => setAmount(preset.toString())}
                  className={amount === preset.toString() 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : ""}
                >
                  ${preset}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter custom amount"
                min="10"
                max="10000"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USD" | "EUR" | "GBP")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Unlimit Widget Container */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 min-h-[400px] max-h-[60vh] overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
                  <p className="text-gray-600 dark:text-gray-400">Loading payment widget...</p>
                </div>
              </div>
            ) : (
              <div id="unlimit-widget" className="w-full h-[400px] overflow-y-auto" />
            )}
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Fast & Easy Process
            </h4>
            <ul className="text-sm text-green-800 dark:text-green-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>No lengthy KYC - Transactions process in minutes, not hours</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Direct to wallet - Funds arrive on Scroll network instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Low fees - Optimized for cost-effective transactions</span>
              </li>
            </ul>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              How it works
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Enter the amount you want to purchase</li>
              <li>Complete payment with card or bank transfer</li>
              <li>Cryptocurrency is sent directly to your connected wallet</li>
              <li>Funds are available immediately after confirmation</li>
            </ul>
          </div>

          {/* Token Compatibility Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <strong>💡 Pro Tip:</strong> After funding, you'll receive tokens on Scroll network. 
                If you need to swap to MBT, use the "Swap to MBT" feature above. 
                Remember: Some services require WETH instead of native ETH - always check compatibility!
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              🔒 Your payment is processed securely by Unlimit. We never store your payment information.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Extend Window interface for Unlimit SDK
declare global {
  interface Window {
    Unlimit: any
  }
}

