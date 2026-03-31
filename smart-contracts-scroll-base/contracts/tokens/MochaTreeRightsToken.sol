// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./FarmShareToken.sol";
import "../ERC6960/interfaces/IDLTEnumerable.sol";
import "../interfaces/tokens/IMochaTreeRightsToken.sol";
import { MTTRStorage } from "../diamondPattern/storage/MTTRStorage.sol";
import { MTTRFarmLib } from "../diamondPattern/libraries/MTTRFarmLib.sol";
import { MTTRBondLib } from "../diamondPattern/libraries/MTTRBondLib.sol";
import { MTTRYieldLib } from "../diamondPattern/libraries/MTTRYieldLib.sol";


/**
 * @title MochaTreeRightsToken (MTTR) - Multi-Tranche Vault Manager
 * @dev Main ERC4626 vault that manages multiple farm-specific tranches with asset-backed bonds.
 * Each farm represents a single tranche with its own ERC20 share token.
 * Trees serve as collateral for bond issuance with independent yield distribution per farm.
 * 
 
 */
contract MochaTreeRightsToken is IMochaTreeRightsToken, ERC4626, AccessControl, ReentrancyGuard, Pausable {
    using Math for uint256;
    using SafeERC20 for IERC20;

    /* ========== CONSTANTS ========== */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant BOND_MANAGER_ROLE = keccak256("BOND_MANAGER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    uint256 public constant TREE_VALUATION_MBT = 4;
    uint256 public constant BPS_DENOMINATOR = 10000;

    
    /* ========== DIAMOND STORAGE VIEW HELPERS ========== */
    function mochaLandToken() public view override returns (address) { return MTTRStorage.layout().mochaLandToken; }
    function mochaTreeToken() public view override returns (address) { return MTTRStorage.layout().mochaTreeToken; }
    function totalFarms() public view override returns (uint256) { return MTTRStorage.layout().totalFarms; }
    function totalShareTokens() public view override returns (uint256) { return MTTRStorage.layout().totalShareTokens; }
    function totalValueLocked() public view override returns (uint256) { return MTTRStorage.layout().totalValueLocked; }
    function totalActiveBonds() public view override returns (uint256) { return MTTRStorage.layout().totalActiveBonds; }

    function minimumMaturityPeriod() public view override returns (uint256) { return MTTRStorage.layout().minimumMaturityPeriod; }
    function maximumMaturityPeriod() public view override returns (uint256) { return MTTRStorage.layout().maximumMaturityPeriod; }
    function defaultCollateralRatio() public view override returns (uint256) { return MTTRStorage.layout().defaultCollateralRatio; }
    function earlyRedemptionPenaltyBps() public view returns (uint256) { return MTTRStorage.layout().earlyRedemptionPenaltyBps; }
    function getTREE_VALUATION_MBT() public pure override returns (uint256) { return 4; }
    function getBPS_DENOMINATOR() public pure override returns (uint256) { return 10000; }
    function getVAULT_MANAGER_ROLE() public pure override returns (bytes32) { return keccak256("VAULT_MANAGER_ROLE"); }
    function getDEFAULT_ADMIN_ROLE() public pure override returns (bytes32) { return 0x00; }
    
    function _farmConfig(uint256 farmId) internal view returns (MTTRStorage.FarmConfig storage) { return MTTRStorage.layout().farms[farmId]; }
    function _bondPosition(address investor, uint256 bondId) internal view returns (MTTRStorage.BondPosition storage) { return MTTRStorage.layout().bondPositions[investor][bondId]; }
    function _collateral(uint256 farmId) internal view returns (MTTRStorage.CollateralInfo storage) { return MTTRStorage.layout().farmCollateral[farmId]; }
    function _yield(uint256 farmId) internal view returns (MTTRStorage.YieldDistribution storage) { return MTTRStorage.layout().farmYields[farmId]; }
    
   

    /* ========== CONSTRUCTOR ========== */
    
    /**
     * @dev Constructor for the Multi-Tranche Vault Manager
     * @param _asset The ERC20 token used for deposits/withdrawals (MBT)
     * @param _name The name of the vault token (MTTR)
     * @param _symbol The symbol of the vault token (MTTR)
     * @param _mochaLandToken Address of MochaLandToken (MLT) 
     * @param _mochaTreeToken Address of MochaTreeToken (MTT) 
     */
    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _mochaLandToken,
        address _mochaTreeToken
    ) ERC4626(_asset) ERC20(_name, _symbol) {
        require(_mochaLandToken != address(0), "Invalid MLT token address");
        require(_mochaTreeToken != address(0), "Invalid MTT token address");

        // initialize diamond storage defaults
        MTTRStorage.Layout storage l = MTTRStorage.layoutPure();
        l.mochaLandToken = _mochaLandToken;
        l.mochaTreeToken = _mochaTreeToken;
        if (l.defaultCollateralRatio == 0) {
            l.defaultCollateralRatio = 12000; // 120%
        }
        if (l.minimumMaturityPeriod == 0) {
            l.minimumMaturityPeriod = 36;
        }
        if (l.maximumMaturityPeriod == 0) {
            l.maximumMaturityPeriod = 60;
        }
        if (l.earlyRedemptionPenaltyBps == 0) {
            l.earlyRedemptionPenaltyBps = 500; // 5% default penalty
        }

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VAULT_MANAGER_ROLE, msg.sender);
        _grantRole(BOND_MANAGER_ROLE, msg.sender);
    }
    
    /* ========== MLT TOKEN VALIDATION ========== */
    
    /**
     * @dev Validates that a farm exists as an MLT token and caller is owner or authorized
     */
    modifier validFarmOwner(uint256 farmId) {
        require(MTTRStorage.layout().mochaLandToken != address(0), "MLT token not initialized");
        require(farmId > 0, "Invalid farm ID");
        
        // Check if MLT token exists and get owner
        address farmOwner;
        try IERC721(MTTRStorage.layout().mochaLandToken).ownerOf(farmId) returns (address owner) {
            farmOwner = owner;
        } catch {
            revert("Farm does not exist as MLT token");
        }
        
        // Check authorization
        require(
            msg.sender == farmOwner || hasRole(VAULT_MANAGER_ROLE, msg.sender),
            "Not authorized: must be farm owner or vault manager"
        );
        _;
    }
    
    /**
     * @dev Validates that a farm exists as an MLT token (view operations)
     */
    modifier validFarm(uint256 farmId) {
        require(MTTRStorage.layout().mochaLandToken != address(0), "MLT token not initialized");
        require(farmId > 0, "Invalid farm ID");
        
        // Check if MLT token exists
        try IERC721(MTTRStorage.layout().mochaLandToken).ownerOf(farmId) returns (address) {
            // Farm exists
        } catch {
            revert("Farm does not exist as MLT token");
        }
        _;
    }
    
    /**
     * @dev Gets the owner of a farm MLT token
     */
    function _getFarmOwner(uint256 farmId) internal view returns (address) {
        address mlt = MTTRStorage.layout().mochaLandToken;
        require(mlt != address(0), "MLT token not initialized");
        return IERC721(mlt).ownerOf(farmId);
    }
    
    /**
     * @dev Updates the MLT token address (admin only)
     */
    function updateMochaLandToken(address _newMochaLandToken) external onlyRole(ADMIN_ROLE) {
        require(_newMochaLandToken != address(0), "Invalid MLT token address");
        MTTRStorage.layout().mochaLandToken = _newMochaLandToken;
    }
    
    /**
     * @dev Updates the MTT token address (admin only)
     */
    function updateMochaTreeToken(address _newMochaTreeToken) external onlyRole(ADMIN_ROLE) {
        require(_newMochaTreeToken != address(0), "Invalid MTT token address");
        MTTRStorage.layout().mochaTreeToken = _newMochaTreeToken;
    }
    
    /**
     * @dev Check if a farm exists as MLT token and has been added to the vault
     */
    function isFarmValid(uint256 farmId) external view returns (bool) {
        if (MTTRStorage.layout().mochaLandToken == address(0)) return false;
        
        // Check if MLT token exists
        try IERC721(MTTRStorage.layout().mochaLandToken).ownerOf(farmId) returns (address) {
            // Check if farm exists in vault
            return _farmConfig(farmId).farmOwner != address(0);
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Get the MLT token owner for a farm (external helper)
     */
    /* function getFarmMltOwner(uint256 farmId) external view validFarm(farmId) returns (address) {
        return _getFarmOwner(farmId);
    } */
    
    /* ========== MTT TOKEN TREE INFORMATION ========== */
    
    /**
     * @dev Get tree count for a farm from MTT tokens
     * @param farmId The farm ID (mainId in MTT structure)
     * @param farmTokenBoundAccount The farm's token-bound account that owns the trees
     */
    function _getFarmTreeCount(uint256 farmId, address farmTokenBoundAccount) internal view returns (uint256) {
        require(MTTRStorage.layout().mochaTreeToken != address(0), "MTT token not initialized");
        
        // Query total number of tree types (subIds) for this farm
        IDLTEnumerable mttToken = IDLTEnumerable(MTTRStorage.layout().mochaTreeToken);
        return mttToken.subIdBalanceOf(farmTokenBoundAccount, farmId);
    }
    
    /**
     * @dev Get all tree IDs for a farm from MTT tokens  
     * @param farmId The farm ID (mainId in MTT structure)
     */
    function _getFarmTreeIds(uint256 farmId) internal view returns (uint256[] memory) {
        require(MTTRStorage.layout().mochaTreeToken != address(0), "MTT token not initialized");
        
        IDLTEnumerable mttToken = IDLTEnumerable(MTTRStorage.layout().mochaTreeToken);
        return mttToken.getSubIds(farmId);
    }
    

    /**
     * @dev Get all active farm IDs
     * @return activeFarmIds Array of active farm IDs
     */
    function getActiveFarmIds() external view override returns (uint256[] memory) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        uint256 activeCount = 0;
        
        // First pass: count active farms
        for (uint256 i = 1; i <= l.totalFarms; i++) {
            if (l.farms[i].farmOwner != address(0) && l.farms[i].active) {
                activeCount++;
            }
        }
        
        // Second pass: populate array
        uint256[] memory activeFarmIds = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= l.totalFarms; i++) {
            if (l.farms[i].farmOwner != address(0) && l.farms[i].active) {
                activeFarmIds[index] = i;
                index++;
            }
        }
        return activeFarmIds;
    }
  
    
    /**
     * @dev Get farm tree count
     * @param farmId ID of the farm
     * @return treeCount Number of trees
     */
    function getFarmTreeCount(uint256 farmId) external view override validFarm(farmId) returns (uint256) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        
        // Get farm's token-bound account from Diamond storage
        // Note: This requires integration with Diamond to get the farm wallet address
        address farmTokenBoundAccount = address(0); // Placeholder - should get from Diamond
        if (farmTokenBoundAccount == address(0)) {
            // Fallback: use farm owner for now
            farmTokenBoundAccount = _getFarmOwner(farmId);
        }
        
        return _getFarmTreeCount(farmId, farmTokenBoundAccount);
    }
    
    /**
     * @dev Get all tree IDs for a farm
     * @param farmId ID of the farm
     * @return treeIds Array of tree IDs
     */
    function getFarmTreeIds(uint256 farmId) external view override validFarm(farmId) returns (uint256[] memory) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        return _getFarmTreeIds(farmId);
    }
    
    /**
     * @dev Get farm tree information summary
     */
    function getFarmTreeInfo(uint256 farmId) external view override validFarm(farmId) returns (
        uint256 treeCount,
        uint256[] memory treeIds,
        uint256 totalTreeShares
    ) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        
        treeIds = _getFarmTreeIds(farmId);
        treeCount = treeIds.length;
        
        // Calculate total tree shares from MTT token
        IDLTEnumerable mttToken = IDLTEnumerable(MTTRStorage.layout().mochaTreeToken);
        totalTreeShares = mttToken.totalMainSupply(farmId);
    }
    
    /**
     * @dev Refresh tree information for a farm (when trees are added/removed)
     * Updates both vault storage and farm share token information
     * @param farmId The farm to refresh tree information for
     * @param farmTokenBoundAccount The farm's token-bound account
     */
    function refreshFarmTreeInfo(uint256 farmId, address farmTokenBoundAccount) 
        external 
        validFarm(farmId) 
        onlyRole(VAULT_MANAGER_ROLE) 
    {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        require(farmTokenBoundAccount != address(0), "Invalid token-bound account");
        
        // Get updated tree information from MTT tokens
        uint256 newTreeCount = _getFarmTreeCount(farmId, farmTokenBoundAccount);
        uint256[] memory newTreeIds = _getFarmTreeIds(farmId);
        
        // Update vault storage first (before external call)
        l.farms[farmId].treeCount = newTreeCount;
        l.farmCollateral[farmId].totalTrees = newTreeCount;
        l.farmCollateral[farmId].totalValue = newTreeCount * l.farmCollateral[farmId].valuationPerTree;
        
        // Recalculate coverage ratio before external call
        FarmShareToken shareToken = FarmShareToken(payable(l.farms[farmId].shareTokenAddress));
        uint256 totalShares = shareToken.totalSupply();
        if (totalShares > 0) {
            l.farmCollateral[farmId].coverageRatio = 
                (l.farmCollateral[farmId].totalValue * MTTRStorage.BPS_DENOMINATOR) / totalShares;
        }
        l.farmCollateral[farmId].lastUpdated = block.timestamp;
        
        shareToken.updateTreeInfo(newTreeCount, newTreeIds);
        
        emit CollateralUpdated(
            farmId,
            l.farmCollateral[farmId].valuationPerTree,
            l.farmCollateral[farmId].coverageRatio,
            block.timestamp
        );
    }
    
    /* ========== FARM MANAGEMENT ========== */
    
    /**
     * @dev Add a new farm as a tranche with its own share token
     * NOTE: farmId must correspond to existing MLT token ID
     * Tree count and info are dynamically retrieved from MTT tokens
     * @param farmId ID of the farm (must match MLT token ID)
     * @param name Farm name identifier
     * @param farmTokenBoundAccount The farm's token-bound account that owns MTT tokens
     * @param targetAPY Target annual percentage yield in basis points
     * @param maturityPeriod Bond maturity period in months
     * Note: share token identifiers are set internally in MTTRFarmLib
     */
    function addFarm(
        uint256 farmId,
        string memory name,
        address farmTokenBoundAccount,
        uint256 targetAPY,
        uint256 maturityPeriod,
        string memory /* shareTokenName */,
        string memory /* shareTokenSymbol */
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        address shareTokenAddress = MTTRFarmLib.addFarm(
            farmId,
            name,
            farmTokenBoundAccount,
            targetAPY,
            maturityPeriod,
            address(this),
            address(asset())
        );

        MTTRStorage.Layout storage l = MTTRStorage.layout();
        emit FarmAdded(
            farmId,
            name,
            l.farms[farmId].farmOwner,
            l.farms[farmId].treeCount,
            l.farms[farmId].bondValue,
            shareTokenAddress
        );

        return farmId;
    }
    
    /**
     * @dev Update farm configuration
     * @param farmId ID of the farm to update (must match MLT token ID)
     * @param targetAPY New target APY in basis points
     * @param active Whether the farm should accept new investments
     */
    function updateFarm(
        uint256 farmId,
        uint256 targetAPY,
        bool active
    ) external onlyRole(ADMIN_ROLE) {
        require(targetAPY > 0 && targetAPY <= 3000, "APY must be 0-30%");
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        
        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        farm.targetAPY = targetAPY;
        farm.active = active;
    }

    /**
     * @dev Update only the target APY for a farm
     * @param farmId ID of the farm to update (must match MLT token ID)
     * @param newTargetAPY New target APY in basis points (max 30%)
     */
    function updateFarmTargetAPY(
        uint256 farmId,
        uint256 newTargetAPY
    ) external onlyRole(ADMIN_ROLE) {
        require(newTargetAPY > 0 && newTargetAPY <= 3000, "APY must be 0-30%");
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        l.farms[farmId].targetAPY = newTargetAPY;
    }

    /**
     * @dev Update the maturity period for a farm (in months) and reset maturity timestamp from now
     * @param farmId ID of the farm to update (must match MLT token ID)
     * @param newMaturityPeriod New maturity period in months (within configured min/max)
     */
    function updateFarmMaturityPeriod(
        uint256 farmId,
        uint256 newMaturityPeriod
    ) external onlyRole(ADMIN_ROLE) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        require(newMaturityPeriod >= l.minimumMaturityPeriod && newMaturityPeriod <= l.maximumMaturityPeriod, "Invalid maturity");
        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        farm.maturityPeriod = newMaturityPeriod;
        farm.maturityTimestamp = block.timestamp + (newMaturityPeriod * 30 days);
    }

    /**
     * @dev Update minimum time invested for a farm (in seconds)
     * @param farmId ID of the farm to update (must match MLT token ID)
     * @param newMinTimeInvested New minimum time invested in seconds
     */
    function updateFarmMinTimeInvested(
        uint256 farmId,
        uint256 newMinTimeInvested
    ) external onlyRole(ADMIN_ROLE) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        // Optional: cap to farm maturity
        require(newMinTimeInvested <= l.farms[farmId].maturityTimestamp - block.timestamp, "exceeds time to maturity");
        l.farms[farmId].minTimeInvested = newMinTimeInvested;
    }

    /**
     * @dev Update the early redemption penalty for the vault
     * @param newPenaltyBps New penalty in basis points (e.g., 500 = 5%)
     */
    function updateEarlyRedemptionPenalty(uint256 newPenaltyBps) external onlyRole(ADMIN_ROLE) {
        require(newPenaltyBps <= 5000, "Penalty too high - max 50%");
        MTTRStorage.layout().earlyRedemptionPenaltyBps = newPenaltyBps;
    }
    
    /**
     * @dev Update farm investment limits
     * @param farmId ID of the farm to update (must match MLT token ID)
     * @param newMinInvestment New minimum investment amount in MBT
     * @param newMaxInvestment New maximum investment amount in MBT
     */
    function updateFarmInvestmentLimits(
        uint256 farmId,
        uint256 newMinInvestment,
        uint256 newMaxInvestment
    ) external onlyRole(ADMIN_ROLE) {
        require(newMinInvestment > 0, "Min investment must be > 0");
        require(newMaxInvestment > newMinInvestment, "Max investment must be > min investment");
        require(newMaxInvestment <= 1000000 * 10**18, "Max investment too high"); // 1M MBT max
        
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        
        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        farm.minInvestment = newMinInvestment;
        farm.maxInvestment = newMaxInvestment;
        
        emit FarmInvestmentLimitsUpdated(farmId, newMinInvestment, newMaxInvestment, block.timestamp);
    }
    
    /* ========== BOND PURCHASE SYSTEM ========== */
    
    /**
     * @dev Purchase bonds on the current farm tranche selected by the vault
     * @param mbtAmount Amount of MBT tokens to invest
     * Note: Bond positions are non-transferable - they are tied to the original investor
     */
    function purchaseBond(
        uint256 mbtAmount
    ) external  nonReentrant whenNotPaused returns (uint256 bondId) {
        // farm auto-selected in lib via current farm tracker when farmId is 0
        uint256 placeholderFarmId = 0;
        bondId = MTTRBondLib.purchaseBond(placeholderFarmId, mbtAmount, msg.sender, address(asset()));

        MTTRStorage.Layout storage l = MTTRStorage.layout();
        uint256 actualFarmId = l.bondPositions[msg.sender][bondId].farmId;
        emit BondPurchased(
            msg.sender,
            actualFarmId,
            bondId,
            mbtAmount,
            l.bondPositions[msg.sender][bondId].shareTokenAmount
        );
    }
    
    /* ========== VIEW FUNCTIONS ========== */
    
    /**
     * @dev Get farm configuration
     * @param farmId ID of the farm (must match MLT token ID)
     */
    function getFarmConfig(uint256 farmId) external view validFarm(farmId) returns (FarmConfig memory) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        MTTRStorage.FarmConfig storage s = l.farms[farmId];
        return FarmConfig({
            name: s.name,
            farmOwner: s.farmOwner,
            treeCount: s.treeCount,
            targetAPY: s.targetAPY,
            maturityPeriod: s.maturityPeriod,
            bondValue: s.bondValue,
            collateralRatio: s.collateralRatio,
            minInvestment: s.minInvestment,
            maxInvestment: s.maxInvestment,
            shareTokenAddress: s.shareTokenAddress,
            minTimeInvested: s.minTimeInvested,
            active: s.active,
            createdTimestamp: s.createdTimestamp,
            maturityTimestamp: s.maturityTimestamp
        });
    } 
    
    /**
     * @dev Get bond position
     * @param investor Address of the investor
     * @param bondId ID of the bond
     */
    function getBondPosition(
        address investor,
        uint256 bondId
    ) external view returns (BondPosition memory) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(bondId < l.userBondCount[investor], "Invalid bond ID");
        MTTRStorage.BondPosition storage s = l.bondPositions[investor][bondId];
        return BondPosition({
            farmId: s.farmId,
            depositAmount: s.depositAmount,
            shareTokenAmount: s.shareTokenAmount,
            depositTimestamp: s.depositTimestamp,
            maturityTimestamp: s.maturityTimestamp,
            redeemed: s.redeemed
        });
    }

    /**
     * @dev Get all bond positions for a user
     * @param investor Address of the investor
     * @return bondPositions Array of all bond positions for the user
     */
    function getUserBonds(address investor) external view returns (BondPosition[] memory bondPositions) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        uint256 bondCount = l.userBondCount[investor];
        
        bondPositions = new BondPosition[](bondCount);
        for (uint256 i = 0; i < bondCount; i++) {
            MTTRStorage.BondPosition storage s = l.bondPositions[investor][i];
            bondPositions[i] = BondPosition({
                farmId: s.farmId,
                depositAmount: s.depositAmount,
                shareTokenAmount: s.shareTokenAmount,
                depositTimestamp: s.depositTimestamp,
                maturityTimestamp: s.maturityTimestamp,
                redeemed: s.redeemed
            });
        }
    }

    /**
     * @dev Get bond count for a user
     * @param investor Address of the investor
     * @return count Number of bonds owned by the user
     */
    function getUserBondCount(address investor) external view returns (uint256 count) {
        return MTTRStorage.layout().userBondCount[investor];
    }

    /**
     * @dev Get active (non-redeemed) bond positions for a user
     * @param investor Address of the investor
     * @return activeBonds Array of active bond positions
     * @return activeBondIds Array of bond IDs for active positions
     */
    function getUserActiveBonds(address investor) external view returns (
        BondPosition[] memory activeBonds,
        uint256[] memory activeBondIds
    ) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        uint256 bondCount = l.userBondCount[investor];
        
        // First pass: count active bonds
        uint256 activeCount = 0;
        for (uint256 i = 0; i < bondCount; i++) {
            if (!l.bondPositions[investor][i].redeemed) {
                activeCount++;
            }
        }
        
        // Second pass: populate arrays
        activeBonds = new BondPosition[](activeCount);
        activeBondIds = new uint256[](activeCount);
        
        uint256 activeIndex = 0;
        for (uint256 i = 0; i < bondCount; i++) {
            if (!l.bondPositions[investor][i].redeemed) {
                MTTRStorage.BondPosition storage s = l.bondPositions[investor][i];
                activeBonds[activeIndex] = BondPosition({
                    farmId: s.farmId,
                    depositAmount: s.depositAmount,
                    shareTokenAmount: s.shareTokenAmount,
                    depositTimestamp: s.depositTimestamp,
                    maturityTimestamp: s.maturityTimestamp,
                    redeemed: s.redeemed
                });
                activeBondIds[activeIndex] = i;
                activeIndex++;
            }
        }
    }
    
    /**
     * @dev Get farm collateral information
     * @param farmId ID of the farm (must match MLT token ID)
     */
    function getCollateralInfo(uint256 farmId) external view validFarm(farmId) returns (CollateralInfo memory) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        MTTRStorage.CollateralInfo storage s = l.farmCollateral[farmId];
        return CollateralInfo({
            totalTrees: s.totalTrees,
            valuationPerTree: s.valuationPerTree,
            totalValue: s.totalValue,
            coverageRatio: s.coverageRatio,
            liquidationThreshold: s.liquidationThreshold,
            lastUpdated: s.lastUpdated
        });
    }
    
    /**
     * @dev Get farm yield distribution data
     * @param farmId ID of the farm (must match MLT token ID)
     */
    function getYieldDistribution(uint256 farmId) external view validFarm(farmId) returns (YieldDistribution memory) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        MTTRStorage.YieldDistribution storage s = l.farmYields[farmId];
        return YieldDistribution({
            totalYield: s.totalYield,
            distributedYield: s.distributedYield,
            pendingYield: s.pendingYield,
            lastDistribution: s.lastDistribution
        });
    }
    
    /**
     * @dev Get the balance of yield tokens in a farm's share token contract
     * @param farmId ID of the farm (must match MLT token ID)
     */
   /*  function getFarmShareTokenYieldBalance(uint256 farmId) external view validFarm(farmId) returns (uint256) {
        require(farms[farmId].farmOwner != address(0), "Farm not found in vault");
        FarmConfig storage farm = farms[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(farm.shareTokenAddress));
        return shareToken.getAssetBalance();
    } */
    
    /* ========== YIELD DISTRIBUTION ========== */
    
    /**
     * @dev Distribute yield for a specific farm
     * @param farmId ID of the farm (must match MLT token ID)
     * @param yieldAmount Amount of yield to distribute
     */
    function distributeYield(
        uint256 farmId,
        uint256 yieldAmount
    ) external validFarm(farmId) onlyRole(VAULT_MANAGER_ROLE) nonReentrant {
        require(yieldAmount > 0, "Yield amount must be > 0");
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        
        MTTRYieldLib.distributeYield(farmId, yieldAmount, msg.sender, address(asset()));

        emit YieldDistributed(
            farmId,
            l.farmYields[farmId].totalYield,
            yieldAmount,
            block.timestamp
        );
    }
    
    /* ========== BOND REDEMPTION ========== */
    
    /**
     * @dev Redeem a matured bond
     * @param bondId ID of the bond to redeem
     */
    function redeemBond(uint256 bondId) external nonReentrant returns (uint256 redemptionAmount) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(bondId < l.userBondCount[msg.sender], "Invalid bond ID");
        
        MTTRStorage.BondPosition storage position = l.bondPositions[msg.sender][bondId];
        require(!position.redeemed, "Bond already redeemed");
        require(block.timestamp >= position.maturityTimestamp, "Bond not yet matured");
        
        MTTRStorage.FarmConfig storage farm = l.farms[position.farmId];
        
        //Should also check whether user has the farm tokens available for valid redemption
        

        // Calculate redemption amount (principal + yield)
        uint256 principalAmount = position.depositAmount;
       
        redemptionAmount = principalAmount;

         
        // Mark bond as redeemed
        position.redeemed = true;
        l.totalActiveBonds--;
        l.totalValueLocked -= principalAmount;
        
        // Claim any unclaimed yield before burning share tokens
        FarmShareToken shareToken = FarmShareToken(payable(farm.shareTokenAddress));
        shareToken.claimYield();
        
        // Burn farm share tokens
        shareToken.burnFrom(msg.sender, position.shareTokenAmount);
       
        
        // Transfer redemption amount to investor
        IERC20(asset()).safeTransfer(msg.sender, redemptionAmount);
        
        emit BondRedeemed(
            msg.sender,
            position.farmId,
            bondId,
            principalAmount,
            0
        );
    }
    
    /**
     * @dev Early redemption with penalty (before maturity)
     * @param bondId ID of the bond to redeem early
     */
    function redeemBondEarly(uint256 bondId) external nonReentrant returns (uint256 redemptionAmount) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(bondId < l.userBondCount[msg.sender], "Invalid bond ID");
        
        MTTRStorage.BondPosition storage position = l.bondPositions[msg.sender][bondId];
        require(!position.redeemed, "Bond already redeemed");
        require(block.timestamp < position.maturityTimestamp, "Bond already matured - use redeemBond");
        
        MTTRStorage.FarmConfig storage farm = l.farms[position.farmId];

        // Enforce minimum time invested before early redemption is allowed
        if (farm.minTimeInvested > 0) {
            require(block.timestamp >= position.depositTimestamp + farm.minTimeInvested, "min time not met");
        }
        
        // Calculate early redemption penalty using configurable penalty
        uint256 principalAmount = position.depositAmount;
        uint256 penalty = (principalAmount * l.earlyRedemptionPenaltyBps) / BPS_DENOMINATOR;
        redemptionAmount = principalAmount - penalty;
        
        // Add penalty to farm yield pool
        l.farmYields[position.farmId].pendingYield += penalty;

        // Mark bond as redeemed
        position.redeemed = true;
        l.totalActiveBonds--;
        l.totalValueLocked -= principalAmount;
        
        
        // Claim any unclaimed yield before burning share tokens
        FarmShareToken shareToken = FarmShareToken(payable(farm.shareTokenAddress));
        shareToken.claimYield();
        
        // Burn farm share tokens
        shareToken.burnFrom(msg.sender, position.shareTokenAmount);
        
        
        // Transfer redemption amount to investor
        IERC20(asset()).safeTransfer(msg.sender, redemptionAmount);
        
        emit BondRedeemed(
            msg.sender,
            position.farmId,
            bondId,
            redemptionAmount,
            0 // No yield for early redemption?
        );
    }
    
   
    
    /* ========== COLLATERAL MANAGEMENT ========== */
    
    /**
     * @dev Update collateral valuation for a farm
     * @param farmId ID of the farm (must match MLT token ID)
     * @param newValuationPerTree New valuation per tree in wei (18 decimals)
     */
    function updateCollateralValuation(
        uint256 farmId,
        uint256 newValuationPerTree
    ) external validFarm(farmId) onlyRole(ORACLE_ROLE) {
        require(newValuationPerTree > 0, "Valuation must be > 0");
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        
        MTTRStorage.CollateralInfo storage collateral = l.farmCollateral[farmId];
        collateral.valuationPerTree = newValuationPerTree;
        collateral.totalValue = collateral.totalTrees * newValuationPerTree;
        
        // Calculate new coverage ratio
        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        FarmShareToken shareToken = FarmShareToken(payable(farm.shareTokenAddress));
        uint256 outstandingShares = shareToken.totalSupply();
        
        if (outstandingShares > 0) {
            collateral.coverageRatio = (collateral.totalValue * BPS_DENOMINATOR) / outstandingShares;
        }
        
        collateral.lastUpdated = block.timestamp;
        
        // Check if liquidation is needed
        if (collateral.coverageRatio < collateral.liquidationThreshold) {
            _triggerLiquidation(farmId);
        }
        
        emit CollateralUpdated(
            farmId,
            newValuationPerTree,
            collateral.coverageRatio,
            block.timestamp
        );
    }
    
    /**
     * @dev Trigger liquidation for undercollateralized farm
     * @param farmId ID of the farm to liquidate
     */
    function _triggerLiquidation(uint256 farmId) internal {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        farm.active = false; // Stop accepting new investments
        
        // In a full implementation, this would:
        // 1. Auction the farm assets
        // 2. Distribute proceeds to bond holders
        // 3. Handle any shortfall through insurance
        
        // For now, we just mark the farm as inactive
        // The liquidation process would be handled by external contracts
    }
    
    /**
     * @dev Handle farm maturity and final settlement
     * @param farmId ID of the farm that has matured (must match MLT token ID)
     */
    function settleMatureFarm(uint256 farmId) external override validFarm(farmId) onlyRole(VAULT_MANAGER_ROLE) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.farms[farmId].farmOwner != address(0), "Farm not found in vault");
        
        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        require(block.timestamp >= farm.maturityTimestamp, "Farm not yet matured");
        
        MTTRStorage.CollateralInfo storage collateral = l.farmCollateral[farmId];
        MTTRStorage.YieldDistribution storage yieldData = l.farmYields[farmId];
        
        // Calculate total values for event emission
        uint256 totalCollateralValue = collateral.totalValue;
        uint256 totalYieldGenerated = yieldData.totalYield;
        
        // Mark farm as inactive
        farm.active = false;
        
        emit FarmMatured(
            farmId,
            totalCollateralValue,
            totalYieldGenerated,
            block.timestamp
        );
    }
    
    /**
     * @dev Allow investors to rollover matured bonds into new farm bonds
     * @param bondId ID of the matured bond to rollover
     * @param newFarmId ID of the new farm to invest in (must match MLT token ID)
     */
    function rolloverBond(uint256 bondId, uint256 newFarmId) external override validFarm(newFarmId) nonReentrant returns (uint256) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(bondId < l.userBondCount[msg.sender], "Invalid bond ID");
        require(l.farms[newFarmId].farmOwner != address(0), "New farm not found in vault");
        
        MTTRStorage.BondPosition storage oldPosition = l.bondPositions[msg.sender][bondId];
        require(!oldPosition.redeemed, "Bond already redeemed");
        require(block.timestamp >= oldPosition.maturityTimestamp, "Bond not yet matured");
        
        MTTRStorage.FarmConfig storage newFarm = l.farms[newFarmId];
        require(newFarm.active, "New farm not accepting investments");
        require(block.timestamp < newFarm.maturityTimestamp, "New farm bonds matured");
        
        // Calculate redemption amount from old bond
        uint256 principalAmount = oldPosition.depositAmount;
        uint256 totalAmount = principalAmount;
        
        // Claim any unclaimed yield before burning old farm share tokens
        MTTRStorage.FarmConfig storage oldFarm = l.farms[oldPosition.farmId];
        FarmShareToken oldShareToken = FarmShareToken(payable(oldFarm.shareTokenAddress));
        oldShareToken.claimYield();
        oldShareToken.burnFrom(msg.sender, oldPosition.shareTokenAmount);
        
        // Mark old bond as redeemed
        oldPosition.redeemed = true;
        
        // Create new bond with total amount
        require(totalAmount >= newFarm.minInvestment, "Below minimum investment");
        require(totalAmount <= newFarm.maxInvestment, "Above maximum investment");
        
        // Mint new farm share tokens
        FarmShareToken newShareToken = FarmShareToken(payable(newFarm.shareTokenAddress));
        newShareToken.mint(msg.sender, totalAmount);
        
        // Create new bond position
        uint256 newBondId = l.userBondCount[msg.sender]++;
        l.bondPositions[msg.sender][newBondId] = MTTRStorage.BondPosition({
            farmId: newFarmId,
            depositAmount: totalAmount,
            shareTokenAmount: totalAmount,
            depositTimestamp: block.timestamp,
            maturityTimestamp: newFarm.maturityTimestamp,
            redeemed: false
        });
        
        // Update statistics
        l.totalActiveBonds++; // Old bond was marked redeemed, new one created
        
        emit BondPurchased(
            msg.sender,
            newFarmId,
            newBondId,
            totalAmount,
            totalAmount
        );
        
        return newBondId;
    }
    

    
    /* ========== ADMIN FUNCTIONS ========== */
    
    /**
     * @dev Get current storage address
     * @return storageAddress The current storage address (0x0 if using default)
     */
    function getStorageAddress() external view returns (address storageAddress) {
        return MTTRStorage.layout().customStorageAddress;
    }
    
    /**
     * @dev Set custom storage address for vault upgrades
     * @param newStorageAddress The address of the new storage contract
     */
    function setStorageAddress(address newStorageAddress) external onlyRole(ADMIN_ROLE) {
        require(newStorageAddress != address(0), "Invalid storage address");
        require(newStorageAddress != address(this), "Cannot set self as storage");
        
        // Set the custom storage address in the current storage
        MTTRStorage.layout().customStorageAddress = newStorageAddress;
        
        // Emit event for tracking storage changes
        emit StorageAddressUpdated(newStorageAddress, block.timestamp);
    }
    
    /**
     * @dev Pause the contract (emergency only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /* ========== ERC4626 OVERRIDES ========== */
    
    /**
     * @dev Override deposit to prevent direct deposits (must use purchaseBond)
     */
    function deposit(uint256, address) public virtual override(ERC4626, IERC4626) returns (uint256) {
        revert("Use purchaseBond instead");
    }
    
    /**
     * @dev Override mint to prevent direct minting (must use purchaseBond)
     */
    function mint(uint256, address) public virtual override(ERC4626, IERC4626) returns (uint256) {
        revert("Use purchaseBond instead");
    }
    
    /**
     * @dev Override withdraw to prevent direct withdrawals (must use redeemBond)
     */
    function withdraw(uint256, address, address) public virtual override(ERC4626, IERC4626) returns (uint256) {
        revert("Use redeemBond instead");
    }
    
    /**
     * @dev Override redeem to prevent direct redemptions (must use redeemBond)
     */
    function redeem(uint256, address, address) public virtual override(ERC4626, IERC4626) returns (uint256) {
        revert("Use redeemBond instead");
    }
    
    /**
     * @dev View function to get total assets
     */
    function totalAssets() public view virtual override(ERC4626, IERC4626) returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    /* ========== PREVIEW HELPERS ========== */

    /**
     * @dev Preview how many farm share tokens would be minted for a given MBT amount on the current farm
     */
    function previewMintFarmTokens(uint256 mbtAmount) external view returns (uint256 farmId, uint256 shareAmount, uint256 capacityRemaining) {
        require(mbtAmount > 0, "amount > 0");
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        require(l.vaultFarmIds.length > 0, "no farms");

        // Use the caller's current farm index
        uint256 userFarmIndex = l.userCurrentFarmIndex[msg.sender];
        if (userFarmIndex >= l.vaultFarmIds.length) {
            revert("no capacity");
        }

        farmId = l.vaultFarmIds[userFarmIndex];
        MTTRStorage.FarmConfig storage farm = l.farms[farmId];
        MTTRStorage.CollateralInfo storage collateral = l.farmCollateral[farmId];
        require(farm.active, "farm inactive");
        require(block.timestamp < farm.maturityTimestamp, "farm matured");
        require(collateral.valuationPerTree > 0, "invalid valuation");

        uint256 totalSupply_ = IERC20(farm.shareTokenAddress).totalSupply();
        uint256 maxShares = farm.treeCount * 1e18;
        capacityRemaining = maxShares > totalSupply_ ? (maxShares - totalSupply_) : 0;

        // shares proportional to amount over valuation per tree
        shareAmount = (mbtAmount * 1e18) / collateral.valuationPerTree;
        if (shareAmount > capacityRemaining) {
            shareAmount = capacityRemaining;
        }
    }

    /**
     * @dev View current farm id used for auto bond purchases
     */
    function getCurrentFarmId() external view returns (uint256) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        if (l.vaultFarmIds.length == 0 || l.currentFarmIndex >= l.vaultFarmIds.length) return 0;
        return l.vaultFarmIds[l.currentFarmIndex];
    }

    /**
     * @dev View current farm id for a specific user
     */
    function getUserCurrentFarmId(address user) external view returns (uint256) {
        MTTRStorage.Layout storage l = MTTRStorage.layout();
        uint256 userFarmIndex = l.userCurrentFarmIndex[user];
        if (userFarmIndex >= l.vaultFarmIds.length) {
            return 0; // No farms available for this user
        }
        return l.vaultFarmIds[userFarmIndex];
    }

    /**
     * @dev Check if a farm is sold out
     */
    function isFarmSoldOut(uint256 farmId) external view returns (bool) {
        return MTTRStorage.layout().farmSoldOut[farmId];
    }
} 