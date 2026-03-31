import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { sessionId } = req.query

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' })
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

    // Check payment status from ChatterPay
    const response = await fetch(`${chatterPayBaseUrl}/v1/payments/${sessionId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chatterPayApiKey}`,
        'X-Merchant-Id': chatterPayMerchantId
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ ChatterPay API error:', error)
      return res.status(500).json({ 
        error: 'Failed to check payment status',
        details: error
      })
    }

    const data = await response.json()
    
    // Map ChatterPay status to our status
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'processing': 'pending',
      'completed': 'completed',
      'success': 'completed',
      'failed': 'failed',
      'cancelled': 'failed',
      'expired': 'failed'
    }

    return res.status(200).json({ 
      status: statusMap[data.status?.toLowerCase()] || data.status || 'pending',
      transactionHash: data.transactionHash || data.tx_hash,
      amount: data.amount,
      currency: data.currency,
      completedAt: data.completedAt || data.completed_at,
      ...data
    })

  } catch (error: any) {
    console.error('❌ ChatterPay status check error:', error)
    return res.status(500).json({ 
      error: 'Failed to check payment status',
      details: error.message,
      status: 'pending' // Default to pending on error
    })
  }
}

