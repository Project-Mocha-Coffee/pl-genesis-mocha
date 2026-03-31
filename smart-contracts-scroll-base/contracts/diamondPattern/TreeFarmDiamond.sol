// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/******************************************************************************\
* Implementation of a diamond following EIP-2535: Diamonds, Multi-Facet Proxy
* https://eips.ethereum.org/EIPS/eip-2535
/******************************************************************************/

import "./libraries/LibDiamond.sol";
import "./interfaces/IDiamondCut.sol";
import "./libraries/LibAppStorage.sol";

/**
 * @title TreeFarmDiamond
 * @dev Main diamond contract for the Project Mocha  system following EIP-2535
 */
contract TreeFarmDiamond {
    // Application storage with shared state across facets
    LibAppStorage.AppStorage internal s;

    constructor(address _contractOwner, address _diamondCutFacet) {
        // Set the contract owner
        LibDiamond.setContractOwner(_contractOwner);

        // Initialize timestamp
        s.establishedTimestamp = block.timestamp;

        // Register the diamondCut function from the DiamondCutFacet
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: _diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        });
        LibDiamond.diamondCut(cut, address(0), "");
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;

        // Get diamond storage
        assembly {
            ds.slot := position
        }

        // Get facet from function selector
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");

        // Execute external function from facet using delegatecall and return any value
        assembly {
            // Copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // Execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // Get any return value
            returndatacopy(0, 0, returndatasize())
            // Return any return value or error back to the caller
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    // Receive function to allow receiving ETH
    receive() external payable {}
}
