# Mocha Coffee Tokenization System - Token Architecture

## Overview

The Mocha Coffee tokenization system employs a multi-token architecture where each token serves a specific purpose in the ecosystem. The rebranded Tree Rights Tokens (MTTR) represent collective ownership of tree production rights, clearly distinguishing them from the underlying Tree NFTs (MTT).

## Token Standards and Specifications

### 1. Mocha Land Tokens (MLT) - ERC6551

**Purpose**: Smart contract wallets representing coffee farm land parcels

```
Token Standard: ERC6551 (Token Bound Accounts)
Contract Type: NFT with wallet functionality
Supply: Limited by available farm parcels
Minting: Restricted to verified farm partnerships

Core Functions:
├── Own and manage Tree NFTs (MTT)
├── Execute farm management transactions
├── Store farm certifications and metadata
├── Enable governance participation
└── Facilitate bulk operations
```

**Metadata Structure**:
```json
{
  "name": "Mocha Land #001",
  "description": "Coffee farm parcel with operational control rights",
  "image": "ipfs://farm-image-hash",
  "attributes": {
    "farm_id": "FARM_001",
    "gps_coordinates": {
      "latitude": -1.2345,
      "longitude": 36.7890
    },
    "land_area_hectares": 5.2,
    "elevation_meters": 1500,
    "soil_type": "volcanic",
    "certifications": ["organic", "fair_trade"],
    "annual_rainfall_mm": 1200,
    "temperature_range": "18-25°C",
    "tree_capacity": 2000,
    "current_trees": 1850,
    "farm_manager": "0x...",
    "established_date": "2023-01-15"
  }
}
```

**Smart Wallet Capabilities**:
- Execute batch tree management operations
- Approve tree tokenization and transfers
- Manage farm-level permissions and access
- Store farm certification documents
- Interface with IoT management systems

### 2. Mocha Tree Tokens (MTT) - ERC6960

**Purpose**: Individual coffee tree production rights with enhanced metadata

```
Token Standard: ERC6960 (Enhanced NFT with metadata updates)
Contract Type: Dynamic NFT with oracle integration
Supply: Based on verified tree count (target: 10,000 trees)
Ownership: Initially owned by MLT (Land NFT), transferable

Core Features:
├── Dynamic metadata updates via oracles
├── Real-time IoT sensor integration
├── Yield prediction and tracking
├── Health status monitoring
└── Production history storage
```

**Metadata Structure**:
```json
{
  "name": "Coffee Tree #001",
  "description": "Individual coffee tree with production rights",
  "image": "ipfs://tree-image-hash",
  "attributes": {
    "tree_id": "TREE_001",
    "parent_farm": "FARM_001",
    "gps_coordinates": {
      "latitude": -1.2346,
      "longitude": 36.7891
    },
    "variety": "arabica_bourbon",
    "planting_date": "2022-03-15",
    "age_months": 22,
    "health_status": "excellent",
    "last_harvest": "2023-12-01",
    "annual_yield_kg": 2.5,
    "projected_yield_kg": 2.8,
    "quality_score": 85,
    "iot_sensor_id": "IOT_001",
    "last_sensor_update": "2024-01-15T10:30:00Z",
    "soil_ph": 6.2,
    "moisture_level": 65,
    "disease_resistance": "high",
    "maintenance_schedule": {
      "next_pruning": "2024-02-15",
      "next_fertilization": "2024-01-30"
    }
  }
}
```

**Oracle Integration**:
- Chainlink price feeds for valuation
- Weather data for yield predictions
- IoT sensor data for health monitoring
- Production verification through multiple sources

### 3. Mocha Bean Tokens (MBT) - ERC20

**Purpose**: Utility and reward token representing actual coffee production

```
Token Standard: ERC20
Total Supply: 10,000,000 MBT (expandable based on production)
Decimals: 18
Backing Ratio: 1 MBT = 1 kg roasted coffee equivalent

Supply Management:
├── Minting: Tied to verified coffee production
├── Burning: Through coffee sales and redemptions
├── Distribution: Multi-stakeholder allocation
└── Price Support: Treasury buyback mechanisms
```

**Token Economics**:
```
Initial Distribution (10M MBT):
├── Production Rewards: 60% (6,000,000 MBT)
│   ├── Farmer payments for verified production
│   ├── Quality bonuses and incentives
│   └── Sustainable farming rewards
│
├── Investor Incentives: 20% (2,000,000 MBT)
│   ├── Early adopter bonuses
│   ├── Staking rewards pool
│   └── Liquidity provision incentives
│
├── Team and Advisors: 10% (1,000,000 MBT)
│   ├── Team allocation (4-year vesting)
│   ├── Advisor compensation
│   └── Development incentives
│
└── Treasury Reserve: 10% (1,000,000 MBT)
    ├── Operational expenses
    ├── Emergency reserves
    └── Burn fund for deflation
```

**Utility Functions**:
- Primary vault deposit asset
- Reward distribution currency
- Coffee purchase and redemption
- Staking for additional yields
- Governance participation (future)

### 4. Mocha Tree Rights Tokens (MTTR) - ERC20/ERC4626

**Purpose**: Vault shares representing collective tree production rights

```
Token Standard: ERC20 with ERC4626 vault functionality
Supply: Dynamic based on vault deposits
Exchange Rate: Variable based on vault performance
Lease Periods: 6, 12, 18, or 24 months

Core Characteristics:
├── Represents proportional vault ownership
├── Yield-bearing with time-based validity
├── Tradeable on secondary markets
├── Redeemable for underlying assets
└── Eligible for additional staking rewards
```

**Vault Share Calculation**:
```solidity
// Simplified vault share calculation
function previewDeposit(uint256 assets) public view returns (uint256 shares) {
    uint256 totalAssets = totalVaultAssets();
    uint256 totalShares = totalSupply();
    
    if (totalShares == 0) {
        return assets; // 1:1 ratio for first deposit
    }
    
    return (assets * totalShares) / totalAssets;
}
```

**Lease Period Structure**:
```
MTTR Lease Periods and Yield Multipliers:

6 Months:   Base yield × 0.85
12 Months:  Base yield × 1.00 (standard)
18 Months:  Base yield × 1.15
24 Months:  Base yield × 1.35

Early Exit Penalties:
├── Before 25% completion: 15% penalty
├── Before 50% completion: 10% penalty
├── Before 75% completion: 5% penalty
└── After 75% completion: No penalty
```

## Token Interaction Flow

### Investment Flow

```
INVESTMENT PROCESS FLOW

User Deposit → Vault Processing → MTTR Issuance → Yield Generation

Step 1: Asset Deposit
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Assets     │───▶│ Vault Contract  │───▶│ Asset Pool      │
│ (MBT/USDT/ETH)  │    │ Validation      │    │ Management      │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Step 2: Share Calculation
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Deposit Amount  │───▶│ Share Price     │───▶│ MTTR Tokens     │
│ Lease Period    │    │ Calculation     │    │ Minted          │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Step 3: Yield Distribution
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Coffee Production│───▶│ MBT Rewards     │───▶│ MTTR Holders    │
│ Verification    │    │ Distribution    │    │ Proportional    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Production to Reward Flow

```
PRODUCTION TO REWARD CONVERSION

Physical Coffee → MBT Minting → Vault Distribution → MTTR Rewards

Farm Production:
┌─────────────────┐
│ Coffee Harvest  │
│ 500kg Verified  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ MBT Minting     │
│ 500 MBT Created │
└─────────┬───────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ Revenue Distribution (500 MBT):         │
│ ├── Farmers: 200 MBT (40%)             │
│ ├── Vault/Investors: 150 MBT (30%)     │
│ └── Treasury: 150 MBT (30%)            │
└─────────┬───────────────────────────────┘
          │
          ▼
┌─────────────────┐
│ MTTR Holder     │
│ Reward Claims   │
│ (150 MBT Pool)  │
└─────────────────┘
```

## Token Economics and Incentives

### Yield Generation Model

**Base Yield Calculation**:
```
Annual Vault Yield = (Total Production Value × Investor Share) / Total Vault Assets

Components:
├── Coffee Production Volume (kg)
├── Market Price per kg
├── Quality Premium Multipliers
├── Seasonal Adjustments
└── Risk-adjusted Returns
```

**Example Calculation**:
```
Scenario: 10,000 trees producing 25,000 kg annually
Market Price: $8/kg roasted equivalent
Total Production Value: $200,000

Distribution:
├── Farmers: $80,000 (40%)
├── Investors: $60,000 (30%)
└── Treasury: $60,000 (30%)

If Vault TVL = $500,000:
Base Annual Yield = $60,000 / $500,000 = 12% APY
```

### Burn Mechanisms

**Coffee Sales Burn**:
```
Direct Sales Burn Process:

Consumer Purchase → MBT Burn → Supply Reduction → Price Support

Implementation:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Coffee Sale     │───▶│ Equivalent MBT  │───▶│ Token Burn      │
│ $10 (1.25kg)    │    │ 1.25 MBT       │    │ Supply -1.25    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**NFT Redemption Burn**:
```
Crefy Platform Integration:

NFT Redemption → Physical Coffee → MBT Burn → Deflationary Pressure

Process Flow:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Redeems    │───▶│ Physical Coffee │───▶│ Automatic MBT   │
│ Coffee NFT      │    │ Fulfillment     │    │ Burn (1:1 ratio)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Staking and Rewards

**MTTR Staking Benefits**:
```
Additional Yield Opportunities for MTTR Holders:

Base Vault Yield + Staking Rewards + Loyalty Bonuses

Staking Tiers:
├── Bronze (30-89 days): +2% APY
├── Silver (90-179 days): +5% APY
├── Gold (180-364 days): +8% APY
└── Platinum (365+ days): +12% APY

Loyalty Multipliers:
├── First-time investors: 1.0x
├── 6-month holders: 1.1x
├── 12-month holders: 1.25x
└── 24-month holders: 1.5x
```

## Token Security and Compliance

### Access Control Matrix

```
TOKEN PERMISSION STRUCTURE

                  MLT    MTT    MBT    MTTR
                  ───    ───    ───    ────
Admin            Full   Full   Full   Full
Farm Manager     Read   Mgmt   None   None
Farmer           None   Read   Claim  None
Investor         None   Trade  Trade  Full
Oracle           None   Meta   None   None
Vault Contract   None   None   Mint   Mint

Operations:
├── Mint: Create new tokens
├── Burn: Destroy existing tokens
├── Transfer: Move token ownership
├── Meta: Update metadata
├── Mgmt: Management operations
├── Trade: Buy/sell on markets
├── Claim: Claim rewards
└── Full: All operations
```

### Compliance Features

**KYC/AML Integration**:
- Investor verification through Crefy platform
- Transaction monitoring and reporting
- Suspicious activity detection
- Regulatory compliance automation

**Audit Trail**:
- Immutable transaction history
- Production verification records
- Yield calculation transparency
- Multi-signature requirement for critical operations

## Token Utility Comparison

```
TOKEN UTILITY MATRIX

Feature/Token       MLT    MTT    MBT    MTTR
──────────────     ───    ───    ───    ────
Land Rights        ✓      ✗      ✗      ✗
Tree Rights        ✗      ✓      ✗      ✓
Yield Generation   ✗      ✓      ✓      ✓
Trading/Liquidity  ✗      ✓      ✓      ✓
Coffee Purchases   ✗      ✗      ✓      ✗
Vault Deposits     ✗      ✗      ✓      ✗
Governance         ✓      ✗      ✓      ✓
Staking Rewards    ✗      ✗      ✓      ✓
Physical Redemption ✗     ✗      ✓      ✗
Farm Management    ✓      ✗      ✗      ✗

Legend: ✓ = Supported, ✗ = Not Supported
```

## Integration Points

### Cross-Token Interactions

**MLT → MTT Relationship**:
- MLT (Land NFT) owns multiple MTT (Tree NFTs)
- Bulk operations executed through MLT wallet
- Farm-level decisions affect all owned trees
- Hierarchical permission structure

**MTT → MTTR Relationship**:
- MTT production rights aggregated in vault
- MTTR represents fractional ownership of tree collective
- Individual tree performance affects overall vault yield
- Risk distributed across multiple trees

**MBT → MTTR Relationship**:
- MBT used for vault deposits to receive MTTR
- MTTR holders receive MBT rewards
- Circular economy with burn mechanisms
- Price correlation through supply/demand dynamics

### External Protocol Integration

**DEX Integration**:
- MBT/USDC trading pairs
- MTTR/MBT liquidity pools
- Automated market maker integration
- Yield farming opportunities

**Lending Protocol Integration**:
- MTTR as collateral for loans
- MBT borrowing against tree rights
- Liquidation mechanisms for defaulted loans
- Interest rate optimization

## Future Token Evolution

### Planned Enhancements

**Governance Token (Future)**:
- Platform governance and voting rights
- Protocol upgrade decisions
- Fee structure modifications
- Treasury fund allocation

**Fractionalized NFTs**:
- Individual tree ownership fractionalization
- Lower entry barriers for small investors
- Increased liquidity for tree assets
- Micro-investment opportunities

**Cross-Chain Expansion**:
- Multi-chain deployment support
- Bridge mechanisms for token transfers
- Expanded market access
- Reduced dependency on single blockchain

## Conclusion

The Mocha Coffee token architecture creates a comprehensive ecosystem where each token serves a specific purpose while maintaining clear relationships and value flows. The rebranded MTTR tokens eliminate confusion by clearly representing tree production rights, while the multi-token structure enables flexible investment strategies and diverse participant onboarding.

This architecture supports the platform's goal of creating transparent, efficient, and scalable coffee investment opportunities while maintaining strong connections to physical asset production and real-world utility.
