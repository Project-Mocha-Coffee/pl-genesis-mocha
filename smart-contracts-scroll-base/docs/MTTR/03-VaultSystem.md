# Mocha Coffee Tokenization System - Multi-Tranche ERC4626 Vault System

## Overview

The Mocha Coffee Multi-Tranche ERC4626 vault system serves as the financial engine of the platform, pooling investor capital through asset-backed bonds for individual farms. Each farm represents a single tranche with its own share token, where the farm's trees serve as collateral for bond issuance. This creates a structured finance approach where each farm's funding is raised as a distinct bond with its own share token, pricing, and reward distribution mechanisms.

## Multi-Tranche Vault Architecture

### Farm-as-Tranche Structure

Instead of multiple tranches per farm, the system employs a multi-tranche vault where each farm represents a single tranche with one share token:

```
MULTI-TRANCHE VAULT ARCHITECTURE

┌─────────────────────────────────────────────────────────────────────────────┐
│                        MOCHA MULTI-TRANCHE VAULT                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FARM A TRANCHE                                  │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │              FarmA_ShareToken                                   │ │   │
│  │  │                                                                 │ │   │
│  │  │  Target APY: 12%                                                │ │   │
│  │  │  Maturity: 3 years                                              │ │   │
│  │  │  Collateral: 1,100 Trees                                        │ │   │
│  │  │  Bond Value: $880,000 (800 MBT per tree)                       │ │   │
│  │  │  Min. Invest: 100 MBT                                           │ │   │
│  │  │  Max. Invest: 50,000 MBT                                        │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  │  Total Trees: 1,100 (Farm A Collateral)                            │   │
│  │  Bond Value: $880,000 (800 MBT per tree)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FARM B TRANCHE                                  │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │              FarmB_ShareToken                                   │ │   │
│  │  │                                                                 │ │   │
│  │  │  Target APY: 14%                                                │ │   │
│  │  │  Maturity: 4 years                                              │ │   │
│  │  │  Collateral: 1,400 Trees                                        │ │   │
│  │  │  Bond Value: $1,120,000 (800 MBT per tree)                     │ │   │
│  │  │  Min. Invest: 100 MBT                                           │ │   │
│  │  │  Max. Invest: 50,000 MBT                                        │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  │  Total Trees: 1,400 (Farm B Collateral)                            │   │
│  │  Bond Value: $1,120,000 (800 MBT per tree)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FARM C TRANCHE                                  │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │              FarmC_ShareToken                                   │ │   │
│  │  │                                                                 │ │   │
│  │  │  Target APY: 16%                                                │ │   │
│  │  │  Maturity: 5 years                                              │ │   │
│  │  │  Collateral: 1,000 Trees                                        │ │   │
│  │  │  Bond Value: $800,000 (800 MBT per tree)                       │ │   │
│  │  │  Min. Invest: 100 MBT                                           │ │   │
│  │  │  Max. Invest: 50,000 MBT                                        │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  │  Total Trees: 1,000 (Farm C Collateral)                            │   │
│  │  Bond Value: $800,000 (800 MBT per tree)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Total Vault TVL: $2,800,000                                               │
│  Total Trees Under Management: 3,500                                      │
│  Number of Share Tokens: 3 (1 tranche × 3 farms)                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Farm-as-Tranche Benefits

**Simplified Risk Management**:
- Each farm represents a single investment opportunity
- Clear risk profile based on farm characteristics (location, variety, management)
- Independent performance tracking and yield distribution
- No complex tranche seniority calculations

**Investor Choice**:
- Investors can select farms matching their preferences
- Different maturity profiles (3-5 years) for liquidity preferences
- Farm-specific exposure for geographic or variety preferences
- Transparent yield expectations based on farm performance

**Farm Funding Flexibility**:
- Each farm raises capital independently
- Collateralized by their specific tree assets
- Customized bond terms based on farm characteristics
- Independent performance tracking and yield distribution

## Multi-Tranche Vault Implementation

### Core Vault Features

The Mocha Multi-Tranche Vault follows the multi-tranche vault pattern, with a main vault contract managing multiple farm-specific share tokens:

**Main Vault Contract (Entry Point)**:
- Single point of entry for all users
- Holds all underlying MBT assets
- Manages farm-specific share token contracts
- Coordinates yield distribution and bond operations

**Farm Share Token Contracts**:
- Individual ERC20 tokens for each farm (e.g., FarmA_ShareToken, FarmB_ShareToken)
- Independent share pricing for each farm based on underlying asset performance
- Separate yield distribution mechanisms per farm
- Individual maturity schedules and redemption processes

**Single Entry Point Asset**:
- Primary asset: MBT (Mocha Bean Tokens) only
- All bond purchases denominated in MBT
- Automatic allocation to appropriate farm tranches based on investor preferences
- Unified liquidity pool for all farms

**Farm-Specific Parameters**:
```
FARM TRANCHE CONFIGURATION

Farm A (Highland Arabica):
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Parameter   │    Value    │ Description │ Risk Level  │ Maturity    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Target APY  │    12%      │ Conservative │    Low     │  3 years    │
│ Collateral  │  1,100 trees│ Highland    │             │             │
│ Bond Value  │  $880,000   │ Arabica     │             │             │
│ Min. Invest │   100 MBT   │ Stable      │             │             │
│ Max. Invest │  50,000 MBT │ Climate     │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

Farm B (Valley Robusta):
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Parameter   │    Value    │ Description │ Risk Level  │ Maturity    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Target APY  │    14%      │ Balanced    │   Medium    │  4 years    │
│ Collateral  │  1,400 trees│ Valley      │             │             │
│ Bond Value  │  $1,120,000 │ Robusta     │             │             │
│ Min. Invest │   100 MBT   │ Moderate    │             │             │
│ Max. Invest │  50,000 MBT │ Climate     │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

Farm C (Coastal Arabica):
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Parameter   │    Value    │ Description │ Risk Level  │ Maturity    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Target APY  │    16%      │ Aggressive  │    High     │  5 years    │
│ Collateral  │  1,000 trees│ Coastal     │             │             │
│ Bond Value  │  $800,000   │ Arabica     │             │             │
│ Min. Invest │   100 MBT   │ Variable    │             │             │
│ Max. Invest │  50,000 MBT │ Climate     │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### Bond Purchase Process Flow

```
BOND PURCHASE PROCESS

User Intent → Farm Selection → MBT Deposit → Share Token Issuance

Step 1: Farm Selection and Validation
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Selects    │───▶│ Farm            │───▶│ Availability    │
│ Farm            │    │ Validation      │    │ Check           │
│ (e.g., Farm A)  │    │ (Risk Level)    │    │ (Capacity)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Step 2: MBT Deposit and Allocation
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Deposits   │───▶│ MBT Validation  │───▶│ Farm            │
│ MBT Amount      │    │ & Processing    │    │ Allocation      │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Step 3: Share Token Issuance
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Share Price     │───▶│ Token Minting   │───▶│ FarmA_ShareToken│
│ Calculation     │    │ Process         │    │ Tokens Issued   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Share Token Calculation Logic

**Farm-Specific Share Calculation**:

Each farm calculates its share tokens independently based on the underlying tree collateral and farm-specific parameters:

```
SHARE CALCULATION FLOW

MBT Deposit → Farm Share Price → Collateral Ratio → Final Share Tokens

Step 1: Farm Share Price Calculation
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Farm            │───▶│ Tree Collateral │───▶│ Share Price     │
│ Configuration   │    │ Value (MBT)     │    │ (MBT per Share) │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Step 2: Collateral Ratio Application
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ MBT Deposit     │───▶│ Collateral      │───▶│ Adjusted        │
│ Amount          │    │ Ratio (e.g.,    │    │ Share Count     │
│                 │    │ 1.2x for Farm A)│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Step 3: Final Token Issuance
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Adjusted        │───▶│ Farm-Specific   │───▶│ Share Tokens    │
│ Share Count     │    │ Token Minting   │    │ Transferred     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Example Calculation Scenario**:
```
Input Parameters:
├── Farm: Farm A
├── Deposit: 1,000 MBT
├── Tree Collateral: 1,100 trees × 800 MBT = 880,000 MBT
├── Target Bond Value: 880,000 MBT
├── Collateral Ratio: 1.2x (120% collateralization)
└── Share Price: 1.00 MBT per share

Calculation Steps:
├── Base Shares = 1,000 MBT ÷ 1.00 = 1,000 shares
├── Collateral Adjustment = 1,000 × 1.2 = 1,200 shares
└── Final Result = 1,200 FarmA_ShareToken tokens issued
```

## Asset-Backed Bond Mechanics

### Collateral Management

**Tree Asset Collateralization**:
```
COLLATERAL STRUCTURE PER FARM

Farm A Collateral Pool:
┌─────────────────────────────────────────────────────────────────────┐
│                       1,100 Trees Total                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    FarmA_ShareToken                             │ │
│  │                                                                 │ │
│  │  Target APY: 12%                                                │ │
│  │  Maturity: 3 years                                              │ │
│  │  Collateral: 1,100 Trees                                        │ │
│  │  Bond Value: $880,000                                           │ │
│  │  Over-Collateralization: 110%                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Total Bond Value: $880,000                                         │
│  Over-Collateralization: 110% (1,100 trees for $880K bonds)        │
└─────────────────────────────────────────────────────────────────────┘
```

**Collateral Monitoring**:
- Real-time tree health monitoring via IoT sensors
- Automatic collateral value adjustments based on tree performance
- Collateral ratio maintenance requirements
- Liquidation triggers for underperforming collateral

### Yield Distribution by Farm

**Farm-Specific Yield Distribution**:

Each farm receives yield distributions based on its performance and risk profile:

```
YIELD DISTRIBUTION BY FARM

Farm A Coffee Production: $200,000 annually

┌─────────────────────────────────────────────────────────────────────┐
│                        FARM A YIELD DISTRIBUTION                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    FarmA_ShareToken                             │ │
│  │                                                                 │ │
│  │  Total Yield: $200,000                                          │ │
│  │  Target APY: 12%                                                │ │
│  │  Bond Value: $880,000                                           │ │
│  │  Expected Yield: $105,600 (12% of bond value)                   │ │
│  │  Actual Yield: $200,000                                         │ │
│  │  Excess Yield: $94,400 (distributed to token holders)           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Distribution: $105,600 to bond holders + $94,400 excess           │
│  Remaining: $0 (all yield distributed)                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Distribution Priority**:
1. **Bond Interest Payments**: Fixed yield based on target APY
2. **Excess Yield Distribution**: Additional yield above target APY
3. **Principal Repayment**: At maturity, collateral is liquidated for principal repayment

### Maturity and Redemption

**Farm Maturity Schedules**:
```
MATURITY TIMELINE

Year 3: Farm A - 3-year maturity
├── Monthly interest payments
├── Principal repayment at maturity
├── Collateral release upon full repayment
└── Option to roll over into new bonds

Year 4: Farm B - 4-year maturity
├── Monthly interest payments
├── Principal repayment at maturity
├── Collateral release upon full repayment
└── Option to roll over into new bonds

Year 5: Farm C - 5-year maturity
├── Monthly interest payments
├── Principal repayment at maturity
├── Collateral release upon full repayment
└── Option to roll over into new bonds
```

**Redemption Process**:
```
REDEMPTION FLOW

Maturity Date → Collateral Valuation → Principal Repayment → Token Burn

Step 1: Maturity Check
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Maturity Date   │───▶│ Farm            │───▶│ Redemption      │
│ Reached         │    │ Validation      │    │ Authorization   │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Step 2: Collateral Liquidation
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Tree Collateral │───▶│ Market Sale     │───▶│ MBT Proceeds    │
│ Valuation       │    │ or Transfer     │    │ Generation      │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Step 3: Principal Repayment
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ MBT Proceeds    │───▶│ Principal       │───▶│ Share Token     │
│ vs Principal    │    │ Repayment       │    │ Burn Process    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Risk Management

### Farm-Specific Risk Parameters

**Risk Assessment Matrix**:
```
RISK PROFILE BY FARM

┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Risk Factor │   Farm A    │   Farm B    │   Farm C    │ Description │
│             │ (Highland)  │  (Valley)   │ (Coastal)   │             │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Default Risk│     Low     │   Medium    │    High     │ Location    │
│ Yield Risk  │     Low     │   Medium    │    High     │ Climate     │
│ Liquidity   │    High     │   Medium    │     Low     │ Market      │
│ Collateral  │   150%      │    120%     │    100%     │ Coverage    │
│ Coverage    │             │             │             │             │
│ Min. Rating │     AAA     │      AA     │      A      │ Credit      │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

**Collateral Coverage Requirements**:
- **Farm A (Low Risk)**: 150% over-collateralization
- **Farm B (Medium Risk)**: 120% over-collateralization  
- **Farm C (High Risk)**: 100% collateralization

### Liquidation Mechanisms

**Automatic Liquidation Triggers**:
```
LIQUIDATION PROTOCOL

Collateral Value Monitoring → Trigger Check → Liquidation Process

Liquidation Triggers:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Farm A          │    │ Farm B          │    │ Farm C          │
│ < 130% Coverage │    │ < 105% Coverage │    │ < 95% Coverage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Liquidation Process:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Collateral      │───▶│ Market Sale     │───▶│ Principal       │
│ Seizure         │    │ or Auction      │    │ Repayment       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Integration Architecture

### Multi-Tranche Token Management

**Share Token Registry**:
```
SHARE TOKEN REGISTRY

┌─────────────────────────────────────────────────────────────────────┐
│                    SHARE TOKEN REGISTRY                             │
│                                                                     │
│  Farm A: FarmA_ShareToken                                           │
│  ├── Target APY: 12%                                                │
│  ├── Maturity: 3 years                                              │
│  ├── Collateral: 1,100 trees                                        │
│  └── Bond Value: $880,000                                           │
│                                                                     │
│  Farm B: FarmB_ShareToken                                           │
│  ├── Target APY: 14%                                                │
│  ├── Maturity: 4 years                                              │
│  ├── Collateral: 1,400 trees                                        │
│  └── Bond Value: $1,120,000                                         │
│                                                                     │
│  Farm C: FarmC_ShareToken                                           │
│  ├── Target APY: 16%                                                │
│  ├── Maturity: 5 years                                              │
│  ├── Collateral: 1,000 trees                                        │
│  └── Bond Value: $800,000                                           │
│                                                                     │
│  Total: 3 ERC20 Share Tokens                                        │
└─────────────────────────────────────────────────────────────────────┘
```

**Token Management Functions**:
- Independent share price calculation per farm
- Separate yield distribution mechanisms
- Individual maturity tracking and redemption
- Farm-specific liquidity management

### Oracle Integration for Multi-Tranche

**Farm-Specific Data Requirements**:
```
ORACLE DATA ARCHITECTURE

Farm Performance Data → Farm-Specific Calculations → Share Price Updates

Data Sources:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Tree Health     │    │ Coffee Prices   │    │ Weather Data    │
│ IoT Sensors     │    │ Market Feeds    │    │ Climate Oracle  │
│ (Per Farm)      │    │ (Per Variety)   │    │ (Per Region)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                       │
                              ▼                       ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │ Farm Yield      │    │ Collateral      │
                    │ Calculations    │    │ Valuations      │
                    └─────────────────┘    └─────────────────┘
```

**Oracle Data Types by Farm**:
- **Farm A**: Conservative yield estimates, high-quality collateral
- **Farm B**: Balanced yield projections, medium-risk collateral
- **Farm C**: Optimistic yield estimates, higher-risk collateral

## User Experience Features

### Multi-Tranche Investment Dashboard

**Farm Selection Interface**:
```
INVESTMENT DASHBOARD FEATURES

Farm Comparison:
├── Risk-return profiles for each farm
├── Maturity timeline visualization
├── Yield projection calculators
├── Collateral coverage indicators
└── Historical performance tracking

Portfolio Management:
├── Multi-farm portfolio view
├── Risk diversification analysis
├── Yield optimization suggestions
├── Maturity ladder management
└── Rebalancing recommendations

Investment Tools:
├── Farm selection wizard
├── Risk tolerance assessment
├── Investment amount calculator
├── Yield projection tools
└── Maturity planning features
```

**Mobile Optimization**:
- Farm comparison on mobile devices
- Quick investment in preferred farms
- Portfolio performance tracking
- Yield claim notifications
- Maturity date reminders

### Advanced Features

**Farm Trading Platform**:
```
SECONDARY MARKET TRADING

Farm Liquidity Pools:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Farm A          │    │ Farm B          │    │ Farm C          │
│ High Liquidity  │    │ Medium Liquidity│    │ Lower Liquidity │
│ Low Spread      │    │ Moderate Spread │    │ Higher Spread   │
└─────────────────┘    └─────────────────┘    └─────────────────┘

Trading Features:
├── Farm-specific order books
├── Automated market making
├── Liquidity provision rewards
├── Price discovery mechanisms
└── Cross-farm arbitrage
```

**Farm Rollover System**:
```
MATURITY ROLLOVER PROCESS

Maturity Approaching → Rollover Options → New Farm Selection

Rollover Options:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Same Farm       │    │ Different Farm  │    │ Different       │
│ New Bond        │    │ Same Risk Level │    │ Risk Level      │
│ (e.g., A→A)     │    │ (e.g., A→B)     │    │ (e.g., A→C)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Future Enhancements

### Planned Features

**Synthetic Farms**:
- Cross-farm combinations
- Geographic diversification farms
- Quality-tier farms (Specialty, Premium, Commercial)
- Seasonal farms (Harvest-timed investments)

**Advanced Analytics**:
- Farm performance benchmarking
- Risk-adjusted return calculations
- Portfolio optimization algorithms
- Yield prediction models per farm

**Cross-Chain Expansion**:
- Multi-chain farm issuance
- Cross-chain liquidity pools
- Bridge mechanisms for farm tokens
- Chain-specific yield optimization

## Conclusion

The Mocha Coffee Multi-Tranche ERC4626 vault system creates a structured finance platform that transforms individual farm funding into asset-backed bonds with farm-specific share tokens. By issuing separate share tokens for each farm, the system provides investors with clear investment opportunities while enabling farms to raise capital efficiently through collateralized debt instruments.

The farm-as-tranche approach provides superior risk segmentation, investor choice, and farm-specific funding solutions. Each farm's trees serve as direct collateral for their bond issuance, creating a transparent and secure investment structure that bridges traditional agricultural finance with modern DeFi infrastructure.

This architecture enables scalable growth as new farms can issue their own bonds without affecting existing investors, while providing the flexibility to customize funding terms based on individual farm characteristics and market conditions.
