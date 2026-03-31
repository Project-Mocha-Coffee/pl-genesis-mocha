# Starknet Mainnet — Deployed Addresses

Deployed: 2026-03-06  
Owner / Admin: `0x069a1e085682601c67c0aaad1b2396dbd9729f10d71651832de2483429ea7b22`  
Network: Starknet Mainnet (SN_MAIN)  
Cairo version: 2.16.0 / Sierra 1.7.0  

## Contract Addresses

| Contract      | Address                                                              |
|---------------|----------------------------------------------------------------------|
| **MBTToken**  | `0x04a91f423a6f8795820e35784d6fbd94cca7dc4250b7721ec3c9d8ff761047ec` |
| **FarmRegistry** | `0x01f260921259669dd5660e9ea52c8745f537c3c250303478c4c4a933d4be7278` |
| **StarknetICO** | `0x257d20710741f494d7131c6ad287e5bb05c5efbb246944e71b8f92a61336653` |

## Class Hashes

| Contract      | Class Hash                                                           |
|---------------|----------------------------------------------------------------------|
| MBTToken      | `0x070b54eee2f289f70d26597f1f3f443db7aeb7d3e2a069a22929e774e8876b81` |
| FarmRegistry  | `0x011c67b529ae1954873d9f3b019b83f1207f8176dca7d0872d060ae78ef50e69` |
| StarknetICO   | `0x28881e670babbe45bfa14ac6856683184e5f9b2c7adb16e06fc328a2cec75e0` |

## Deployment Transactions

| Contract      | Declare TX                                                           | Deploy TX |
|---------------|----------------------------------------------------------------------|-----------|
| MBTToken      | `0x02b2730a6149caea814d3303f2ac927b59b8eaeb65a8ef292fee6bf049d8f656` | `0x2052fc854117109c498d8bae5ae80a1dd31826460bd02a44e3d33487b58f099` |
| FarmRegistry  | `0x023513d2edcef2e3cbbeb6fea8c84df2a87ecb5e382324988b7298cace6888c3` | `0x7869e4093923cc9aa0875301952aa979f56ca3e3682e0af5a79c8b27386e3c` |
| StarknetICO   | (reused existing class) | `0x58f0968ab41e921a42c862b81a3b7bf930053055aee22f3094e16a26f41de8a` |

## Verify on Starkscan

- MBTToken: https://starkscan.co/contract/0x04a91f423a6f8795820e35784d6fbd94cca7dc4250b7721ec3c9d8ff761047ec
- FarmRegistry: https://starkscan.co/contract/0x01f260921259669dd5660e9ea52c8745f537c3c250303478c4c4a933d4be7278
- StarknetICO: https://starkscan.co/contract/0x257d20710741f494d7131c6ad287e5bb05c5efbb246944e71b8f92a61336653

## Contract Summary

### MBTToken
- **Name**: Mocha Bean Token
- **Symbol**: MBT
- **Standard**: ERC20 (OpenZeppelin Cairo)
- **Owner / initial minter**: `0x069a1e...7b22`
- **Functions**: `mint`, `set_minter`, `owner`, `is_minter` + full ERC20 (transfer, approve, balanceOf, etc.)

### FarmRegistry
- **Owner**: `0x069a1e...7b22`
- **Functions**: `register_farm`, `set_farm_active`, `record_investment`, `get_farm_*`, `get_user_position`, `total_investors`

### StarknetICO
- **Owner / treasury**: `0x069a1e...7b22`
- **Minter on MBT**: yes (set-minter TX applied)
- **Functions**: `buy_with_eth(beneficiary, amount_eth, min_mbt)`, `get_eth_price_usd`, `get_mbt_for_eth`, `set_eth_price_usd`, `set_paused`, `set_treasury`

## Farm v1 — Seeded (Live)

| Parameter | Value |
|---|---|
| Farm ID | 1 |
| Total trees | 500 (remaining from 2,500-tree pilot after Scroll's 2,000) |
| APY | 12% |
| Maturity | 5 years |
| Seed TX | `0x450dc7305acb383619ad9f27e1b5132e2f882e21c951201e8e8278ec779b37b` |

## MBT Supply — Minted (Live)

| Item | Amount | Value |
|---|---|---|
| Total minted | 1,000 MBT | $25,000 @ $25/MBT |
| Tree shares (1:1) | 500 MBT | for 500 Starknet trees |
| Protocol reserve | 500 MBT | yield distribution + future farms |
| Mint TX | `0x1f82a4469ba2fde9150fdc2dd60bc41223a268c794361a478babc132071fc03` | |

## Cross-Chain MBT Summary

| Chain | Trees Tokenized | MBT Minted | Status |
|---|---|---|---|
| Scroll Mainnet | 2,000 | 2,000 MBT | Live |
| Base Mainnet | TBC | TBC | Live |
| **Starknet Mainnet** | **500** | **1,000 MBT** | **Live (Beta)** |
| **Pilot Farm Total** | **2,500** | | |

## Starknet ICO (automatic MBT disbursement)

An **StarknetICO** contract is implemented in `src/starknet_ico.cairo`. Once deployed and set as minter on MBT:

- Users **approve** ETH to the ICO, then call **buy_with_eth(beneficiary, amount_eth, min_mbt)**.
- The ICO pulls ETH to the treasury and **mints MBT to the user in the same transaction** — no manual mint step.

| Item | Value |
|------|--------|
| **StarknetICO** | `0x257d20710741f494d7131c6ad287e5bb05c5efbb246944e71b8f92a61336653` |
| Class hash | `0x28881e670babbe45bfa14ac6856683184e5f9b2c7adb16e06fc328a2cec75e0` |
| Deploy TX | `0x58f0968ab41e921a42c862b81a3b7bf930053055aee22f3094e16a26f41de8a` |
| Set-minter TX | `0x6413d9d8eafcf6346b983d03b93af24c09be1170aed9237bad13f43eb919dd2` |
| Deploy / set minter | See **STARKNET_ICO_DEPLOY.md** |
| Starkscan | https://starkscan.co/contract/0x257d20710741f494d7131c6ad287e5bb05c5efbb246944e71b8f92a61336653 |
| Portal | Set `NEXT_PUBLIC_STARKNET_ICO_ADDRESS=0x257d20710741f494d7131c6ad287e5bb05c5efbb246944e71b8f92a61336653` to enable automatic mint-on-purchase in the UI |

## Next Steps

1. **Portal**: set `NEXT_PUBLIC_STARKNET_ICO_ADDRESS=0x257d20710741f494d7131c6ad287e5bb05c5efbb246944e71b8f92a61336653` in the portal (e.g. Vercel env or `.env.local`) and redeploy so “Swap to MBT” on Starknet uses the ICO and mints automatically.
2. **Investors**: distribute MBT from owner reserve as Starknet beta investors onboard (or use ICO for automatic disbursement).
3. **Scale**: mint additional MBT and register new farms as the program expands beyond the pilot.
