// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./NFTChicken.sol";

/**
 * @title MockNFTChicken
 * WARNING: use only for testing and debugging purpose
 */
contract MockNFTChicken is NFTChicken {

    uint256 mockTime = 0;

    constructor(
        address[] memory admins,
        uint minApprovalsRequired,
        string memory baseURL
    ) NFTChicken(
        admins,
        minApprovalsRequired,
        baseURL
    ) { }

    function setCurrentTime(uint256 time) external {
        mockTime = time;
    }

    function getCurrentTime() public virtual override view returns(uint256) {
        return mockTime;
    }
}
