// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMintableToken {
    function mint(address to, uint256 amount) external;
}

contract MockMintableToken is ERC20, Ownable, IMintableToken {
    address public minter;
    
    constructor(string memory name, string memory symbol, uint8 tokenDecimals) 
        ERC20(name, symbol) 
        Ownable(msg.sender) 
    {
        // Set decimals
        _decimals = tokenDecimals;
    }
    
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }
    
    function mint(address to, uint256 amount) external override {
        require(msg.sender == minter, "MockMintableToken: Only minter can mint");
        _mint(to, amount);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    uint8 private _decimals;
}
