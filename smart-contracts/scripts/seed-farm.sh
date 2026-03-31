#!/usr/bin/env bash
# seed-farm.sh  —  Register Starknet Farm v1 in FarmRegistry after deployment
# Usage: FARM_ADDRESS=0x... OWNER_ADDRESS=0x... ./scripts/seed-farm.sh
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

PROFILE="${PROFILE:-mainnet}"

FARM_ADDRESS="${FARM_ADDRESS:-}"
OWNER_ADDRESS="${OWNER_ADDRESS:-}"

if [[ -z "$FARM_ADDRESS" || -z "$OWNER_ADDRESS" ]]; then
  echo "ERROR: Set FARM_ADDRESS and OWNER_ADDRESS."
  echo "  export FARM_ADDRESS=0x..."
  echo "  export OWNER_ADDRESS=0x..."
  exit 1
fi

echo "Registering Starknet Farm v1..."
echo "  FarmRegistry : $FARM_ADDRESS"

# register_farm(id=1, total_trees=5000, apy_bps=1200 (12%), maturity_years=5)
sncast --profile "$PROFILE" invoke \
  --contract-address "$FARM_ADDRESS" \
  --function "register_farm" \
  --calldata "1" "5000" "1200" "5"

echo ""
echo "Farm v1 registered. Confirm at:"
echo "  https://voyager.online/contract/$FARM_ADDRESS"
