"use client"

import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, Shield, AlertCircle } from "lucide-react"
import { useAccount } from "wagmi"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface KYCVerificationProps {
  isOpen: boolean
  onClose: () => void
  onVerified?: (status: string) => void
}

type KYCStatus = "not_started" | "pending" | "approved" | "rejected" | "loading"

export function KYCVerification({ isOpen, onClose, onVerified }: KYCVerificationProps) {
  const { address } = useAccount()
  const [kycStatus, setKycStatus] = useState<KYCStatus>("not_started")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const sumsubRef = useRef<any>(null)

  // Initialize Sumsub SDK
  useEffect(() => {
    if (!isOpen || !address) return

    const initSumsub = async () => {
      try {
        // Load Sumsub SDK script
        if (!document.getElementById('sumsub-sdk')) {
          const script = document.createElement('script')
          script.id = 'sumsub-sdk'
          script.src = 'https://static.sumsub.com/idensic/static/sns-web-sdk-build/sns-web-sdk-loader.js'
          script.async = true
          document.body.appendChild(script)
        }

        // Get access token from backend
        const response = await fetch('/api/kyc/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to get KYC token' }))
          throw new Error(errorData.error || errorData.details || 'Failed to get KYC token')
        }

        const data = await response.json()
        
        // Check if service is not configured
        if (data.error && data.error.includes('not configured')) {
          toast.error('KYC service is not yet configured. Please contact support.')
          setKycStatus("not_started")
          return
        }
        
        setAccessToken(data.token)

        // Initialize Sumsub widget
        if (window.SNSWebSdk) {
          sumsubRef.current = window.SNSWebSdk.init(
            data.token,
            () => {
              // Token expired, get new one
              return fetch('/api/kyc/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
              }).then(r => r.json()).then(d => d.token)
            }
          )
          .withConf({
            lang: 'en',
            theme: 'light'
          })
          .withEventHandler((event: string) => {
            if (event === 'idCheck.onStepCompleted') {
              setKycStatus("pending")
            } else if (event === 'idCheck.onApplicantSubmitted') {
              setKycStatus("pending")
              toast.success("KYC verification submitted! We'll review it shortly.")
            }
          })
          .build()

          setKycStatus("loading")
        }
      } catch (error: any) {
        console.error('KYC initialization error:', error)
        const errorMessage = error.message || 'Failed to initialize KYC verification'
        toast.error(errorMessage.includes('not configured') 
          ? 'KYC service is not yet configured. Please contact support.' 
          : errorMessage)
        setKycStatus("not_started")
      }
    }

    initSumsub()

    return () => {
      if (sumsubRef.current) {
        try {
          sumsubRef.current.destroy()
        } catch (e) {
          console.error('Error destroying Sumsub:', e)
        }
      }
    }
  }, [isOpen, address])

  // Check KYC status
  useEffect(() => {
    if (!address || !isOpen) return

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/kyc/status?address=${address}`)
        if (response.ok) {
          const data = await response.json()
          setKycStatus(data.status || "not_started")
          if (data.status === "approved" && onVerified) {
            onVerified("approved")
          }
        }
      } catch (error) {
        console.error('Error checking KYC status:', error)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [address, isOpen, onVerified])

  const handleStartVerification = () => {
    if (sumsubRef.current) {
      sumsubRef.current.launch()
      setKycStatus("loading")
    }
  }

  const getStatusIcon = () => {
    switch (kycStatus) {
      case "approved":
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case "rejected":
        return <XCircle className="w-8 h-8 text-red-500" />
      case "pending":
        return <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      default:
        return <Shield className="w-8 h-8 text-gray-400" />
    }
  }

  const getStatusMessage = () => {
    switch (kycStatus) {
      case "approved":
        return {
          title: "Verification Approved!",
          description: "Your identity has been verified. You can now access all features."
        }
      case "rejected":
        return {
          title: "Verification Rejected",
          description: "Your verification was rejected. Please contact support or try again."
        }
      case "pending":
        return {
          title: "Verification Pending",
          description: "Your verification is being reviewed. This usually takes a few minutes."
        }
      default:
        return {
          title: "Identity Verification",
          description: "Complete KYC verification to access all features and comply with regulations."
        }
    }
  }

  const statusMessage = getStatusMessage()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing if user explicitly clicks close button
      if (!open && kycStatus !== "approved") {
        // Show confirmation before closing if verification is in progress
        if (kycStatus === "pending" || kycStatus === "loading") {
          if (window.confirm("Are you sure you want to close? Your verification progress will be saved.")) {
            onClose();
          }
        } else {
          onClose();
        }
      } else if (!open) {
        onClose();
      }
    }} modal={true}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {getStatusIcon()}
            {statusMessage.title}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {statusMessage.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* KYC Widget Container */}
          {kycStatus === "not_started" || kycStatus === "loading" ? (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
              {kycStatus === "loading" ? (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
                  <p className="text-gray-600 dark:text-gray-400">Loading verification...</p>
                </div>
              ) : (
                <div className="text-center max-w-md">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    KYC Verification Coming Soon
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    We're working on integrating a free KYC solution. For now, you can use the platform without verification.
                    KYC will be available soon to unlock additional features and higher limits.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Note:</strong> KYC verification will be optional and free when available. 
                      It will help you access higher investment limits and enhanced security features.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : kycStatus === "pending" ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin mt-1" />
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                    Verification in Progress
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Your documents are being reviewed. This typically takes 5-10 minutes.
                    You'll receive a notification once the review is complete.
                  </p>
                </div>
              </div>
            </div>
          ) : kycStatus === "approved" ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6"
            >
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                    Verification Complete!
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Your identity has been successfully verified. You now have full access to all platform features.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <XCircle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                    Verification Rejected
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-300 mb-4">
                    Your verification was rejected. Please ensure all documents are clear and valid.
                  </p>
                  <Button
                    onClick={handleStartVerification}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Section */}
          {kycStatus === "not_started" && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Why Verify?
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Access to higher investment limits</li>
                <li>Faster transaction processing</li>
                <li>Enhanced security and compliance</li>
                <li>Priority customer support</li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">
            {kycStatus === "approved" ? "Close" : "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Extend Window interface for Sumsub SDK
declare global {
  interface Window {
    SNSWebSdk: any
  }
}

