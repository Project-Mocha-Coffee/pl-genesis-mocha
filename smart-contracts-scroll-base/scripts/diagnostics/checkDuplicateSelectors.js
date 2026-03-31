// Diagnostic script to check for duplicate function selectors across facets
const { ethers } = require("hardhat");
const { getSelectorsWithNames } = require("../libraries/diamond.js");

async function main() {
  console.log("🔍 Checking for duplicate function selectors across facets...\n");
  
  // Get all facet contracts
  const facetNames = [
    "DiamondLoupeFacet",
    "OwnershipFacet", 
    "InitializationFacet",
    "FarmManagementFacet",
    "TreeManagementFacet",
    "YieldManagementFacet",
    "StakingFacet",
    "StakingRewardsFacet",
    "StakingYieldFacet",
    "BondManagementFacet",
    "MultiTrancheVaultFacet",
    "FarmShareTokenFacet"
  ];
  
  const allSelectors = new Map(); // selector -> [{facet, function}]
  const facetSelectors = new Map(); // facet -> selectors[]
  
  // Collect selectors from each facet
  for (const facetName of facetNames) {
    try {
      console.log(`📄 Analyzing ${facetName}...`);
      const FacetFactory = await ethers.getContractFactory(facetName);
      const facet = await FacetFactory.deploy();
      
      const selectorsWithNames = getSelectorsWithNames(facet);
      facetSelectors.set(facetName, selectorsWithNames);
      
      console.log(`   Found ${selectorsWithNames.length} functions`);
      
      // Check for duplicates
      for (const { name, selector } of selectorsWithNames) {
        if (!allSelectors.has(selector)) {
          allSelectors.set(selector, []);
        }
        allSelectors.get(selector).push({ facet: facetName, function: name });
      }
      
    } catch (error) {
      console.log(`   ❌ Error with ${facetName}: ${error.message}`);
    }
  }
  
  // Find duplicates
  console.log("\n🔍 DUPLICATE ANALYSIS:");
  console.log("=" .repeat(60));
  
  let duplicatesFound = false;
  
  for (const [selector, occurrences] of allSelectors.entries()) {
    if (occurrences.length > 1) {
      duplicatesFound = true;
      console.log(`\n❌ DUPLICATE SELECTOR: ${selector}`);
      console.log(`   Function signature: ${occurrences[0].function}`);
      console.log(`   Found in facets:`);
      
      for (const { facet, function: func } of occurrences) {
        console.log(`     - ${facet}: ${func}`);
      }
    }
  }
  
  if (!duplicatesFound) {
    console.log("\n✅ No duplicate selectors found!");
  } else {
    console.log("\n⚠️  SOLUTION: Remove duplicate functions or use different names/parameters");
  }
  
  // Show summary
  console.log("\n📊 SUMMARY:");
  console.log("=" .repeat(60));
  for (const [facetName, selectors] of facetSelectors.entries()) {
    console.log(`${facetName}: ${selectors.length} functions`);
  }
  
  console.log(`\nTotal unique selectors: ${allSelectors.size}`);
  console.log(`Total functions: ${Array.from(facetSelectors.values()).reduce((sum, selectors) => sum + selectors.length, 0)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });