# 🔄 Tokenomics Refactoring Requirements: From Staking to Vault Model

**Project**: Mocha Coffee Tokenization Platform   
**Document Type**: Technical Refactoring Specification 
**Date**: June 2025 
**Transition**: ERC-20 Staking Model → ERC-4626 Vault Model 🔄  

---

## 📋 Executive Summary

The new tokenomics model represents a **fundamental architectural shift** 🏗️ from a complex staking-based system to a simplified vault-based yield distribution model. This transition requires significant refactoring of core components, elimination of the staking system, and implementation of ERC-4626 vault mechanics for yield-bearing Mocha Bean Tokens (MBT).

**Refactoring Scope**: Major architectural changes affecting ~60% of the codebase   
**Estimated Effort**: 6-8 weeks of development   
**Risk Level**: High (fundamental model change)   

---

## 🔄 Current vs New Model Comparison

| Aspect | Current Implementation | New Requirements |
|--------|----------------------|------------------|
| **Token Standards** 🏷️ | MLT (ERC-6551), MTT (ERC-6960), MBT (ERC-20) | MLT (ERC-6551), MTT (ERC-6960), MBT (ERC-4626) |
| **Ownership Model** 👥 | Staking MBT to get MTT shares | Direct MTT ownership generates MBT yield |
| **Yield Distribution** 💰 | Complex staking rewards + yield | Direct vault-based yield distribution |
| **Token Relationships** 🔗 | MBT → Stake → MTT Shares → Yield | MTT → Direct MBT Yield Generation |
| **Storage Model** 🗄️ | Distributed across staker wallets | Centralized in ERC-4626 vaults per farm/tree class |
| **Liquidity Mechanism** 💧 | Time-locked staking periods | Immediate vault deposit/withdrawal |
| **Complexity Level** 🧩 | High (multi-facet staking system) | Medium (vault-based distribution) |

---

## 📊 Refactoring Impact Matrix

| Component | Change Type | Impact Level | Refactoring Required |
|-----------|-------------|--------------|---------------------|
| **TOKEN CONTRACTS**  | | | |
| MBT Token Contract | 🔄 Complete Rewrite | Critical 🔴 | ERC-20 → ERC-4626 vault implementation |
| MTT Token Contract | 🔧 Moderate Changes | Medium 🟡 | Remove staking integration, add yield linking |
| MLT Token Contract | ⚪ Minor Changes | Low 🟢 | Update to hold MTTs directly via ERC-6551 |
| **DIAMOND FACETS**  | | | |
| StakingFacet | ❌ Complete Removal | Critical 🔴 | Entire facet becomes obsolete |
| StakingRewardsFacet | ❌ Complete Removal | Critical 🔴 | Time-based rewards no longer needed |
| StakingYieldFacet | ❌ Complete Removal | Critical 🔴 | Replace with direct yield allocation |
| YieldManagementFacet | 🔄 Major Refactor | Critical 🔴 | Integrate with ERC-4626 vault mechanics |
| TreeManagementFacet | 🔧 Moderate Changes | Medium 🟡 | Update to trigger direct MBT generation |
| FarmManagementFacet | ⚪ Minor Changes | Low 🟢 | Update metadata for vault association |
| **STORAGE & LIBRARIES** 🗃️ | | | |
| AppStorage | 🔄 Major Refactor | Critical 🔴 | Remove staking storage, add vault mappings |
| LibAppStorage | 🔄 Major Refactor | Critical 🔴 | New storage layout for vault model |
| TreeTypes | 🔧 Moderate Changes | Medium 🟡 | Remove staking structs, add vault structures |
| **BUSINESS LOGIC** ⚙️ | | | |
| Yield Recording | 🔄 Major Refactor | Critical 🔴 | Direct MBT vault minting instead of distribution |
| Ownership Tracking | 🔄 Major Refactor | Critical 🔴 | MTT-based ownership replaces stake tracking |
| Reward Systems | ❌ Complete Removal | Critical 🔴 | No more time-based or staking rewards |

**Legend**: 📚
- 🔄 Complete Rewrite/Major Refactor
- 🔧 Moderate Changes  
- ⚪ Minor Changes
- ❌ Complete Removal

---

## 🔧 Detailed Refactoring Requirements

### 1. 🪙 TOKEN CONTRACT REFACTORING

#### **☕ MBT Token: ERC-20 → ERC-4626 Transformation**

**Current State**: Simple ERC-20 token used for staking and yield distribution 
**Required Changes**: Complete rewrite to ERC-4626 vault standard 

**Key Refactoring Areas**: 🎯
- **Vault Architecture** 🏛️: Transform from simple token to yield-bearing vault
- **Asset Management** 💼: Implement underlying asset tracking (USDT/stablecoin equivalent)
- **Share Calculation** 📊: Add deposit/withdraw/share conversion mechanics
- **Yield Accrual** 📈: Implement automatic yield distribution through vault appreciation
- **Multi-Vault Support** 🏭: Support multiple vaults per farm/cooperative/tree class
- **Revenue Integration** 💸: Connect coffee sale revenues to vault asset increases

**New Functionality Required**: ⚡
- `deposit()` function for revenue from coffee sales entering vault 
- `withdraw()` function for investors/farmers redeeming yield 
- `totalAssets()` tracking cumulative coffee sale value 
- `convertToShares()` calculating MBT allocation per investment unit 
- `previewWithdraw()` for yield estimation without execution 
- Custom `harvest()` function for triggered distribution after delivery 

#### **🌳 MTT Token: Staking Integration Removal**

**Current State**: Integrated with staking system for share-based ownership   
**Required Changes**: Remove staking dependency, add direct yield generation 

**Key Refactoring Areas**: 🎯
- **Ownership Model** 👤: Simplify to direct NFT ownership without shares
- **Yield Linking** 🔗: Create direct connection between MTT ownership and MBT generation
- **Transfer Logic** 🔀: Remove staking restrictions, enable free transfer
- **Metadata Enhancement** 📝: Add vault association metadata
- **Integration Points** 🔌: Update integration with yield management system

#### **🌍 MLT Token: ERC-6551 Enhancement**

**Current State**: Creates token bound accounts, integrates with farm management   
**Required Changes**: Enhance to directly hold MTTs via ERC-6551 functionality 

**Key Refactoring Areas**: 🎯
- **Asset Management** 💼: Implement direct MTT holding in token bound account
- **Vault Association** 🔗: Link MLT to corresponding MBT vaults
- **Metadata Updates** 📝: Include vault identifiers and yield tracking
- **Integration Flow** ⚡: Update farm registration to include vault creation

### 2. 💎 DIAMOND PATTERN REFACTORING

#### **❌ Staking System Elimination**

**Components to Remove**: 🗑️
- **StakingFacet**: Complete removal of staking logic (767 lines) 📄
- **StakingRewardsFacet**: Elimination of time-based reward calculations (270 lines) 📄
- **StakingYieldFacet**: Removal of stake-based yield distribution (405 lines) 📄

**Impact on System**: 
- Reduction of 3 major facets (~1,442 lines of code) 
- Elimination of complex multi-period staking logic 
- Removal of time-locked investment mechanisms 
- Simplification of user interaction flows 

#### **⚙️ YieldManagementFacet: Major Refactoring**

**Current Functionality**: Handles speculative/actual yield with stake-based distribution   
**Required Changes**: Integrate with ERC-4626 vault mechanics 

**Key Refactoring Areas**: 🎯
- **Vault Integration** 🏛️: Replace staking distribution with vault deposit logic
- **Revenue Processing** 💸: Implement coffee sale revenue → vault asset flow
- **Yield Calculation** 📊: Direct MTT ownership → MBT vault share calculation
- **Distribution Logic** 🔄: Simplify from complex stakeholder splits to direct vault attribution
- **Oracle Integration** 🌐: Connect yield verification to vault minting events

**New Flow Requirements**: 🔀
1. Coffee yield verification triggers vault asset increase 
2. MTT owners automatically receive proportional MBT vault shares 
3. Revenue from coffee sales increases vault total assets 
4. Yield distribution becomes passive through vault appreciation 

#### **🏗️ Tree and Farm Management Updates**

**TreeManagementFacet Changes**: 
- Remove staking enablement logic 
- Add direct yield → vault linking 
- Update metadata to include vault associations 
- Simplify tree lifecycle management 

**FarmManagementFacet Changes**: 
- Add vault creation during farm registration 
- Update farm metadata to include vault identifiers 
- Modify operator permissions for vault management 
- Integrate with ERC-4626 vault deployment 

### 3. 🗃️ STORAGE ARCHITECTURE REFACTORING

#### **📊 AppStorage: Complete Restructuring**

**Current Storage Elements to Remove**: ❌
- All staking-related mappings and structures 
- Multi-period stake tracking data 
- Time-based reward calculations storage 
- Staking rate configurations 
- User stake summaries and tracking 

**New Storage Elements Required**: ➕
- Vault identifier mappings per farm/tree class 
- MTT → Vault association storage 
- Revenue tracking for vault asset updates 
- Yield calculation temporary storage 
- Vault creation and management metadata 

#### **🏗️ Data Structure Elimination and Addition**

**Structures to Remove**: ❌
- `SingleStake` structure 📋
- `TreeStakes` structure 📋  
- `UserStakeSummary` structure 📋
- `StakingPeriod` enumerations 📋
- All staking-related constants 📋

**New Structures Required**: ➕
- `VaultMetadata` for vault information 
- `YieldAllocation` for MTT → MBT mapping 
- `RevenueRecord` for coffee sale tracking 
- `VaultAssociation` for tree-vault linking 

### 4. ⚙️ BUSINESS LOGIC TRANSFORMATION

#### **🎯 Ownership Model Simplification**

**Current Model**: Complex staking with fractional shares (1000 shares per tree) 
**New Model**: Direct MTT ownership with automatic MBT yield generation 

**Changes Required**: 🛠️
- Eliminate share-based fractional ownership 
- Implement direct NFT ownership model 
- Remove time-locked investment periods 
- Simplify transfer and trading mechanics 

#### **🔄 Yield Distribution Revolution**

**Current Flow**: Yield → Staking Calculation → Distribution to Stakers 
**New Flow**: Yield → Vault Asset Increase → Automatic MBT Appreciation 

**Key Changes**: 🛠️
- Remove complex stakeholder percentage calculations 
- Eliminate manual yield distribution events 
- Implement automatic vault-based yield accrual 
- Simplify from active to passive yield distribution 

#### **💰 Revenue Integration**

**New Requirements**: 📋
- Coffee sale revenue integration with vault assets 
- Stablecoin (USDT) as underlying vault asset 
- Automatic conversion of coffee sales to vault deposits 
- Real-time yield reflection through vault share appreciation 

### 5. 🔌 INTEGRATION POINT MODIFICATIONS

#### **🌐 External Contract Integration**

**Current Integration**: Complex token transfers for staking operations   
**Required Changes**: Simplified vault deposit/withdrawal operations 

**Key Modifications**: 🛠️
- Replace staking token transfers with vault operations 
- Implement revenue stream integration from coffee sales 
- Add stablecoin handling for vault underlying assets 
- Integrate with potential DeFi protocols for vault optimization 

#### **🌐 Oracle and Data Feed Integration**

**Current State**: Yield verification for distribution calculation 
**Required Enhancement**: Yield verification for direct vault asset updates 

**Integration Changes**: 🛠️
- Connect yield verification directly to vault minting 
- Implement coffee sale revenue data feeds 
- Add NDVI and delivery verification for automatic vault updates 
- Integrate ESG and sustainability yield bonuses 

### 6. 👥 USER EXPERIENCE TRANSFORMATION

#### **🎯 Simplified User Journey**

**Current Journey**: Buy MBT → Stake → Get MTT Shares → Wait for Locked Period → Claim Rewards   
**New Journey**: Buy MTT → Automatically Receive MBT Yield → Withdraw When Desired 

**Experience Improvements**: ✨
- Elimination of complex staking periods and calculations 
- Immediate liquidity through vault deposit/withdrawal 
- Simplified ownership model (direct NFT ownership) 
- Automatic yield accrual without manual claiming 

#### **🎯 Reduced Complexity**

**Eliminated Complexities**: ❌
- Multi-period staking options (1, 3, 5 years) 
- Time-based reward calculations 
- Staking rate configurations 
- Manual yield claiming processes 
- Complex unstaking procedures 

### 7. 🚀 DEPLOYMENT AND MIGRATION STRATEGY

#### **🔄 Migration Requirements**

**Current System**: Live staking system with locked funds 
**Migration Challenge**: Transition existing stakers to new model without loss 

**Migration Flow Required**: 📋
1. **Analysis Phase**: Calculate existing staker positions and accrued rewards(N/A, in testing phase)
2. **Conversion Mechanism**: Convert existing stakes to equivalent MTT + MBT positions 
3. **Vault Initialization**: Create new ERC-4626 vaults with appropriate initial assets 
4. **Position Migration**: Transfer user positions from staking to direct ownership 
5. **System Cutover**: Switch from old to new system with minimal downtime 

#### **🔄 Backward Compatibility**

**Compatibility Requirements**: 📋
- Maintain existing MLT and MTT NFT holdings ✅
- Honor existing yield commitments from old system ✅
- Provide clear migration path for all stakeholders 🛤️
- Ensure no loss of value during transition 💰

### 8. 🧪 TESTING AND VALIDATION REQUIREMENTS

#### **🔬 Comprehensive Testing Needs**

**New Testing Areas**: 📋
- ERC-4626 vault functionality and compliance 
- Direct yield generation and distribution 
- Vault asset management and security 
- Revenue integration and stablecoin handling 
- Migration process validation 

**Critical Test Scenarios**: ⚠️
- Large-scale vault operations 
- Revenue stream integration 
- Yield calculation accuracy 
- Vault share price manipulation resistance 
- Emergency withdrawal scenarios 

---

## 📅 Implementation Timeline and Phases

### **🏗️ Phase 1: Foundation (Week 1)**
- Design new ERC-4626 MBT vault implementation 📐
- Remove staking facets from Diamond ❌
- Refactor storage structures in AppStorage 🗃️

### **⚙️ Phase 2: Core Implementation (Weeks 2-3)**
- Implement new MBT vault contract 🏛️
- Refactor YieldManagementFacet for vault integration 🔄
- Update MTT contract for direct yield generation 🌳

### **🔌 Phase 3: Integration (Weeks 3-6)**
- Integrate revenue streams with vault assets 💰
- Implement oracle connections for automated updates 🌐
- Connect MLT token bound accounts with vault management 🔗

### **🚀 Phase 4: Migration and Testing (Weeks 7-8)**
- Develop migration tools for existing stakers 🛠️
- Comprehensive testing of new system 🧪
- Deployment and cutover planning 📋

---

## ⚠️ Risk Assessment and Mitigation

### **🔴 High-Risk Areas**

1. **Migration Complexity**: Converting existing staking positions to new model 🔄
2. **Vault Security**: ERC-4626 implementation vulnerabilities 🛡️
3. **Revenue Integration**: Real-world coffee sale data integration 💰
4. **User Adoption**: Acceptance of simplified but different model 👥

### **🛡️ Mitigation Strategies**

1. **Phased Migration**: Gradual transition with parallel system operation 📊
2. **Security Audits**: Comprehensive audit of new vault implementation 🔍
3. **Oracle Redundancy**: Multiple data sources for revenue and yield verification 🌐
4. **User Education**: Clear communication about benefits of new model 📚

---

## 🎯 Conclusion

The transition from the current staking-based model to the new ERC-4626 vault-based tokenomics represents a **fundamental architectural shift** 🏗️ that will significantly simplify the system while providing better liquidity and user experience. While the refactoring effort is substantial, the resulting system will be more aligned with DeFi standards, easier to integrate with external protocols, and provide clearer value accrual for token holders.

**Key Benefits of Refactoring**: ✅
- ✅ Simplified user experience and ownership model 🎯
- ✅ Better DeFi composability through ERC-4626 standard 🌐
- ✅ Automatic yield accrual without manual claiming 📈
- ✅ Immediate liquidity through vault mechanics 💧
- ✅ Clearer value proposition for investors 💰

**Major Challenges**: ❌
- ❌ Significant development effort (6-8 weeks) ⏱️
- ❌ Complex migration from existing system 🔄
- ❌ Need for comprehensive testing and auditing 🧪
- ❌ User education and adoption challenges 📚

**Recommendation**: Proceed with refactoring in phases, starting with foundation work while planning comprehensive migration strategy for existing users. 🚀

---

*This document represents a comprehensive analysis of refactoring requirements to transition from the current staking-based tokenomics to the new ERC-4626 vault-based model.* 📋 