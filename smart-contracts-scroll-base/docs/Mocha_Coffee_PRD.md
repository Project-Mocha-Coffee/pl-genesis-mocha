# Mocha Coffee - Technical Product Requirements Document (PRD)

## 1. Introduction & System Overview

### 1.1. Executive Summary

The Mocha Coffee Tokenization System is a comprehensive, blockchain-based platform designed to tokenize real-world coffee production assets, creating transparent and accessible investment opportunities through innovative DeFi mechanisms. Built on the Scroll blockchain to leverage its native Zero-Knowledge (ZK) capabilities, the system connects physical coffee farms and trees to a sophisticated financial layer, creating a robust, secure, and scalable ecosystem for the global coffee market.

### 1.2. System Layers

The platform is structured in five distinct layers, from the physical asset to the user-facing application:

*   **Layer 1: Physical Asset Layer**: Real-world coffee farms, individual trees, and the IoT sensors that monitor them.
*   **Layer 2: Tokenization Layer**: The representation of physical assets as unique digital tokens on the blockchain (NFTs).
*   **Layer 3: Financial Layer**: DeFi protocols, including an ERC4626 vault, that manage investment, yield generation, and distribution.
*   **Layer 4: Integration Layer**: Oracles, payment gateways, and third-party systems that connect the blockchain to off-chain data and services.
*   **Layer 5: User Interface Layer**: Dashboards and applications that allow stakeholders to interact with the system.

---

## 2. System Architecture (EIP-2535 Diamond)

The system's core logic is built using the **EIP-2535 Diamond Standard**. This provides a modular and upgradeable smart contract system.

### 2.1. Core Components

*   **Diamond Contract**: The single, persistent contract address that users interact with. It acts as a proxy, delegating function calls to the appropriate logic contracts (facets).
*   **Facets**: Individual, standalone contracts that contain the business logic for a specific domain (e.g., `FarmManagementFacet`, `YieldManagementFacet`). They are stateless and operate on the shared storage of the Diamond.
*   **`LibAppStorage`**: A centralized library where all system state is defined and stored. This ensures data persistence across contract upgrades.
*   **`LibAccess`**: A library that manages a sophisticated, role-based access control system for all functions within the Diamond.
*   **`DiamondCutFacet`**: A standard facet for adding, replacing, and removing other facets, enabling secure and transparent upgrades.
*   **`DiamondLoupeFacet`**: A standard facet that allows for introspection, making it possible to view which facets and functions the Diamond currently supports.

### 2.2. Required Facets

*   **`InitializationFacet`**: Handles the initial setup and configuration of the Diamond upon deployment.
*   **`OwnershipFacet`**: Manages ownership and administrative control of the Diamond.
*   **`FarmManagementFacet`**: Logic for registering new farms, verifying their credentials, and managing farm-level data.
*   **`TreeManagementFacet`**: Logic for minting and managing `MochaTreeTokens` (MTTs), including updating their metadata based on oracle data.
*   **`YieldManagementFacet`**: Contains the logic for recording yield data, calculating distributions, and making rewards available to the vault.
*   **`StakingFacet`**: Manages user deposits into the `MTTRVault`.
*   **`StakingRewardsFacet`**: Manages the distribution of staking rewards for MTTR holders.
*   **`StakingYieldFacet`**: Manages the core yield distribution from the vault.

---

## 3. Core Token Architecture

The ecosystem utilizes four distinct tokens, each with a specialized purpose.

### 3.1. `MochaLandToken` (MLT) - ERC721 with ERC6551 TBA

*   **Standard**: ERC721 NFT implementing ERC6551 for Token Bound Accounts.
*   **Purpose**: Represents legal title or operational rights to a specific parcel of coffee farmland. Each MLT is a smart contract wallet.
*   **Key Functionality**:
    *   Acts as the owner and manager of all `MochaTreeToken` (MTT) NFTs associated with its land parcel.
    *   Can execute batch operations on its MTTs (e.g., approve maintenance).
    *   Stores high-level farm metadata (GPS, area, certifications).
*   **Metadata**: `farm_id`, `gps_coordinates`, `land_area_hectares`, `tree_capacity`, `farm_manager`, etc.

### 3.2. `MochaTreeToken` (MTT) - ERC-6960

*   **Standard**: ERC-6960 (Dual-Layer Token). This standard is used to represent each tree as a unique asset, behaving like an NFT by ensuring the balance of each tree token is always 1.
*   **Purpose**: Represents the production rights of a single, unique coffee tree, identified by a hierarchical `(mainId, subId)` pair.
    *   `mainId`: Represents a farm or a large batch of trees (e.g., "FARM_001").
    *   `subId`: Represents the unique tree identifier within that farm (e.g., "TREE_1234").
*   **Key Functionality**:
    *   **Hierarchical Organization**: Natively groups trees under their respective farms on-chain, simplifying management and queries.
    *   **Signal for Dynamic Metadata**: While the bulky metadata (`soil_ph`, etc.) is stored off-chain for gas efficiency, the ERC-6960 standard provides the on-chain mechanism to link to this data. The contract will work in conjunction with the `MochaOracleAggregator` to validate and signal updates.
    *   **Oracle-Driven Updates**: Authorized oracles can submit data pertaining to a specific `(mainId, subId)`. The system can then update the off-chain metadata and, if necessary, emit an on-chain event or update a URI to reflect the change, ensuring frontends and other systems have access to the latest information.
*   **Metadata**: The on-chain contract will emit a `URI` event pointing to a JSON file (e.g., on IPFS). This file contains the detailed attributes for the trees within a `mainId`. The attributes themselves include `health_status`, `soil_ph`, `moisture_level`, etc.

### 3.3. `MochaBeanToken` (MBT) - ERC20 Utility Token

*   **Standard**: ERC20.
*   **Purpose**: Represents the verified yield from coffee production. It is the primary utility and reward token of the ecosystem. 1 MBT is backed by 1 kg of roasted coffee equivalent.
*   **Key Functionality**:
    *   Minted by the `YieldManagementFacet` proportional to verified harvests.
    *   The primary asset for depositing into the `MTTRVault`.
    *   Used for consumer redemption of coffee products via the Crefy platform.
    *   Burned upon redemption to create a deflationary mechanism.
*   **Access Control**: A `MINTER_ROLE` must be defined and granted *only* to the Diamond contract.

### 3.4. `MochaTreeTokenRights` (MTTR) - ERC4626 Vault Token

*   **Standard**: ERC4626, which is an extension of ERC20.
*   **Purpose**: Represents a share in the investment vault. MTTR tokens are yield-bearing instruments that entitle holders to a proportional share of the coffee yield.
*   **Key Functionality**:
    *   Issued to users when they deposit assets into the `MTTRVault`.
    *   Represents a claim on the vault's underlying assets (primarily MBT).
    *   Tradeable on secondary markets.

---

## 4. Financial Core: The Index Vault (`MTTRVault.sol`)

The `MTTRVault` is the financial heart of the system.

### 4.1. Index Vault Strategy

*   The system will use a single, unified **Index Vault** that holds the production rights (via MBT) from all participating farms.
*   This approach provides investors with instant diversification across different geographic regions, coffee varieties, and climates, mitigating farm-specific risks.

### 4.2. ERC4626 Implementation

*   **Contract**: A new contract, `MTTRVault.sol`, must be created, inheriting from OpenZeppelin's `ERC4626.sol`.
*   **Multi-Asset Deposits**: The vault must accept deposits in `MBT`, `WETH`, `USDC`, and `USDT`.
    *   Non-MBT deposits must be automatically swapped to MBT via a DEX integration (e.g., Uniswap v3), with configurable slippage protection.
*   **Lease Periods & Share Multipliers**: The vault must support multiple lock-up periods. When depositing, users select a lease period which applies a multiplier to the number of MTTR shares they receive.
    *   **6 Months**: 0.85x multiplier
    *   **12 Months**: 1.00x multiplier (Standard)
    *   **18 Months**: 1.15x multiplier
    *   **24 Months**: 1.35x multiplier
*   **Fee Structure**:
    *   **Performance Fee**: 2% on generated yield.
    *   **Management Fee**: 1% annually on total assets under management.
*   **User Position Tracking**: The vault must track individual user deposits, including the amount, lease period chosen, and the lock-up end date.

---

## 5. Data Flow & Oracle Integration

### 5.1. `MochaOracleAggregator.sol`

*   A dedicated contract, `MochaOracleAggregator.sol`, must be created to act as the single, secure entry point for all off-chain data.
*   This contract will be responsible for aggregating data from multiple sources (e.g., Chainlink nodes, custom backend systems) and validating it before passing it to other system contracts.
*   It must implement a multi-validator system, requiring a minimum number of authorized oracle signatures before accepting data.
*   It must enforce freshness constraints, rejecting stale data.

### 5.2. Data Pipeline

1.  **Collection**: IoT sensors, farm manager reports, and weather APIs collect raw data.
2.  **Validation**: An off-chain system validates, signs, and formats the data.
3.  **Submission**: Authorized oracle nodes submit the validated data to the `MochaOracleAggregator`.
4.  **On-Chain Update**: The aggregator verifies the data and calls the appropriate function, typically `TreeManagementFacet.updateTreeData()`, to update the metadata of a specific MTT.

### 5.3. Third-Party Integrations

*   **Payment Gateways**: Integration with **Swypt** and **ElementPay** for fiat-to-crypto on-ramps.
*   **NFT Redemption**: Integration with the **Crefy** platform to allow users to redeem MBT for physical coffee products, triggering the `burn` mechanism.

---

## 6. User Roles & Journeys

### 6.1. Stakeholder Roles

*   **Fiat Investor**: Onboarded via KYC/AML process; interacts through a simplified dashboard.
*   **Crypto Investor**: Interacts directly with smart contracts via a Web3 wallet.
*   **Farmer**: Onboarded after a verification process; provides production data.
*   **Consumer**: Redeems MBT for coffee on the Crefy platform.
*   **Platform Administrator**: Manages system parameters and executes upgrades.
*   **Oracle Operator**: Runs the infrastructure to feed data to the blockchain.

### 6.2. Core User Flows

*   **Investing**:
    1.  User deposits `USDT`, `WETH`, `USDC`, or `MBT` into the `MTTRVault`.
    2.  User selects a lease period (e.g., 12 months).
    3.  The vault converts the deposit to MBT (if necessary) and mints a corresponding amount of MTTR shares, applying the lease multiplier.
    4.  The user holds MTTR and receives yield distributions.
*   **Yield Distribution**:
    1.  Oracles report verified harvest data to the `YieldManagementFacet`.
    2.  The facet mints new MBT tokens proportional to the harvest and transfers them to the `MTTRVault`.
    3.  The value of the assets in the vault increases, raising the value of each MTTR share.
*   **Redemption**:
    1.  An MTTR holder can redeem their shares for a proportional amount of the underlying MBT in the vault after their lease period ends.
    2.  A user can take their MBT to the Crefy platform to redeem it for coffee.
    3.  The redemption contract burns the MBT.

---

## 7. Security, Governance & ZK Proofs

### 7.1. Access Control (`LibAccess`)

*   The system must use a robust role-based access control system.
*   **Key Roles**: `DEFAULT_ADMIN_ROLE`, `UPGRADE_GOVERNOR_ROLE`, `VAULT_MANAGER_ROLE`, `YIELD_DISTRIBUTOR_ROLE`, `ORACLE_PROVIDER_ROLE`.
*   The `DEFAULT_ADMIN_ROLE` must be held by a multi-signature wallet.

### 7.2. Governance & Upgrades

*   **Multi-Signature Wallet**: All critical administrative functions (e.g., changing fees, upgrading facets) must be controlled by a multi-sig wallet (e.g., Gnosis Safe) with a 3-of-5 signature requirement.
*   **Time-locks**: All critical operations, especially contract upgrades via `diamondCut`, must be subject to a mandatory, non-skippable time-lock (e.g., 48-72 hours) to allow for community review.
*   **Emergency Pause**: A mechanism to selectively pause critical functions (e.g., deposits, withdrawals) must be implemented. This power should be held by a separate, more responsive security council.

### 7.3. Zero-Knowledge Proofs

*   Leveraging Scroll's native ZK-rollup technology, the system should implement privacy-preserving features where necessary.
*   **Private Yield Reporting**: Farmers should be able to report their yield data in a way that can be publicly verified on-chain without revealing competitively sensitive information. A ZK proof can attest that the reported yield is valid without disclosing the exact amount.

---

## 8. Deployment & Initial Configuration

### 8.1. Deployment Sequence

1.  Deploy core libraries (`LibAppStorage`, `LibAccess`).
2.  Deploy core facets (`DiamondCutFacet`, `DiamondLoupeFacet`, `OwnershipFacet`).
3.  Deploy the main `TreeFarmDiamond` contract.
4.  Deploy all token contracts (`MLT`, `MTT`, `MBT`).
5.  Deploy the `MTTRVault.sol` contract.
6.  Deploy the `MochaOracleAggregator.sol` contract.
7.  Deploy the business logic facets.
8.  Use `diamondCut` to add the business logic facets to the Diamond.
9.  Configure all initial parameters and grant roles.
10. Transfer ownership of the Diamond to the multi-sig wallet.

### 8.2. Key Initial Parameters

*   Multi-sig wallet address.
*   Time-lock delay duration.
*   Addresses of authorized oracles.
*   Initial fee percentages for the vault.
*   Addresses of the token contracts.

---

## 9. Gap Analysis & Missing Components

This section summarizes the critical components described in the documentation that are either missing from or incorrectly implemented in the current codebase, based on the `Gap_Analysis.md` file.

### 9.1. Missing Contracts

The following essential smart contracts **do not exist** and must be created from scratch:

*   **`MTTRVault.sol`**: The core ERC4626 investment vault. This is the most critical missing piece.
*   **`MochaOracleAggregator.sol`**: The contract to securely receive and aggregate data from off-chain oracles.
*   **`SecurityMonitor.sol`**: A contract for real-time threat detection and automated emergency response.
*   **`CrefyRedemption.sol`**: A dedicated contract to handle the consumer-facing redemption of MBT for coffee products.
*   An official **`ERC6551Registry.sol`** for deployment.

### 9.2. Required Refactoring of Existing Contracts

*   **`LibAppStorage.sol`**:
    *   **Missing**: State variables for the vault (`MTTRVault` address), security (`multiSig` address), oracles (`oracleAggregator` address), and fee structures.
    *   **Expand**: `FarmMetadata` and `TreeMetadata` structs to include all fields specified in the documentation.
*   **`LibAccess.sol`**:
    *   **Missing**: Definitions for key roles (`VAULT_MANAGER_ROLE`, `YIELD_DISTRIBUTOR_ROLE`).
    *   **Implement**: Time-lock functionality for all critical administrative actions.
*   **`MochaLandToken.sol` (MLT)**:
    *   **Refactor**: Remove all state management (`landMetadata`). The NFT should only be a key. All state and logic should be in its Token Bound Account (`ERC6551Account.sol`).
    *   **Remove**: The on-chain JSON metadata generation. Replace with an event emitting a URI to off-chain metadata (IPFS).
*   **`MochaTreeToken.sol` (MTT)**:
    *   **Complete Re-architecture**: The contract must be rewritten to correctly implement the ERC-6960 standard. This means using the `(mainId, subId)` structure to represent individual trees (where `amount` is always 1) rather than a simple ERC-721 `tokenId`.
    *   **Implement Oracle Integration**: Instead of an on-chain key-value store, the contract needs a secure function (e.g., `updateTreeMetadataURI`) callable only by the `MochaOracleAggregator`. This function will update the `URI` for a given `mainId` (farm), signaling to the ecosystem that the off-chain metadata for its trees has changed.
    *   **Clarify Token Model**: The implementation must use the `(mainId, subId, amount)` model native to ERC-6960, ensuring each unique tree is represented by setting `amount` to 1. This provides the required NFT-like uniqueness while leveraging the standard's hierarchical benefits.
*   **`MochaBeanToken.sol` (MBT)**:
    *   **Replace `Ownable` with `AccessControl`**: Implement a `MINTER_ROLE`.
    .   **Modify `mint()`**: Ensure only the `YieldManagementFacet` (via the Diamond) can mint tokens.
    *   **Use `ERC20Burnable`**: For the consumer redemption mechanism.
*   **`YieldManager.sol`**:
    *   **Deprecate**: This standalone contract should be removed. Its logic must be moved into a new `YieldManagementFacet.sol` that is part of the Diamond. 