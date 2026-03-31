# TreeFarm Smart Contract System Testing

This document provides instructions for testing the TreeFarm smart contract system, which has been split into multiple contracts for improved maintainability and deployment efficiency.

## Test Coverage

The test suite includes:

1. **Unit Tests** - Test each component in isolation:

   - Farm Management tests
   - Tree Management tests
   - Yield Management tests

2. **Proxy Tests** - Test the proxy layer specifically:

   - Implementation contract upgradeability
   - Function delegation
   - State persistence across upgrades

3. **Integration Tests** - Test the system as a whole:
   - Complete farm lifecycle
   - Multi-farm operations
   - Error handling

## Prerequisites

- Node.js v14+ and npm
- Hardhat

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Compile contracts:
   ```
   npx hardhat compile
   ```

## Running Tests

### Run all tests:

```
npx hardhat test
```

### Run specific test files:

```
npx hardhat test test/my-test-file.js
```

### Run with gas reporting:

```
REPORT_GAS=true npx hardhat test
```

### Run with coverage:

```
npx hardhat coverage
```

## Test Structure

The tests follow this structure:

1. **Setup** - Deploy mock contracts and implementation contracts, and set up the proxy.
2. **Unit Tests** - Test each component in isolation.
3. **Proxy Tests** - Test the proxy upgrade and delegation functionality.
4. **Integration Tests** - Test the complete system with realistic scenarios.

## Mock Contracts

The test suite uses several mock contracts to simulate external dependencies:

- `MockToken` - Simulates the MTT, MLT, and MBT tokens
- `MockYieldManager` - Simulates the yield manager contract
- `MockStakingContract` - Simulates the staking contract

## Notes on Test Environment

- Tests use the Hardhat network with `allowUnlimitedContractSize` set to true.
- Gas reporting is available when the `REPORT_GAS` environment variable is set.
- Test timeouts are set to 2 minutes to accommodate complex test scenarios.

## Troubleshooting

- If tests fail with "Transaction ran out of gas", increase the gas limit in the Hardhat config.
- If tests fail with "Contract code size exceeds 24576 bytes", ensure `allowUnlimitedContractSize` is set to true in the Hardhat config.
- If tests timeout, increase the timeout value in the Mocha configuration.
