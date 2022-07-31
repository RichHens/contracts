// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./Utils.sol";
//import "hardhat/console.sol";


/**
 * @title Access
 */
abstract contract Access is Utils {
    /**
     * Struct of one owner.
     */
    struct Owner {
        // owner's address
        address account;
        // the address who added an owner
        address addedBy;
        // when an owner was added
        uint256 addedAt;
        // when an owner can be activated
        uint256 activatedAt;
    }

    // list of all owners
    Owner[] private owners;

    event Added(address account, address addedBy, uint256 addedAt, uint256 activatedAt);
    event Removed(address account, address removedBy, uint256 removedAt);


    /**
     * @dev Checks if you are an owner.
     */
    modifier onlyOwner() {
        require(isOwner(_msgSender()), "Access: You are not an owner");
        _;
    }

    /**
     * @dev Creates a contract with the first owner.
     */
    constructor() {
        owners.push(Owner({
            account: _msgSender(),
            addedBy: _msgSender(),
            addedAt: getCurrentTime(),
            activatedAt: getCurrentTime()
        }));
    }

    /**
     * @dev Returns delays in second when a new owner will be active
     */
    function getAddOwnerDelay() public pure virtual returns(uint256) {
        return 5 days;
    }

    /**
     * @dev Checks if an account is an owner.
     *
     * @param account - address to check
     */
    function isOwner(address account) public view returns(bool) {
        for (uint i=0; i<owners.length; i++) {
            if (owners[i].account == account && owners[i].activatedAt <= getCurrentTime()) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Returns total amount of owners.
     */
    function getTotalOwners() public view returns(uint256) {
        return owners.length;
    }

    /**
     * @dev Returns the owner data by an address.
     *
     * @param account - address of an owner
     */
    function getOwnerByAddress(address account) public view returns(Owner memory) {
        for (uint i=0; i<owners.length; i++) {
            if (owners[i].account == account) {
                return owners[i];
            }
        }

        revert("Access: The owner doesn't exists");
    }

    /**
     * @dev Returns the owner data by an index.
     *
     * @param index - index into the array of owners
     */
    function getOwnerByIndex(uint256 index) public view returns(Owner memory) {
        return owners[index];
    }

    /**
     * @dev Returns the data of all owners.
     */
    function getAllOwners() public view returns(Owner[] memory) {
        return owners;
    }

    /**
     * @dev Adds a new owner. The new owner will be activated in 5 days.
     *
     * @param account - address of a new owner
     */
    function addOwner(address account) public onlyOwner {
        for (uint256 i=0; i<owners.length; i++) {
            if (owners[i].account == account) {
                revert("Access: The owner already exists");
            }
        }

        uint256 currentTime  = getCurrentTime();
        uint256 activateTime = currentTime + getAddOwnerDelay();

        owners.push(Owner({
            account: account,
            addedBy: _msgSender(),
            addedAt: currentTime,
            activatedAt: activateTime
        }));

        emit Added(account, _msgSender(), currentTime, activateTime);
    }

    /**
     * @dev Removes one of owners.
     *
     * @param account - address of a owner
     */
    function removeOwner(address account) public onlyOwner {
        require(_msgSender() != account, "Access: Impossible to delete yourself");

        for (uint256 i=0; i<owners.length; i++) {
            if (owners[i].account == account) {
                if (owners[i].activatedAt <= getCurrentTime()) {
                    revert("Access: The owner is already active");
                }
                delete owners[i];
                for (uint256 j=i; j<owners.length-1; j++) {
                    owners[i] = owners[i + 1];
                }
                owners.pop();

                emit Removed(account, _msgSender(), getCurrentTime());

                break;
            }
        }
    }

}