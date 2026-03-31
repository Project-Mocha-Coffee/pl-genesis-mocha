# ✅ Base Sepolia Deployment Complete!

**Deployment Date:** January 21, 2026  
**Network:** Base Sepolia Testnet (Chain ID: 84532)  
**Deployer:** `0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795`  
**Treasury Wallet (SAFE):** `0x9B628779b452eEc5aF2eb769e1954539625EAb9B` (Multi-chain address)

---

## 🎉 Deployment Summary

All contracts successfully deployed on Base Sepolia, matching the Scroll deployment!

### 💎 Core Contracts

- **TreeFarmDiamond:** `0xaf1804E92BAfC44e4BC212Dc8204C96684FD6f15`
- **ICO Contract:** `0x8732f0080B549f6ECCeceFF5744734278fD0E8a2`

### 🪙 Tokens

- **MochaBeanToken (MBT):** `0xdb56AF2092C1e162e0cb503CeC5500ba16bfb8e8`
- **MochaLandToken (MLT):** `0x26B28FB75cd0184E816e447e56Cfc3D4658d0C29`
- **MochaTreeToken (MTT):** `0xb28b4DB5C7Ce83C67596105558c348E0c2e88108`
- **MochaTreeRightsToken (MTTR):** `0xD41D556d69BbDd8a1e0d4fCE4F95674D74d127B8`

### 💎 Diamond Facets (10 Total)

1. **DiamondCutFacet:** `0x4475AA786AD802B70092e9B43B40C5ed8fCA099c`
2. **DiamondLoupeFacet:** `0x9f95044FC2ac63963a2194D89Ea2FDA15aA55A87`
3. **OwnershipFacet:** `0x17c61faaB53d33d8970e18Ee782a0A75649ad0cF`
4. **InitializationFacet:** `0x936374f657507C76d6c47438C03f52F487dFcebd`
5. **FarmManagementFacet:** `0x546FF371a297aB2Ea7c6bcf939769d11793a2C1A`
6. **TreeManagementFacet:** `0x95065696D9aAC1E0d9916F71EFb9Cd08189C8c8e`
7. **YieldManagementFacet:** `0x22FcA51eE53A4D6Ab9cE6c6831af7b309a646225`
8. **BondManagementFacet:** `0x0B7F3C22c737a101CBc87a12d6566069BB2Ff9E9`
9. **MultiTrancheVaultFacet:** `0x9Ae75B51E239e6b748e9E6D52b08c10abB810f70`
10. **FarmShareTokenFacet:** `0x865616fdeca38eBa6F037c61B24Ef8121EeC420c`

### 🔧 Utility Contracts

- **ERC6551Account Implementation:** `0x1F1c1bDEE4d05D890c8D7c86191d5727efA4765A`
- **ERC6551Registry:** `0x2E70a2C5d74c4D0864105D77264cF2f74b32BE7D`
- **MTTRBondLib:** `0x8FF07116603Cf11208F3285Ea3083d32D25baCED`
- **MTTRFarmLib:** `0x3Bd5C6a9de23512bB1810ff3168f002b5eF252Da`
- **MTTRYieldLib:** `0x65D71DfE058D716FE7e56a819559723B828F3cB6`

### 📊 Mock Contracts (Base Sepolia Testnet)

**Price Feeds:**
- **ETH/USD:** `0x3f196eB950d7A2005378eb2d68e2835f6921F804`
- **USDT/USD:** `0x8b29e8F83C4E7d759470a61fD9e19357B0320F47`
- **USDC/USD:** `0xdAcB4b6472D0ed91e471069CDc4C593A57c0E9cE`
- **BTC/USD:** `0xAb942b418617b6Ac7b1c7273eaee84a768962cf8`
- **SCR/USD:** `0xBF7EA6BfEe0cdE9EcbF75837dfC970108320eE9a`

**Mock Tokens:**
- **USDT:** `0x7a204cC583277912e9fbaF6463D5c25357Bb819B`
- **USDC:** `0x2e85F5557330F1EAc418f52897EdC18e471F8225`
- **WBTC:** `0xB9dcdbffec9e28E80912DB4B72719639f2A3a488`
- **SCR:** `0xA10d64DA771E207a8C80f802C9C7469C76Ae7882`

---

## 🔗 View on Basescan

- **Diamond Contract:** https://sepolia.basescan.org/address/0xaf1804E92BAfC44e4BC212Dc8204C96684FD6f15
- **ICO Contract:** https://sepolia.basescan.org/address/0x8732f0080B549f6ECCeceFF5744734278fD0E8a2
- **Deployer Wallet:** https://sepolia.basescan.org/address/0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795

---

## ✅ Configuration Status

- ✅ All tokens deployed
- ✅ ICO contract deployed with SAFE treasury wallet
- ✅ Diamond pattern fully deployed with all 10 facets
- ✅ All roles granted (MINTER_ROLE, BURNER_ROLE, etc.)
- ✅ Contract relationships configured
- ✅ Vault system initialized
- ✅ Same contract structure as Scroll deployment

---

## 🚀 Next Steps

1. **Test the contracts** on Base Sepolia
2. **Deploy to Base Mainnet** when ready:
   ```bash
   cd smart-contracts-erc4626-scroll-base
   npm run deploy:base
   ```
3. **Update frontend** with Base Sepolia addresses for testing
4. **Add Base Mainnet addresses** when mainnet deployment is complete

---

## 📝 Notes

- The SAFE wallet address (`0x9B628779b452eEc5aF2eb769e1954539625EAb9B`) is a multi-chain address and works identically on Base as on Scroll
- Mock price feeds and tokens are used on Base Sepolia (testnet) - these will be replaced with real Chainlink feeds on Base Mainnet
- All deployment information is saved in: `deployments/deployment-baseSepolia-chain-84532-2026-01-21T16-25-25-108Z.json`

---

**🎊 Deployment successful! Your contracts are now live on Base Sepolia and ready for testing!**
