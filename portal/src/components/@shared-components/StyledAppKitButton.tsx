"use client"

import { useEffect, useRef } from 'react'
import { AppKitButton } from '@reown/appkit/react'

/** Neutral label so email/social + wallet users aren’t steered by “Connect wallet” only. */
const SIGN_IN_LABEL = 'Sign in'
const SIGN_IN_LOADING_LABEL = 'Signing in…'

/**
 * Light styling for the AppKit account button host. Avoid universal `*` / `button *` rules in the
 * shadow root — they break spinners, loading state, and internal disconnect actions.
 */
export function StyledAppKitButton() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const injectStyles = () => {
      const appkitButton = containerRef.current?.querySelector('appkit-button')
      if (!appkitButton) return

      const shadowRoot = appkitButton.shadowRoot
      if (!shadowRoot) return

      let styleElement = shadowRoot.querySelector('style#appkit-custom-styles') as HTMLStyleElement
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = 'appkit-custom-styles'
        shadowRoot.appendChild(styleElement)
      }

      const isDark = document.documentElement.classList.contains('dark')
      const fg = isDark ? '#fafafa' : '#1a1a1a'
      const bg = isDark ? '#1a1a1a' : '#ffffff'
      const border = isDark ? '#3a3a3a' : '#e5e5e5'

      styleElement.textContent = `
        :host {
          display: inline-block;
        }
        button {
          color: ${fg} !important;
          background-color: ${bg} !important;
          border: 1px solid ${border} !important;
        }
      `
    }

    injectStyles()
    const timeout = setTimeout(injectStyles, 100)
    const observer = new MutationObserver(injectStyles)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef}>
      <AppKitButton label={SIGN_IN_LABEL} loadingLabel={SIGN_IN_LOADING_LABEL} />
    </div>
  )
}
