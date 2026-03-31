// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {DLT} from "../ERC6960/DLT.sol";

import {DLTPermit} from "../ERC6960/extensions/DLTPermit.sol";
import {DLTEnumerable} from "../ERC6960/extensions/DLTEnumerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MochaBeanToken.sol";
import "../ERC6551/ERC6551Account.sol";
import "../interfaces/tokens/IMochaTreeToken.sol";

/**
 * @title MochaTreeToken
 * @dev Implementation of the Mocha Tree Token (MTT)
 * A token for tokenizing trees in the Mocha ecosystem with bond-based investments and yield rewards
 */

contract MochaTreeToken is
    DLT,
    DLTPermit,
    DLTEnumerable,
    ReentrancyGuard,
    Ownable,
    IMochaTreeToken
{
    address public TreeManager;

    constructor(
        string memory version
    )
        DLT("MochaTreeToken", "MTT")
        DLTPermit("MochaTreeToken", version)
        Ownable(msg.sender)
    {}

    modifier onlyAdmin() {
        require(
            msg.sender == owner() || msg.sender == TreeManager,
            "Only Admin is authorized"
        );
        _;
    }

    function setTreeManagerAddress(address newAddress) external onlyOwner {
        TreeManager = newAddress;
        emit TreeManagerUpdated(newAddress);
    }

    function thirdPartyApprove(
        address owner,
        address spender,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) public onlyAdmin {
        _thirdPartyapprove(owner, spender, mainId, subId, amount);
    }

    function transfer(
        address sender,
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external {
        require(sender != address(0), "DLT: transfer from the zero address");
        require(
            subBalanceOf(sender, mainId, subId) >= amount,
            "DLT: insufficient balance for transfer"
        );
        _transfer(sender, recipient, mainId, subId, amount);
    }

    function allow(
        address sender,
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external {
        _approve(sender, recipient, mainId, subId, amount);
    }

    function mint(
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external onlyAdmin {
        _safeMint(recipient, mainId, subId, amount);
    }

    function burn(
        address account,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) external {
        _burn(account, mainId, subId, amount);
    }

    // Override Required Functions
    function _mint(
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) internal virtual override(DLT, DLTEnumerable) {
        super._mint(recipient, mainId, subId, amount);
    }

    function _burn(
        address recipient,
        uint256 mainId,
        uint256 subId,
        uint256 amount
    ) internal virtual override(DLT, DLTEnumerable) {
        super._burn(recipient, mainId, subId, amount);
    }
}
