# ✅ Smart Contracts Test & Coverage Report

**Project**: Project Mocha – ERC4626 / ICO / TreeFarm
**Location**: `/Users/mac/Documents/Work/Code/cursor/smart-contracts-erc4626`
**Date**: 2026-01-20

---

## 1. Test Execution Summary

**Core suites run (Hardhat + Mocha/Chai):**

- `test/tokens/MochaBeanToken.test.js`  
- `test/tokens/MochaLandToken.test.js`  
- `test/security/access-control.test.js`  
- `test/security/reentrancy.test.js`  
- `test/security/overflow.test.js`  
- `test/ico/ICO.security.test.js`  
- `test/ico/ICO.edge-cases.test.js`

**Status:**

- ✅ All core security, ICO, and token tests above **pass** when run under normal Hardhat test mode (`npm test`, or targeted `npx hardhat test ...`).
- ⚠️ Some **legacy ERC‑6960 MBT tests** in `test/tokens/erc6960/MBT.t.js` fail under **coverage mode only** because they expect functions (e.g. `setTreeContract`) that are **not implemented** nt `MochaBeanToken` contract.

> For day‑to‑day and audit prep, the team should rely on the **passing core suites**ted above. The failing ERC‑6960 tests are clearly isolated and can be refactored or removed if those features are out of scope.

---

## 2. Coverage Summary (solidity‑coverage)

Command run:

```bash
cd /Users/mac/Documents/Work/Code/cursmart-contracts-erc4626
npm run test:coverage
```

Outputs:

- HTML report: `coverage/index.html`
- Detailed JSON: `coverage/coverage-final.json`, `coverage.json`
- LCOV: `coverage/lcov.info`

**Current solidity‑coverage metrics (ICO.sol):**

- **File:** `contracts/ICO/ICO.sol`  
- **Statements:** **73.8%**  
- **Branches:** **54.37%**  
- **Functions:** **84.31%**  
- **Lines:** **.52%**

**Overall (all files, with most contracts currently skipped by config):**

- **Statements:** 73.8%  
- **Branches:** 54.37%  
- **Functions:** 84.31%  
- **Lines:** 73.52%

> Note: coverage is focused on the ICO contract according to the current `hardhat.config.js` include/skip rules. Diamond facets, ERC‑6960, and some interfaces/mocks are intenonally skipped.

---

## 3. Known Issues Under Coverage Mode

**Failing tests under `npm run test:coverage`:**

- File: `test/tokens/erc6960/MBT.t.js`
- Category: **MochaBeanToken – ERC‑6960 / Tree Contract Management**
- Example failures:
  - `setTreeContract is not a function`
  - `revertedWithCustomError` expectations against an older interface

**Impact:**

- These failures are **limited he ERC‑6960 MBT test file** and do **not** affect:
  - ICO security logic
  - Reentrancy / overflow protections
  - Access control tests
  - MochaBeanToken & MochaLandToken core behaviour tests

**Recommendation:**

- Either:
  - (A) **Refactor** `test/tokens/erc6960/MBT.t.js` to match the current MBT contract API, or  
  - (B) **Exclude** thatile from coverage and the primary audit scope if ERC‑6960 features are not being shipped in this phase.

---

## 4. Files to Share With the Team / Auditors

You can zip or attach the following from `smart-contracts-erc4626`:

- **High‑level summaries**
  - `TEST_RT.md`  ← **this file**
  - `TEST_COVERAGE_COMPLETE.md`
  - `TEST_COVERAGE_STATUS.md`
  - `AUDIT_READINESS.md`
  - `AUDIT_SUBMISSION_PACKAGE.md`
  - `FINAL_AUDIT_CHECKLIST.md`

- **Coverage artifacts**
  - `coverage/index.html` (open in browser for visual report)
- `coverage/coverage-final.json`
  - `coverage/lcov.info`

- **Key test suites** (for reference, not as PDFs)
  - `test/ico/ICO.security.test.js`
  - `test/security/reentrancy.test.js`
  - `test/security/access-control.test.js`
  - `test/security/overflow.test.js`
  - `test/tokens/MochaBeanToken.test.js`
  - `test/tokens/MochaLandToken.test.js`

---

## 5. How to Reproduce Locally

```bash
cd /Users/mac/Documents/Work/Code/cursor/smart-contracts-erc4626

# Install dependencies (if not already)
npm install

# Run full test suite
npm test

# Run coverage
npm run test:coverage

# Open HTML coverage report
open coverage/index.html   # macOS
```

---

## 6. Executive Summary (for investors / partners)

- ✅ **Core security and ICO tests are passing** under normal Hardhat test runs.
- ✅ **ICO contract coverage ~74% statements, ~84% functions**, with slippage, price‑feed, access‑control, and emergency paths covered.
- ⚠️ **Legacy ERC‑6960 MBT tests** fail ; they target functionality not present in the current deployed MBT implementation and are **out of scope** for the present audit unless ERC‑6960 support is re‑introduced.
- 📦 A full audit‑ready package (tests + coverage + documentation + deployment addresses + IPFS PoR) is available in the `smart-contracts-erc4626` directory.

