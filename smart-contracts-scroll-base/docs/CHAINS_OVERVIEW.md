# Chains overview – Scroll, Base, Starknet

Quick reference so you can find the right docs and folder for each chain.

---

## Where everything lives

| Chain | Folder | What’s here |
|-------|--------|-------------|
| **Scroll** | This repo: `smart-contracts-erc4626-scroll-base` | Same EVM codebase as Base; deploy to Scroll via Hardhat network. |
| **Base** | This repo: `smart-contracts-erc4626-scroll-base` | Same EVM codebase as Scroll; deploy to Base via Hardhat network. |
| **Starknet** | Sibling folder: `smart-contracts-erc4626-starknet` | Separate Cairo codebase (MBT + farm registry MVP). |

**This folder (`smart-contracts-erc4626-scroll-base`) is for Scroll and Base only.** Starknet has its own folder and docs.

---

## Scroll (EVM)

- **Networks:** Scroll Mainnet (534352), Scroll Sepolia (534351).
- **Docs in this folder:** [README](../README.md), [08-DeploymentGuide.md](./08-DeploymentGuide.md), [01-SystemOverview.md](./01-SystemOverview.md), [02-TokenArchitecture.md](./02-TokenArchitecture.md), and rest of [docs/](./).
- **Deploy:** `npm run deploy:scroll`, `npm run deploy:scroll:sepolia`.
- **ICO:** `npm run deploy:ico:scroll`, `npm run deploy:ico:scroll:sepolia`.

---

## Base (EVM)

- **Networks:** Base Mainnet (8453), Base Sepolia (84532).
- **Docs in this folder:** [BASE_DEPLOYMENT_INSTRUCTIONS.md](../BASE_DEPLOYMENT_INSTRUCTIONS.md), [BASE_MAINNET_DEPLOYMENT_COMPLETE.md](../BASE_MAINNET_DEPLOYMENT_COMPLETE.md), [docs/base/](./base/), [scripts/base/](../scripts/base/) (e.g. README-ADD-FARMS.md).
- **Deploy:** `npm run deploy:base`, `npm run deploy:base:sepolia`.
- **ICO:** `npm run deploy:ico:base`, `npm run deploy:ico:base:sepolia`.
- **Bridging / ElementPay:** [BASE_TO_SCROLL_BRIDGE_GUIDE.md](./BASE_TO_SCROLL_BRIDGE_GUIDE.md), [MBT_MINTING_LOGIC.md](./MBT_MINTING_LOGIC.md).

---

## Starknet (Cairo)

- **Folder:** Repository root → `smart-contracts-erc4626-starknet` (sibling to the folder that contains this `smart-contracts-erc4626-scroll-base`).
- **Docs there:** [STARKNET_SCOPE.md](../../smart-contracts-erc4626-starknet/STARKNET_SCOPE.md), [STARKNET_DEPLOYMENT.md](../../smart-contracts-erc4626-starknet/STARKNET_DEPLOYMENT.md).
- **Build:** `scarb build` (from the Starknet folder).

---

## Repo root

For a single entry point to all three chains, see the repository root [README](../../README.md).
