// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IICO.sol";
import "./MockERC20.sol";

/**
 * @title ReentrancyAttacker
 * @dev Contract used to test reentrancy protection in ICO contract
 * WARNING: This is a test contract only - DO NOT deploy to mainnet
 */
contract ReentrancyAttacker {
    IICO public ico;
    MockERC20 public paymentToken;
    bool public attacking;

    constructor(address _ico, address _paymentToken) {
        ico = IICO(_ico);
        paymentToken = MockERC20(_paymentToken);
        attacking = false;
    }

    function attack(uint256 amount) external {
        attacking = true;
        paymentToken.approve(address(ico), amount);
        // Use the appropriate buy function based on token type
        // For USDT
        ico.buyTokensWithUsdtNoProtection(amount);
        attacking = false;
    }

    // Fallback function to attempt reentrancy
    receive() external payable {
        if (attacking) {
            // Attempt to reenter via ETH purchase
            ico.buyTokensWithEthNoProtection{value: msg.value}(address(this));
        }
    }
}

