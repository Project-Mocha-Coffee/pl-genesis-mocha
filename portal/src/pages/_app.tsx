import type { AppContext, AppProps } from "next/app";
import App from "next/app";
import "@/styles/globals.css";
import "@/chainrails/chainrails-modal.css";
import "@/chainrails/chainrails-react-ui.css";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Providers } from "@/components/providers/openfortProviders";

// Dynamically import ContextProvider with SSR disabled to prevent bundling issues
const ContextProvider = dynamic(() => import("@/context").then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#522912] mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  ),
});

// Import NextStepProvider normally (it needs to be in tree for hooks)
// But make NextStep component client-only
import { NextStepProvider } from 'nextstepjs';

const NextStep = dynamic(() => import('nextstepjs').then(mod => ({ default: mod.NextStep })), {
  ssr: false,
});

const TOUR_KEY = "mainTourCompleted";

function handleTourClose() {
  console.log("Tour closing - saving to localStorage");
  if (typeof window !== "undefined") {
  localStorage.setItem(TOUR_KEY, "true");
    console.log("Tour saved:", localStorage.getItem(TOUR_KEY));
  }
}

function handleTourSkip() {
  console.log("Tour skipped - saving to localStorage");
  if (typeof window !== "undefined") {
    localStorage.setItem(TOUR_KEY, "true");
  }
}

const steps = [
  {
    tour: "mainTour",
    steps: [
      {
        icon: "☕",
        title: (
          <span style={{ 
            color: "#fff", 
            background: "linear-gradient(135deg, #522912 0%, #6A4A36 100%)", 
            padding: "0.75em 1.25em", 
            borderRadius: "12px", 
            fontSize: "18px",
            fontWeight: 600,
            display: "inline-block",
            boxShadow: "0 4px 12px rgba(82, 41, 18, 0.3)"
          }}>
            Welcome to Mocha Investor Portal
          </span>
        ),
        content: (
          <div style={{ color: "#18181b", background: "#fff", fontWeight: 500, padding: "1em", borderRadius: "8px" }}>
            <p style={{ marginBottom: "0.75em" }}>
              Welcome to your <strong>coffee-backed investment dashboard</strong>! 
            </p>
            <p style={{ marginBottom: "0.75em" }}>
              We'll guide you through how to invest in real-world coffee assets using <strong>MBT tokens</strong> and track your returns.
            </p>
            <p style={{ marginBottom: "0.75em", color: "#7A5540", fontWeight: 600, fontSize: "14px", padding: "0.5em", background: "#F6F0E4", borderRadius: "6px" }}>
              💡 Remember: <strong>1 MBT = 1 kg of coffee</strong>
            </p>
            <p style={{ color: "#7A5540", fontWeight: 600 }}>
              Let's get started! →
            </p>
          </div>
        ),
        showControls: true,
        showSkip: true,
        side: "center"
      },
      {
        icon: "🔐",
        title: (
          <span style={{ 
            color: "#fff", 
            background: "linear-gradient(135deg, #522912 0%, #6A4A36 100%)", 
            padding: "0.75em 1.25em", 
            borderRadius: "12px",
            fontWeight: 600,
            display: "inline-block",
            boxShadow: "0 4px 12px rgba(82, 41, 18, 0.3)"
          }}>
            Staked MBTs
          </span>
        ),
        content: (
          <div style={{ color: "#18181b", background: "#fff", fontWeight: 500, padding: "1em", borderRadius: "8px" }}>
            <p style={{ marginBottom: "0.75em" }}>
              <strong>Staked MBTs</strong> represent your <strong>locked investment</strong> converted from the crypto you deposited.
            </p>
            <p style={{ marginBottom: "0.75em", color: "#7A5540", fontWeight: 600, fontSize: "14px", padding: "0.5em", background: "#F6F0E4", borderRadius: "6px" }}>
              💡 Remember: <strong>1 MBT = 1 kg of coffee</strong>
            </p>
            <p style={{ color: "#7A5540" }}>
              This is your total investment balance that's staked and earning returns over time.
            </p>
          </div>
        ),
        selector: "#statcard-staked-mbts",
        side: "right",
        showControls: true,
        showSkip: true
      },
      {
        icon: "💎",
        title: (
          <span style={{ 
            color: "#fff", 
            background: "linear-gradient(135deg, #522912 0%, #6A4A36 100%)", 
            padding: "0.75em 1.25em", 
            borderRadius: "12px",
            fontWeight: 600,
            display: "inline-block",
            boxShadow: "0 4px 12px rgba(82, 41, 18, 0.3)"
          }}>
            Annual Interest
          </span>
        ),
        content: (
          <div style={{ color: "#18181b", background: "#fff", fontWeight: 500, padding: "1em", borderRadius: "8px" }}>
            <p style={{ marginBottom: "0.75em" }}>
              <strong>Annual Interest</strong> represents your <strong>claimable yearly earnings</strong> from the fixed annual yield.
            </p>
            <p style={{ marginBottom: "0.75em", color: "#7A5540", fontWeight: 600, fontSize: "14px", padding: "0.5em", background: "#F6F0E4", borderRadius: "6px" }}>
              💡 Remember: <strong>1 MBT = 1 kg of coffee</strong>
            </p>
            <p style={{ color: "#7A5540" }}>
              This displays your estimated MBT earnings per year at the current yield rate.
            </p>
          </div>
        ),
        selector: "#statcard-annual-interest",
        side: "right",
        showControls: true,
        showSkip: true
      },
      {
        icon: "📊",
        title: (
          <span style={{ 
            color: "#fff", 
            background: "linear-gradient(135deg, #522912 0%, #6A4A36 100%)", 
            padding: "0.75em 1.25em", 
            borderRadius: "12px",
            fontWeight: 600,
            display: "inline-block",
            boxShadow: "0 4px 12px rgba(82, 41, 18, 0.3)"
          }}>
            Total Returns (5Y)
          </span>
        ),
        content: (
          <div style={{ color: "#18181b", background: "#fff", fontWeight: 500, padding: "1em", borderRadius: "8px" }}>
            <p style={{ marginBottom: "0.75em" }}>
              <strong>Total Returns (5Y)</strong> shows the cumulative interest accrued, <strong>claimable at investment maturity</strong>.
            </p>
            <p style={{ marginBottom: "0.75em", color: "#7A5540", fontWeight: 600, fontSize: "14px", padding: "0.5em", background: "#F6F0E4", borderRadius: "6px" }}>
              💡 Remember: <strong>1 MBT = 1 kg of coffee</strong>
            </p>
            <p style={{ color: "#7A5540" }}>
              This is your complete 5-year projection of MBT returns, assuming current yield and compounding rates remain constant.
            </p>
          </div>
        ),
        selector: "#statcard-total-returns",
        side: "right",
        showControls: true,
        showSkip: true
      },
      {
        icon: "🔄",
        title: (
          <span style={{ 
            color: "#fff", 
            background: "linear-gradient(135deg, #522912 0%, #6A4A36 100%)", 
            padding: "0.75em 1.25em", 
            borderRadius: "12px",
            fontWeight: 600,
            display: "inline-block",
            boxShadow: "0 4px 12px rgba(82, 41, 18, 0.3)"
          }}>
            Step 1: Swap Crypto for MBT
          </span>
        ),
        content: (
          <div style={{ color: "#18181b", background: "#fff", fontWeight: 500, padding: "1em", borderRadius: "8px" }}>
            <p style={{ marginBottom: "0.75em" }}>
              Use this panel to <strong>swap your crypto</strong> (ETH, USDC, USDT, SCR, WBTC) for <strong>MBT tokens</strong>.
            </p>
            <p style={{ marginBottom: "0.75em", color: "#7A5540", fontWeight: 600, fontSize: "14px", padding: "0.5em", background: "#F6F0E4", borderRadius: "6px" }}>
              💡 Remember: <strong>1 MBT = 1 kg of coffee</strong>
            </p>
            <p style={{ marginBottom: "0.75em" }}>
              <strong>MBT is the utility token</strong> of the Mocha ecosystem representing real coffee inventory.
            </p>
            <p style={{ color: "#7A5540" }}>
              You need MBT tokens to invest in Trees and earn returns.
            </p>
          </div>
        ),
        selector: "#SwapToMbt",
        side: "left",
        showControls: true,
        showSkip: true
      },
      {
        icon: "🌳",
        title: (
          <span style={{ 
            color: "#fff", 
            background: "linear-gradient(135deg, #522912 0%, #6A4A36 100%)", 
            padding: "0.75em 1.25em", 
            borderRadius: "12px",
            fontWeight: 600,
            display: "inline-block",
            boxShadow: "0 4px 12px rgba(82, 41, 18, 0.3)"
          }}>
            Step 2: Invest in a Tree
          </span>
        ),
        content: (
          <div style={{ color: "#18181b", background: "#fff", fontWeight: 500, padding: "1em", borderRadius: "8px" }}>
            <p style={{ marginBottom: "0.75em" }}>
              Click <strong>"Invest Now"</strong> to invest your MBT tokens into a <strong>Tree</strong>.
            </p>
            <p style={{ marginBottom: "0.75em", color: "#7A5540", fontWeight: 600, fontSize: "14px", padding: "0.5em", background: "#F6F0E4", borderRadius: "6px" }}>
              💡 Remember: <strong>1 MBT = 1 kg of coffee</strong>
            </p>
            <p style={{ marginBottom: "0.75em" }}>
              A Tree is a smart contract-based asset that represents a claim on our roasted coffee inventory.
            </p>
            <p style={{ color: "#7A5540" }}>
              Your investment will start earning fixed annual returns in <strong>Q1</strong>, once the tree bond purchase period is complete.
            </p>
          </div>
        ),
        selector: "#InvestNowButton",
        side: "top",
        showControls: true,
        showSkip: true
      },
      {
        icon: "🎯",
        title: (
          <span style={{ 
            color: "#fff", 
            background: "linear-gradient(135deg, #522912 0%, #6A4A36 100%)", 
            padding: "0.75em 1.25em", 
            borderRadius: "12px",
            fontWeight: 600,
            display: "inline-block",
            boxShadow: "0 4px 12px rgba(82, 41, 18, 0.3)"
          }}>
            Track Your Investments
          </span>
        ),
        content: (
          <div style={{ color: "#18181b", background: "#fff", fontWeight: 500, padding: "1em", borderRadius: "8px" }}>
            <p style={{ marginBottom: "0.75em" }}>
              Your active investments and transactions will appear in the <strong>Investments</strong> and <strong>Transactions</strong> tabs below.
            </p>
            <p style={{ marginBottom: "0.75em", color: "#7A5540", fontWeight: 600, fontSize: "14px", padding: "0.5em", background: "#F6F0E4", borderRadius: "6px" }}>
              💡 Remember: <strong>1 MBT = 1 kg of coffee</strong>
            </p>
            <p style={{ marginBottom: "0.75em" }}>
              Monitor your portfolio performance, track yields, and manage your Trees all from this dashboard.
            </p>
            <p style={{ color: "#7A5540", fontWeight: 600 }}>
              You're all set! Happy investing! ☕
            </p>
          </div>
        ),
        showControls: true,
        showSkip: false,
        side: "center"
      }
    ]
  }
];


function MyApp({ Component, pageProps, cookie }: AppProps & { cookie: string | null }) {
  // Suppress Reown AppKit errors in Next.js error overlay (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Override Next.js error overlay to filter Reown errors
      const originalError = window.console.error;
      const originalWarn = window.console.warn;
      
      window.console.error = (...args: any[]) => {
        const errorString = args.join(' ');
        
        // Filter out Reown API errors
        if (errorString.includes('HTTP status code: 400') &&
            (errorString.includes('reown') || errorString.includes('appkit') || errorString.includes('walletconnect') ||
             errorString.includes('fetchWallets') || errorString.includes('initializeExcludedWallets') ||
             errorString.includes('FetchUtil') || errorString.includes('ApiController'))) {
          // Suppress these errors - they don't affect functionality
          // Log as warning instead
          originalWarn.apply(window.console, ['[Reown API Error Suppressed]:', ...args]);
          return;
        }
        
        // Filter out RPC network errors (Scroll RPC can be unreliable, retry logic handles it)
        if ((errorString.includes('Failed to fetch') || 
             errorString.includes('HTTP request failed') ||
             errorString.includes('HttpRequestError')) &&
            (errorString.includes('rpc.scroll.io') || 
             errorString.includes('scroll') ||
             errorString.includes('viem'))) {
          // Suppress RPC errors - they're handled by retry logic and don't need to show in error overlay
          originalWarn.apply(window.console, ['[RPC Error Suppressed - handled by retry]:', ...args]);
          return;
        }
        
        originalError.apply(window.console, args);
      };

      // Also catch errors that might trigger Next.js error overlay
      const handleError = (event: ErrorEvent) => {
        const errorMessage = event.message || '';
        const errorSource = event.filename || '';
        
        // Suppress Reown/AppKit API errors
        if ((errorMessage.includes('HTTP status code: 400') ||
             errorMessage.includes('Failed to fetch') ||
             errorMessage.includes('fetchWallets') ||
             errorMessage.includes('initializeExcludedWallets')) &&
            (errorMessage.includes('reown') || errorMessage.includes('appkit') || errorMessage.includes('walletconnect') ||
             errorSource.includes('appkit') || errorSource.includes('reown'))) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
        
        // Suppress RPC network errors (Scroll RPC can be unreliable)
        if ((errorMessage.includes('Failed to fetch') || 
             errorMessage.includes('HTTP request failed') ||
             errorMessage.includes('HttpRequestError')) &&
            (errorMessage.includes('rpc.scroll.io') || 
             errorMessage.includes('scroll') ||
             errorMessage.includes('viem'))) {
          // Log but don't show to user - RPC errors are handled by retry logic
          console.warn('RPC network error (handled by retry):', errorMessage);
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      };

      // Catch at capture phase to intercept before Next.js
      window.addEventListener('error', handleError, true);
      
      // Also catch unhandled rejections
      const handleRejection = (event: PromiseRejectionEvent) => {
        const error = event.reason;
        const errorMessage = error?.message || '';
        const errorString = String(error || '');
        
        // Suppress Reown/AppKit API errors
        if ((errorMessage.includes('HTTP status code: 400') ||
             errorMessage.includes('Failed to fetch') ||
             errorString.includes('fetchWallets') ||
             errorString.includes('initializeExcludedWallets')) &&
            (errorMessage.includes('reown') || errorMessage.includes('appkit') || errorMessage.includes('walletconnect'))) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        // Suppress RPC network errors (Scroll RPC can be unreliable)
        if ((errorMessage.includes('Failed to fetch') || 
             errorMessage.includes('HTTP request failed') ||
             errorMessage.includes('HttpRequestError')) &&
            (errorString.includes('rpc.scroll.io') || 
             errorString.includes('scroll') ||
             errorString.includes('viem'))) {
          // Log but don't show to user - RPC errors are handled by retry logic
          console.warn('RPC network error (handled by retry):', errorMessage);
          event.preventDefault();
          event.stopPropagation();
        }
      };
      
      window.addEventListener('unhandledrejection', handleRejection, true);

      return () => {
        window.console.error = originalError;
        window.removeEventListener('error', handleError, true);
        window.removeEventListener('unhandledrejection', handleRejection, true);
      };
    }
  }, []);

  // Always render NextStepProvider (it's client-only but needs to be in tree for hooks)
  // On server, render Component without NextStep wrapper
  // On client, wrap with NextStep for tour functionality
  // Reown `ContextProvider` must wrap optional Openfort so there is only one `WagmiProvider` for AppKit.
  if (typeof window === 'undefined') {
    return (
      <ContextProvider cookies={cookie}>
        <Providers>
          <NextStepProvider>
            <Component {...pageProps} />
          </NextStepProvider>
        </Providers>
      </ContextProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ContextProvider cookies={cookie}>
        <Providers>
          <NextStepProvider>
            <NextStep 
              steps={steps} 
              onEnd={handleTourClose}  
              onClose={handleTourClose}
              onSkip={handleTourSkip}
              shadowRgb="0,0,0" 
              shadowOpacity={0.8}
            >
              <Component {...pageProps} />
            </NextStep>
          </NextStepProvider>
        </Providers>
      </ContextProvider>
    </ErrorBoundary>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  try {
    const appProps = await App.getInitialProps(appContext);
    const { req } = appContext.ctx;
    const cookie = req?.headers?.cookie || null;
    return { ...appProps, cookie };
  } catch (error) {
    console.error('Error in getInitialProps:', error);
    // Return minimal props to prevent crash
    return { pageProps: {}, cookie: null };
  }
};

export default MyApp;