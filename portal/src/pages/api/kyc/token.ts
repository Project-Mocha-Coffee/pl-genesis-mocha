import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { address } = req.body

  if (!address) {
    return res.status(400).json({ error: 'Wallet address is required' })
  }

  try {
    // Get Sumsub credentials from environment variables
    const sumsubAppToken = process.env.SUMSUB_APP_TOKEN
    const sumsubSecretKey = process.env.SUMSUB_SECRET_KEY

    if (!sumsubAppToken || !sumsubSecretKey) {
      console.error('❌ Sumsub credentials not configured')
      return res.status(500).json({ 
        error: 'KYC service not configured',
        details: 'SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY must be set in Vercel settings.'
      })
    }

    // Create access token for Sumsub
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = await createSumsubSignature(
      sumsubSecretKey,
      timestamp,
      'POST',
      '/resources/accessTokens',
      JSON.stringify({ userId: address })
    )

    const response = await fetch('https://api.sumsub.com/resources/accessTokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': sumsubAppToken,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString()
      },
      body: JSON.stringify({
        userId: address,
        levelName: 'basic-kyc-level', // Change to your KYC level name
        ttlInSecs: 3600 // Token valid for 1 hour
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Sumsub API error:', error)
      return res.status(500).json({ 
        error: 'Failed to create KYC token',
        details: error
      })
    }

    const data = await response.json()
    return res.status(200).json({ token: data.token })

  } catch (error: any) {
    console.error('❌ KYC token creation error:', error)
    return res.status(500).json({ 
      error: 'Failed to create KYC token',
      details: error.message
    })
  }
}

// Create HMAC SHA256 signature for Sumsub
async function createSumsubSignature(
  secret: string,
  ts: number,
  method: string,
  path: string,
  body: string
): Promise<string> {
  const crypto = require('crypto')
  const data = ts + method + path + body
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

