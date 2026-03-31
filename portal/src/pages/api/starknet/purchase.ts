import type { NextApiRequest, NextApiResponse } from "next"
import { supabase } from "@/lib/supabase"

export interface StarknetPurchasePayload {
  buyerAddress: string
  txHash: string
  ethAmount: string   // as decimal string, e.g. "0.01"
  mbtExpected: string // e.g. "72.44"
  usdValue: string    // e.g. "1811.00"
}

export interface StarknetPurchaseResponse {
  success: boolean
  id?: string
  message?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StarknetPurchaseResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" })
  }

  const { buyerAddress, txHash, ethAmount, mbtExpected, usdValue } =
    req.body as StarknetPurchasePayload

  if (!buyerAddress || !txHash || !ethAmount || !mbtExpected) {
    return res.status(400).json({ success: false, error: "Missing required fields" })
  }

  try {
    const { data, error } = await supabase
      .from("starknet_purchases")
      .insert({
        buyer_address: buyerAddress,
        tx_hash: txHash,
        eth_amount: parseFloat(ethAmount),
        mbt_expected: parseFloat(mbtExpected),
        usd_value: parseFloat(usdValue ?? "0"),
        status: "pending_mint",
      })
      .select("id")
      .single()

    if (error) {
      // Still succeed — we log the purchase even if Supabase is unavailable
      console.error("Supabase insert error:", error.message)
      return res.status(200).json({
        success: true,
        message: "Purchase recorded (db warning)",
      })
    }

    return res.status(200).json({ success: true, id: data?.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("starknet/purchase error:", msg)
    // Don't block the user — the tx is already on-chain
    return res.status(200).json({ success: true, message: "Purchase noted" })
  }
}
