// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IICO.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

interface IMintableToken {
    function mint(address to, uint256 amount) external;
}

/**
 * @title ICO
 * @dev A smart contract for an Initial Coin Offering (ICO) on Scroll that accepts ETH, USDT, USDC, WBTC, and SCR.
 * It uses Chainlink price feeds to determine the value of contributed assets and mints tokens
 * at a fixed rate of $25 per token.
 */
contract ICO is IICO, Ownable, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    // The ERC20 token being sold
    IMintableToken public immutable token;
    ERC20 public immutable tokenContract;

    // The rate of the token in USD (e.g., 25 USD per token)
    uint256 public constant TOKEN_RATE_USD = 25 * 10**18; // 25 USD with 18 decimals

    // Maximum staleness for price feeds (1 hour)
    uint256 public constant MAX_PRICE_STALENESS = 3600;

    // Slippage protection settings
    uint256 public maxSlippageBps = 500; // 5% default slippage tolerance
    uint256 public constant MAX_SLIPPAGE_BPS = 2000; // 20% maximum allowed slippage
    uint256 public constant BPS_BASE = 10000; // 100% in basis points

    // Price deviation protection (for oracle price jumps)
    uint256 public maxPriceDeviationBps = 1000; // 10% max price deviation
    mapping(string => uint256) public lastRecordedPrices; // Asset => Last price
    mapping(string => uint256) public priceUpdateTimestamps; // Asset => Last update time

    // Chainlink price feed interfaces
    AggregatorV3Interface private immutable ethUsdPriceFeed;
    AggregatorV3Interface private immutable usdtUsdPriceFeed;
    AggregatorV3Interface private immutable usdcUsdPriceFeed;
    AggregatorV3Interface private immutable btcUsdPriceFeed;
    AggregatorV3Interface private immutable scrUsdPriceFeed;

    // Token contract addresses (mutable to allow admin updates)
    IERC20 public usdt;
    IERC20 public usdc;
    IERC20 public wbtc;
    IERC20 public scr;

    // Minimum purchase amounts (in wei/smallest unit)
    uint256 public minEthPurchase = 0.001 ether;
    uint256 public minUsdtPurchase = 1 * 10**6; // 1 USDT (6 decimals)
    uint256 public minUsdcPurchase = 1 * 10**6; // 1 USDC (6 decimals)
    uint256 public minWbtcPurchase = 0.0001 * 10**8; // 0.0001 WBTC (8 decimals)
    uint256 public minScrPurchase = 1 * 10**18; // 1 SCR (18 decimals)

    // Total tokens sold
    uint256 public totalTokensSold;
    
    // Maximum tokens that can be sold through the ICO
    uint256 public maxTokensToSell = 2000 * 10**18; // 2000 tokens (18 decimals)
    
    // Per-wallet cap for MBT tokens distributed by this ICO (0 disables the cap)
    uint256 public maxMBTTokensPerWallet = 80;
    
    // Admin role for managing the ICO
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Treasury wallet address for receiving funds
    address public treasuryWallet;
    
    // Purchase statistics per asset
    mapping(string => uint256) public totalPurchasedByAsset; // Asset name => Total USD value
    mapping(string => uint256) public totalVolumeByAsset; // Asset name => Total asset amount

    // Events are declared in IICO

    /**
     * @dev Sets up the ICO contract with the necessary parameters.
     * @param _token The address of the ERC20 token being sold.
     * @param _maxTokensToSell The maximum number of tokens that can be sold through the ICO.
     * @param _treasuryWallet The address of the treasury wallet to receive funds.
     * @param _ethUsdPriceFeedAddress The address of the ETH/USD Chainlink price feed.
     * @param _usdtUsdPriceFeedAddress The address of the USDT/USD Chainlink price feed.
     * @param _usdcUsdPriceFeedAddress The address of the USDC/USD Chainlink price feed.
     * @param _btcUsdPriceFeedAddress The address of the BTC/USD Chainlink price feed.
     * @param _scrUsdPriceFeedAddress The address of the SCR/USD Chainlink price feed.
     * @param _usdtAddress The address of the USDT token contract.
     * @param _usdcAddress The address of the USDC token contract.
     * @param _wbtcAddress The address of the WBTC token contract.
     * @param _scrAddress The address of the SCR token contract.
     */
    constructor(
        address _token,
        uint256 _maxTokensToSell,
        address _treasuryWallet,
        address _ethUsdPriceFeedAddress,
        address _usdtUsdPriceFeedAddress,
        address _usdcUsdPriceFeedAddress,
        address _btcUsdPriceFeedAddress,
        address _scrUsdPriceFeedAddress,
        address _usdtAddress,
        address _usdcAddress,
        address _wbtcAddress,
        address _scrAddress
    ) Ownable(msg.sender) {
        if (_token == address(0)) revert InvalidAddress("token");
        if (_maxTokensToSell == 0) revert InvalidAmount();
        if (_treasuryWallet == address(0)) revert InvalidAddress("treasuryWallet");
        if (_ethUsdPriceFeedAddress == address(0)) revert InvalidAddress("ethPriceFeed");
        if (_usdtUsdPriceFeedAddress == address(0)) revert InvalidAddress("usdtPriceFeed");
        if (_usdcUsdPriceFeedAddress == address(0)) revert InvalidAddress("usdcPriceFeed");
        if (_btcUsdPriceFeedAddress == address(0)) revert InvalidAddress("btcPriceFeed");
        if (_scrUsdPriceFeedAddress == address(0)) revert InvalidAddress("scrPriceFeed");
        if (_usdtAddress == address(0)) revert InvalidAddress("usdt");
        if (_usdcAddress == address(0)) revert InvalidAddress("usdc");
        if (_wbtcAddress == address(0)) revert InvalidAddress("wbtc");
        if (_scrAddress == address(0)) revert InvalidAddress("scr");

        token = IMintableToken(_token);
        tokenContract = ERC20(_token);
        maxTokensToSell = _maxTokensToSell;
        maxMBTTokensPerWallet = 80 * 10**18; // disabled by default
        treasuryWallet = _treasuryWallet;
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeedAddress);
        usdtUsdPriceFeed = AggregatorV3Interface(_usdtUsdPriceFeedAddress);
        usdcUsdPriceFeed = AggregatorV3Interface(_usdcUsdPriceFeedAddress);
        btcUsdPriceFeed = AggregatorV3Interface(_btcUsdPriceFeedAddress);
        scrUsdPriceFeed = AggregatorV3Interface(_scrUsdPriceFeedAddress);
        
        usdt = IERC20(_usdtAddress);
        usdc = IERC20(_usdcAddress);
        wbtc = IERC20(_wbtcAddress);
        scr = IERC20(_scrAddress);
        
        // Set up admin role - owner gets admin role by default
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Fallback function to receive ETH (uses default slippage protection).
     */
    receive() external payable {
        buyTokensWithEth(msg.sender, 0); // 0 means use default slippage protection
    }

    /**
     * @dev Buys tokens with ETH with slippage protection.
     * @param _beneficiary The address that will receive the tokens.
     * @param _minTokensExpected Minimum tokens expected (slippage protection).
     */
    function buyTokensWithEth(address _beneficiary, uint256 _minTokensExpected) 
        public 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(msg.value >= minEthPurchase, "ICO: ETH amount below minimum");
        if (_beneficiary == address(0)) revert InvalidBeneficiary();

        uint256 usdAmount = getEthUsdPrice(msg.value);
        uint256 tokensToMint = calculateTokens(usdAmount);
        
        // Slippage protection
        _checkSlippageProtection("ETH", tokensToMint, _minTokensExpected, msg.sender);
        _checkWalletCap(_beneficiary, tokensToMint);
        

        // Automatically send ETH to treasury wallet
        _sendToTreasury(msg.value);
    
        _mintTokens(_beneficiary, tokensToMint);
        _updateStatistics("ETH", msg.value, usdAmount, tokensToMint);
        
        

        emit TokensPurchased(
            msg.sender,
            _beneficiary,
            "ETH",
            msg.value,
            tokensToMint,
            usdAmount
        );
    }

    /**
     * @dev Fallback function compatibility - uses 0 slippage protection (backward compatibility).
     */
    function buyTokensWithEthNoProtection(address _beneficiary) 
        public 
        payable 
    {
        buyTokensWithEth(_beneficiary, 0);
    }

    /**
     * @dev Buys tokens with USDT with slippage protection.
     * @param _amount The amount of USDT to spend.
     * @param _minTokensExpected Minimum tokens expected (slippage protection).
     */
    function buyTokensWithUsdt(uint256 _amount, uint256 _minTokensExpected) 
        public 
        nonReentrant 
        whenNotPaused 
    {
        require(_amount >= minUsdtPurchase, "ICO: USDT amount below minimum");
        
        uint256 usdAmount = getUsdtUsdPrice(_amount);
        _purchaseWithErc20(usdt, _amount, usdAmount, msg.sender, "USDT", _minTokensExpected);
    }

    /**
     * @dev Buys tokens with USDT (backward compatibility - no slippage protection).
     * @param _amount The amount of USDT to spend.
     */
    function buyTokensWithUsdtNoProtection(uint256 _amount) public {
        buyTokensWithUsdt(_amount, 0);
    }

    /**
     * @dev Buys tokens with USDC with slippage protection.
     * @param _amount The amount of USDC to spend.
     * @param _minTokensExpected Minimum tokens expected (slippage protection).
     */
    function buyTokensWithUsdc(uint256 _amount, uint256 _minTokensExpected) 
        public 
        nonReentrant 
        whenNotPaused 
    {
        require(_amount >= minUsdcPurchase, "ICO: USDC amount below minimum");
        
        uint256 usdAmount = getUsdcUsdPrice(_amount);
        _purchaseWithErc20(usdc, _amount, usdAmount, msg.sender, "USDC", _minTokensExpected);
    }

    /**
     * @dev Buys tokens with USDC (backward compatibility - no slippage protection).
     * @param _amount The amount of USDC to spend.
     */
    function buyTokensWithUsdcNoProtection(uint256 _amount) public {
        buyTokensWithUsdc(_amount, 0);
    }

    /**
     * @dev Buys tokens with WBTC with slippage protection.
     * @param _amount The amount of WBTC to spend.
     * @param _minTokensExpected Minimum tokens expected (slippage protection).
     */
    function buyTokensWithWbtc(uint256 _amount, uint256 _minTokensExpected) 
        public 
        nonReentrant 
        whenNotPaused 
    {
        require(_amount >= minWbtcPurchase, "ICO: WBTC amount below minimum");
        
        uint256 usdAmount = getBtcUsdPrice(_amount);
        _purchaseWithErc20(wbtc, _amount, usdAmount, msg.sender, "WBTC", _minTokensExpected);
    }

    /**
     * @dev Buys tokens with WBTC (backward compatibility - no slippage protection).
     * @param _amount The amount of WBTC to spend.
     */
    function buyTokensWithWbtcNoProtection(uint256 _amount) public {
        buyTokensWithWbtc(_amount, 0);
    }

    /**
     * @dev Buys tokens with SCR with slippage protection.
     * @param _amount The amount of SCR to spend.
     * @param _minTokensExpected Minimum tokens expected (slippage protection).
     */
    function buyTokensWithScr(uint256 _amount, uint256 _minTokensExpected) 
        public 
        nonReentrant 
        whenNotPaused 
    {
        require(_amount >= minScrPurchase, "ICO: SCR amount below minimum");
        
        uint256 usdAmount = getScrUsdPrice(_amount);
        _purchaseWithErc20(scr, _amount, usdAmount, msg.sender, "SCR", _minTokensExpected);
    }

    /**
     * @dev Buys tokens with SCR (backward compatibility - no slippage protection).
     * @param _amount The amount of SCR to spend.
     */
    function buyTokensWithScrNoProtection(uint256 _amount) public {
        buyTokensWithScr(_amount, 0);
    }

    /**
     * @dev Internal function to handle ERC20 token purchases with slippage protection.
     * @param _erc20Token The ERC20 token being used for the purchase.
     * @param _amount The amount of the ERC20 token to spend.
     * @param _usdAmount The equivalent USD amount of the ERC20 token.
     * @param _beneficiary The address that will receive the tokens.
     * @param _paymentMethod The payment method identifier for events.
     * @param _minTokensExpected Minimum tokens expected (slippage protection).
     */
    function _purchaseWithErc20(
        IERC20 _erc20Token,
        uint256 _amount,
        uint256 _usdAmount,
        address _beneficiary,
        string memory _paymentMethod,
        uint256 _minTokensExpected
    ) internal {
        uint256 tokensToMint = calculateTokens(_usdAmount);
        
        // Slippage protection
        _checkSlippageProtection(_paymentMethod, tokensToMint, _minTokensExpected, msg.sender);
        _checkWalletCap(_beneficiary, tokensToMint);
        
        // Transfer tokens from buyer to contract
        _erc20Token.safeTransferFrom(msg.sender, address(this), _amount);
        

        // Automatically send tokens to treasury wallet
        _sendTokensToTreasury(_erc20Token, _amount);
        
        _mintTokens(_beneficiary, tokensToMint);
        _updateStatistics(_paymentMethod, _amount, _usdAmount, tokensToMint);
        
        

        emit TokensPurchased(
            msg.sender,
            _beneficiary,
            _paymentMethod,
            _amount,
            tokensToMint,
            _usdAmount
        );
    }

    /**
     * @dev Internal function to update purchase statistics.
     */
    function _updateStatistics(
        string memory _asset,
        uint256 _assetAmount,
        uint256 _usdAmount,
        uint256 _tokensToMint
    ) internal {
        totalTokensSold += _tokensToMint;
        totalPurchasedByAsset[_asset] += _usdAmount;
        totalVolumeByAsset[_asset] += _assetAmount;
    }

    /**
     * @dev Internal function to send ETH to treasury wallet.
     */
    function _sendToTreasury(uint256 _amount) internal {
        (bool success, ) = treasuryWallet.call{value: _amount}("");
        require(success, "ICO: ETH transfer to treasury failed");
    }

    /**
     * @dev Internal function to send ERC20 tokens to treasury wallet.
     */
    function _sendTokensToTreasury(IERC20 _token, uint256 _amount) internal {
        _token.safeTransfer(treasuryWallet, _amount);
    }

    /**
     * @dev Internal function to check slippage protection.
     * @param _asset The asset being used for purchase.
     * @param _tokensToReceive The actual tokens to be received.
     * @param _minTokensExpected The minimum tokens expected by user.
     * @param _user The user making the purchase.
     */
    function _checkSlippageProtection(
        string memory _asset,
        uint256 _tokensToReceive,
        uint256 _minTokensExpected,
        address _user
    ) internal {
        // If user specified minimum tokens expected, check slippage
        if (_minTokensExpected > 0) {
        if (!(_tokensToReceive >= _minTokensExpected)) {
            revert SlippageExceeded(_asset, _minTokensExpected, _tokensToReceive);
        }
            
            // Calculate actual slippage for event
            if (_tokensToReceive < _minTokensExpected) {
                uint256 slippageBps = ((_minTokensExpected - _tokensToReceive) * BPS_BASE) / _minTokensExpected;
                
                emit SlippageProtectionTriggered(
                    _user,
                    _asset,
                    _minTokensExpected,
                    _tokensToReceive,
                    slippageBps
                );
            }
        } else {
            // Apply default slippage protection using stored expected amount
            uint256 expectedTokensFromPreview = _getExpectedTokensFromPreview(_asset, _user);
            if (expectedTokensFromPreview > 0) {
                uint256 minAcceptable = (expectedTokensFromPreview * (BPS_BASE - maxSlippageBps)) / BPS_BASE;
                
                if (_tokensToReceive < minAcceptable) {
                    uint256 actualSlippageBps = ((expectedTokensFromPreview - _tokensToReceive) * BPS_BASE) / expectedTokensFromPreview;
                    
                    emit SlippageProtectionTriggered(
                        _user,
                        _asset,
                        expectedTokensFromPreview,
                        _tokensToReceive,
                        actualSlippageBps
                    );
                    
                    if (!(actualSlippageBps <= maxSlippageBps)) {
                        revert DefaultSlippageExceeded(_asset, actualSlippageBps, maxSlippageBps);
                    }
                }
            }
        }
    }

    /**
     * @dev Get expected tokens from a preview calculation (simplified version).
     * In production, you might store this in a mapping from recent preview calls.
     */
    function _getExpectedTokensFromPreview(string memory _asset, address _user) internal pure returns (uint256) {
        // This is a simplified implementation
        // In production, you might store preview results temporarily
        return 0; // Return 0 to skip default slippage check if no preview was made
    }

    /**
     * @dev Update recorded price for price deviation protection.
     * @param _asset The asset identifier.
     * @param _currentPrice The current price from oracle.
     */
    function _updateRecordedPrice(string memory _asset, uint256 _currentPrice) internal {
        uint256 lastPrice = lastRecordedPrices[_asset];
        uint256 lastUpdate = priceUpdateTimestamps[_asset];
        
        // If this is the first price or enough time has passed, record it
        if (lastPrice == 0 || block.timestamp - lastUpdate >= 300) { // 5 minutes
            lastRecordedPrices[_asset] = _currentPrice;
            priceUpdateTimestamps[_asset] = block.timestamp;
            emit RecordedPriceUpdated(_asset, _currentPrice, block.timestamp);
            return;
        }
        
        // Check for significant price deviation
        uint256 priceDifference = lastPrice > _currentPrice 
            ? lastPrice - _currentPrice 
            : _currentPrice - lastPrice;
        
        uint256 deviationBps = (priceDifference * BPS_BASE) / lastPrice;
        
        require(
            deviationBps <= maxPriceDeviationBps,
            "ICO: Price deviation protection triggered - price changed too much"
        );
        
        // Update the recorded price
        lastRecordedPrices[_asset] = _currentPrice;
        priceUpdateTimestamps[_asset] = block.timestamp;
        emit RecordedPriceUpdated(_asset, _currentPrice, block.timestamp);
    }

    /**
     * @dev Calculates the amount of tokens to mint based on the USD amount.
     * @param _usdAmount The amount in USD (18 decimals).
     * @return The amount of tokens to mint.
     */
    function calculateTokens(uint256 _usdAmount) public view returns (uint256) {
        uint256 tokenDecimals = tokenContract.decimals();
        
        // _usdAmount has 18 decimals, TOKEN_RATE_USD has 18 decimals
        // Result should have tokenDecimals
        return (_usdAmount * (10**tokenDecimals)) / TOKEN_RATE_USD;
    }

    /**
     * @dev Ensures the per-wallet cap is not exceeded by this mint
     */
    function _checkWalletCap(address _beneficiary, uint256 _tokensToMint) internal view {
        if (maxMBTTokensPerWallet == 0) return; // cap disabled
        uint256 bal = tokenContract.balanceOf(_beneficiary);
        require(bal + _tokensToMint <= maxMBTTokensPerWallet, "ICO: wallet cap exceeded");
    }

    /**
     * @dev Mints tokens to a beneficiary.
     * @param _beneficiary The address that will receive the tokens.
     * @param _amount The amount of tokens to mint.
     */
    function _mintTokens(address _beneficiary, uint256 _amount) internal {
        if (_amount == 0) revert ZeroMint();
        
        // Check if minting would exceed the maximum tokens to sell
        uint256 newTotalSold = totalTokensSold + _amount;
        if (newTotalSold > maxTokensToSell) {
            uint256 availableTokens = maxTokensToSell - totalTokensSold;
            if (availableTokens == 0) {
                emit TokenLimitReached(maxTokensToSell, totalTokensSold);
            }
            revert TokenLimitExceeded(_amount, availableTokens, maxTokensToSell);
        }
        
        token.mint(_beneficiary, _amount);
    }

    /**
     * @dev Validates oracle data for freshness and accuracy.
     * @param _price The price from oracle.
     * @param _updatedAt The timestamp when price was updated.
     * @param _answeredInRound The round in which the answer was computed.
     * @param _roundId The round ID.
     * @param _assetName The name of the asset for error messages.
     */
    function _validateOracleData(
        int256 _price,
        uint256 _updatedAt,
        uint80 _answeredInRound,
        uint80 _roundId,
        string memory _assetName
    ) internal view {
        if (_price <= 0) revert OracleInvalidPrice(_assetName);
        if (_updatedAt == 0) revert OraclePriceStale(_assetName);
        if (block.timestamp - _updatedAt > MAX_PRICE_STALENESS) revert OraclePriceTooOld(_assetName);
        if (_answeredInRound < _roundId) revert OracleRoundIncomplete(_assetName);
    }

    /**
     * @dev Gets the latest ETH/USD price from Chainlink with price deviation protection.
     * @param _amount The amount of ETH (in wei).
     * @return The equivalent USD value (18 decimals).
     */
    function getEthUsdPrice(uint256 _amount) public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = ethUsdPriceFeed.latestRoundData();

        //_validateOracleData(price, updatedAt, answeredInRound, roundId, "ETH");

        uint8 feedDecimals = ethUsdPriceFeed.decimals();
        uint256 currentPrice = uint256(price);
        
        // Price deviation protection (view function can't modify state, so we just validate)
        _validatePriceDeviation("ETH", currentPrice);
        
        // Convert to 18 decimal USD amount
        return (_amount * currentPrice * 10**(18 - feedDecimals)/10**(18));
    }

    /**
     * @dev Internal function to validate price deviation without state changes (for view functions).
     */
    function _validatePriceDeviation(string memory _asset, uint256 _currentPrice) internal view {
        uint256 lastPrice = lastRecordedPrices[_asset];
        uint256 lastUpdate = priceUpdateTimestamps[_asset];
        
        // Skip validation if no previous price recorded or too old
        if (lastPrice == 0 || block.timestamp - lastUpdate >= 3600) { // 1 hour
            return;
        }
        
        uint256 priceDifference = lastPrice > _currentPrice 
            ? lastPrice - _currentPrice 
            : _currentPrice - lastPrice;
        
        uint256 deviationBps = (priceDifference * BPS_BASE) / lastPrice;
        
        if (deviationBps > maxPriceDeviationBps) revert PriceDeviationTooHigh(_asset, deviationBps, maxPriceDeviationBps);
    }

    /**
     * @dev Gets the latest USDT/USD price from Chainlink.
     * @param _amount The amount of USDT.
     * @return The equivalent USD value (18 decimals).
     */
    function getUsdtUsdPrice(uint256 _amount) public view returns (uint256) {
        try usdtUsdPriceFeed.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
           // _validateOracleData(price, updatedAt, answeredInRound, roundId, "USDT");

        uint8 feedDecimals = usdtUsdPriceFeed.decimals();
        
        // Convert to 18 decimal USD amount
        return (_amount * uint256(price) * 10**(18 - feedDecimals)/10**(6));
        } catch {
            revert OracleCallFailed("USDT");
        }
    }

    /**
     * @dev Gets the latest USDC/USD price from Chainlink.
     * @param _amount The amount of USDC.
     * @return The equivalent USD value (18 decimals).
     */
    function getUsdcUsdPrice(uint256 _amount) public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = usdcUsdPriceFeed.latestRoundData();

        //_validateOracleData(price, updatedAt, answeredInRound, roundId, "USDC");

        uint8 feedDecimals = usdcUsdPriceFeed.decimals();
        
        // Convert to 18 decimal USD amount
        return (_amount * uint256(price) * 10**(18 - feedDecimals)/10**(6));
    }

    /**
     * @dev Gets the latest BTC/USD price from Chainlink.
     * @param _amount The amount of WBTC.
     * @return The equivalent USD value (18 decimals).
     */
    function getBtcUsdPrice(uint256 _amount) public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = btcUsdPriceFeed.latestRoundData();

        //_validateOracleData(price, updatedAt, answeredInRound, roundId, "BTC");

        uint8 feedDecimals = btcUsdPriceFeed.decimals();
        
        // Convert to 18 decimal USD amount
        return (_amount * uint256(price) * 10**(18 - feedDecimals)/10**(8));
    }

    /**
     * @dev Gets the latest SCR/USD price from Chainlink.
     * @param _amount The amount of SCR.
     * @return The equivalent USD value (18 decimals).
     */
    function getScrUsdPrice(uint256 _amount) public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = scrUsdPriceFeed.latestRoundData();

       // _validateOracleData(price, updatedAt, answeredInRound, roundId, "SCR");

        uint8 feedDecimals = scrUsdPriceFeed.decimals();
        
        // Convert to 18 decimal USD amount
        return (_amount * uint256(price) * 10**(18 - feedDecimals)/10**(18));
    }

    /**
     * @dev Updates slippage protection settings.
     * @param _maxSlippageBps Maximum slippage in basis points (e.g., 500 = 5%).
     */
    function updateSlippageProtection(uint256 _maxSlippageBps) external onlyRole(ADMIN_ROLE) {
        if (_maxSlippageBps > MAX_SLIPPAGE_BPS) revert SlippageToleranceTooHigh(_maxSlippageBps, MAX_SLIPPAGE_BPS);
        maxSlippageBps = _maxSlippageBps;
        emit SlippageProtectionUpdated(_maxSlippageBps);
    }

    /**
     * @dev Updates price deviation protection settings.
     * @param _maxDeviationBps Maximum price deviation in basis points (e.g., 1000 = 10%).
     */
    function updatePriceDeviationProtection(uint256 _maxDeviationBps) external onlyRole(ADMIN_ROLE) {
        if (_maxDeviationBps > 5000) revert PriceDeviationToleranceTooHigh(_maxDeviationBps, 5000); // Max 50%
        maxPriceDeviationBps = _maxDeviationBps;
        emit PriceDeviationProtectionUpdated(_maxDeviationBps);
    }

    /**
     * @dev Updates the per-wallet cap for MBT tokens distributed by this ICO. 0 disables the cap.
     */
    function updateMaxMBTTokensPerWallet(uint256 _newCap) external onlyRole(ADMIN_ROLE) {
        maxMBTTokensPerWallet = _newCap; // allow 0 to disable
    }

    /**
     * @dev Updates the maximum number of tokens that can be sold through the ICO.
     *      The new value must be greater than or equal to the number of tokens already sold.
     * @param _newMaxTokensToSell The new maximum number of tokens allowed to be sold.
     */
    function updateMaxTokensToSell(uint256 _newMaxTokensToSell) external onlyRole(ADMIN_ROLE) {
        require(_newMaxTokensToSell >= totalTokensSold, "ICO: new max less than total sold");
        maxTokensToSell = _newMaxTokensToSell;
    }

    /**
     * @dev Updates the ERC20 payment token contract address for a supported asset.
     * @param _asset Asset identifier ("USDT", "USDC", "WBTC", "SCR").
     * @param _newAddress New ERC20 token contract address.
     */
    function updatePaymentTokenAddress(string calldata _asset, address _newAddress) external onlyRole(ADMIN_ROLE) {
        if (_newAddress == address(0)) revert InvalidAddress("token");

        address previousAddress;
        bytes32 assetHash = keccak256(bytes(_asset));
        if (assetHash == keccak256(bytes("USDT"))) {
            previousAddress = address(usdt);
            usdt = IERC20(_newAddress);
        } else if (assetHash == keccak256(bytes("USDC"))) {
            previousAddress = address(usdc);
            usdc = IERC20(_newAddress);
        } else if (assetHash == keccak256(bytes("WBTC"))) {
            previousAddress = address(wbtc);
            wbtc = IERC20(_newAddress);
        } else if (assetHash == keccak256(bytes("SCR"))) {
            previousAddress = address(scr);
            scr = IERC20(_newAddress);
        } else {
            revert InvalidPaymentMethod();
        }

        emit PaymentTokenAddressUpdated(_asset, previousAddress, _newAddress);
    }

    /**
     * @dev Manually update recorded price for an asset (emergency function).
     * @param _asset Asset identifier.
     * @param _price New price to record.
     */
    function updateRecordedPrice(string calldata _asset, uint256 _price) external onlyRole(ADMIN_ROLE) {
        if (_price == 0) revert OracleInvalidPrice(_asset);
        lastRecordedPrices[_asset] = _price;
        priceUpdateTimestamps[_asset] = block.timestamp;
        emit RecordedPriceUpdated(_asset, _price, block.timestamp);
    }

    /**
     * @dev Updates minimum purchase amounts.
     */
    function updateMinPurchase(
        uint256 _minEth,
        uint256 _minUsdt,
        uint256 _minUsdc,
        uint256 _minWbtc,
        uint256 _minScr
    ) external onlyRole(ADMIN_ROLE) {
        if (_minEth > 0) {
            minEthPurchase = _minEth;
            emit MinPurchaseUpdated("ETH", _minEth);
        }
        if (_minUsdt > 0) {
            minUsdtPurchase = _minUsdt;
            emit MinPurchaseUpdated("USDT", _minUsdt);
        }
        if (_minUsdc > 0) {
            minUsdcPurchase = _minUsdc;
            emit MinPurchaseUpdated("USDC", _minUsdc);
        }
        if (_minWbtc > 0) {
            minWbtcPurchase = _minWbtc;
            emit MinPurchaseUpdated("WBTC", _minWbtc);
        }
        if (_minScr > 0) {
            minScrPurchase = _minScr;
            emit MinPurchaseUpdated("SCR", _minScr);
        }
    }

    /**
     * @dev Pauses the ICO.
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit IcoPaused(msg.sender);
    }

    /**
     * @dev Unpauses the ICO.
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit IcoUnpaused(msg.sender);
    }

    /**
     * @dev Emergency ETH withdrawal function.
     * @notice This is kept for emergency situations only. Normal operations use automatic treasury transfers.
     */
    function emergencyWithdrawEth() external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NoEthToWithdraw();
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ICO: ETH withdrawal failed");
        emit EthWithdrawn(owner(), balance);
    }

    /**
     * @dev Emergency ERC20 token withdrawal function.
     * @param _tokenAddress The address of the ERC20 token to withdraw.
     * @notice This is kept for emergency situations only. Normal operations use automatic treasury transfers.
     */
    function emergencyWithdrawErc20(address _tokenAddress) external onlyRole(ADMIN_ROLE) nonReentrant {
        if (_tokenAddress == address(0)) revert InvalidAddress("token");
        
        IERC20 tokenToWithdraw = IERC20(_tokenAddress);
        uint256 balance = tokenToWithdraw.balanceOf(address(this));
        if (balance == 0) revert NoTokensToWithdraw(_tokenAddress);
        
        tokenToWithdraw.safeTransfer(owner(), balance);
        emit Erc20Withdrawn(_tokenAddress, owner(), balance);
    }

    /**
     * @dev Emergency function to withdraw specific amount of tokens.
     * @param _tokenAddress The address of the ERC20 token to withdraw.
     * @param _amount The amount to withdraw.
     */
    function emergencyWithdraw(address _tokenAddress, uint256 _amount) 
        external 
        onlyRole(ADMIN_ROLE) 
        nonReentrant 
    {
        if (_tokenAddress == address(0)) revert InvalidAddress("token");
        if (_amount == 0) revert InvalidAmount();
        
        IERC20 tokenToWithdraw = IERC20(_tokenAddress);
        {
            uint256 available = tokenToWithdraw.balanceOf(address(this));
            if (available < _amount) revert InsufficientBalance(_tokenAddress, _amount, available);
        }
        
        tokenToWithdraw.safeTransfer(owner(), _amount);
        emit EmergencyErc20Withdrawn(_tokenAddress, owner(), _amount);
    }

    /**
     * @dev Returns current prices for display purposes.
     */
    function getCurrentPrices() external view returns (
        uint256 ethPrice,
        uint256 usdtPrice,
        uint256 usdcPrice,
        uint256 btcPrice,
        uint256 scrPrice
    ) {
        (, int256 ethPriceInt, , , ) = ethUsdPriceFeed.latestRoundData();
        (, int256 usdtPriceInt, , , ) = usdtUsdPriceFeed.latestRoundData();
        (, int256 usdcPriceInt, , , ) = usdcUsdPriceFeed.latestRoundData();
        (, int256 btcPriceInt, , , ) = btcUsdPriceFeed.latestRoundData();
        (, int256 scrPriceInt, , , ) = scrUsdPriceFeed.latestRoundData();
        
        ethPrice = uint256(ethPriceInt);
        usdtPrice = uint256(usdtPriceInt);
        usdcPrice = uint256(usdcPriceInt);
        btcPrice = uint256(btcPriceInt);
        scrPrice = uint256(scrPriceInt);
    }

    /**
     * @dev Returns purchase statistics for analytics.
     */
    function getPurchaseStatistics() external view returns (
        uint256 totalUsdValueEth,
        uint256 totalUsdValueUsdt,
        uint256 totalUsdValueUsdc,
        uint256 totalUsdValueWbtc,
        uint256 totalUsdValueScr,
        uint256 totalVolumeEth,
        uint256 totalVolumeUsdt,
        uint256 totalVolumeUsdc,
        uint256 totalVolumeWbtc,
        uint256 totalVolumeScr
    ) {
        totalUsdValueEth = totalPurchasedByAsset["ETH"];
        totalUsdValueUsdt = totalPurchasedByAsset["USDT"];
        totalUsdValueUsdc = totalPurchasedByAsset["USDC"];
        totalUsdValueWbtc = totalPurchasedByAsset["WBTC"];
        totalUsdValueScr = totalPurchasedByAsset["SCR"];
        
        totalVolumeEth = totalVolumeByAsset["ETH"];
        totalVolumeUsdt = totalVolumeByAsset["USDT"];
        totalVolumeUsdc = totalVolumeByAsset["USDC"];
        totalVolumeWbtc = totalVolumeByAsset["WBTC"];
        totalVolumeScr = totalVolumeByAsset["SCR"];
    }

    /**
     * @dev Preview how many tokens would be received for a given payment.
     * @param _paymentMethod The payment method ("ETH", "USDT", "USDC", "WBTC", "SCR").
     * @param _amount The amount of the payment token.
     * @return tokensToReceive The amount of ICO tokens that would be received.
     * @return usdValue The USD value of the payment.
     */
    function previewTokenPurchase(string calldata _paymentMethod, uint256 _amount) 
        external 
        view 
        returns (uint256 tokensToReceive, uint256 usdValue) 
    {
        if (keccak256(bytes(_paymentMethod)) == keccak256(bytes("ETH"))) {
            usdValue = getEthUsdPrice(_amount);
        } else if (keccak256(bytes(_paymentMethod)) == keccak256(bytes("USDT"))) {
            usdValue = getUsdtUsdPrice(_amount);
        } else if (keccak256(bytes(_paymentMethod)) == keccak256(bytes("USDC"))) {
            usdValue = getUsdcUsdPrice(_amount);
        } else if (keccak256(bytes(_paymentMethod)) == keccak256(bytes("WBTC"))) {
            usdValue = getBtcUsdPrice(_amount);
        } else if (keccak256(bytes(_paymentMethod)) == keccak256(bytes("SCR"))) {
            usdValue = getScrUsdPrice(_amount);
        } else {
            revert InvalidPaymentMethod();
        }
        
        tokensToReceive = calculateTokens(usdValue);
    }

    /**
     * @dev Preview including wallet-cap context for a given beneficiary.
     */
    function previewTokenPurchaseFor(address _beneficiary, string calldata _paymentMethod, uint256 _amount)
        external
        view
        returns (
            uint256 tokensToReceive,
            uint256 usdValue,
            uint256 walletCap,
            uint256 currentBalance,
            uint256 maxAdditionalTokens,
            bool wouldExceedCap
        )
    {
        (tokensToReceive, usdValue) = this.previewTokenPurchase(_paymentMethod, _amount);
        walletCap = maxMBTTokensPerWallet;
        currentBalance = tokenContract.balanceOf(_beneficiary);
        if (walletCap == 0 || walletCap > currentBalance) {
            maxAdditionalTokens = walletCap == 0 ? type(uint256).max : walletCap - currentBalance;
        } else {
            maxAdditionalTokens = 0;
        }
        wouldExceedCap = (walletCap > 0 && (currentBalance + tokensToReceive > walletCap));
    }

    /**
     * @dev Returns how many additional tokens the beneficiary can receive before hitting the cap.
     */
    function getMaxAdditionalTokens(address _beneficiary) external view returns (uint256) {
        if (maxMBTTokensPerWallet == 0) return type(uint256).max;
        uint256 bal = tokenContract.balanceOf(_beneficiary);
        if (bal >= maxMBTTokensPerWallet) return 0;
        return maxMBTTokensPerWallet - bal;
    }

    /**
     * @dev Returns the remaining tokens available for purchase.
     * @return The number of tokens that can still be sold through the ICO.
     */
    function getRemainingTokens() external view returns (uint256) {
        if (totalTokensSold >= maxTokensToSell) {
            return 0;
        }
        return maxTokensToSell - totalTokensSold;
    }

    /**
     * @dev Grants admin role to an account.
     * @param account The account to grant admin role to.
     */
    function grantAdminRole(address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, account);
    }

    /**
     * @dev Revokes admin role from an account.
     * @param account The account to revoke admin role from.
     */
    function revokeAdminRole(address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(ADMIN_ROLE, account);
    }

    /**
     * @dev Checks if an account has admin role.
     * @param account The account to check.
     * @return True if the account has admin role.
     */
    function hasAdminRole(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    /**
     * @dev Updates the treasury wallet address.
     * @param _newTreasuryWallet The new treasury wallet address.
     */
    function updateTreasuryWallet(address _newTreasuryWallet) external onlyRole(ADMIN_ROLE) {
        if (_newTreasuryWallet == address(0)) revert InvalidAddress("treasuryWallet");
        treasuryWallet = _newTreasuryWallet;
        emit TreasuryWalletUpdated(_newTreasuryWallet);
    }

    /**
     * @dev Checks if the ICO is still active (has remaining tokens to sell).
     * @return True if the ICO is still active.
     */
    function isIcoActive() external view returns (bool) {
        return totalTokensSold <= maxTokensToSell;
    }
}