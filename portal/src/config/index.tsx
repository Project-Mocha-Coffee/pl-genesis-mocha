// This file must only be imported client-side
// All Reown/WalletConnect imports are deferred to prevent SSR bundling issues

// Get and trim project ID (safe to read env vars)
const rawProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ''
export const projectId = rawProjectId.trim() || undefined

// Lazy-load Reown modules only on client-side
let wagmiAdapter: any = null
let config: any = null
let networks: any[] = []
let transports: any = {}

// Initialize only on client-side
if (typeof window !== 'undefined' && projectId && projectId.length > 0) {
  try {
    // Dynamic imports to prevent SSR bundling
    const { cookieStorage, createStorage, http } = require('@wagmi/core')
    const { WagmiAdapter } = require('@reown/appkit-adapter-wagmi')
    const { scroll, base, baseSepolia } = require('@reown/appkit/networks')

    const isProd = process.env.NODE_ENV === 'production'

    // Networks: Scroll + Base in production, add Base Sepolia only for dev/testing
    networks = isProd ? [scroll, base] : [scroll, base, baseSepolia]

    // Use multiple RPC endpoints for better reliability
    transports = {
      [scroll.id]: http('https://rpc.scroll.io', {
        batch: true,
        retryCount: 3,
        retryDelay: 150,
        timeout: 10000, // 10 second timeout
      }),
      [base.id]: http('https://mainnet.base.org', {
        batch: true,
        retryCount: 3,
        retryDelay: 150,
        timeout: 10000,
      }),
      // Only include Base Sepolia transport in dev/test
      ...(isProd
        ? {}
        : {
            [baseSepolia.id]: http('https://sepolia.base.org', {
              batch: true,
              retryCount: 3,
              retryDelay: 150,
              timeout: 10000,
            }),
          })
    }
    
    // Add fallback RPC endpoint if primary fails
    // Note: Scroll network RPC can be unreliable, so we handle errors gracefully
    
    wagmiAdapter = new WagmiAdapter({
      storage: createStorage({
        storage: cookieStorage
      }),
      ssr: true,
      projectId,
      networks,
      transports
    })
    config = wagmiAdapter.wagmiConfig
    
    console.log('✅ WagmiAdapter initialized successfully', {
      projectId: projectId.substring(0, 8) + '...',
      networks: networks.map(n => ({ name: n.name, chainId: n.id }))
    });
  } catch (error) {
    console.error('Failed to create WagmiAdapter:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }
} else {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set. Wallet features will be disabled.');
  }
}

export { wagmiAdapter, config, networks, transports }
