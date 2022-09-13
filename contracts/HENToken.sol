// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Access.sol";
//import "hardhat/console.sol";

/**
 * @title HENToken
 */
contract HENToken is ERC20("HEN Token", "HEN"), Access {
    /**
     * Struct of one minting period.
     */
    struct MintingPeriod {
        // duration of minting period in seconds
        uint256 duration;
        // the number of tokens to be minted after the end of the period
        uint256 amount;
    }

    // minting start time in seconds
    uint256 private mintingStartAt;
    // array of minting periods
    MintingPeriod[] private mintingPeriods;


    /**
     * @dev Creates a contract.
     *
     * @param _mintingStartAt - minting start time in seconds
     * @param _mintingPeriods - array of minting periods
     */
    constructor(uint256 _mintingStartAt, MintingPeriod[] memory _mintingPeriods) {
        mintingStartAt = _mintingStartAt;
        for (uint256 i=0; i<_mintingPeriods.length; i++) {
            mintingPeriods.push(_mintingPeriods[i]);
        }

    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     */
    function decimals() public pure override returns(uint8) {
        return 8;
    }

    /**
     * @dev Mints tokens.
     *
     * @param account - tokens will be sent to this account
     * @param amount - amount of token to mint
     */
    function mint(address account, uint amount) public onlyOwner() {
        require(amount <= (totalAvailable() - totalSupply()), "HENToken: Too many tokens to mint");

        _mint(account, amount);
    }

    /**
     * @dev Burns tokens.
     *
     * @param account - tokens will be burned on this account
     * @param amount - amount of token to burn
     */
    // function burn(address account, uint amount) public onlyOwner() {
    //     _burn(account, amount);
    // }

    /**
     * @dev Returns the limit of tokens that can be minted for all time.
     */
    function limitSupply() public view returns(uint) {
        uint256 limitAmount;

        for (uint256 i=0; i<mintingPeriods.length; i++) {
            limitAmount += mintingPeriods[i].amount;
        }

        return limitAmount;
    }

    /**
     * @dev Returns the amount of tokens that can be minted so far.
     */
    function totalAvailable() public view returns(uint) {
        if (getCurrentTime() < mintingStartAt) {
            return 0;
        }

        uint256 availableAmount;
        uint256 elapsedPeriodsTime;
        uint256 elapsedTime = getCurrentTime() - mintingStartAt;

        for (uint256 i=0; i<mintingPeriods.length; i++) {
            elapsedPeriodsTime += mintingPeriods[i].duration;
            if (elapsedPeriodsTime > elapsedTime) {
                break;
            }

            availableAmount += mintingPeriods[i].amount;
        }
        
        return availableAmount;
    }

    /**
     * @dev Returns minting start time in seconds.
     */
    function getMintingStartAt() public view returns(uint) {
        return mintingStartAt;
    }

    /**
     * @dev Returns minting period by an index.
     */
    function getMintingPeriod(uint256 index) public view returns(MintingPeriod memory) {
        return mintingPeriods[index];
    }

    /**
     * @dev Returns minting periods
     */
    function getMintingPeriods() public view returns(MintingPeriod[] memory) {
        return mintingPeriods;
    }

    /**
     * @dev Returns all minting periods.
     */
    function getTotalMintingPeriods() public view returns(uint) {
        return mintingPeriods.length;
    }
}