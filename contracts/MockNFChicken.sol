// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./NFChicken.sol";

/**
 * @title MockNFChicken
 * WARNING: use only for testing and debugging purpose
 */
contract MockNFChicken is NFChicken {

    uint256 mockTime = 0;

    constructor(address[] memory admins, uint minApprovalsRequired) NFChicken(admins, minApprovalsRequired) { }

    function setCurrentTime(uint256 time) external {
        mockTime = time;
    }

    function getCurrentTime() public virtual override view returns(uint256) {
        return mockTime;
    }
}
