#!/usr/bin/env bash
# mint-mbt.sh  —  Mint MBT tokens on Starknet Mainnet
# Usage: MBT_ADDRESS=0x... RECIPIENT=0x... AMOUNT=1000000000000000000000 ./scripts/mint-mbt.sh
# AMOUNT is in 18-decimal wei (1000000000000000000000 = 1000 MBT)
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

PROFILE="${PROFILE:-mainnet}"
MBT_ADDRESS="${MBT_ADDRESS:-}"
RECIPIENT="${RECIPIENT:-}"
AMOUNT="${AMOUNT:-1000000000000000000000}"  # default 1000 MBT

if [[ -z "$MBT_ADDRESS" || -z "$RECIPIENT" ]]; then
  echo "ERROR: Set MBT_ADDRESS and RECIPIENT."
  echo "  export MBT_ADDRESS=0x..."
  echo "  export RECIPIENT=0x..."
  exit 1
fi

echo "Minting MBT..."
echo "  Token     : $MBT_ADDRESS"
echo "  Recipient : $RECIPIENT"
echo "  Amount    : $AMOUNT (raw units)"

# u256 calldata = low_128, high_128
AMOUNT_LOW=$(python3 -c "print(hex($AMOUNT & ((1<<128)-1)))")
AMOUNT_HIGH=$(python3 -c "print(hex(($AMOUNT >> 128) & ((1<<128)-1)))")

sncast --profile "$PROFILE" invoke \
  --contract-address "$MBT_ADDRESS" \
  --function "mint" \
  --calldata "$RECIPIENT" "$AMOUNT_LOW" "$AMOUNT_HIGH"

echo "Done. Check balance at https://voyager.online/contract/$MBT_ADDRESS"
