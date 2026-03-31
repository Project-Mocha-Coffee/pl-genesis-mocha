const { ethers } = require('ethers');
require('dotenv').config();

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.log('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

// Remove 0x prefix if present, then add it back for ethers
const cleanKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
const wallet = new ethers.Wallet(cleanKey);

console.log('\n🔍 Private Key Verification:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 Private Key (first 10 chars):', privateKey.substring(0, 10) + '...');
console.log('💼 Derived Wallet Address:', wallet.address);
console.log('🎯 Expected Address (from ETH receipt):', '0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (wallet.address.toLowerCase() === '0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795'.toLowerCase()) {
  console.log('✅ MATCH! The private key corresponds to the wallet that received ETH.');
  console.log('   The script will use the correct wallet for deployment.\n');
} else {
  console.log('❌ MISMATCH! The private key does NOT match the wallet that received ETH.');
  console.log('   You need to update PRIVATE_KEY in .env to match the wallet with ETH.');
  console.log('   Current wallet from private key:', wallet.address);
  console.log('   Wallet that received ETH:        0x7893ef20c5e96dA90A975EeD6F5B8c6F033F8795\n');
}
