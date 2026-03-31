'use client'

import { wagmiAdapter, projectId, config, networks } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'
import { StarknetProvider } from '@/context/StarknetContext'

// Lazy-load Reown modules only on client-side
let createAppKit: any = null
let scroll: any = null
let base: any = null
let baseSepolia: any = null
let AllWallets: any = null

if (typeof window !== 'undefined') {
  try {
    const appkitModule = require('@reown/appkit/react')
    const networksModule = require('@reown/appkit/networks')
    createAppKit = appkitModule.createAppKit
    scroll = networksModule.scroll
    base = networksModule.base
    baseSepolia = networksModule.baseSepolia
    // Try to get AllWallets enum if available
    AllWallets = appkitModule.AllWallets || { SHOW: 'SHOW', ONLY_MOBILE: 'ONLY_MOBILE', HIDE: 'HIDE' }
  } catch (error) {
    console.error('Failed to load Reown modules:', error)
  }
}

// Determine default network for wallet creation
// Allows users to choose their preferred network (multi-chain support)
// Priority: Environment variable > First available network
function getDefaultNetwork() {
  // Check for explicit environment variable
  const envDefaultChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID
  if (envDefaultChain) {
    const chainId = parseInt(envDefaultChain, 10)
    if (chainId === 8453 && base) return base // Base mainnet
    if (chainId === 84532 && baseSepolia) return baseSepolia // Base Sepolia
    if (chainId === 534352 && scroll) return scroll // Scroll
  }
  
  // Multi-chain: Return first available network as default
  // Users can switch networks in the AppKit modal (enableNetworkView: true)
  // This just sets the initial default - users can choose any network
  return scroll || base || baseSepolia
}

// Set up queryClient with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      staleTime: 30000,
      gcTime: 300000,
    },
  },
})

// Set up metadata
const metadata = {
  name: 'Project Mocha',
  description: 'Coffee-backed investment portal',
  url: typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'https://portal-main-ctq2aor24-project-mocha.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Mobile wallet deep link schemes (for detecting installed wallets)
const mobileWalletSchemes = [
  'metamask:',
  'brave:',
  'base:',
  'trust:',
  'coinbase:',
]

// Detect if we're on a mobile device (dynamic check)
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
  );
}

// Create the modal only if adapter exists and modules are loaded
// Since ContextProvider is loaded with ssr: false, this only runs client-side
let modal = null
if (wagmiAdapter && projectId && createAppKit && (scroll || base || baseSepolia) && networks.length > 0) {
  try {
    // Get the default network for wallet creation (users can change this in the modal)
    const defaultNetwork = getDefaultNetwork()
    
    modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
      networks: networks, // Filtered networks: Scroll + Base (production), + Base Sepolia (dev only)
  defaultNetwork: defaultNetwork, // Initial default (users can choose any network)
  metadata: metadata,
  features: {
        analytics: false, // Disable analytics to reduce server errors
        email: true, // Enable email login - users can choose network during creation
        socials: true, // Enable social logins - users can choose network during creation
      },
      // Email & social before wallet list so the modal doesn’t feel “wallet-only”
      connectMethodsOrder: ['email', 'social', 'wallet'],
      // Wallet configuration
      // Enable EIP6963 on all devices to detect installed wallets (including mobile browser extensions)
      // This allows installed wallets like MetaMask, Brave, Rabby extension, etc. to appear
      enableEIP6963: true,
      enableCoinbase: true,
      enableNetworkView: true, // CRITICAL: Shows network selector - allows users to choose their preferred network
      // Mobile wallet support - ensure all wallets are shown including Rabby Mobile app
      // Rabby has two products: browser extension (desktop) and mobile app (via WalletConnect)
      // Don't use includeWalletIds - it restricts the list to ONLY those wallets
      // Instead, let all wallets appear naturally from WalletConnect registry
      excludeWalletIds: [],
      // Enable WalletConnect for mobile wallet connections (required for mobile wallets like Rabby Mobile)
      enableWalletConnect: true,
      // Show "All Wallets" button - required for mobile wallet access
      // This ensures mobile wallets appear in the list via WalletConnect
      // Use AllWallets.SHOW if enum is available, otherwise use string
      allWallets: AllWallets?.SHOW || 'SHOW', // Show on all devices - enables mobile wallet detection
      // Enable mobile wallet deep linking detection
      // This allows the app to detect installed mobile wallet apps (including Rabby Mobile)
      enableMobileWalletLink: true,
      // Try to feature Rabby Mobile if it exists in the registry
      // Common Rabby wallet IDs (these won't restrict the list, just prioritize if found)
      // Note: Rabby Mobile may not be in WalletConnect registry - users should use in-app browser
      featuredWalletIds: [
        'io.rabby',
        'com.rabby',
        'rabby',
        'io.rabby.wallet',
        'com.rabby.wallet',
      ],
      // Note: If Rabby Mobile doesn't appear, it may not be in WalletConnect registry
      // Users should use Rabby Mobile's in-app browser or connect via MetaMask option
      // Add debug logging to see which wallets are detected
      // This helps identify if Rabby Mobile is in the registry
      // Connection timeout is handled client-side below to prevent stuck connection loops
    })

    if (typeof modal.setConnectMethodsOrder === 'function') {
      modal.setConnectMethodsOrder(['email', 'social', 'wallet'])
    }
    
    // Debug: Log available wallets (only in development)
    if (typeof window !== 'undefined' && modal && process.env.NODE_ENV === 'development') {
      // Try to access wallet list after a short delay
      setTimeout(() => {
        console.log('🔍 Wallet Connection Debug:', {
          modalCreated: !!modal,
          projectId: projectId ? 'Set' : 'Missing',
          enableWalletConnect: true,
          allWallets: AllWallets?.SHOW || 'SHOW',
          featuredWalletIds: ['io.rabby', 'com.rabby', 'rabby'],
        });
        console.log('💡 Note: Rabby Mobile may work via MetaMask option if not appearing directly');
      }, 2000);
    }
    
    // Connection timeout handler - prevent stuck connection loops
    if (typeof window !== 'undefined' && modal) {
      let connectionStartTime: number | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Monitor for stuck connections
      const checkConnectionState = () => {
        const modalElement = document.querySelector('[data-appkit-modal]') || 
                             document.querySelector('w3m-modal') ||
                             document.querySelector('[class*="w3m"]');
        
        if (modalElement) {
          const isVisible = modalElement.checkVisibility?.() ?? 
                           (modalElement as HTMLElement).offsetParent !== null;
          
          if (isVisible) {
            // Check if showing "Approve in wallet" for too long
            const approveText = Array.from(document.querySelectorAll('*')).find(
              el => el.textContent?.includes('Approve in wallet') || 
                    el.textContent?.includes('Accept connection request')
            );
            
            if (approveText && !connectionStartTime) {
              connectionStartTime = Date.now();
              console.log('⏱️ Connection request started, monitoring for timeout...');
            }
            
            // If connection has been pending for more than 30 seconds, show error
            if (connectionStartTime && Date.now() - connectionStartTime > 30000) {
              console.warn('⚠️ Connection timeout detected - connection stuck for >30s');
              
              // Try to close modal and show error
              const closeButton = document.querySelector('[aria-label="Close"]') ||
                                 document.querySelector('button[class*="close"]') ||
                                 document.querySelector('button:has(svg)');
              
              if (closeButton) {
                (closeButton as HTMLElement).click();
              }
              
              // Reset connection state
              connectionStartTime = null;
              if (timeoutId) clearTimeout(timeoutId);
              
              // Show user-friendly error
              setTimeout(() => {
                alert('Connection timeout. Please try again or use a different wallet.');
              }, 500);
            }
          } else {
            // Modal closed, reset state
            connectionStartTime = null;
            if (timeoutId) clearTimeout(timeoutId);
          }
        }
      };
      
      // Check connection state every 5 seconds
      timeoutId = setInterval(checkConnectionState, 5000);
      
      // Use MutationObserver to hide error messages when they appear
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Look for error messages containing "Server Error"
              if (element.querySelectorAll) {
                const errorElements = element.querySelectorAll('*');
                errorElements.forEach((el: Element) => {
                  const text = el.textContent || '';
                  if (text.includes('Server Error')) {
                    (el as HTMLElement).style.display = 'none';
                    (el as HTMLElement).style.visibility = 'hidden';
                    (el as HTMLElement).style.opacity = '0';
                  }
                });
              }
              
              // Also check the element itself
              const text = element.textContent || '';
              if (text.includes('Server Error')) {
                (element as HTMLElement).style.display = 'none';
                (element as HTMLElement).style.visibility = 'hidden';
                (element as HTMLElement).style.opacity = '0';
              }
            }
          });
        });
      });
      
      // Observe the document body for new error elements
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
      
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        // Filter out Reown server errors and API errors from console
        const errorString = args.join(' ');
        if ((errorString.includes('Server Error') || 
             errorString.includes('HTTP status code: 400') ||
             errorString.includes('Failed to fetch') ||
             errorString.includes('fetchWallets') ||
             errorString.includes('initializeExcludedWallets')) && 
            (errorString.includes('reown') || errorString.includes('walletconnect') || errorString.includes('appkit'))) {
          // Silently ignore API errors - wallet list will still work via WalletConnect
          return;
        }
        originalConsoleError.apply(console, args);
      };
      
      // Add global error handler for AppKit (only on client)
      const errorHandler = (event: ErrorEvent) => {
        const errorMessage = event.message || '';
        const errorSource = event.filename || '';
        
        // Suppress Reown/AppKit API errors (400, fetchWallets, etc.)
        if (errorMessage.includes('reown') || 
            errorMessage.includes('walletconnect') || 
            errorMessage.includes('appkit') ||
            errorMessage.includes('HTTP status code: 400') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('fetchWallets') ||
            errorMessage.includes('initializeExcludedWallets') ||
            errorSource.includes('appkit') ||
            errorSource.includes('reown')) {
          // Log but don't show to user
          console.warn('Reown AppKit error detected (handled):', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
          });
          // Prevent error from propagating
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      };
      
      window.addEventListener('error', errorHandler, true); // Use capture phase
      
      // Also catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        const errorMessage = error?.message || '';
        const errorString = String(error || '');
        
        // Suppress Reown/AppKit API errors
        if (errorMessage.includes('reown') || 
            errorMessage.includes('walletconnect') ||
            errorMessage.includes('appkit') ||
            errorMessage.includes('HTTP status code: 400') ||
            errorMessage.includes('Failed to fetch') ||
            errorString.includes('fetchWallets') ||
            errorString.includes('initializeExcludedWallets')) {
          console.warn('Reown AppKit promise rejection (handled):', error);
          // Prevent error from showing in console as unhandled
          event.preventDefault();
          event.stopPropagation();
        }
      });
    }
  } catch (error) {
    console.error('Failed to create AppKit modal:', error);
    // Log detailed error info
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        projectId: projectId ? 'Set' : 'Missing',
        hasAdapter: !!wagmiAdapter
      });
    }
  }
}

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  // If config is missing, render app without WagmiProvider
  if (!wagmiAdapter || !projectId || !config) {
    console.warn('WalletConnect not configured - rendering app without wallet features')
    return (
      <QueryClientProvider client={queryClient}>
        <StarknetProvider>{children}</StarknetProvider>
      </QueryClientProvider>
    )
  }

  // Safely get initial state from cookies
  let initialState = null
  try {
    initialState = cookieToInitialState(config as Config, cookies)
  } catch (error) {
    console.error('Failed to get initial state from cookies:', error)
  }

  return (
    <WagmiProvider config={config as Config} initialState={initialState || undefined}>
      <QueryClientProvider client={queryClient}>
        <StarknetProvider>{children}</StarknetProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
