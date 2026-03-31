# Test Suite Documentation

## Test Structure

```
test/
├── ico/
│   ├── ICOTest.js                    # Comprehensive ICO tests
│   ├── ICO.security.test.js          # Security-focused tests
│   ├── ICO.edge-cases.test.js        # Edge cases and boundaries
│   └── ICOTestScrollSepolia.js       # Scroll Sepolia integration tests
├── tokens/
│   ├── MochaBeanToken.test.js        # MBT (ERC20) tests
│   ├── MochaLandToken.test.js        # MLT (ERC721) tests
│   ├── MochaTreeRightsToken.test.js  # MTTR comprehensive tests
│   ├── MochaTreeRightsToken.purchaseFlow.test.js
│   └── erc6960/                      # DLT implementation tests
├── security/
│   ├── reentrancy.test.js            # Reentrancy protection
│   ├── access-control.test.js        # Access control verification
│   └── overflow.test.js              # Integer overflow protection
├── diamond/
│   ├── DiamondCut.test.js            # Diamond cut operations
│   └── FarmManagementFacet.test.js   # Farm management tests
└── farmManagement/
    └── TreeFarmSystem.js             # Farm system integration tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
npm run test:ico          # ICO contract tests
npm run test:security     # Security tests
npm run test:tokens      # Token contract tests
npm run test:diamond     # Diamond pattern tests
```

### Coverage
```bash
npm run test:coverage           # Generate coverage report
npm run test:coverage:html      # Open HTML coverage report
npm run test:coverage:check     # Check if thresholds are met
```

## Test Coverage Goals

- **ICO Contract**: 90%+
- **Diamond Pattern**: 85%+
- **Token Contracts**: 90%+
- **Security Tests**: 100%
- **Overall**: 80%+

## Test Categories

### Unit Tests
- Individual function testing
- Edge cases
- Error conditions
- Boundary values

### Integration Tests
- Contract interactions
- Multi-step workflows
- State transitions

### Security Tests
- Reentrancy attacks
- Access control bypass
- Integer overflow/underflow
- Front-running protection

## Coverage Reports

After running `npm run test:coverage`, check:
- `coverage/index.html` - Interactive HTML report
- `coverage/coverage.json` - JSON data
- `coverage/lcov.info` - LCOV format

## Best Practices

1. Use `loadFixture` for consistent test setup
2. Test both success and failure paths
3. Verify events are emitted correctly
4. Test access control on all admin functions
5. Include edge cases and boundary conditions
