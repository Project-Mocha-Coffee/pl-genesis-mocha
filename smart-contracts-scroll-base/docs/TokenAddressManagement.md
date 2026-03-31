# Token Address Management in TreeFarm Diamond

## Overview

The TreeFarm Diamond system maintains token addresses in multiple storage locations. This document explains how to manage and update these addresses to ensure system consistency.

## Storage Locations

### 1. LibAppStorage (Diamond)
- **Location**: `contracts/diamondPattern/libraries/LibAppStorage.sol`
- **Used by**: All diamond facets (FarmManagementFacet, YieldManagementFacet, etc.)
- **Access**: Read-only for facets, updatable via InitializationFacet
- **Addresses stored**:
  - `MTTToken` - MochaTreeRightsToken address
  - `MLTToken` - MochaLandToken address  
  - `MBTToken` - MochaBeanToken address

### 2. MTTRStorage (MochaTreeRightsToken)
- **Location**: `contracts/diamondPattern/storage/MTTRStorage.sol`
- **Used by**: MochaTreeRightsToken contract
- **Access**: Updatable via `updateMochaLandToken()` function
- **Addresses stored**:
  - `mochaLandToken` - MochaLandToken address

## Update Functions

### Individual Token Updates

The `InitializationFacet` provides individual functions to update each token address:

```solidity
function updateMTTToken(address _newMttToken) external
function updateMLTToken(address _newMltToken) external  
function updateMBTToken(address _newMbtToken) external
```

### Batch Update

For efficiency, use the batch update function to update multiple tokens at once:

```solidity
function updateTokenAddresses(
    address _newMttToken,  // Pass address(0) to skip
    address _newMltToken,  // Pass address(0) to skip
    address _newMbtToken   // Pass address(0) to skip
) external
```

### Access Control

- **Owner Only**: All update functions can only be called by the diamond owner
- **Initialization Required**: System must be initialized before updates are allowed
- **Validation**: All addresses must be non-zero

## Events

Each update function emits an event for transparency:

```solidity
event MTTTokenUpdated(address oldMttToken, address newMttToken);
event MLTTokenUpdated(address oldMltToken, address newMltToken);
event MBTTokenUpdated(address oldMbtToken, address newMbtToken);
```

## Management Scripts

### 1. Diamond Token Address Update Tool

**Script**: `scripts/update-diamond-token-addresses.js`

**Usage**:
```bash
# Show current addresses
npx hardhat run scripts/update-diamond-token-addresses.js --network scrollSepolia --show-current

# Update single token
npx hardhat run scripts/update-diamond-token-addresses.js --network scrollSepolia --mlt 0x1234...

# Update multiple tokens
npx hardhat run scripts/update-diamond-token-addresses.js --network scrollSepolia --mtt 0x1234... --mlt 0x5678... --mbt 0x9abc...
```

**Features**:
- View current token addresses
- Update individual or multiple tokens
- Automatic verification of updates
- Comprehensive error handling
- Transaction confirmation

### 2. MLT Mint Test Script

**Script**: `scripts/test-updated-mlt-mint.js`

**Usage**:
```bash
# Deploy new MLT and update addresses
npx hardhat run scripts/test-updated-mlt-mint.js --network scrollSepolia --deploy-new

# Use existing MLT and ensure consistency
npx hardhat run scripts/test-updated-mlt-mint.js --network scrollSepolia --use-existing
```

**Features**:
- Automatic MLT deployment (optional)
- Synchronizes both storage systems
- Tests minting functionality
- Comprehensive validation

## Common Scenarios

### Scenario 1: Deploy New MLT Token

1. Deploy new MochaLandToken contract
2. Update MTTRStorage via MochaTreeRightsToken
3. Update LibAppStorage via InitializationFacet
4. Verify both storage systems are synchronized

### Scenario 2: Update Existing Token Addresses

1. Use the diamond update tool to view current addresses
2. Update specific tokens as needed
3. Verify updates were successful
4. Test affected functionality

### Scenario 3: Fix Storage Inconsistency

If you encounter "Only MLT token can add farms" error:

1. Check current addresses in both storage systems
2. Identify the mismatch
3. Update the diamond's LibAppStorage to match the actual token address
4. Verify the fix

## Best Practices

### 1. Always Verify Updates
After updating token addresses, always verify the changes were applied correctly:

```javascript
const initInfo = await diamond.getInitializationInfo();
console.log("MTT:", initInfo.mttToken);
console.log("MLT:", initInfo.mltToken);
console.log("MBT:", initInfo.mbtToken);
```

### 2. Use Batch Updates
When updating multiple tokens, use the batch function for gas efficiency:

```javascript
await diamond.updateTokenAddresses(
    newMttAddress,  // Update MTT
    newMltAddress,  // Update MLT
    ethers.ZeroAddress  // Skip MBT
);
```

### 3. Test After Updates
Always test the affected functionality after updating token addresses:

```bash
# Test MLT minting
npx hardhat run scripts/test-updated-mlt-mint.js --network scrollSepolia --use-existing

# Test other functionality as needed
```

### 4. Monitor Events
Listen for update events to track changes:

```javascript
diamond.on("MLTTokenUpdated", (oldAddress, newAddress) => {
    console.log(`MLT updated: ${oldAddress} -> ${newAddress}`);
});
```

## Troubleshooting

### Error: "Only contract owner"
**Cause**: Only the diamond owner can update token addresses
**Solution**: Ensure the deployer account is the diamond owner

### Error: "System not initialized"
**Cause**: Diamond must be initialized before updates
**Solution**: Initialize the diamond first using `initialize()`

### Error: "Only MLT token can add farms"
**Cause**: MLT address mismatch between storage systems
**Solution**: Update the diamond's LibAppStorage to match the actual MLT address

### Error: "Invalid token address"
**Cause**: Attempting to set a zero address
**Solution**: Provide a valid non-zero address

## Security Considerations

1. **Access Control**: Only diamond owner can update token addresses
2. **Validation**: All addresses must be non-zero
3. **Events**: All updates are logged for transparency
4. **Verification**: Always verify updates were applied correctly
5. **Testing**: Test functionality after any address updates

## Future Enhancements

Potential improvements to consider:

1. **Multi-signature Updates**: Require multiple signatures for critical updates
2. **Timelock**: Add delay before updates take effect
3. **Emergency Pause**: Ability to pause updates during emergencies
4. **Update History**: Track all address changes with timestamps
5. **Automated Validation**: Scripts to automatically detect and fix inconsistencies





