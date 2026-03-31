## Starknet Deployment – Scope Document

### 1. Objective

**Primary goal**: Deploy a minimal, production-ready version of the Project Mocha protocol on Starknet to:
- Demonstrate cross-ecosystem presence (Scroll, Base, Starknet).
- Support MBT-based tree investment tracking on Starknet.
- Prepare for future M-Pesa / off-ramp integrations via ElementPay or similar partners.

---

### 2. In-Scope

**2.1 Core Protocol Port (MVP)**
- **Token Layer**
  - MBT (ERC20-equivalent) token on Starknet.
  - Optional: MLT (farm NFT) + MTT (tree NFT) equivalents if feasible in v1.
- **Farm / Tree Logic**
  - Represent at least one “Starknet Farm” with a fixed set of trees.
  - Track:
    - Total trees,
    - Trees allocated to investors,
    - Farm APY and maturity assumptions (even if returns are off-chain for v1).
- **Investment Flow**
  - Simple purchase flow:
    - User pays in ETH or USDC on Starknet.
    - User receives MBT on Starknet (or a farm share representation).
  - Admin mint / allocation path to simulate initial inventory and reserves.

**2.2 Smart Contract Work (Cairo)**
- Define Starknet-native contracts:
  - MBT token contract (ERC20 standard on Starknet).
  - Optional: NFT contracts (MLT/MTT) using Starknet’s ERC721 standard.
  - Farm / investment registry contract:
    - Register at least one farm (Starknet Farm v1).
    - Map user → allocation / position (amount invested, tree share).
- Implement admin roles analogous to:
  - `DEFAULT_ADMIN_ROLE` (protocol owner).
  - `MINTER_ROLE` for MBT on Starknet.

**2.3 Integration & Tooling**
- **Wallets**
  - Support at least one major Starknet wallet (e.g. Argent X, Braavos).
- **Frontend Integration (Portal)**
  - Add Starknet to the network selector.
  - Display Starknet balances for:
    - MBT on Starknet,
    - Starknet farm positions (basic stats).
  - Clearly label Starknet as **“Beta / Testing”** initially.
- **Indexing / Analytics (MVP)**
  - Direct on-chain reads from the frontend (no full indexer required).
  - Basic stats:
    - Total Starknet MBT supply,
    - Starknet farm TVL,
    - Number of Starknet investors.

**2.4 Environment & DevOps**
- **Testnet deployment**
  - Deploy contracts to Starknet testnet (e.g. Sepolia Starknet).
  - End-to-end test:
    - Mint MBT,
    - Create / seed farm allocation,
    - Read balances and positions from the portal.
- **Mainnet deployment**
  - Deploy the same set of contracts to Starknet mainnet after testnet validation.
- **Docs & Scripts**
  - `STARKNET_DEPLOYMENT.md` with:
    - Contract addresses,
    - Deployment commands,
    - Basic verification and troubleshooting.
  - Minimal Hardhat/Foundry-equivalent (or Starknet CLI) scripts for:
    - Deploy,
    - Mint,
    - Seed farm inventory.

---

### 3. Out of Scope (v1)

- Full Diamond pattern port to Starknet.
- Token Bound Accounts (ERC-6551) or advanced account abstractions.
- Full parity of all facets/libraries from Scroll/Base (Bond, Yield, Farm libraries in detail).
- Direct M-Pesa / ElementPay smart contract integration on Starknet (can be planned for a later phase).
- Complex cross-chain messaging / automatic state sync between Starknet and Base/Scroll.

---

### 4. Assumptions & Dependencies

- Business logic and tokenomics follow the existing Base/Scroll design; only the implementation is adapted to Starknet.
- Admin wallet on Starknet is controlled by the same entity as on Base and Scroll.
- Sufficient ETH is available on Starknet testnet and mainnet for:
  - Contract deployments,
  - A small number of test mints and user actions.
- Tooling:
  - Use the current Node.js/TypeScript stack plus Starknet tooling (e.g. Starknet.js, Cairo compiler, Starknet CLI).

---

### 5. Deliverables

1. **Smart Contracts (Cairo)**
   - MBT (ERC20) on Starknet.
   - Optional: MLT/MTT (ERC721) plus a simple farm registry contract.
2. **Deployments**
   - Testnet deployment (addresses documented, basic verification done).
   - Mainnet deployment (addresses documented, smoke tests completed).
3. **Frontend Updates**
   - Starknet added to the network selector.
   - Starknet balances and a basic farm/investment view in the portal.
   - Starknet clearly marked as **Beta**.
4. **Documentation**
   - `STARKNET_SCOPE.md` (this document).
   - `STARKNET_DEPLOYMENT.md` with:
     - Contract addresses,
     - Commands and environment variables,
     - Quick troubleshooting tips.

---

### 6. Phasing / Milestones

**Phase 1 – Design (1–2 days)**
- Map existing Scroll/Base contracts to Starknet equivalents.
- Lock scope for v1 (MBT-only vs MBT + simple NFT farm).

**Phase 2 – Implementation (3–7 days)**
- Implement Cairo contracts for MBT (and optional NFTs + farm registry).
- Write basic unit tests.
- Integrate with at least one Starknet wallet.

**Phase 3 – Testnet & Portal Integration (2–4 days)**
- Deploy to Starknet testnet.
- Wire up the portal:
  - Network selector,
  - Balance reads,
  - Simple investment display.

**Phase 4 – Mainnet Go-Live (1–2 days)**
- Deploy to Starknet mainnet.
- Run smoke tests from the portal.
- Mark Starknet as **Beta** but production-usable for early adopters.

---

### 7. Risks & Considerations

- **Ecosystem differences**
  - Starknet’s account abstraction and tooling differ from EVM L2s; extra time may be needed for wallet, gas, and transaction UX.
- **Feature parity**
  - Full Diamond parity is *not* a v1 goal; scope creep is a risk if we try to match every existing facet.
- **User UX**
  - Need very clear messaging in the UI that Starknet is:
    - A separate deployment,
    - In **Beta**,
    - Potentially with different liquidity / APY than Base or Scroll.

## Starknet Deployment – Scope Document

### 1. Objective

**Primary goal**: Deploy a minimal, production-ready version of the Project Mocha protocol on Starknet to:
- Demonstrate cross-ecosystem presence (Scroll, Base, Starknet).
- Support MBT-based tree investment tracking on Starknet.
- Prepare for future M-Pesa / off-ramp integrations via ElementPay or similar partners.

---

### 2. In-Scope

**2.1 Core Protocol Port (MVP)**
- **Token Layer**
  - MBT (ERC20-equivalent) token on Starknet.
  - Optional: MLT (farm NFT) + MTT (tree NFT) equivalents if feasible in v1.
- **Farm / Tree Logic**
  - Represent at least one “Starknet Farm” with a fixed set of trees.
  - Track:
    - Total trees,
    - Trees allocated to investors,
    - Farm APY and maturity assumptions (even if returns are off-chain for v1).
- **Investment Flow**
  - Simple purchase flow:
    - User pays in ETH or USDC on Starknet.
    - User receives MBT on Starknet (or a farm share representation).
  - Admin mint / allocation path to simulate initial inventory and reserves.

**2.2 Smart Contract Work (Cairo)**
- Define Starknet-native contracts:
  - MBT token contract (ERC20 standard on Starknet).
  - Optional: NFT contracts (MLT/MTT) using Starknet’s ERC721 standard.
  - Farm / investment registry contract:
    - Register at least one farm (Starknet Farm v1).
    - Map user → allocation / position (amount invested, tree share).
- Implement admin roles analogous to:
  - `DEFAULT_ADMIN_ROLE` (protocol owner).
  - `MINTER_ROLE` for MBT on Starknet.

**2.3 Integration & Tooling**
- **Wallets**
  - Support at least one major Starknet wallet (e.g. Argent X, Braavos).
- **Frontend Integration (Portal)**
  - Add Starknet to the network selector.
  - Display Starknet balances for:
    - MBT on Starknet,
    - Starknet farm positions (basic stats).
  - Clearly label Starknet as **“Beta / Testing”** initially.
- **Indexing / Analytics (MVP)**
  - Direct on-chain reads from the frontend (no full indexer required).
  - Basic stats:
    - Total Starknet MBT supply,
    - Starknet farm TVL,
    - Number of Starknet investors.

**2.4 Environment & DevOps**
- **Testnet deployment**
  - Deploy contracts to Starknet testnet (e.g. Sepolia Starknet).
  - End-to-end test:
    - Mint MBT,
    - Create / seed farm allocation,
    - Read balances and positions from the portal.
- **Mainnet deployment**
  - Deploy the same set of contracts to Starknet mainnet after testnet validation.
- **Docs & Scripts**
  - `STARKNET_DEPLOYMENT.md` with:
    - Contract addresses,
    - Deployment commands,
    - Basic verification and troubleshooting.
  - Minimal Hardhat/Foundry-equivalent (or Starknet CLI) scripts for:
    - Deploy,
    - Mint,
    - Seed farm inventory.

---

### 3. Out of Scope (v1)

- Full Diamond pattern port to Starknet.
- Token Bound Accounts (ERC-6551) or advanced account abstractions.
- Full parity of all facets/libraries from Scroll/Base (Bond, Yield, Farm libraries in detail).
- Direct M-Pesa / ElementPay smart contract integration on Starknet (can be planned for a later phase).
- Complex cross-chain messaging / automatic state sync between Starknet and Base/Scroll.

---

### 4. Assumptions & Dependencies

- Business logic and tokenomics follow the existing Base/Scroll design; only the implementation is adapted to Starknet.
- Admin wallet on Starknet is controlled by the same entity as on Base and Scroll.
- Sufficient ETH is available on Starknet testnet and mainnet for:
  - Contract deployments,
  - A small number of test mints and user actions.
- Tooling:
  - Use the current Node.js/TypeScript stack plus Starknet tooling (e.g. Starknet.js, Cairo compiler, Starknet CLI).

---

### 5. Deliverables

1. **Smart Contracts (Cairo)**
   - MBT (ERC20) on Starknet.
   - Optional: MLT/MTT (ERC721) plus a simple farm registry contract.
2. **Deployments**
   - Testnet deployment (addresses documented, basic verification done).
   - Mainnet deployment (addresses documented, smoke tests completed).
3. **Frontend Updates**
   - Starknet added to the network selector.
   - Starknet balances and a basic farm/investment view in the portal.
   - Starknet clearly marked as **Beta**.
4. **Documentation**
   - `STARKNET_SCOPE.md` (this document).
   - `STARKNET_DEPLOYMENT.md` with:
     - Contract addresses,
     - Commands and environment variables,
     - Quick troubleshooting tips.

---

### 6. Phasing / Milestones

**Phase 1 – Design (1–2 days)**
- Map existing Scroll/Base contracts to Starknet equivalents.
- Lock scope for v1 (MBT-only vs MBT + simple NFT farm).

**Phase 2 – Implementation (3–7 days)**
- Implement Cairo contracts for MBT (and optional NFTs + farm registry).
- Write basic unit tests.
- Integrate with at least one Starknet wallet.

**Phase 3 – Testnet & Portal Integration (2–4 days)**
- Deploy to Starknet testnet.
- Wire up the portal:
  - Network selector,
  - Balance reads,
  - Simple investment display.

**Phase 4 – Mainnet Go-Live (1–2 days)**
- Deploy to Starknet mainnet.
- Run smoke tests from the portal.
- Mark Starknet as **Beta** but production-usable for early adopters.

---

### 7. Risks & Considerations

- **Ecosystem differences**
  - Starknet’s account abstraction and tooling differ from EVM L2s; extra time may be needed for wallet, gas, and transaction UX.
- **Feature parity**
  - Full Diamond parity is *not* a v1 goal; scope creep is a risk if we try to match every existing facet.
- **User UX**
  - Need very clear messaging in the UI that Starknet is:
    - A separate deployment,
    - In **Beta**,
    - Potentially with different liquidity / APY than Base or Scroll.

