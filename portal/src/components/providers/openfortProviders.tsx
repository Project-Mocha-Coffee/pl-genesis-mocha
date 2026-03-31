import React from 'react'
import {
  OpenfortKitProvider,
  getDefaultConfig,
  RecoveryMethod,
  AuthProvider,
  OpenfortWalletConfig,
} from '@openfort/openfort-kit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig } from 'wagmi'
import { scroll } from 'viem/chains'

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
const shieldPublishableKey = process.env.NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY
const shieldEncryptionShare = process.env.NEXT_PUBLIC_SHIELD_ENCRYPTION_SHARE
const openfortPublishableKey = process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY

/** Set when Reown/AppKit initializes wagmi in `ContextProvider` (stable for SSR + client). */
const hasWalletConnectProjectId = Boolean((process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '').trim())

if (process.env.NODE_ENV === 'development') {
  if (!walletConnectProjectId) {
    console.warn(
      'NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not defined; WalletConnect / OpenfortKit will be limited.'
    )
  }
  if (!shieldPublishableKey) {
    console.warn('NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY is not defined; embedded signer will not work fully.')
  }
  if (!shieldEncryptionShare) {
    console.warn('NEXT_PUBLIC_SHIELD_ENCRYPTION_SHARE is not defined; embedded signer will not work fully.')
  }
  if (!openfortPublishableKey) {
    console.warn('NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY is not defined; OpenfortKitProvider will be disabled.')
  }
}

/** Minimal Wagmi shell only when Openfort is on but Reown/AppKit is not configured (rare). */
const openfortOnlyWagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Project Mocha',
    walletConnectProjectId: walletConnectProjectId || '',
    chains: [scroll],
  })
)

const queryClient = new QueryClient()

const walletConfig: OpenfortWalletConfig = {
  createEmbeddedSigner: !!(shieldPublishableKey && shieldEncryptionShare),
  embeddedSignerConfiguration: {
    shieldPublishableKey: shieldPublishableKey || '',
    recoveryMethod: RecoveryMethod.PASSWORD,
    shieldEncryptionKey: shieldEncryptionShare || '',
  },
}

const authProviders: AuthProvider[] = [AuthProvider.WALLET]

/**
 * Optional Openfort UI. Reown/AppKit Wagmi lives in `ContextProvider` — do not wrap the app in a second
 * `WagmiProvider` here, or connection/disconnect and AppKit loading state break (nested providers).
 */
export function Providers({ children }: { children?: React.ReactNode }) {
  if (!openfortPublishableKey) {
    return <>{children}</>
  }

  const kit = (
    <OpenfortKitProvider
      publishableKey={openfortPublishableKey}
      options={{ authProviders }}
      theme="auto"
      walletConfig={walletConfig}
    >
      {children}
    </OpenfortKitProvider>
  )

  // Openfort requires a WagmiProvider; when WC/Reown is configured, `ContextProvider` supplies it.
  if (hasWalletConnectProjectId) {
    return kit
  }

  // Legacy: Openfort without Reown — provide a single Wagmi shell.
  return (
    <WagmiProvider config={openfortOnlyWagmiConfig}>
      <QueryClientProvider client={queryClient}>{kit}</QueryClientProvider>
    </WagmiProvider>
  )
}
