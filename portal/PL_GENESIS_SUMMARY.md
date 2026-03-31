# Project Mocha – Cross‑Chain Coffee Farm Vaults

**One‑liner**

Project Mocha turns real‑world coffee farms into on‑chain, yield‑bearing vaults across Scroll, Base, and Starknet using ERC‑4626, with a production‑ready investor portal.

**Problem**

Smallholder coffee farmers struggle to access long‑term, climate‑resilient capital. On the other side, impact‑minded investors want transparent, diversified yield products but face complex onboarding, fragmented chains, and trust issues around how funds are actually used.

**Solution**

Project Mocha is a cross‑chain RWA DeFi system where each farm (or farm bundle) becomes an ERC‑4626‑style vault backed by real coffee trees. Investors deposit via Scroll, Base, or Starknet and receive Mocha Bean Tokens (MBT) that represent tree‑backed yield shares. A Next.js portal abstracts away chain complexity, handles KYC and fiat/MPESA on‑ramps, and surfaces farm performance in a simple dashboard.

**What we built**

- **Smart contracts** (repo: `Project-Mocha-Coffee/smart-contracts`)
  - **ERC‑4626 vault + farm registry** on Scroll/Base (`erc4626-scroll-base` & `erc4626` branches).
  - **Starknet Cairo contracts** for MBT, FarmRegistry, and **StarknetICO** on Starknet mainnet (`erc4626-starknet` branch), with:
    - Live mainnet addresses and class hashes.
    - Admin/minter roles and farm seeding flow.
  - Deployment + verification scripts and docs for Scroll, Base, and Starknet.

- **Investor portal** (repo: `Project-Mocha-Coffee/portal-main`)
  - **Next.js app** with network selector (Scroll / Base / Starknet).
  - Wallet connections (`wagmi`, `viem`, `@starknet-react/core`), KYC, and payment flows (ElementPay, Chainrails).
  - Farm dashboards with MBT balances, tree allocations, APY, and cross‑chain farm summaries.
  - **Starknet ICO integration**: “Swap to MBT” uses `NEXT_PUBLIC_STARKNET_ICO_ADDRESS` for one‑transaction purchase + mint.

**Why it matters**

- Bridges real‑world regenerative agriculture into programmable DeFi vaults.
- Shows a practical pattern for **multi‑chain RWA** (Scroll/Base L2s + Starknet ZK L2) with consistent vault semantics.
- Gives farmers a new capital channel and investors transparent, auditable exposure with strong on‑chain guarantees.

**Tech stack**

- **Smart contracts:** Solidity (ERC‑4626, ERC‑20, diamond pattern) on Scroll/Base; Cairo 2 on Starknet.
- **Tooling:** Hardhat, Starknet CLI / Scarb, TypeChain.
- **Frontend:** Next.js, React, Tailwind, `wagmi`, `viem`, `@starknet-react/core`.
- **Infra:** Supabase (data), payment/fiat bridges (ElementPay, Chainrails), Vercel for deployment.

**Repositories**

- Frontend portal: `https://github.com/Project-Mocha-Coffee/portal-main`
- Smart contracts (all branches): `https://github.com/Project-Mocha-Coffee/smart-contracts`
  - Scroll / Base: `erc4626-scroll-base`
  - Starknet: `erc4626-starknet`
  - Shared ERC‑4626 logic: `erc4626`

