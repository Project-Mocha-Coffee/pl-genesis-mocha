import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { address, amount, currency = 'USD' } = req.body

  if (!address) {
    return res.status(400).json({ error: 'Wallet address is required' })
  }

  try {
    // Get Unlimit API key from environment variables
    const unlimitApiKey = process.env.UNLIMIT_API_KEY
    const unlimitMerchantId = process.env.UNLIMIT_MERCHANT_ID

    if (!unlimitApiKey || !unlimitMerchantId) {
      console.error('❌ Unlimit credentials not configured')
      return res.status(500).json({ 
        error: 'Onramp service not configured',
        details: 'UNLIMIT_API_KEY and UNLIMIT_MERCHANT_ID must be set in Vercel settings.'
      })
    }

    // Create Unlimit session
    const response = await fetch('https://api.unlimit.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${unlimitApiKey}`
      },
      body: JSON.stringify({
        merchantId: unlimitMerchantId,
        walletAddress: address,
        amount: parseFloat(amount),
        currency: currency,
        network: 'scroll', // Scroll network
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal-main.vercel.app'}/onramp/success`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal-main.vercel.app'}/onramp/cancel`
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Unlimit API error:', error)
      return res.status(500).json({ 
        error: 'Failed to create onramp session',
        details: error
      })
    }

    const data = await response.json()
    return res.status(200).json({ sessionId: data.sessionId })

  } catch (error: any) {
    console.error('❌ Onramp session creation error:', error)
    return res.status(500).json({ 
      error: 'Failed to create onramp session',
      details: error.message
    })
  }
}

