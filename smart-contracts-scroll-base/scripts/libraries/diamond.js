// Helper functions for diamond deployment with ethers v6

// FacetCutAction enum values from IDiamondCut.sol
const FacetCutAction = {
  Add: 0,
  Replace: 1,
  Remove: 2,
};

// Get function selectors from ABI
function getSelectors(contract) {
  // Get all function fragments from the interface
  const fragments = Object.values(contract.interface.fragments).filter(
    (fragment) => fragment.type === "function"
  );

  const selectors = fragments.reduce((acc, fragment) => {
    // Filter out init function
    if (fragment.name !== "init") {
      // In ethers v6, we use getSighash instead of getSelector
      acc.push(fragment.selector);
    }
    return acc;
  }, []);

  return selectors;
}

// Get function selectors with name mapping
function getSelectorsWithNames(contract) {
  const fragments = Object.values(contract.interface.fragments).filter(
    (fragment) => fragment.type === "function"
  );

  const selectors = fragments.reduce((acc, fragment) => {
    // Filter out init function
    if (fragment.name !== "init") {
      acc.push({
        name: fragment.format(), // Use format() to get the function signature
        selector: fragment.selector,
      });
    }
    return acc;
  }, []);

  return selectors;
}

// Remove selectors from an array of selectors
function removeSelectors(selectors, selectorsToRemove) {
  const selectorsSet = new Set(selectors);
  for (const selector of selectorsToRemove) {
    selectorsSet.delete(selector);
  }
  return [...selectorsSet];
}

// Find a position in the selectors array of the first selector that matches the pattern
function findPositionForSelector(selectors, selector) {
  for (let i = 0; i < selectors.length; i++) {
    if (selectors[i] === selector) {
      return i;
    }
  }
  return -1;
}

module.exports = {
  FacetCutAction,
  getSelectors,
  getSelectorsWithNames,
  removeSelectors,
  findPositionForSelector,
};
