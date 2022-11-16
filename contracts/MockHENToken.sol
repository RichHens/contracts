// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import "./HENToken.sol";

/**
 * @title MockHENToken
 * WARNING: use only for testing and debugging purpose
 */
contract MockHENToken is HENToken {

    uint256 mockTime = 0;

    constructor(
        uint256 mintingStartAt,
        MintingPeriod[] memory mintingPeriods,
        address[] memory minters,
        uint minVotesRequired
    ) HENToken(mintingStartAt, mintingPeriods, minters, minVotesRequired) { }

    function setCurrentTime(uint256 time) external {
        mockTime = time;
    }

    function getCurrentTime() public virtual override view returns(uint256) {
        return mockTime;
    }

    function transferInternal(address from, address to, uint value) public {
        _transfer(from, to, value);
    }

    function mintInternal(address account, uint amount) public {
        _mint(account, amount);
    }
}
