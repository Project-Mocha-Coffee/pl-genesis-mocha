"use client"

import { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MessageCircle, QrCode, Loader2, CheckCircle, X, Zap, AlertTriangle, Copy, ExternalLink, Send, Bot } from "lucide-react"
import { useAccount } from "wagmi"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface ChatterPayPaymentProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  amount?: string
  currency?: string
}

type PaymentStep = "init" | "chat" | "processing" | "success" | "error"

interface ChatMessage {
  id: string
  text: string
  sender: "bot" | "user"
  timestamp: Date
  type?: "text" | "button" | "qr" | "status"
  buttons?: Array<{ label: string; action: string }>
}

export function ChatterPayPayment({ 
  isOpen, 
  onClose, 
  onSuccess, 
  amount = "100",
  currency = "USD"
}: ChatterPayPaymentProps) {
  const { address } = useAccount()
  const [step, setStep] = useState<PaymentStep>("init")
  const [qrCode, setQrCode] = useState<string>("")
  const [whatsappNumber, setWhatsappNumber] = useState<string>("")
  const [sessionId, setSessionId] = useState<string>("")
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "completed" | "failed">("pending")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize chat immediately when modal opens
  useEffect(() => {
    if (!isOpen || !address) {
      // Reset when modal closes
      setMessages([])
      setStep("init")
      return
    }

    // Show chat interface immediately - don't wait for API
    initializeChatImmediate()
  }, [isOpen, address])

  // Initialize ChatterPay session after chat is shown
  useEffect(() => {
    if (!isOpen || !address) return
    // Wait a bit for chat to initialize
    if (step !== "chat") {
      // If step is still "init", wait a bit more
      const timer = setTimeout(() => {
        if (step === "init") {
          setStep("chat")
        }
      }, 100)
      return () => clearTimeout(timer)
    }

    const initChatterPay = async () => {
      setIsLoading(true)
      addMessage("🔄 Creating payment session...", "bot", "status")
      
      try {
        const response = await fetch('/api/chatterpay/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            address,
            amount: parseFloat(amount),
            currency
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to create ChatterPay session')
        }

        const data = await response.json()
        setSessionId(data.sessionId)
        setQrCode(data.qrCode || "")
        setWhatsappNumber(data.whatsappNumber || "")
        
        // Update chat with success message
        addMessage("✅ Payment session created successfully! Your session ID is: " + (data.sessionId?.substring(0, 20) || "N/A") + "...", "bot")
        setTimeout(() => {
          addMessage("Now, let's proceed with your payment. Choose an option:", "bot", "button")
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: "",
              sender: "bot",
              timestamp: new Date(),
              type: "button",
              buttons: [
                { label: "📱 Show QR Code", action: "show_qr" },
                { label: "💬 Guide Me Through", action: "guide" },
                { label: "🔗 Open WhatsApp", action: "open_whatsapp" }
              ]
            }])
          }, 100)
        }, 500)
        
        // Start polling for payment status
        if (data.sessionId) {
          startPolling(data.sessionId)
        }
      } catch (error: any) {
        console.error('ChatterPay initialization error:', error)
        addMessage("❌ Failed to create payment session: " + (error.message || "Unknown error"), "bot")
        addMessage("Please check your connection and try again, or contact support if the issue persists.", "bot")
        // Keep chat open even on error
      } finally {
        setIsLoading(false)
      }
    }

    // Small delay to show welcome messages first
    const timer = setTimeout(() => {
      initChatterPay()
    }, 1500)

    return () => {
      clearTimeout(timer)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [isOpen, address, amount, currency, step])

  // Initialize chat with welcome messages immediately
  const initializeChatImmediate = () => {
    const welcomeMessages: ChatMessage[] = [
      {
        id: "1",
        text: `👋 Welcome to ChatterPay! I'm here to help you fund your wallet with ${currency} ${amount}.`,
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      },
      {
        id: "2",
        text: "Let me guide you through the process. I'm creating a payment session for you now...",
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      }
    ]
    
    setMessages(welcomeMessages)
    setStep("chat")
    
    // Auto-scroll to bottom
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  // Add message to chat
  const addMessage = (text: string, sender: "bot" | "user" = "user", type: "text" | "button" | "qr" | "status" = "text") => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      type
    }
    setMessages(prev => [...prev, newMessage])
    
    // Auto-scroll to bottom
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  // Handle button actions
  const handleButtonAction = (action: string) => {
    switch (action) {
      case "show_qr":
        addMessage("Please show me the QR code", "user")
        if (qrCode) {
          setTimeout(() => {
            addMessage("Here's your QR code. Scan it with WhatsApp to start the payment process.", "bot", "qr")
          }, 1000)
        } else {
          setTimeout(() => {
            addMessage("QR code is not available yet. Please wait for the payment session to be created, or try opening WhatsApp directly.", "bot")
          }, 1000)
        }
        break
      case "guide":
        addMessage("Guide me through the process", "user")
        setTimeout(() => {
          addMessage("Great! Here's how to complete your payment:\n\n1. Open WhatsApp on your phone\n2. Scan the QR code I'll show you\n3. Follow the bot's instructions\n4. Complete the payment\n5. I'll notify you when it's confirmed!\n\nReady to see the QR code?", "bot", "button")
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: "",
              sender: "bot",
              timestamp: new Date(),
              type: "button",
              buttons: [
                { label: "📱 Show QR Code", action: "show_qr" },
                { label: "🔗 Open WhatsApp", action: "open_whatsapp" }
              ]
            }])
          }, 500)
        }, 1000)
        break
      case "open_whatsapp":
        addMessage("Opening WhatsApp...", "user")
        handleWhatsAppClick()
        setTimeout(() => {
          addMessage("WhatsApp should open in a popup window. Complete your payment there, and I'll monitor the status here in the portal!", "bot")
        }, 1000)
        break
      case "check_status":
        addMessage("Check payment status", "user")
        addMessage("Checking payment status...", "bot", "status")
        setStep("processing")
        break
    }
  }

  // Handle send message
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return
    
    addMessage(inputMessage, "user")
    setInputMessage("")
    
    // Simulate bot response
    setTimeout(() => {
      addMessage("I'm processing your request. Please use the buttons above for faster assistance, or complete your payment in WhatsApp.", "bot")
    }, 1500)
  }

  // Poll for payment status with better UX
  const startPolling = (sessionId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    let pollCount = 0
    const maxPolls = 300 // 15 minutes max (300 * 3 seconds)

    pollIntervalRef.current = setInterval(async () => {
      pollCount++
      
      // Stop polling after max attempts
      if (pollCount > maxPolls) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
        setStep("error")
        toast.error('Payment timeout. Please try again.')
        return
      }

      try {
        const response = await fetch(`/api/chatterpay/status?sessionId=${sessionId}`)
        if (!response.ok) return

        const data = await response.json()
        if (data.status === "completed") {
          setPaymentStatus("completed")
          addMessage("🎉 Payment confirmed! Your wallet has been funded successfully!", "bot", "status")
          setTimeout(() => {
            setStep("success")
          }, 2000)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          toast.success('Wallet funded! Now swap to MBT tokens to invest.', {
            duration: 4000,
          })
          if (onSuccess) onSuccess()
          setTimeout(() => {
            onClose()
          }, 5000) // Give user time to read success message
        } else if (data.status === "failed") {
          setPaymentStatus("failed")
          addMessage("❌ Payment failed. Please try again or contact support.", "bot", "status")
          setTimeout(() => {
            setStep("error")
          }, 2000)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          toast.error('Payment failed. Please try again.')
        } else {
          // Still pending - add status update to chat
          if (step === "chat" && pollCount % 10 === 0) {
            addMessage("⏳ Still waiting for payment confirmation...", "bot", "status")
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
    }, 3000) // Poll every 3 seconds for faster detection
  }

  const handleWhatsAppClick = () => {
    if (whatsappNumber) {
      const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`
      
      // Open WhatsApp in a popup window (smaller, less intrusive) instead of new tab
      // This keeps the portal visible in the background
      const popupWidth = 500
      const popupHeight = 700
      const left = (window.screen.width - popupWidth) / 2
      const top = (window.screen.height - popupHeight) / 2
      
      const popup = window.open(
        whatsappUrl,
        'ChatterPay WhatsApp',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )
      
      // Focus the popup
      if (popup) {
        popup.focus()
      }
      
      // Add message to chat about opening WhatsApp
      addMessage("Opening WhatsApp in popup window...", "user")
      setTimeout(() => {
        addMessage("WhatsApp should open in a popup window. Complete your payment there, and I'll monitor the status here in the portal!", "bot")
      }, 1000)
      
      // Check if popup is closed (user might have completed payment)
      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopupClosed)
          // User closed WhatsApp, they might have completed payment
          // Status polling will detect completion
          setStep("processing")
        }
      }, 1000)
      
      // Cleanup interval after 5 minutes
      setTimeout(() => clearInterval(checkPopupClosed), 5 * 60 * 1000)
    }
  }

  const handleCopyWhatsApp = () => {
    if (whatsappNumber) {
      navigator.clipboard.writeText(whatsappNumber)
      toast.success('WhatsApp number copied!')
    }
  }

  const handleCopySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      toast.success('Session ID copied!')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <MessageCircle className="w-6 h-6 text-green-600" />
            Fund Your Wallet
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            <div className="space-y-2">
              <p>Fund your wallet with crypto through ChatterPay (WhatsApp). Fast, secure, and easy!</p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>📋 Two-Step Process:</strong>
                </p>
                <ol className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-1 list-decimal list-inside">
                  <li>Fund your wallet with crypto (ETH/USDT) via ChatterPay</li>
                  <li>Swap your crypto to MBT tokens using the swap component</li>
                </ol>
              </div>
              <span className="block mt-2 text-sm text-green-600 dark:text-green-400 font-semibold">
                ⚡ Instant processing on Scroll network
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Amount Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment Amount</div>
              <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                {currency} {parseFloat(amount).toLocaleString()}
              </div>
            </div>
          </div>

          {/* In-App Chat Interface - Always show when modal is open */}
          <AnimatePresence mode="wait">
            {(step === "chat" || step === "init" || step === "processing") && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 dark:border-green-800 overflow-hidden flex flex-col"
                style={{ height: "500px" }}
              >
                {/* Chat Header */}
                <div className="bg-green-600 text-white p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">ChatterPay Bot</div>
                    <div className="text-xs text-green-100">Online • Usually replies instantly</div>
                  </div>
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.sender === "user"
                          ? "bg-green-600 text-white"
                          : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                      }`}>
                        {message.type === "qr" && qrCode ? (
                          <div className="space-y-2">
                            <p className="mb-2">{message.text}</p>
                            <div className="bg-white p-3 rounded-lg">
                              <img 
                                src={qrCode} 
                                alt="QR Code" 
                                className="w-48 h-48 mx-auto"
                                onError={(e) => {
                                  console.error('QR code failed to load')
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                            <Button
                              onClick={handleWhatsAppClick}
                              size="sm"
                              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <MessageCircle className="w-3 h-3 mr-2" />
                              Open WhatsApp
                            </Button>
                          </div>
                        ) : message.type === "button" && message.buttons ? (
                          <div className="space-y-2">
                            <p className="mb-2">{message.text}</p>
                            <div className="space-y-2">
                              {message.buttons.map((button, idx) => (
                                <Button
                                  key={idx}
                                  onClick={() => handleButtonAction(button.action)}
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-left justify-start"
                                >
                                  {button.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : message.type === "status" ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{message.text}</span>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.text}</p>
                        )}
                        <div className={`text-xs mt-1 ${
                          message.sender === "user" ? "text-green-100" : "text-gray-500"
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>💡 Use buttons above for faster assistance</span>
                    <Button
                      onClick={() => setStep("processing")}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                    >
                      Check Status
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Processing Step - In-App Status */}
          <AnimatePresence mode="wait">
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-amber-200 dark:border-amber-800"
              >
                <div className="text-center mb-4">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-amber-600" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Processing Payment
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    We're checking your payment status. This usually takes just a few seconds.
                  </p>
                </div>
                
                {/* Real-time Status Updates */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-amber-800 dark:text-amber-300">
                        Monitoring payment status...
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                      <span className="text-sm text-amber-800 dark:text-amber-300">
                        Checking blockchain confirmation...
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                      <span className="text-sm text-amber-800 dark:text-amber-300">
                        Verifying transaction...
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 <strong>Tip:</strong> You can continue using the portal. We'll notify you automatically when payment is confirmed!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Step */}
          <AnimatePresence mode="wait">
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-green-200 dark:border-green-800"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Wallet Funded Successfully! 🎉
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Your wallet has been funded with crypto. Now swap to MBT tokens to start investing!
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <strong>Next Step:</strong> Use the "Swap to MBT" component above to exchange your crypto (ETH/USDT) for MBT tokens.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Step */}
          <AnimatePresence mode="wait">
            {step === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-red-200 dark:border-red-800"
              >
                <div className="text-center">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Payment Failed
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    There was an issue processing your payment. Please try again.
                  </p>
                  <Button
                    onClick={() => {
                      setStep("init")
                      setIsLoading(true)
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Tips */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Fast & Easy Process
            </h4>
            <ul className="text-sm text-green-800 dark:text-green-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>No app download needed - works directly in WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>ChatterPay bot guides you through wallet creation</span>
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
              <MessageCircle className="w-5 h-5" />
              How it works
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Step 1: Fund Your Wallet</p>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li>Scan QR code or open WhatsApp link</li>
                  <li>ChatterPay bot creates your wallet (if needed)</li>
                  <li>Follow bot instructions to deposit funds</li>
                  <li>Payment is confirmed automatically</li>
                  <li>Funds arrive in your wallet on Scroll network</li>
                </ul>
              </div>
              <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">Step 2: Swap to MBT</p>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  After funding, use the "Swap to MBT" component to exchange your crypto (ETH/USDT) for MBT tokens. 
                  Then you can invest in coffee farms!
                </p>
              </div>
            </div>
          </div>

          {/* Token Compatibility Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <strong>💡 Important:</strong> ChatterPay funds your wallet with crypto (ETH/USDT/WETH) on Scroll network. 
                After funding, you <strong>must swap to MBT</strong> using the "Swap to MBT" component above to invest in coffee farms. 
                The swap component supports ETH, USDT, USDC, and other tokens.
              </div>
            </div>
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

