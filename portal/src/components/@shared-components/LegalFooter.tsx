"use client"

import Link from "next/link"
import { FileText, AlertTriangle, Mail, ExternalLink } from "lucide-react"
import { TrustBadges } from "@/components/@shared-components/TrustBadges"

export function LegalFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mt-16">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link href="/terms" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/risk-disclosure" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Risk Disclosure
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Support
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <a 
                  href="mailto:support@projectmocha.com" 
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  support@projectmocha.com
                </a>
              </li>
              <li>
                <Link href="/faq" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">About</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link href="/about" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Our Mission
                </Link>
              </li>
              <li>
                <Link href="/team" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Team
                </Link>
              </li>
              <li>
                <Link href="/farms" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                  Our Farms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Risk Disclosure Notice */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-8">
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Important Investment Disclaimer
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                Investment involves risk. Past performance does not guarantee future results. Returns depend on 
                harvest yields, market conditions, weather patterns, and other factors. Please invest only what 
                you can afford to lose. This platform does not provide financial advice. Consult with a qualified 
                financial advisor before making investment decisions. Smart contracts are deployed on Base network 
                and are publicly verifiable on BaseScan.
              </p>
            </div>
          </div>
        </div>

        {/* Copyright + Trust badges */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
          <div className="flex flex-col gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-center md:text-left">
                © {new Date().getFullYear()} Project Mocha. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <span>Built on Base Network</span>
                <span>•</span>
                <a
                  href="https://github.com/Project-Mocha-Coffee/portal-main"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-green-600 dark:hover:text-green-400 transition-colors flex items-center gap-1"
                >
                  Open Source
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <TrustBadges />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
