# Mocha Coffee ICO

## Overview
- Purpose: Sale of MBT via multiple payment assets with on-chain oracle pricing.
- Supported payment methods: ETH, USDT (6d), USDC (6d), WBTC (8d), SCR (18d).
- Token price: 25 USD per token, represented as `25 * 10^18` (18 decimals) in `TOKEN_RATE_USD`.
- Oracles: Chainlink `AggregatorV3Interface` (typically 8 decimals per price feed).
- Networks: Scroll testnet/mainnet (update addresses in deployment config as needed).

## Architecture
- Contracts:
  - `ICO` (primary sale contract): accepts payments, validates oracle data, calculates tokens, mints via `IMintableToken`.
  - `MBT` token (implements `IMintableToken.mint(to, amount)`), exposed in tests as `MockMintableToken`.
- Security modules: `Ownable` (admin ops), `Pausable` (pause sales), `ReentrancyGuard` (purchase & withdraw paths).
- Pricing pipeline (per asset X):
  - `getXUsdPrice(amount)` reads latest round data, validates, scales by feed and token decimals to 18-decimal USD.
  - `calculateTokens(usd)` converts USD (18d) to token amount with `TOKEN_RATE_USD` and token decimals.
- Slippage model: caller-provided `_minTokensExpected` or default check (currently preview-based path returns 0 → no default enforcement unless added off-chain).
- Price deviation model: enforced only in view pricing functions via `_validatePriceDeviation` (recorded prices are updated by owner or internal helpers not wired into buys).
- Accounting: per-asset totals for USD value and volume; aggregate `totalTokensSold`.

## On-chain API (selected)
- Purchases (with slippage arg):
  - `buyTokensWithEth(address _beneficiary, uint256 _minTokensExpected) payable`
  - `buyTokensWithUsdt(uint256 _amount, uint256 _minTokensExpected)`
  - `buyTokensWithUsdc(uint256 _amount, uint256 _minTokensExpected)`
  - `buyTokensWithWbtc(uint256 _amount, uint256 _minTokensExpected)`
  - `buyTokensWithScr(uint256 _amount, uint256 _minTokensExpected)`
- Back-compat no-protection entrypoints: `buyTokensWith{Eth,Usdt,Usdc,Wbtc,Scr}NoProtection(...)`.
- Quoting & helpers:
  - `previewTokenPurchase(string paymentMethod, uint256 amount) returns (uint256 tokensToReceive, uint256 usdValue)`
  - `calculateTokens(uint256 usd18) returns (uint256 tokenAmount)`
  - `get{Eth,Usdt,Usdc,Btc,Scr}UsdPrice(uint256 amount) returns (uint256 usd18)`
- Admin operations (onlyOwner):
  - `updateSlippageProtection(uint256 maxSlippageBps)` (cap 20%)
  - `updatePriceDeviationProtection(uint256 maxDeviationBps)` (cap 50%)
  - `updateRecordedPrice(string asset, uint256 price)`
  - `updateMinPurchase(uint256 minEth, uint256 minUsdt, uint256 minUsdc, uint256 minWbtc, uint256 minScr)`
  - `pause() / unpause()`
  - `withdrawEth()`
  - `withdrawErc20(address token)`
  - `emergencyWithdraw(address token, uint256 amount)`

### Events
- `TokensPurchased(address purchaser, address beneficiary, string paymentMethod, uint256 paymentAmount, uint256 tokensReceived, uint256 usdValue)`
- `MinPurchaseUpdated(string asset, uint256 newMinAmount)`
- `SlippageProtectionUpdated(uint256 newMaxSlippageBps)`
- `PriceDeviationProtectionUpdated(uint256 newMaxDeviationBps)`
- `SlippageProtectionTriggered(address user, string asset, uint256 expectedTokens, uint256 actualTokens, uint256 slippageBps)`

## Integration flow (frontend/backend)
1. Discovery: read min purchase thresholds and current prices (optional) via `get{...}UsdPrice` or rely on `previewTokenPurchase`.
2. Quote: call `previewTokenPurchase(paymentMethod, amount)` to get `(tokens, usd)`.
3. Slippage guard: set `minTokens = tokens * (1 - maxSlippageBps/10000)` off-chain.
4. Approvals:
   - ETH: none; send `value` with the call.
   - ERC20: `approve(ico, amount)` on USDT/USDC/WBTC/SCR before calling buy.
5. Execute: call purchase entrypoint with `_minTokensExpected = minTokens`.
6. Observe: listen for `TokensPurchased` to confirm and index analytics.

### ethers.js examples
ETH buy:
```ts
const ico = new ethers.Contract(icoAddress, icoAbi, signer);
const ethAmount = ethers.parseEther("0.1");
const [tokens, usd] = await ico.previewTokenPurchase("ETH", ethAmount);
const min = tokens - (tokens * 500n) / 10000n; // 5% slippage
await ico.buyTokensWithEth(user.address, min, { value: ethAmount });
```

USDT buy (6 decimals):
```ts
const ico = new ethers.Contract(icoAddress, icoAbi, signer);
const usdt = new ethers.Contract(usdtAddress, erc20Abi, signer);
const amt = ethers.parseUnits("100", 6);
await usdt.approve(icoAddress, amt);
const [tokens, usd] = await ico.previewTokenPurchase("USDT", amt);
const min = tokens - (tokens * 500n) / 10000n;
await ico.buyTokensWithUsdt(amt, min);
```

## Developer notes
- Decimals & scaling:
  - Price feeds: usually 8 decimals. USD outputs are normalized to 18 decimals.
  - Token decimals: USDT/USDC=6, WBTC=8, SCR=18. See helpers for scaling formula per asset.
- Slippage:
  - Default preview-based slippage enforcement is effectively disabled (internal preview returns 0). Provide `_minTokensExpected` for protection.
- Price deviation:
  - Enforced in view price getters only. Purchase flows do not revert on deviation—use slippage instead. Admin can seed/refresh recorded prices.
- Minimums (defaults):
  - ETH: `0.001 ether`; USDT/USDC: `1 * 10^6`; WBTC: `0.0001 * 10^8`; SCR: `1 * 10^18`.

## Security considerations (for researchers & auditors)
- Access control: centralized `Ownable` owner for pausing and parameters; consider multisig.
- Reentrancy: guarded on purchase and withdrawal paths.
- Oracle safety:
  - `_validateOracleData` checks positive price, non-stale timestamp (≤ 1h), and complete round.
  - Price deviation check is view-only; buyers must rely on explicit slippage.
- Pausing: `pause/unpause` stops buys, not withdrawals.
- Withdrawals: owner-only ETH/ERC20 withdrawals; `emergencyWithdraw(token, amount)` for partial drains with balance checks.
- Denial of service: careful with extreme min purchase settings and pausing semantics.

## Operations runbook (owner)
- Update minimum purchases:
```solidity
updateMinPurchase(minEth, minUsdt, minUsdc, minWbtc, minScr);
```
- Tune slippage/deviation thresholds:
```solidity
updateSlippageProtection(maxSlippageBps);
updatePriceDeviationProtection(maxDeviationBps);
```
- Record reference prices (for deviation validation in views):
```solidity
updateRecordedPrice("ETH", price);
```
- Pause/unpause sales:
```solidity
pause();
unpause();
```
- Withdraw proceeds:
```solidity
withdrawEth();
withdrawErc20(token);
emergencyWithdraw(token, amount);
```

## Deployment & configuration
- See `scripts/deploy-ico.js` and `scripts/configure-ico.js`.
- Provide network-specific feed addresses and token addresses.
- Post-deploy: set min purchases and optional recorded prices; verify events and basic buys.

## Testing & coverage
- Comprehensive suite in `test/ico/ICOTest.js` including:
  - Decimal handling across assets and feeds
  - Slippage behavior and custom thresholds
  - Oracle validation (stale/invalid/incomplete round)
  - Withdrawals, pausing, statistics queries
- Coverage focused on `contracts/ico/ICO.sol` (see `.solcover.js`).

## FAQ
- Why no price deviation revert in buys?
  - To avoid false positives mid-purchase; callers use `_minTokensExpected` for deterministic slippage control.
- How to protect users from sudden price swings?
  - Always compute quotes via `previewTokenPurchase` and pass a conservative `_minTokensExpected`.
- Do I need approvals?
  - Yes for ERC20 methods; not for ETH.
- How are tokens calculated?
  - USD(18d) from feed scaling → `calculateTokens(usd)` → token decimals using `TOKEN_RATE_USD=25e18`.

## Glossary
- USD(18d): USD values scaled to 18 decimals for internal math.
- BPS: basis points, `BPS_BASE=10000`.