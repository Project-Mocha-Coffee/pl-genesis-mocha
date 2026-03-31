# Bond Purchase User Guide

## Overview

The Mocha Coffee system allows users to purchase asset-backed bonds representing investments in coffee farms. This guide outlines the complete end-to-end process for purchasing bonds, from system setup to bond redemption.

**Launch Phase Features:**
During the initial launch phase, the system includes an internal ICO (Initial Coin Offering) mechanism that allows investors to acquire MBT tokens using various supported assets. This feature is designed to facilitate easy onboarding of new investors and provide liquidity for the ecosystem.

## System Architecture

The bond system is built on the **MochaTreeRightsToken (MTTR)** contract, which serves as the main vault for bond operations. The system integrates with several token contracts:

- **MochaBeanToken (MBT)**: The base asset used for bond purchases
- **MochaLandToken (MLT)**: Represents farm ownership (ERC721)
- **MochaTreeToken (MTT)**: Represents individual trees on farms (ERC6960 DLT)
- **FarmShareToken**: Created per farm to represent bond ownership

## Prerequisites

### For Farm Owners

1. **MLT Token Ownership**: Must own an MLT token representing the farm
2. **MTT Tokens**: Must have MTT tokens representing trees on the farm
3. **Token-Bound Account**: Must have a token-bound account (ERC6551) that owns the MTT tokens

### For Investors

1. **MBT Tokens**: Must have sufficient MBT tokens for bond purchase (can be acquired via ICO)
2. **Supported Assets**: Must have one of the supported assets (ETH, BTC, SOL, USDT, USDC) for ICO purchase if MBT tokens are needed
3. **Wallet Setup**: Must have a compatible wallet with ETH for gas fees

## Bond Purchase Process

### Unified Investor Experience Flow

The system provides a seamless, unified user experience that combines MBT token acquisition (ICO) and bond purchase into a single flow. This ensures that investors can complete their entire investment journey without leaving the platform.

**Flow Overview:**
1. **Asset Selection**: Investor chooses their preferred asset (ETH, BTC, SOL, USDT, USDC)
2. **Amount Input**: Investor specifies the amount they want to invest
3. **ICO Purchase**: System automatically handles MBT token acquisition
4. **Farm Selection**: Investor selects the farm they want to invest in
5. **Bond Purchase**: System automatically purchases bonds with acquired MBT tokens
6. **Confirmation**: Investor receives confirmation of both ICO and bond purchase

**Benefits of Unified Flow:**
- **Seamless Experience**: No need to manage separate transactions
- **Reduced Complexity**: Single transaction flow for entire investment
- **Better UX**: Investors don't need to understand technical details
- **Faster Execution**: Automated process reduces manual steps
- **Error Prevention**: System handles all validation and approvals

### Step 1: Farm Setup (Farm Owner)

Before bonds can be purchased, farms must be properly set up in the system:

#### 1.1 Farm Registration


**Requirements:**
- `farmId` must match an existing MLT token ID
- Caller must be the MLT token owner or have VAULT_MANAGER_ROLE
- `targetAPY` must be between 0-3000 basis points (0-30%)
- `maturityPeriod` must be between 36-60 months
- Farm must have at least one MTT token (tree)
- Farm must not already exist in the vault

#### 1.2 Farm Configuration
The system automatically sets:
- **Default Collateral Ratio**: 120% (12000 basis points)
- **Tree Valuation**: 100 MBT per tree
- **Min Investment**: 100 MBT
- **Max Investment**: 50,000 MBT
- **Liquidation Threshold**: 80% of collateral ratio

### Step 2: MBT Token Acquisition (Investor)

#### 2.1 ICO Purchase Flow
For investors who need to acquire MBT tokens, the system provides an internal ICO (Initial Coin Offering) mechanism. This step allows investors to purchase MBT tokens using various supported assets.

**Supported Assets for ICO Purchase:**
- ETH (Ethereum)
- BTC (Bitcoin)
- SOL (Solana)
- USDT (Tether)
- USDC (USD Coin)

#### 2.2 ICO Purchase Process

**Step 2.2.1: Asset Selection**
- Investor selects their preferred asset for MBT purchase
- System displays current exchange rates and MBT pricing
- Investor confirms the asset and amount to exchange

**Step 2.2.2: Asset Transfer**
- Investor transfers their chosen asset to the ICO contract
- System validates the asset transfer and amount
- Exchange rate is calculated based on current market conditions

**Step 2.2.3: MBT Token Distribution**
- ICO contract calculates MBT tokens to be distributed
- MBT tokens are minted and transferred to investor's wallet
- Transaction is recorded and confirmed on blockchain

**Step 2.2.4: Purchase Confirmation**
- Investor receives confirmation of MBT token acquisition
- MBT balance is updated in investor's wallet
- Investor can now proceed to bond purchase

#### 2.3 MBT Token Verification
Before proceeding to bond purchase, investors should verify their MBT token balance:



#### 2.4 ICO Pricing and Exchange Rates

**Dynamic Pricing:**
- MBT token price is determined by market conditions
- Exchange rates are updated in real-time based on asset prices
- Pricing may include small fees for asset conversion and processing

**Supported Asset Exchange:**
- **ETH**: Direct exchange with current ETH/MBT rate
- **BTC**: Cross-chain exchange via bridge or wrapped tokens
- **SOL**: Cross-chain exchange via bridge or wrapped tokens
- **USDT/USDC**: Stable coin exchange with minimal slippage

**Price Transparency:**
- All exchange rates are displayed before purchase
- No hidden fees or charges
- Real-time price updates during the purchase process

### Step 3: Bond Purchase (Investor)

#### 3.1 MBT Token Approval
Before purchasing bonds, investors must approve the MTTR contract to spend their MBT tokens:



#### 3.2 Purchase Bond


**Requirements:**
- Farm must be active and not matured
- `mbtAmount` must be within farm's min/max investment limits
- Farm must have sufficient collateral (trees)
- Investor must have sufficient MBT balance and allowance

#### 2.3 Bond Creation Process
When a bond is purchased:

1. **MBT Transfer**: MBT tokens are transferred from investor to MTTR contract
2. **Share Calculation**: Share amount = `mbtAmount / valuationPerTree`
3. **Bond Position**: New bond position is created with:
   - Farm ID
   - Deposit amount
   - Share token amount
   - Deposit timestamp
   - Maturity timestamp
   - Redeemed status (false)
4. **Share Token Minting**: FarmShareToken is minted to investor
5. **Vault Updates**: Total value locked and active bonds are incremented

### Step 4: Bond Management

#### 4.1 View Bond Positions


Returns bond details including:
- Farm ID
- Deposit amount
- Share token amount
- Deposit timestamp
- Maturity timestamp
- Redeemed status

#### 4.2 Early Redemption


**Requirements:**
- Bond must not be redeemed
- Bond must not be matured
- Investor must have sufficient share tokens

**Process:**
- 5% penalty is applied to principal
- Share tokens are burned
- Remaining amount (95%) is transferred to investor
- Bond is marked as redeemed

#### 4.3 Maturity Redemption


**Requirements:**
- Bond must be matured
- Bond must not be redeemed

**Process:**
- Full principal is returned
- Accrued yield is calculated and distributed
- Share tokens are burned
- Bond is marked as redeemed

## Yield Distribution

### Yield Distribution Process


**Requirements:**
- Caller must have VAULT_MANAGER_ROLE
- Farm must be active
- Sufficient MBT tokens must be approved

**Process:**
- Yield is distributed proportionally to bond holders
- Share token holders receive yield based on their share percentage
- Yield tracking is updated for the farm

## Collateral Management

### Collateral Valuation Updates


**Requirements:**
- Caller must have ORACLE_ROLE
- Farm must be active

**Process:**
- Tree valuation is updated
- Total collateral value is recalculated
- Coverage ratios are updated
- Liquidation thresholds are adjusted

## Risk Management

### Collateral Requirements
- **Default Collateral Ratio**: 120% (12000 basis points)
- **Liquidation Threshold**: 80% of collateral ratio
- **Tree Valuation**: 100 MBT per tree (configurable)

### Liquidation Process
If collateral ratio falls below liquidation threshold:
- Bonds become eligible for liquidation
- Liquidators can purchase bonds at a discount
- 5% bonus is provided to liquidators

## Gas Requirements

### Estimated Gas Costs
- **Farm Addition**: ~500,000 gas
- **ICO Purchase**: ~300,000 gas (varies by asset type)
- **Bond Purchase**: ~200,000 gas
- **Unified ICO + Bond Purchase**: ~450,000 gas (optimized)
- **Early Redemption**: ~150,000 gas
- **Maturity Redemption**: ~180,000 gas
- **Yield Distribution**: ~250,000 gas

### Gas Optimization Tips
1. Batch operations when possible
2. Use appropriate gas limits
3. Consider gas price fluctuations
4. Monitor network congestion



## Security Considerations

### Access Control
- **ADMIN_ROLE**: System configuration
- **VAULT_MANAGER_ROLE**: Yield distribution, farm management
- **ORACLE_ROLE**: Collateral valuation updates
- **BOND_MANAGER_ROLE**: Bond issuance management

### Reentrancy Protection
- All bond operations use `nonReentrant` modifier
- External calls are made after state updates

### Pausability
- System can be paused in emergency situations
- Bond purchases are blocked when paused
- Redemptions may still be allowed depending on pause type






