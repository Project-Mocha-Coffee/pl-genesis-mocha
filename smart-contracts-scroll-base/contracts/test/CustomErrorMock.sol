// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CustomErrorMock {
    function failWithData() external pure {
        bytes memory data = new bytes(100);
        assembly {
            revert(add(data, 32), 100)
        }
    }
}
