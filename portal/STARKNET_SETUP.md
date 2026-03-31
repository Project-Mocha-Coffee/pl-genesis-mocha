# Starknet on the portal

**1. Deploy the ICO** (one-time)  
See `smart-contracts-erc4626-starknet/STARKNET_ICO_DEPLOY.md`: build → add RPC + key in `.env` → run `node scripts/deploy-ico.mjs`.

**2. Set the ICO address in the portal**
```bash
NEXT_PUBLIC_STARKNET_ICO_ADDRESS=0x<ico_address_from_step_1>
```
In Vercel or `.env.local`, then redeploy/restart.

**3. Test**  
Switch network to Starknet → connect Braavos/Argent X → Swap to MBT → complete a purchase. MBT is minted in one tx.

---

Without `NEXT_PUBLIC_STARKNET_ICO_ADDRESS`, the swap still works: ETH goes to the protocol and an admin mints MBT later (records in `starknet_purchases`). Run `supabase/starknet_purchases.sql` in Supabase if you use that flow.
