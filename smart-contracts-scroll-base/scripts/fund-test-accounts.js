// Script to fund test accounts on Scroll Sepolia
const { ethers } = require("hardhat");
const fs = require("fs");

// Configuration
const ACCOUNTS_FILE = "accounts/accounts-scrollSepolia-534351-2025-08-01T16-14-51-798Z.txt";
const FUNDING_AMOUNT = ethers.parseEther("0.01"); // 0.01 ETH per account

async function main() {
    console.log("Funding Test Accounts on Scroll Sepolia");
    console.log("=======================================\n");

    // Load test accounts
    const accounts = await loadTestAccounts();
    
    console.log("Loaded accounts:", Object.keys(accounts));
    console.log("");
    
    // Get deployer signer
    const [deployer] = await ethers.getSigners();
    
    console.log("Deployer address:", deployer.address);
    console.log("Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    console.log("");

    // Calculate total funding needed
    const accountsToFund = Object.keys(accounts).filter(key => key !== 'DEPLOYER');
    const totalNeeded = FUNDING_AMOUNT * BigInt(accountsToFund.length);
    
    console.log(`Funding ${accountsToFund.length} accounts with ${ethers.formatEther(FUNDING_AMOUNT)} ETH each`);
    console.log(`Total needed: ${ethers.formatEther(totalNeeded)} ETH`);
    console.log("");

    // Check if deployer has enough balance
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    if (deployerBalance < totalNeeded) {
        console.error("Insufficient balance in deployer account!");
        console.error(`Required: ${ethers.formatEther(totalNeeded)} ETH`);
        console.error(`Available: ${ethers.formatEther(deployerBalance)} ETH`);
        console.error("Please add more ETH to the deployer account.");
        return;
    }

    // Fund each account
    for (const accountKey of accountsToFund) {
        const account = accounts[accountKey];
        
        try {
            console.log(`Funding ${accountKey}: ${account.address}...`);
            
            const tx = await deployer.sendTransaction({
                to: account.address,
                value: FUNDING_AMOUNT
            });
            
            console.log(`   Transaction hash: ${tx.hash}`);
            await tx.wait();
            
            const newBalance = await ethers.provider.getBalance(account.address);
            console.log(`   New balance: ${ethers.formatEther(newBalance)} ETH`);
            console.log("");
            
        } catch (error) {
            console.error(`   Failed to fund ${accountKey}:`, error.message);
        }
    }

    console.log("Funding completed!");
    console.log("");
    
    // Show final balances
    console.log("Final Account Balances:");
    console.log("========================");
    for (const [key, account] of Object.entries(accounts)) {
        try {
            const balance = await ethers.provider.getBalance(account.address);
            console.log(`${key}: ${ethers.formatEther(balance)} ETH`);
        } catch (error) {
            console.log(`${key}: Error getting balance`);
        }
    }
}

async function loadTestAccounts() {
    const accountsContent = fs.readFileSync(ACCOUNTS_FILE, "utf8");
    const accounts = {};
    
    // Parse the accounts file to extract addresses and private keys
    const lines = accountsContent.split('\n');
    let currentRole = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if this is a role header (ends with ':')
        if (trimmedLine.endsWith(':') && !trimmedLine.includes(' ')) {
            currentRole = trimmedLine.slice(0, -1); // Remove the ':'
            if (currentRole !== 'DEPLOYER') { // Skip deployer as we don't fund it
                accounts[currentRole] = {};
            }
        }
        // Check if this is an address line
        else if (trimmedLine.startsWith('Address:') && currentRole && currentRole !== 'DEPLOYER') {
            const address = trimmedLine.split('Address:')[1].trim();
            accounts[currentRole].address = address;
        }
        // Check if this is a private key line
        else if (trimmedLine.startsWith('Private Key:') && currentRole && currentRole !== 'DEPLOYER') {
            const privateKey = trimmedLine.split('Private Key:')[1].trim();
            if (privateKey !== 'CONFIGURED_IN_ENV') {
                accounts[currentRole].privateKey = privateKey;
            }
        }
    }
    
    return accounts;
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
        console.error("Script failed:", error);
    process.exit(1);
  });