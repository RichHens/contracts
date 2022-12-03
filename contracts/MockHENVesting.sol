// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import "./HENVesting.sol";

/**
 * @title MockHENVesting
 * WARNING: use only for testing and debugging purpose
 */
contract MockHENVesting is HENVesting {

    uint256 mockTime = 0;

    constructor(
        address token,
        address[] memory admins,
        uint minApprovalsRequired
    ) HENVesting(token, admins, minApprovalsRequired) { }

    function setCurrentTime(uint256 time) external {
        mockTime = time;
    }

    function getCurrentTime() public virtual override view returns(uint256) {
        return mockTime;
    }
}
