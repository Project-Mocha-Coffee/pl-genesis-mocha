# Project Mocha – Track Fit Blurbs

Use these short sections directly in DevSpot / PL_Genesis track fields.

---

## Crypto (Protocol Labs)

Project Mocha fits the **Crypto** track by designing a full economic system around real‑world agroforestry. We use ERC‑4626 vaults and MBT tokens to represent tree‑backed yield shares, with cross‑chain deployments on Scroll, Base, and Starknet. The contracts encode farm parameters (trees, APY, maturity) and route yield to token holders, while the portal provides a consumer‑grade investing UX with KYC, on‑ramp integrations, and multi‑chain support. This is a concrete example of programmable treasuries, RWA yield products, and coordination between on‑chain vaults and off‑chain farm operations.

---

## Infrastructure & Digital Rights (Protocol Labs)

Project Mocha is infrastructure for user‑owned, censorship‑resistant access to regenerative agriculture yields. MBT is a portable, non‑custodial representation of a user’s farm exposure; the underlying vaults and registries live on open L2s (Scroll, Base, Starknet) with clear admin roles, on‑chain farm state, and transparent supply. Investors retain custody of their tokens in standard wallets, and all farm state (trees, APY, allocations) is readable from public smart contracts. The portal sits atop this infra but does not hold funds, making it an access layer on top of user‑owned positions rather than a custody provider.

---

## AI & Robotics (optional angle)

While Project Mocha is primarily DeFi/RWA infrastructure, we layer in **agentic workflows** around investment and monitoring. The architecture is designed so that AI agents can:

- Read farm + vault state across Scroll/Base/Starknet.
- Simulate portfolio allocations.
- Propose or execute rebalancing transactions under guardrails.

This demonstrates how autonomous agents can interact with real economic systems (RWA vaults, multi‑chain assets) while remaining bounded by on‑chain rules and human‑set policies.

---

## 🤖 Agent Only – Let the agent cook (optional extension)

We use the Mocha infra (vault contracts + portal APIs) as the environment for a **fully autonomous investment agent**. After configuration, the agent:

1. Discovers available farms and vault parameters from the on‑chain registry.
2. Plans a diversified strategy under constraints (risk, tree caps, budget).
3. Executes deposits/withdrawals via Scroll/Base/Starknet using our contracts.
4. Verifies positions and logs all decisions and tool calls into `agent_log.json`.
5. Exposes an `agent.json` capability manifest describing supported chains, vaults, and budget limits.

The agent operates as an independent economic actor in a real, multi‑chain RWA system rather than a toy environment.

---

## Starknet

Our Starknet leg is a live deployment of the Mocha system on **Starknet mainnet**. We provide:

- Cairo contracts for MBT, FarmRegistry, and StarknetICO.
- Mainnet addresses, class hashes, and transactions in `STARKNET_DEPLOYED_ADDRESSES.md`.
- A deployment + ICO playbook (`STARKNET_DEPLOYMENT.md`, `STARKNET_ICO_DEPLOY.md`).

This shows how Starknet can host real‑world asset vaults with verifiable, on‑chain farm state and automatic token distribution via the ICO. With additional work (e.g. shielded positions or anonymized farm allocations), the same pattern can be extended toward privacy‑preserving RWA exposure.

---

## Filecoin (future extension)

We use the Mocha vaults and portal as the financial layer and **Filecoin Onchain Cloud** as the data layer. Off‑chain artifacts like farm documents, agronomy reports, and historical yield data can be stored as CIDs on Filecoin, referenced by on‑chain farm IDs. This gives agents and investors a verifiable history of farm performance while keeping heavy data off‑chain but content‑addressed. The same pattern can be extended to store execution logs and agent traces, enabling transparent, auditable investment decisions.

---

## Hypercerts (future extension)

Project Mocha’s impact is measurable in hectares of agroforestry, carbon impact, and farmer income. By integrating **Hypercerts** we can:

- Mint hypercerts that represent specific farm cohorts or seasons (who did what, when, and with what evidence).
- Link on‑chain vault/farm IDs to hypercert metadata and evidence (reports, satellite data, agronomy audits) stored off‑chain.
- Allow funders to see not just their financial yield (via MBT) but also their verified impact record.

This turns Mocha into both a DeFi RWA product and a transparent impact funding primitive.

