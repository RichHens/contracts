// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import "./HENToken.sol";

/**
 * @title MockHENToken
 * WARNING: use only for testing and debugging purpose
 */
contract MockHENToken is HENToken {

    uint256 mockTime = 0;

//    constructor(uint256 _mintingStartAt, MintingPeriod[] memory _mintingPeriods) HENToken(_mintingStartAt, _mintingPeriods) {
//    }
    constructor(address[] memory _minters, uint _minVotesRequired) HENToken(_minters, _minVotesRequired) {
    }

    function setCurrentTime(uint256 _time) external {
        mockTime = _time;
    }

//    function getCurrentTime() public virtual override view returns(uint256) {
//        return mockTime;
//    }

    function transferInternal(address from, address to, uint value) public {
        _transfer(from, to, value);
    }

    function mintInternal(address account, uint amount) public {
        _mint(account, amount);
    }
}
