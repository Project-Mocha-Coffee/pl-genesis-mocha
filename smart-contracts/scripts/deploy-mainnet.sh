#!/usr/bin/env bash
# deploy-mainnet.sh  —  Deploy MBTToken + FarmRegistry to Starknet Mainnet
# Usage: OWNER_ADDRESS=0x... ./scripts/deploy-mainnet.sh
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ---------------------------------------------------------------------------
# Configuration — override via env vars if needed
# ---------------------------------------------------------------------------
OWNER_ADDRESS="${OWNER_ADDRESS:-}"
NETWORK="${NETWORK:-mainnet}"
PROFILE="${PROFILE:-mainnet}"
ARTIFACTS_DIR="$PROJECT_DIR/target/dev"
DEPLOYMENT_LOG="$PROJECT_DIR/STARKNET_DEPLOYED_ADDRESSES.md"

if [[ -z "$OWNER_ADDRESS" ]]; then
  echo "ERROR: Set OWNER_ADDRESS to your Braavos wallet address."
  echo "  export OWNER_ADDRESS=0x069a...7b22"
  exit 1
fi

echo "=================================================="
echo "  Project Mocha — Starknet Mainnet Deployment"
echo "  Network  : $NETWORK"
echo "  Owner    : $OWNER_ADDRESS"
echo "=================================================="

# ---------------------------------------------------------------------------
# 1. Declare MBTToken
# ---------------------------------------------------------------------------
echo ""
echo "[1/4] Declaring MBTToken..."
MBT_DECLARE_OUTPUT=$(sncast --profile "$PROFILE" declare \
  --contract-name MBTToken \
  2>&1)
echo "$MBT_DECLARE_OUTPUT"

MBT_CLASS_HASH=$(echo "$MBT_DECLARE_OUTPUT" | grep -oE 'class_hash: (0x[0-9a-fA-F]+)' | head -1 | awk '{print $2}')
if [[ -z "$MBT_CLASS_HASH" ]]; then
  # Already declared — extract from "already declared" message
  MBT_CLASS_HASH=$(echo "$MBT_DECLARE_OUTPUT" | grep -oE '0x[0-9a-fA-F]{60,}' | head -1)
fi
echo "  MBT class hash: $MBT_CLASS_HASH"

# ---------------------------------------------------------------------------
# 2. Declare FarmRegistry
# ---------------------------------------------------------------------------
echo ""
echo "[2/4] Declaring FarmRegistry..."
FARM_DECLARE_OUTPUT=$(sncast --profile "$PROFILE" declare \
  --contract-name FarmRegistry \
  2>&1)
echo "$FARM_DECLARE_OUTPUT"

FARM_CLASS_HASH=$(echo "$FARM_DECLARE_OUTPUT" | grep -oE 'class_hash: (0x[0-9a-fA-F]+)' | head -1 | awk '{print $2}')
if [[ -z "$FARM_CLASS_HASH" ]]; then
  FARM_CLASS_HASH=$(echo "$FARM_DECLARE_OUTPUT" | grep -oE '0x[0-9a-fA-F]{60,}' | head -1)
fi
echo "  FarmRegistry class hash: $FARM_CLASS_HASH"

# ---------------------------------------------------------------------------
# 3. Deploy MBTToken
#    Constructor: (name: ByteArray, symbol: ByteArray, initial_owner: felt252)
#    sncast encodes string literals as ByteArray automatically
# ---------------------------------------------------------------------------
echo ""
echo "[3/4] Deploying MBTToken..."
MBT_DEPLOY_OUTPUT=$(sncast --profile "$PROFILE" deploy \
  --class-hash "$MBT_CLASS_HASH" \
  --constructor-calldata "str:Mocha Bean Token" "str:MBT" "$OWNER_ADDRESS" \
  2>&1)
echo "$MBT_DEPLOY_OUTPUT"

MBT_ADDRESS=$(echo "$MBT_DEPLOY_OUTPUT" | grep -oE 'contract_address: (0x[0-9a-fA-F]+)' | head -1 | awk '{print $2}')
if [[ -z "$MBT_ADDRESS" ]]; then
  MBT_ADDRESS=$(echo "$MBT_DEPLOY_OUTPUT" | grep -oE '0x[0-9a-fA-F]{60,}' | head -1)
fi
echo "  MBTToken deployed at: $MBT_ADDRESS"

# ---------------------------------------------------------------------------
# 4. Deploy FarmRegistry
#    Constructor: (owner: felt252)
# ---------------------------------------------------------------------------
echo ""
echo "[4/4] Deploying FarmRegistry..."
FARM_DEPLOY_OUTPUT=$(sncast --profile "$PROFILE" deploy \
  --class-hash "$FARM_CLASS_HASH" \
  --constructor-calldata "$OWNER_ADDRESS" \
  2>&1)
echo "$FARM_DEPLOY_OUTPUT"

FARM_ADDRESS=$(echo "$FARM_DEPLOY_OUTPUT" | grep -oE 'contract_address: (0x[0-9a-fA-F]+)' | head -1 | awk '{print $2}')
if [[ -z "$FARM_ADDRESS" ]]; then
  FARM_ADDRESS=$(echo "$FARM_DEPLOY_OUTPUT" | grep -oE '0x[0-9a-fA-F]{60,}' | head -1)
fi
echo "  FarmRegistry deployed at: $FARM_ADDRESS"

# ---------------------------------------------------------------------------
# Write deployment log
# ---------------------------------------------------------------------------
DEPLOYED_AT=$(date -u '+%Y-%m-%d %H:%M UTC')
cat > "$DEPLOYMENT_LOG" << EOF
# Starknet Mainnet — Deployed Addresses

Deployed: $DEPLOYED_AT  
Owner / Admin: \`$OWNER_ADDRESS\`  
Network: Starknet Mainnet  

## Contract Addresses

| Contract      | Address                        | Class Hash                     |
|---------------|--------------------------------|--------------------------------|
| MBTToken      | \`$MBT_ADDRESS\`               | \`$MBT_CLASS_HASH\`            |
| FarmRegistry  | \`$FARM_ADDRESS\`              | \`$FARM_CLASS_HASH\`           |

## Verify on Voyager

- MBTToken: https://voyager.online/contract/$MBT_ADDRESS
- FarmRegistry: https://voyager.online/contract/$FARM_ADDRESS

## Next Steps

1. Register Starknet Farm v1 (run \`scripts/seed-farm.sh\`)
2. Mint initial MBT supply to owner / reserve
3. Update frontend portal with these addresses
EOF

echo ""
echo "=================================================="
echo "  Deployment complete!"
echo ""
echo "  MBTToken     : $MBT_ADDRESS"
echo "  FarmRegistry : $FARM_ADDRESS"
echo ""
echo "  Addresses written to: $DEPLOYMENT_LOG"
echo "=================================================="
