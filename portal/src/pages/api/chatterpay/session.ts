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
    // Get ChatterPay API credentials from environment variables
    const chatterPayApiKey = process.env.CHATTERPAY_API_KEY
    const chatterPayMerchantId = process.env.CHATTERPAY_MERCHANT_ID
    const chatterPayBaseUrl = process.env.CHATTERPAY_BASE_URL || 'https://api.chatterpay.com'

    if (!chatterPayApiKey || !chatterPayMerchantId) {
      console.error('❌ ChatterPay credentials not configured')
      return res.status(500).json({ 
        error: 'ChatterPay service not configured',
        details: 'CHATTERPAY_API_KEY and CHATTERPAY_MERCHANT_ID must be set in environment variables.'
      })
    }

    // Create ChatterPay payment session
    const response = await fetch(`${chatterPayBaseUrl}/v1/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chatterPayApiKey}`,
        'X-Merchant-Id': chatterPayMerchantId
      },
      body: JSON.stringify({
        walletAddress: address,
        amount: parseFloat(amount),
        currency: currency,
        network: 'scroll', // Scroll network
        paymentMethod: 'whatsapp',
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal-main.vercel.app'}/chatterpay/success`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal-main.vercel.app'}/chatterpay/cancel`,
        metadata: {
          source: 'project-mocha-portal',
          timestamp: new Date().toISOString()
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ ChatterPay API error:', error)
      return res.status(500).json({ 
        error: 'Failed to create ChatterPay session',
        details: error
      })
    }

    const data = await response.json()
    
    // Return session data including QR code and WhatsApp number
    return res.status(200).json({ 
      sessionId: data.sessionId || data.id,
      qrCode: data.qrCode || data.qr_code,
      whatsappNumber: data.whatsappNumber || data.whatsapp_number || data.contact,
      paymentUrl: data.paymentUrl || data.payment_url,
      expiresAt: data.expiresAt || data.expires_at
    })

  } catch (error: any) {
    console.error('❌ ChatterPay session creation error:', error)
    return res.status(500).json({ 
      error: 'Failed to create ChatterPay session',
      details: error.message
    })
  }
}

