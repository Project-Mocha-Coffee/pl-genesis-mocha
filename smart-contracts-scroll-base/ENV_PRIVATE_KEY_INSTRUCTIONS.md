# Add deployer key for grant MINTER_ROLE (keep existing PRIVATE_KEY)

**Do not commit or share your .env file or private key.**

## If you already have PRIVATE_KEY in .env (recommended)

Add a **second** line for the Scroll deployer key so you don’t overwrite your existing key:

1. Open `.env` in this folder (`smart-contracts-erc4626-scroll-base`).
2. Add this line (use the **deployer** key for `0x6ed208c1e6a012118194c4457fe8dc3215ea971a`):

```
SCROLL_DEPLOYER_PRIVATE_KEY=your_deployer_64_character_hex_key_here
```

- The **grant** script uses `SCROLL_DEPLOYER_PRIVATE_KEY` first; if unset, it uses `PRIVATE_KEY`.
- Your existing `PRIVATE_KEY` stays as-is (e.g. your wallet for minting).
- Key with or without `0x`; no quotes; one line.

Save the file.

## If you don’t mind overwriting PRIVATE_KEY

You can instead set `PRIVATE_KEY=` to the deployer key only when running the grant, then change it back. Using `SCROLL_DEPLOYER_PRIVATE_KEY` avoids that.

## Run these commands (in order)

From `smart-contracts-erc4626-scroll-base`:

```bash
# 1) Grant MINTER_ROLE to your wallet on Scroll
npm run grant:minter:scroll -- --to 0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795

# 2) Mint 10,000 MBT to ElementPay Treasury on Scroll
npm run mint:mbt:scroll -- --amount 10000 --to 0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3
```

- Step 1 uses **SCROLL_DEPLOYER_PRIVATE_KEY** (or PRIVATE_KEY if that’s unset) to grant MINTER_ROLE to `0x7893...`.
- Step 2 uses **PRIVATE_KEY** for minting. If PRIVATE_KEY is your wallet `0x7893...`, leave it as-is and run step 2 after the grant; that wallet will then have MINTER_ROLE and can mint. Ensure that wallet has a little ETH on Scroll for gas.
