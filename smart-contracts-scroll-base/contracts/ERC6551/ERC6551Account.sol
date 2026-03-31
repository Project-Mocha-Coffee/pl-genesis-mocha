// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "erc6551/interfaces/IERC6551Account.sol";
import "erc6551/interfaces/IERC6551Executable.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDLTReceiver} from "../ERC6960/interfaces/IDLTReceiver.sol";

contract ERC6551Account is
    IERC165,
    IERC1271,
    IERC6551Account,
    IERC6551Executable,
    IDLTReceiver
{
    uint256 public state;

    receive() external payable {}

    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable virtual returns (bytes memory result) {
        require(_isValidSigner(msg.sender), "Invalid signer");
        require(operation == 0, "Only call operations are supported");

        ++state;

        bool success;
        (success, result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function isValidSigner(
        address signer,
        bytes calldata
    ) external view virtual returns (bytes4) {
        if (_isValidSigner(signer)) {
            return IERC6551Account.isValidSigner.selector;
        }

        return bytes4(0);
    }

    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view virtual returns (bytes4 magicValue) {
        address _owner = owner();
        if (_owner == address(0)) return bytes4(0);

        bool isValid = SignatureChecker.isValidSignatureNow(
            _owner,
            hash,
            signature
        );

        if (isValid) {
            return IERC1271.isValidSignature.selector;
        }

        return bytes4(0);
    }

    function token() public view virtual returns (uint256, address, uint256) {
        // Get the immutable values from the account bytecode
        bytes memory bytecode = address(this).code;
        uint256 offset = bytecode.length - 0x60; // Last 96 bytes contain the data

        bytes memory data = new bytes(0x60);
        assembly {
            extcodecopy(address(), add(data, 0x20), offset, 0x60)
        }

        return abi.decode(data, (uint256, address, uint256));
    }

    function owner() public view virtual returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);

        try IERC721(tokenContract).ownerOf(tokenId) returns (
            address tokenOwner
        ) {
            return tokenOwner;
        } catch {
            return address(0);
        }
    }

    function _isValidSigner(
        address signer
    ) internal view virtual returns (bool) {
        address _owner = owner();
        return _owner != address(0) && signer == _owner;
    }

    function onERC721Received(
        address,
        address,
        uint256 receivedTokenId,
        bytes memory
    ) external view virtual returns (bytes4) {
        _revertIfOwnershipCycle(msg.sender, receivedTokenId);
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) external view virtual returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) external pure virtual returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    // DLT (ERC-6960) receiver implementations to accept MochaTreeToken transfers
    function onDLTReceived(
        address /*operator*/,
        address /*from*/,
        uint256 /*mainId*/,
        uint256 /*subId*/,
        uint256 /*amount*/,
        bytes calldata /*data*/
    ) external pure override returns (bytes4) {
        return IDLTReceiver.onDLTReceived.selector;
    }

    function onDLTBatchReceived(
        address /*operator*/,
        address /*from*/,
        uint256[] memory /*mainIds*/,
        uint256[] memory /*subIds*/,
        uint256[] memory /*amounts*/,
        bytes calldata /*data*/
    ) external pure override returns (bytes4) {
        return IDLTReceiver.onDLTBatchReceived.selector;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public pure virtual returns (bool) {
        return (interfaceId == type(IERC6551Account).interfaceId ||
            interfaceId == type(IERC6551Executable).interfaceId ||
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IDLTReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId);
    }

    /**
     * @dev Helper method to check if a received token is in the ownership chain of the wallet.
     * @param receivedTokenAddress The address of the token being received.
     * @param receivedTokenId The ID of the token being received.
     */
    function _revertIfOwnershipCycle(
        address receivedTokenAddress,
        uint256 receivedTokenId
    ) internal view virtual {
        (
            uint256 _chainId,
            address _contractAddress,
            uint256 _tokenId
        ) = token();
        require(
            _chainId != block.chainid ||
                receivedTokenAddress != _contractAddress ||
                receivedTokenId != _tokenId,
            "Cannot own yourself"
        );

        address currentOwner = owner();
        require(currentOwner != address(this), "Token in ownership chain");
        uint256 depth = 0;
        while (currentOwner.code.length > 0) {
            try IERC6551Account(payable(currentOwner)).token() returns (
                uint256 chainId,
                address contractAddress,
                uint256 tokenId
            ) {
                require(
                    chainId != block.chainid ||
                        contractAddress != receivedTokenAddress ||
                        tokenId != receivedTokenId,
                    "Token in ownership chain"
                );
                // Advance up the ownership chain
                currentOwner = IERC721(contractAddress).ownerOf(tokenId);
                require(
                    currentOwner != address(this),
                    "Token in ownership chain"
                );
            } catch {
                break;
            }
            unchecked {
                ++depth;
            }
            if (depth == 5) revert("Ownership chain too deep");
        }
    }

    //any other smart contract interactions will be handled by encoding
    //the transactions on the front end and calling execute()
}
