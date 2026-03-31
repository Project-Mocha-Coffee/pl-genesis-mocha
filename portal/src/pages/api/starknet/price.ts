import type { NextApiRequest, NextApiResponse } from "next"

export interface StarknetPriceResponse {
  ethPriceUsd: number
  mbtPriceUsd: number
  /** MBT you receive for 1 ETH */
  mbtPerEth: number
  timestamp: number
}

export interface StarknetPriceError {
  error: string
}

const MBT_PRICE_USD = 25 // $25 per MBT — matches mainnet tokenomics

let cache: { data: StarknetPriceResponse; expiresAt: number } | null = null
const CACHE_TTL_MS = 60_000 // refresh every 60 s

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StarknetPriceResponse | StarknetPriceError>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Serve from cache if fresh
  if (cache && Date.now() < cache.expiresAt) {
    return res.status(200).json(cache.data)
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) },
    )

    if (!response.ok) throw new Error(`CoinGecko ${response.status}`)

    const json = await response.json()
    const ethPriceUsd: number = json?.ethereum?.usd

    if (!ethPriceUsd || ethPriceUsd <= 0) throw new Error("Invalid ETH price")

    const data: StarknetPriceResponse = {
      ethPriceUsd,
      mbtPriceUsd: MBT_PRICE_USD,
      mbtPerEth: ethPriceUsd / MBT_PRICE_USD,
      timestamp: Date.now(),
    }

    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
    return res.status(200).json(data)
  } catch (err) {
    // Fallback to stale cache if we have it, otherwise error
    if (cache) return res.status(200).json(cache.data)
    const msg = err instanceof Error ? err.message : "Failed to fetch ETH price"
    return res.status(502).json({ error: msg })
  }
}
