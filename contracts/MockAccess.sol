// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./Access.sol";

/**
 * @title MockAccess
 * WARNING: use only for testing and debugging purpose
 */
contract MockAccess is Access {

    uint256 mockTime = 0;

    constructor() Access() {
    }

    function setCurrentTime(uint256 _time) external {
        mockTime = _time;
    }

    function getCurrentTime() public virtual override view returns(uint256) {
        return mockTime;
    }
}
