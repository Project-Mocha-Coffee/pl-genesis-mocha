module.exports = {
  skipFiles: [
    'test/',
    'mocks/',
    'contracts/test/',
    'contracts/mocks/',
    'diamondPattern/',
    'ERC6551/',
    'ERC6960/',
    'interfaces/',
    'tokens/',
    'types/',
    'contracts/test/**/*',
    'contracts/mocks/**/*.sol'
  ],
  // Only include ICO contract and its dependencies
  include: [
    'contracts/ico/ICO.sol'
  ],
  // Exclude everything else
  exclude: [
    'contracts/diamondPattern/**/*',
    'contracts/ERC6551/**/*',
    'contracts/ERC6960/**/*',
    'contracts/interfaces/**/*',
    'contracts/tokens/**/*',
    'contracts/types/**/*',
    'contracts/test/**/*'
  ],
  // Configure test files
  testFiles: ['test/ico/ICOTest.js'],
  // Set coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};