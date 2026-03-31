# Project Mocha – Starknet (Cairo)

**This folder is for Starknet only.** It is separate from the Scroll and Base EVM codebase. Here you will find the scope, Cairo contracts, and deployment instructions for the Project Mocha protocol on Starknet.

---

## Starknet vs Scroll / Base

| | **Scroll & Base** | **Starknet (this folder)** |
|---|-------------------|----------------------------|
| **Location** | [`smart-contracts-erc4626-scroll-base`](../smart-contracts-erc4626-scroll-base) | This folder |
| **Tech** | Solidity, Hardhat | Cairo, Scarb |
| **Scope** | Full Diamond + tokens (MLT, MTT, MBT, MTTR) | MVP: MBT (ERC20) + simple farm registry |
| **Networks** | Scroll Mainnet/Sepolia, Base Mainnet/Sepolia | Starknet testnet/mainnet |

Do not mix this folder with the EVM project. For Scroll or Base, use the [EVM folder](../smart-contracts-erc4626-scroll-base) and the [repo root README](../README.md) for the full chain index.

---

## Docs and assets (quick reference)

| Document | Description |
|----------|-------------|
| [**STARKNET_SCOPE.md**](./STARKNET_SCOPE.md) | Scope, in-scope/out-of-scope, phasing, risks (canonical spec). |
| [**STARKNET_SCOPE.pdf**](./STARKNET_SCOPE.pdf) | Same content as PDF for sharing or printing. |
| [**STARKNET_DEPLOYMENT.md**](./STARKNET_DEPLOYMENT.md) | Deployment: addresses, commands, seeding, troubleshooting. |

---

## Repo layout (this folder)

```
smart-contracts-erc4626-starknet/
├── README.md              ← You are here
├── STARKNET_SCOPE.md      ← Scope document
├── STARKNET_SCOPE.pdf     ← Scope (PDF)
├── STARKNET_DEPLOYMENT.md ← Deployment guide
├── Scarb.toml             ← Cairo/Scarb config
├── src/                   ← Cairo contracts (e.g. MBT, FarmRegistry)
└── scripts/               ← Helpers (e.g. md-to-pdf)
```

---

## Quick start

1. **Read the scope:** [STARKNET_SCOPE.md](./STARKNET_SCOPE.md) (or [STARKNET_SCOPE.pdf](./STARKNET_SCOPE.pdf)).
2. **Fund Starknet:** Bridge ETH to Starknet mainnet via [StarkGate](https://starkgate.starknet.io/ethereum/bridge?mode=deposit). Use your Braavos (or Argent X) Starknet address.
3. **Build:** `scarb build` (from this folder). Install [Scarb](https://docs.swmansion.com/scarb/docs/install) if needed.
4. **Deploy:** Follow [STARKNET_DEPLOYMENT.md](./STARKNET_DEPLOYMENT.md) (Braavos + mainnet steps).

For the full picture of all three chains (Scroll, Base, Starknet), see the [repository root README](../README.md).
