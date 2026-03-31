-- Run this in your Supabase SQL editor to enable Starknet purchase recording

CREATE TABLE IF NOT EXISTS starknet_purchases (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_address  text        NOT NULL,
  tx_hash        text        NOT NULL,
  eth_amount     numeric     NOT NULL,
  mbt_expected   numeric     NOT NULL,
  usd_value      numeric     NOT NULL DEFAULT 0,
  status         text        NOT NULL DEFAULT 'pending_mint'
                   CHECK (status IN ('pending_mint', 'minted', 'failed')),
  minted_tx_hash text,                          -- filled by admin after minting
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_starknet_purchases_status   ON starknet_purchases (status);
CREATE INDEX IF NOT EXISTS idx_starknet_purchases_buyer    ON starknet_purchases (buyer_address);
CREATE INDEX IF NOT EXISTS idx_starknet_purchases_created  ON starknet_purchases (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_starknet_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS starknet_purchases_updated_at ON starknet_purchases;
CREATE TRIGGER starknet_purchases_updated_at
  BEFORE UPDATE ON starknet_purchases
  FOR EACH ROW EXECUTE FUNCTION update_starknet_purchases_updated_at();

-- Enable RLS (anon can insert, admin can read/update)
ALTER TABLE starknet_purchases ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist so this script is safe to re-run
DROP POLICY IF EXISTS "Anyone can insert a purchase" ON starknet_purchases;
DROP POLICY IF EXISTS "Service role can read all purchases" ON starknet_purchases;

CREATE POLICY "Anyone can insert a purchase"
  ON starknet_purchases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read all purchases"
  ON starknet_purchases FOR SELECT
  USING (auth.role() = 'service_role');
