// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IICO {
    // --- Errors ---
    error InvalidAddress(string what);
    error InvalidBeneficiary();
    error InvalidAmount();
    error AmountBelowMinimum(string asset, uint256 amount, uint256 minimum);
    error TokenTransferFailed();
    error ZeroMint();
    error OracleInvalidPrice(string asset);
    error OraclePriceStale(string asset);
    error OraclePriceTooOld(string asset);
    error OracleRoundIncomplete(string asset);
    error PriceDeviationTooHigh(string asset, uint256 deviationBps, uint256 maxDeviationBps);
    error SlippageExceeded(string asset, uint256 minExpected, uint256 actualTokens);
    error DefaultSlippageExceeded(string asset, uint256 actualSlippageBps, uint256 maxSlippageBps);
    error NoEthToWithdraw();
    error NoTokensToWithdraw(address token);
    error InsufficientBalance(address token, uint256 requested, uint256 available);
    error InvalidPaymentMethod();
    error SlippageToleranceTooHigh(uint256 requested, uint256 maxAllowed);
    error PriceDeviationToleranceTooHigh(uint256 requested, uint256 maxAllowed);
    error OracleCallFailed(string asset);
    error TokenLimitExceeded(uint256 requested, uint256 available, uint256 maxTokens);
    // --- Views ---
    function TOKEN_RATE_USD() external view returns (uint256);

    function totalTokensSold() external view returns (uint256);
    function maxTokensToSell() external view returns (uint256);
    function maxMBTTokensPerWallet() external view returns (uint256);

    function minEthPurchase() external view returns (uint256);
    function minUsdtPurchase() external view returns (uint256);
    function minUsdcPurchase() external view returns (uint256);
    function minWbtcPurchase() external view returns (uint256);
    function minScrPurchase() external view returns (uint256);

    function calculateTokens(uint256 usdAmount) external view returns (uint256 tokenAmount);

    function getEthUsdPrice(uint256 amount) external view returns (uint256 usdValue);
    function getUsdtUsdPrice(uint256 amount) external view returns (uint256 usdValue);
    function getUsdcUsdPrice(uint256 amount) external view returns (uint256 usdValue);
    function getBtcUsdPrice(uint256 amount) external view returns (uint256 usdValue);
    function getScrUsdPrice(uint256 amount) external view returns (uint256 usdValue);

    function getCurrentPrices()
        external
        view
        returns (
            uint256 ethPrice,
            uint256 usdtPrice,
            uint256 usdcPrice,
            uint256 btcPrice,
            uint256 scrPrice
        );

    function getPurchaseStatistics()
        external
        view
        returns (
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
        );

    function previewTokenPurchase(string calldata paymentMethod, uint256 amount)
        external
        view
        returns (uint256 tokensToReceive, uint256 usdValue);

    function previewTokenPurchaseFor(
        address beneficiary,
        string calldata paymentMethod,
        uint256 amount
    )
        external
        view
        returns (
            uint256 tokensToReceive,
            uint256 usdValue,
            uint256 walletCap,
            uint256 currentBalance,
            uint256 maxAdditionalTokens,
            bool wouldExceedCap
        );

    function getMaxAdditionalTokens(address beneficiary) external view returns (uint256);

    function getRemainingTokens() external view returns (uint256);
    function isIcoActive() external view returns (bool);

    // --- Access Control ---
    function ADMIN_ROLE() external view returns (bytes32);
    function grantAdminRole(address account) external;
    function revokeAdminRole(address account) external;
    function hasAdminRole(address account) external view returns (bool);
    
    // --- Treasury Management ---
    function treasuryWallet() external view returns (address);
    function updateTreasuryWallet(address _newTreasuryWallet) external;

    // --- Purchases ---
    function buyTokensWithEth(address beneficiary, uint256 minTokensExpected) external payable;
    function buyTokensWithEthNoProtection(address beneficiary) external payable;

    function buyTokensWithUsdt(uint256 amount, uint256 minTokensExpected) external;
    function buyTokensWithUsdtNoProtection(uint256 amount) external;

    function buyTokensWithUsdc(uint256 amount, uint256 minTokensExpected) external;
    function buyTokensWithUsdcNoProtection(uint256 amount) external;

    function buyTokensWithWbtc(uint256 amount, uint256 minTokensExpected) external;
    function buyTokensWithWbtcNoProtection(uint256 amount) external;

    function buyTokensWithScr(uint256 amount, uint256 minTokensExpected) external;
    function buyTokensWithScrNoProtection(uint256 amount) external;

    // --- Admin (onlyRole(ADMIN_ROLE) in implementation) ---
    function updateSlippageProtection(uint256 maxSlippageBps) external;
    function updatePriceDeviationProtection(uint256 maxDeviationBps) external;
    function updateRecordedPrice(string calldata asset, uint256 price) external;
    function updateMaxMBTTokensPerWallet(uint256 newCap) external;
    function updateMinPurchase(
        uint256 minEth,
        uint256 minUsdt,
        uint256 minUsdc,
        uint256 minWbtc,
        uint256 minScr
    ) external;
    function pause() external;
    function unpause() external;
    function emergencyWithdrawEth() external;
    function emergencyWithdrawErc20(address tokenAddress) external;
    function emergencyWithdraw(address tokenAddress, uint256 amount) external;
    function updatePaymentTokenAddress(string calldata asset, address newAddress) external;

    // --- Events ---
    event TokensPurchased(
        address indexed purchaser,
        address indexed beneficiary,
        string indexed paymentMethod,
        uint256 paymentAmount,
        uint256 tokensReceived,
        uint256 usdValue
    );

    event MinPurchaseUpdated(string asset, uint256 newMinAmount);
    event SlippageProtectionUpdated(uint256 newMaxSlippageBps);
    event PriceDeviationProtectionUpdated(uint256 newMaxDeviationBps);
    event SlippageProtectionTriggered(
        address indexed user,
        string asset,
        uint256 expectedTokens,
        uint256 actualTokens,
        uint256 slippageBps
    );

    // New operational events
    event RecordedPriceUpdated(string asset, uint256 price, uint256 timestamp);
    event EthWithdrawn(address indexed to, uint256 amount);
    event Erc20Withdrawn(address indexed token, address indexed to, uint256 amount);
    event EmergencyErc20Withdrawn(address indexed token, address indexed to, uint256 amount);
    event IcoPaused(address indexed by);
    event IcoUnpaused(address indexed by);
    event TokenLimitReached(uint256 maxTokens, uint256 totalSold);
    event TreasuryWalletUpdated(address indexed newTreasuryWallet);
    event PaymentTokenAddressUpdated(string asset, address previousAddress, address newAddress);
}


