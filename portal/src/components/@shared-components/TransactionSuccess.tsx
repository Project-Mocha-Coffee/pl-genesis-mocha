import React, { useState, useEffect } from "react";
import { CheckCircle, Copy, ExternalLink, RefreshCw, Check, Sparkles, Coffee, ArrowRight, Share2, Twitter, Facebook, Linkedin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import { Confetti } from "./Confetti";
import { toast } from "sonner";
import { useChainId } from "wagmi";
import { getExplorerUrl, getExplorerName } from "@/lib/config";

interface TransactionSuccessProps {
  txHash: string;
  title: string;
  description: string;
  onRefresh?: () => void;
  showRefresh?: boolean;
  // New props for post-swap nudge
  nextAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  showNextActionPrompt?: boolean;
  // Social sharing props
  shareData?: {
    trees?: number;
    farmName?: string;
    amount?: string;
    tokenSymbol?: string;
  };
}

const PROJECT_MOCHA_URL = "https://projectmocha.com"; // Update with actual URL
const PROJECT_MOCHA_HASHTAG = "#ProjectMocha #CoffeeInvestment #Blockchain";

export function TransactionSuccess({
  txHash,
  title,
  description,
  onRefresh,
  showRefresh = true,
  nextAction,
  showNextActionPrompt = false,
  shareData,
}: TransactionSuccessProps) {
  const chainId = useChainId();
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = React.useRef<HTMLDivElement>(null);
  
  const explorerUrl = getExplorerUrl(chainId, txHash);
  const explorerName = getExplorerName(chainId);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(explorerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleViewExplorer = () => {
    window.open(explorerUrl, "_blank", "noopener,noreferrer");
  };

  // Social sharing functions
  const getShareMessage = () => {
    if (shareData?.trees && shareData?.farmName) {
      return `I just invested in ${shareData.trees.toFixed(2)} coffee tree(s) at ${shareData.farmName} with Project Mocha! 🌱☕ ${PROJECT_MOCHA_HASHTAG}`;
    } else if (shareData?.amount && shareData?.tokenSymbol) {
      return `I just swapped for ${shareData.amount} ${shareData.tokenSymbol} with Project Mocha! Ready to invest in real coffee trees. 🌱☕ ${PROJECT_MOCHA_HASHTAG}`;
    }
    return `I just made an investment with Project Mocha! Supporting real coffee farmers through blockchain technology. 🌱☕ ${PROJECT_MOCHA_HASHTAG}`;
  };
  
  const getShareText = () => {
    // For platforms that support text + URL separately
    return getShareMessage();
  };

  const getShareUrl = () => {
    // Include the explorer URL so users can verify the transaction
    return explorerUrl;
  };

  const handleShareTwitter = () => {
    const message = getShareText();
    const url = getShareUrl();
    const fullText = `${message} ${url}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
    setShowShareMenu(false);
  };

  const handleShareFacebook = () => {
    const url = getShareUrl();
    const message = getShareText();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`;
    window.open(facebookUrl, "_blank", "width=550,height=420");
    setShowShareMenu(false);
  };

  const handleShareLinkedIn = async () => {
    const message = getShareText();
    const url = getShareUrl();
    const fullText = `${message} ${url}`;
    // LinkedIn doesn't support pre-filled text in share dialog (security restriction)
    // Copy message to clipboard so user can paste it into LinkedIn
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Share text copied! Paste it into LinkedIn", { duration: 3000 });
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
      toast.info("Opening LinkedIn... You can add your message manually", { duration: 3000 });
    }
    // Open LinkedIn share with just the URL (user will paste the text)
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedInUrl, "_blank", "width=550,height=420");
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    const message = getShareText();
    const url = getShareUrl();
    const fullText = `${message} ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(whatsappUrl, "_blank");
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const message = getShareText();
        const url = getShareUrl();
        await navigator.share({
          title: "Project Mocha Investment",
          text: `${message} ${url}`,
          url: url,
        });
        setShowShareMenu(false);
      } catch (err) {
        console.log("Error sharing:", err);
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      const message = getShareText();
      const url = getShareUrl();
      const shareText = `${message} ${url}`;
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        toast.success("Share text copied to clipboard!", { duration: 2000 });
        setTimeout(() => setCopied(false), 2000);
        setShowShareMenu(false);
      } catch (err) {
        toast.error("Failed to copy to clipboard", { duration: 2000 });
      }
    }
  };

  const truncateHash = (hash: string) => {
    if (hash.length < 15) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

      return (
        <>
          <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
          
          <motion.div 
            className="text-center py-3"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="relative inline-block">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ 
                    rotate: [0, 20, -20, 0],
                    scale: [1, 1.3, 1]
                  }}
                  transition={{ duration: 1, repeat: 3 }}
                >
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </motion.div>
              </div>
            </motion.div>
            
            <motion.h3 
              className="text-xl font-bold mb-1 dark:text-white"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {title} 🎉
            </motion.h3>
            
            <motion.p 
              className="text-sm text-gray-600 dark:text-gray-300 mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {description}
            </motion.p>

      {/* Transaction Hash Display - Compact */}
      <motion.div 
        className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-2 mb-2 border border-gray-200 dark:border-gray-600"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
          Transaction Hash
        </p>
        <p className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
          {truncateHash(txHash)}
        </p>
      </motion.div>

      {/* Action Buttons - Compact */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-1.5 justify-center mb-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Link</span>
            </>
          )}
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleViewExplorer}
            className="flex items-center gap-2 bg-[#522912] hover:bg-[#6A4A36] text-white"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View on {explorerName}</span>
          </Button>
        </motion.div>

        {/* Social Share Button */}
        {shareData && (
          <motion.div 
            ref={shareMenuRef}
            className="relative"
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#7A5540] to-[#8B6650] hover:from-[#8B6650] hover:to-[#7A5540] text-white"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>

            {/* Social Share Menu - Positioned to appear above on mobile, below on desktop */}
            {showShareMenu && (
              <motion.div
                className="absolute bottom-full left-0 mb-2 sm:bottom-auto sm:top-full sm:mt-2 sm:mb-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-[100] min-w-[200px] max-w-[250px]"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleShareTwitter}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 justify-start hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 w-full"
                  >
                    <Twitter className="w-5 h-5 text-[#1DA1F2] dark:text-[#1DA1F2]" fill="currentColor" />
                    <span className="text-xs font-medium">Twitter</span>
                  </Button>
                  <Button
                    onClick={handleShareFacebook}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 justify-start hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 w-full"
                  >
                    <Facebook className="w-5 h-5 text-[#1877F2] dark:text-[#1877F2]" fill="currentColor" />
                    <span className="text-xs font-medium">Facebook</span>
                  </Button>
                  <Button
                    onClick={handleShareLinkedIn}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 justify-start hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 w-full"
                  >
                    <Linkedin className="w-5 h-5 text-[#0077B5] dark:text-[#0077B5]" fill="currentColor" />
                    <span className="text-xs font-medium">LinkedIn</span>
                  </Button>
                  <Button
                    onClick={handleShareWhatsApp}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 justify-start hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-200 w-full"
                  >
                    <MessageCircle className="w-5 h-5 text-[#25D366] dark:text-[#25D366]" fill="currentColor" />
                    <span className="text-xs font-medium">WhatsApp</span>
                  </Button>
                </div>
                {navigator.share && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={handleNativeShare}
                      variant="ghost"
                      size="sm"
                      className="w-full flex items-center gap-2 justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs">More Options</span>
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Next Action Prompt (for post-swap nudge) */}
          {showNextActionPrompt && nextAction && (
            <motion.div
              className="mt-3 pt-3 border-t-2 border-dashed border-gray-200 dark:border-gray-600"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <motion.div
                className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-3 border-2 border-amber-300 dark:border-amber-700 shadow-lg relative overflow-hidden"
            animate={{
              boxShadow: [
                "0 4px 12px rgba(217, 119, 6, 0.3)",
                "0 8px 20px rgba(217, 119, 6, 0.5)",
                "0 4px 12px rgba(217, 119, 6, 0.3)",
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute top-0 left-0 w-full h-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
            />

            <div className="relative z-10">
              <motion.div 
                className="flex items-center gap-2 mb-2"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-base font-bold text-gray-800 dark:text-white">
                  Ready for the Next Step?
                </h4>
              </motion.div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                You now have MBT tokens! Put them to work by investing in coffee trees.
              </p>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={nextAction.onClick}
                  className="w-full bg-gradient-to-r from-[#522912] to-[#6A4A36] hover:from-[#6A4A36] hover:to-[#7A5540] text-white py-4 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                >
                  {/* Button shimmer */}
                  <motion.div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {nextAction.icon || <Coffee className="w-5 h-5" />}
                    {nextAction.label}
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.span>
                  </span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Refresh Button */}
      {showRefresh && onRefresh && (
        <motion.div 
          className="mt-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: showNextActionPrompt ? 0.9 : 0.7 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onRefresh}
              variant="ghost"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Balances</span>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
    </>
  );
}

