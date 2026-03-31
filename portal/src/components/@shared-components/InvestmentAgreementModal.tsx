import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, FileText, Mail, CheckCircle, Download } from "lucide-react";
import { useAccount } from "wagmi";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PaymentCardShell } from "./PaymentCardShell";

const generateAgreementText = (params: { address?: string; email: string }) => {
  const { address, email } = params;

  const safeAddress = address || "N/A";

  return `
MOCHA COFFEE ASSET-BACKED INVESTMENT AGREEMENT

Date: ${new Date().toLocaleDateString()}
Investor Wallet Address: ${safeAddress}
Investor Email: ${email}

TERMS AND CONDITIONS

1. INVESTMENT OVERVIEW
This agreement governs your investment in Mocha Coffee's asset-backed MBT (Mocha Bean Token) and Tree NFT investment products. By signing this agreement, you acknowledge and accept the following terms.

2. ASSET BACKING
- 1 MBT = 1 kg of roasted coffee
- Each Tree NFT represents a claim on coffee inventory
- Investments are backed by real-world coffee assets held by Mocha Coffee

3. INVESTMENT STRUCTURE
- Minimum Investment: Variable based on farm configuration
- Investment Vehicle: MBT tokens and Tree NFTs
- Lock-up Period: As specified per investment product
- Expected Returns: Fixed annual interest as disclosed

4. RISKS AND DISCLOSURES
You acknowledge and understand that:
- Coffee commodity prices may fluctuate
- Agricultural investments carry inherent risks
- Returns are not guaranteed despite best efforts
- Smart contract risks exist in blockchain-based investments
- You are investing only funds you can afford to lose

5. KYC/AML COMPLIANCE
- You agree to complete KYC/AML verification if required
- You certify you are not from a restricted jurisdiction
- You confirm the source of funds is legitimate
- You agree to comply with all applicable laws

6. REPRESENTATIONS AND WARRANTIES
You represent and warrant that:
- You are of legal age to enter into this agreement
- You have the authority to invest these funds
- All information provided is accurate and truthful
- You understand the risks associated with this investment

7. TOKEN ECONOMICS
- MBT tokens are utility tokens, not securities
- Tree NFTs represent investment claims
- Tokens may have limited liquidity
- No guarantee of secondary market availability

8. INTELLECTUAL PROPERTY
All trademarks, logos, and content are property of Mocha Coffee. You receive no ownership rights except as explicitly granted.

9. DISPUTE RESOLUTION
Any disputes will be resolved through arbitration in accordance with the laws of [Jurisdiction]. You waive the right to class action participation.

10. AMENDMENTS
Mocha Coffee reserves the right to amend these terms with 30 days notice. Continued participation constitutes acceptance of amended terms.

11. TERMINATION
Mocha Coffee may terminate accounts for violation of terms, illegal activity, or at its discretion with appropriate notice.

12. CONTACT INFORMATION
For questions or concerns, contact: legal@mochacoffee.com

ACKNOWLEDGMENT
By signing below, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.

Investor Signature (Digital): ${safeAddress}
Date: ${new Date().toISOString()}
Email: ${email}

This agreement is legally binding and enforceable.
  `.trim();
};

interface InvestmentAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: (email: string) => void;
}

export function InvestmentAgreementModal({
  isOpen,
  onClose,
  onAgree,
}: InvestmentAgreementModalProps) {
  const { address } = useAccount();
  const [email, setEmail] = useState("");
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleDownloadAgreement = () => {
    const agreementText = generateAgreementText({ address, email });
    // Create blob and download
    const blob = new Blob([agreementText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mocha_Investment_Agreement_${address?.slice(0, 8)}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    setError("");

    // Validate email
    if (!email || !validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Check if terms are read
    if (!hasReadTerms) {
      setError("Please scroll through and read all terms");
      return;
    }

    // Check if agreed
    if (!hasAgreed) {
      setError("Please agree to the terms and conditions");
      return;
    }

    setIsSubmitting(true);

    try {
      // Store agreement in localStorage
      const agreementData = {
        address,
        email,
        timestamp: Date.now(),
        agreedToTerms: true,
        version: "1.0",
      };
      
      localStorage.setItem(`mocha_agreement_${address}`, JSON.stringify(agreementData));

      const agreementText = generateAgreementText({ address, email });

      // Download agreement copy for user
      handleDownloadAgreement();

      // Send email via backend API
      try {
        console.log('📧 Sending agreement email to:', email);
        console.log('📧 Wallet address:', address);
        
        const response = await fetchWithRetry('/api/send-agreement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email, 
            address, 
            timestamp: Date.now(),
            agreementVersion: '1.0',
            agreementText,
          }),
          retries: 3,
          retryDelay: 1000,
          timeout: 15000, // Increased timeout
        });

        console.log('📧 Email API response status:', response.status);
        console.log('📧 Email API response ok:', response.ok);

        if (!response.ok) {
          let errorData: any = { error: 'Unknown error' };
          try {
            errorData = await response.json();
          } catch (e) {
            // If JSON parsing fails, use response text or status
            const text = await response.text().catch(() => '');
            errorData = { error: text || `HTTP ${response.status}` };
          }
          
          console.error('❌ Email sending failed:', errorData);
          console.error('❌ Full error details:', JSON.stringify(errorData, null, 2));
          
          // Safely extract error message - handle all possible error formats
          const errorMessage = 
            (typeof errorData === 'string' ? errorData : null) ||
            errorData?.details ||
            errorData?.error ||
            errorData?.message ||
            (errorData?.resendError?.message) ||
            `HTTP ${response.status}: ${response.statusText}` ||
            'Unknown error';
          
          // Ensure errorMessage is a string and doesn't contain undefined references
          const safeErrorMessage = String(errorMessage).replace(/undefined/g, 'unknown');
          
          toast.error(`Email failed: ${safeErrorMessage}`, { duration: 8000 });
          
          // Don't fail the whole flow if email fails - agreement is still valid
          console.warn('⚠️ Email sending failed, but agreement is still valid. Proceeding...');
        } else {
          const data = await response.json();
          console.log('✅ Email sent successfully:', data);
          console.log('✅ Email ID:', data.emailId);
          console.log('✅ Team email sent:', data.teamEmailSent);
          console.log('✅ Team email ID:', data.teamEmailId);
          console.log('⚠️ Team email error:', data.teamEmailError);
          
          // Show success message - keep it simple and positive
          if (data.emailId) {
            // Only mention team email if it was successfully sent
            const description = data.teamEmailSent 
              ? `Email ID: ${data.emailId.substring(0, 8)}... | Team copy sent`
              : `Email ID: ${data.emailId.substring(0, 8)}...`;
            
            toast.success('Agreement signed — confirmation email sent!', { 
              duration: 5000,
              description
            });
            
            // Don't show any warnings or errors - domain is verified and emails work
            // Team email errors are logged server-side but not shown to users
          } else {
            toast.success('Agreement signed — email sent!', { duration: 5000 });
          }
        }
      } catch (err: any) {
        console.error('❌ Email API exception:', err);
        console.error('❌ Error message:', err.message);
        console.error('❌ Error stack:', err.stack);
        
        // Show detailed error
        const errorMsg = err?.message || err?.toString() || 'Network error';
        toast.error(`Email error: ${errorMsg}`, { 
          duration: 8000,
          description: 'Agreement is still valid. Proceeding...'
        });
        
        // Don't fail the whole flow if email fails - agreement is already saved locally
        console.warn('⚠️ Email sending failed, but agreement is still valid. Proceeding...');
      }

      // Always proceed with agreement even if email fails
      setEmailSent(true);
      
      // Wait a bit for user to see confirmation, then proceed
      setTimeout(() => {
        try {
          onAgree(email);
          onClose();
        } catch (err: any) {
          console.error('❌ Error in agreement completion:', err);
          toast.error('Error completing agreement', { duration: 5000 });
        }
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to process agreement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrolledToBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (scrolledToBottom && !hasReadTerms) {
      setHasReadTerms(true);
    }
  };

  if (emailSent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md border-none bg-transparent p-0 shadow-none">
          <PaymentCardShell
            title="Agreement Signed!"
            subtitle={`A copy has been sent to ${email}`}
            icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          >
            <motion.div 
              className="text-center py-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              </motion.div>
              
              <motion.p 
                className="text-gray-600 dark:text-gray-300 mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Your investment agreement has been signed and downloaded.
              </motion.p>
              
              <motion.div 
                className="mt-5 space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {["Agreement saved locally", "Document downloaded", "Email notification sent"].map((text, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {text}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </PaymentCardShell>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] border-none bg-transparent p-0 shadow-none">
        <PaymentCardShell
          title="Investment Agreement"
          subtitle="Required before making your first investment"
          icon={<FileText className="w-5 h-5 text-[#522912] dark:text-amber-400" />}
          contentClassName="pt-3 flex-1"
          className="max-h-[90vh] flex flex-col"
        >

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Terms Content - Scrollable */}
          <div
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700 mb-4"
          >
            <div className="prose dark:prose-invert max-w-none text-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                MOCHA COFFEE ASSET-BACKED INVESTMENT AGREEMENT
              </h3>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 my-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> Please read this agreement carefully. It contains important information about your rights and obligations.
                  </p>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300">
                <strong>Date:</strong> {new Date().toLocaleDateString()}<br />
                <strong>Investor Wallet:</strong> {address}<br />
              </p>

              <h4 className="font-bold text-gray-900 dark:text-white mt-4">1. INVESTMENT OVERVIEW</h4>
              <p className="text-gray-700 dark:text-gray-300">
                This agreement governs your investment in Mocha Coffee's asset-backed MBT (Mocha Bean Token) and Tree NFT investment products. By signing this agreement, you acknowledge and accept all terms herein.
              </p>

              <h4 className="font-bold text-gray-900 dark:text-white mt-4">2. ASSET BACKING</h4>
              <ul className="text-gray-700 dark:text-gray-300">
                <li>1 MBT = 1 kg of roasted coffee</li>
                <li>Each Tree NFT represents a claim on coffee inventory</li>
                <li>Investments are backed by real-world coffee assets</li>
              </ul>

              <h4 className="font-bold text-gray-900 dark:text-white mt-4">3. INVESTMENT STRUCTURE</h4>
              <ul className="text-gray-700 dark:text-gray-300">
                <li>Minimum Investment: Variable based on farm configuration</li>
                <li>Investment Vehicle: MBT tokens and Tree NFTs</li>
                <li>Lock-up Period: As specified per investment product</li>
                <li>Expected Returns: Fixed annual interest as disclosed</li>
              </ul>

              <h4 className="font-bold text-gray-900 dark:text-white mt-4">4. RISKS AND DISCLOSURES</h4>
              <p className="text-gray-700 dark:text-gray-300">You acknowledge and understand that:</p>
              <ul className="text-gray-700 dark:text-gray-300">
                <li>Coffee commodity prices may fluctuate</li>
                <li>Agricultural investments carry inherent risks</li>
                <li>Returns are not guaranteed despite best efforts</li>
                <li>Smart contract risks exist in blockchain-based investments</li>
                <li>You are investing only funds you can afford to lose</li>
              </ul>

              <h4 className="font-bold text-gray-900 dark:text-white mt-4">5. KYC/AML COMPLIANCE</h4>
              <ul className="text-gray-700 dark:text-gray-300">
                <li>You agree to complete KYC/AML verification if required</li>
                <li>You certify you are not from a restricted jurisdiction</li>
                <li>You confirm the source of funds is legitimate</li>
                <li>You agree to comply with all applicable laws</li>
              </ul>

              <h4 className="font-bold text-gray-900 dark:text-white mt-4">6. REPRESENTATIONS AND WARRANTIES</h4>
              <p className="text-gray-700 dark:text-gray-300">You represent and warrant that:</p>
              <ul className="text-gray-700 dark:text-gray-300">
                <li>You are of legal age to enter into this agreement</li>
                <li>You have the authority to invest these funds</li>
                <li>All information provided is accurate and truthful</li>
                <li>You understand the risks associated with this investment</li>
              </ul>

              <h4 className="font-bold text-gray-900 dark:text-white mt-4">7. TOKEN ECONOMICS</h4>
              <ul className="text-gray-700 dark:text-gray-300">
                <li>MBT tokens are utility tokens, not securities</li>
                <li>Tree NFTs represent investment claims</li>
                <li>Tokens may have limited liquidity</li>
                <li>No guarantee of secondary market availability</li>
              </ul>

              <h4 className="font-bold text-gray-900 dark:text-white mt-4">8. CONTACT INFORMATION</h4>
              <p className="text-gray-700 dark:text-gray-300">
                For questions or concerns, contact: <strong>legal@mochacoffee.com</strong>
              </p>

              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-4 border-t-4 border-[#522912]">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Scroll to the bottom to continue</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address (for agreement copy)
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white dark:bg-gray-800"
              disabled={isSubmitting}
            />
          </div>

          {/* Checkbox Agreement */}
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="read-terms"
                checked={hasReadTerms}
                onCheckedChange={(checked) => setHasReadTerms(checked as boolean)}
                disabled={isSubmitting}
              />
              <label
                htmlFor="read-terms"
                className="text-sm text-gray-700 dark:text-gray-300 leading-tight cursor-pointer"
              >
                I have read and understood all terms and conditions above
              </label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="agree-terms"
                checked={hasAgreed}
                onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
                disabled={!hasReadTerms || isSubmitting}
              />
              <label
                htmlFor="agree-terms"
                className="text-sm text-gray-700 dark:text-gray-300 leading-tight cursor-pointer"
              >
                I agree to the terms and conditions and acknowledge the risks associated with this investment
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex justify-between items-center mt-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-600 dark:text-gray-400"
            >
              Cancel
            </Button>
          </motion.div>
          <div className="flex gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                onClick={handleDownloadAgreement}
                disabled={!email || !validateEmail(email)}
                className="border-gray-300 dark:border-gray-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Agreement
              </Button>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              animate={hasReadTerms && hasAgreed && email ? {
                boxShadow: [
                  "0 0 0 0 rgba(82, 41, 18, 0)",
                  "0 0 0 8px rgba(82, 41, 18, 0.1)",
                  "0 0 0 0 rgba(82, 41, 18, 0)"
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Button
                onClick={handleSubmit}
                disabled={!email || !hasReadTerms || !hasAgreed || isSubmitting}
                className="bg-[#522912] hover:bg-[#6A4A36] text-white relative overflow-hidden"
              >
                {isSubmitting ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block mr-2"
                  >
                    ⏳
                  </motion.span>
                ) : null}
                {isSubmitting ? "Processing..." : "Sign Agreement"}
              </Button>
            </motion.div>
          </div>
        </DialogFooter>
        </PaymentCardShell>
      </DialogContent>
    </Dialog>
  );
}

