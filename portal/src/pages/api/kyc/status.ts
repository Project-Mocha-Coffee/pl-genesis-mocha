import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { address } = req.query

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' })
  }

  try {
    const sumsubAppToken = process.env.SUMSUB_APP_TOKEN
    const sumsubSecretKey = process.env.SUMSUB_SECRET_KEY

    if (!sumsubAppToken || !sumsubSecretKey) {
      return res.status(500).json({ 
        error: 'KYC service not configured',
        status: 'not_started'
      })
    }

    // Check applicant status in Sumsub
    const timestamp = Math.floor(Date.now() / 1000)
    const path = `/resources/applicants/-;externalUserId=${address}/one`
    
    const crypto = require('crypto')
    const signature = crypto
      .createHmac('sha256', sumsubSecretKey)
      .update(timestamp + 'GET' + path)
      .digest('hex')

    const response = await fetch(`https://api.sumsub.com${path}`, {
      method: 'GET',
      headers: {
        'X-App-Token': sumsubAppToken,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString()
      }
    })

    if (!response.ok) {
      // Applicant not found = not started
      if (response.status === 404) {
        return res.status(200).json({ status: 'not_started' })
      }
      throw new Error(`Sumsub API error: ${response.statusText}`)
    }

    const applicant = await response.json()
    
    // Map Sumsub review status to our status
    let status = 'pending'
    if (applicant.reviewResult?.reviewStatus === 'approved') {
      status = 'approved'
    } else if (applicant.reviewResult?.reviewStatus === 'rejected') {
      status = 'rejected'
    } else if (applicant.reviewResult?.reviewStatus === 'pending') {
      status = 'pending'
    }

    return res.status(200).json({ status })

  } catch (error: any) {
    console.error('❌ KYC status check error:', error)
    // Return not_started on error to allow retry
    return res.status(200).json({ status: 'not_started' })
  }
}

