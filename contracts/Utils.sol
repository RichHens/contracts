// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";


/**
 * @title Utils
 */
abstract contract Utils is Context {
    /**
     * @dev Returns time of the current block.
     */
    function getCurrentTime() public virtual view returns(uint256) {
        return block.timestamp;
    }
}