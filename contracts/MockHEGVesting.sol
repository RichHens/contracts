// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "./HEGVesting.sol";

/**
 * @title MockHEGVesting
 * WARNING: use only for testing and debugging purpose
 */
contract MockHEGVesting is HEGVesting {

    uint256 mockTime = 0;

    constructor(
        address token,
        address[] memory admins,
        uint minApprovalsRequired
    ) HEGVesting(token, admins, minApprovalsRequired) { }

    function setCurrentTime(uint256 time) external {
        mockTime = time;
    }

    function getCurrentTime() public virtual override view returns(uint256) {
        return mockTime;
    }
}
