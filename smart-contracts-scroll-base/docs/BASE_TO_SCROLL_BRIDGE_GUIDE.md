# Complete guide: Getting MBT to the ElementPay wallet (Scroll)

Two ways to get MBT to ElementPay’s liquidity pool on Scroll. The **recommended approach** is the simpler one: bridge ETH, buy MBT on Scroll via ICO, then transfer.

---

## Minter status (confirmed)

For wallet `0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795`:

| Network        | MINTER_ROLE | Can mint MBT? |
|----------------|-------------|----------------|
| **Scroll Mainnet** | ❌ No  | No             |
| **Base Mainnet**   | ✅ Yes | Yes            |

So you can **mint MBT only on Base**. To get MBT to ElementPay on Scroll you either:

1. **Mint on Base → Bridge MBT → Scroll → Transfer to ElementPay** (if a bridge supports MBT), or  
2. **Bridge ETH → Scroll → Buy MBT via ICO → Transfer to ElementPay** (no MBT bridging needed).

Re-check minter status anytime: `npm run check:minter:role` (optionally `--wallet <address>`).  
Check bridge options: `node scripts/check-bridge-support.js`.

---

## Recommended approach (simplest)

**Bridge ETH from Base → Scroll, then buy MBT on Scroll and send to ElementPay.**  
No custom-token bridging; uses the standard ETH bridge and the ICO on Scroll.

1. **Bridge ETH** from Base → Scroll  
   - Use any standard bridge (e.g. [Scroll Bridge](https://scroll.io/bridge), [Orbiter](https://orbiter.finance/)).  
   - You only need ETH on Scroll for gas and to buy MBT.

2. **Purchase MBTs** via ICO on Scroll using your bridged ETH.  
   - Connect your wallet to the ICO (Scroll mainnet).  
   - Buy MBT with ETH.

3. **Transfer** the purchased MBTs to ElementPay:

   ```bash
   npm run fund:elementpay:scroll
   ```

   Set in `.env` (if needed):

   ```bash
   ELEMENTPAY_LIQUIDITY_POOL_ADDRESS=0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3
   MBT_AMOUNT=10000
   ```

This is the **simpler path** for funding the ElementPay wallet: no MBT bridging, no MINTER_ROLE on Base required for this flow.

---

## Alternative: Mint on Base → Bridge MBT → Transfer

Use this only if you already have MBT on Base or need to move existing MBT. **MBT is a custom token;** most bridges need UI steps or special setup.

### Step 1: Mint MBTs on Base Mainnet

You need `MINTER_ROLE` on Base:

```bash
npm run mint:mbt:base -- --amount 10000 --to 0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795
```

Or set `MBT_AMOUNT` and `MINT_TO_ADDRESS` in `.env`, then:

```bash
npm run mint:mbt:base
```

**Verify:** [BaseScan – MBT](https://basescan.org/token/0x784aD497f0C0C0C66FaF46768f1158118Ec39B4a?a=0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795)

### Step 2: Bridge MBTs from Base → Scroll

Check whether any bridge supports MBT:

```bash
npm run check:bridge:support
```

Then try (in order):

1. **Orbiter Finance** – https://orbiter.finance/ (Base → Scroll; see if MBT is listed).  
2. **Scroll Official Bridge** – https://scroll.io/bridge (see if MBT is whitelisted).  
3. **LayerZero** – only if you deploy an OFT wrapper (more complex).

### Step 3: Transfer to ElementPay

Once MBT is on Scroll:

```bash
npm run fund:elementpay:scroll
```

---

## Quick start (recommended path)

1. Bridge **ETH** from Base → Scroll (e.g. [scroll.io/bridge](https://scroll.io/bridge) or [orbiter.finance](https://orbiter.finance/)).
2. Purchase **MBTs** via ICO on Scroll with the bridged ETH.
3. Run:

   ```bash
   npm run fund:elementpay:scroll
   ```

That’s the simpler approach for getting MBT to the ElementPay wallet.

---

## Files and scripts

| File | Purpose |
|------|--------|
| `docs/BASE_TO_SCROLL_BRIDGE_GUIDE.md` | This guide |
| `scripts/check-bridge-support.js` | Check which bridges support MBT |
| `scripts/bridge-mbt-base-to-scroll.js` | Helper when bridging MBT from Base (balance + instructions) |

---

## Prerequisites

- **ETH on Base** for gas and (if using recommended path) to bridge to Scroll.
- **ETH on Scroll** for gas and to buy MBT via ICO.
- **ElementPay pool (Scroll):** `0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3`
- `.env`: `PRIVATE_KEY`; for funding: `ELEMENTPAY_LIQUIDITY_POOL_ADDRESS`, optional `MBT_AMOUNT` / `MINT_TO_ADDRESS`

For the **alternative** path you also need **MINTER_ROLE** on Base.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Want the easiest path | Use **recommended approach**: Bridge ETH → ICO on Scroll → `fund:elementpay:scroll` |
| Token not supported on bridge | Use recommended approach (no MBT bridging). |
| Insufficient gas on Scroll | Bridge more ETH to Scroll first. |
| Bridge tx stuck | Check bridge status / explorer; contact bridge support if needed. |

---

## Cost (rough)

- **Recommended:** Bridge ETH (~fee from bridge) + ICO cost + transfer gas on Scroll (~0.00002 ETH).
- **Alternative:** Mint on Base (~0.000024 ETH) + bridge (varies) + transfer on Scroll (~0.00002 ETH).
