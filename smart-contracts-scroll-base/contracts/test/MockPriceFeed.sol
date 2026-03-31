// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MockPriceFeed is AggregatorV3Interface {
    int256 private _price;
    uint8 private _decimals;
    uint256 private _updatedAt;
    uint80 private _roundId;
    uint80 private _answeredInRound;
    
    constructor(int256 price, uint8 decimals) {
        _price = price;
        _decimals = decimals;
        _updatedAt = block.timestamp;
        _roundId = 1;
        _answeredInRound = 1;
    }
    
    function setPrice(int256 newPrice) external {
        _price = newPrice;
        _updatedAt = block.timestamp;
        _roundId++;
        _answeredInRound = _roundId;
    }
    
    function setStalePrice(int256 newPrice, uint256 staleTime) external {
        _price = newPrice;
        _updatedAt = block.timestamp - staleTime;
        _roundId++;
        _answeredInRound = _roundId;
    }
    
    function setInvalidPrice() external {
        _price = -1;
        _updatedAt = block.timestamp;
        _roundId++;
        _answeredInRound = _roundId;
    }
    
    function setIncompleteRound() external {
        _price = int256(1000 * 10**_decimals);
        _updatedAt = block.timestamp;
        _roundId = 5; // Set roundId to 5
        _answeredInRound = 4; // Set answeredInRound to 4 to make it incomplete
    }
    
    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            _roundId,
            _price,
            0,
            _updatedAt,
            _answeredInRound
        );
    }
    
    function getRoundData(uint80) external pure override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        revert("MockPriceFeed: getRoundData not implemented");
    }
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function description() external pure override returns (string memory) {
        return "Mock Price Feed";
    }
    
    function version() external pure override returns (uint256) {
        return 1;
    }
}
