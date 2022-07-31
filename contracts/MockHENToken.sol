// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./HENToken.sol";

/**
 * @title MockHENToken
 * WARNING: use only for testing and debugging purpose
 */
contract MockHENToken is HENToken {

    uint256 mockTime = 0;

    constructor(uint256 _mintingStartAt, MintingPeriod[] memory _mintingPeriods) HENToken(_mintingStartAt, _mintingPeriods) {
    }

    function setCurrentTime(uint256 _time) external {
        mockTime = _time;
    }

    function getCurrentTime() public virtual override view returns(uint256) {
        return mockTime;
    }
}
