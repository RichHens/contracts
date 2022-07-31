// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./Access.sol";


/**
 * @title HENTokenVesting
 */
contract HENTokenVesting is Context, Access {
    using SafeERC20 for IERC20;

    /**
     * Struct of one vesting period.
     */
    struct SchedulePeriod {
        // duration of veting period in seconds
        uint256 duration;
        // the number of tokens to be released after the end of the period
        uint256 amount;
    }

    /**
     * Struct of vesting.
     */
    struct Schedule {
        // address of token beneficiary
        address beneficiary;
        // start time of the vesting period in seconds
        uint256 start;
        // cliff period in seconds
        uint256 cliff;
        // array of schedule periods
        SchedulePeriod[] periods;
        // total time of all periods
        uint256 duration;
        // total amount of tokens of all periods
        uint256 amount;
        // amount of tokens released
        uint256 released;
        // whether or not the vesting is revocable
        bool revocable;
        // whether or not the vesting has been revoked
        bool revoked;
    }

    // address of the ERC20 token
    IERC20 immutable private _token;

    // total amount of reserved tokens for all vesting schedules
    uint256 private reservedTokens;
    // total amount of vesting schedules
    uint256 private totalSchedules;
    // map of vesting schedules, key is unique ID of a schedule
    mapping(bytes32 => Schedule) private schedules;
    // map of beneficiary's counts, key is beneficiary's address
    mapping(address => uint256) private beneficiaryCounts;

    event CreatedSchedule(bytes32 scheduleId);
    event Released(bytes32 scheduleId, uint256 releasedTokens);
    event Revoked(bytes32 scheduleId, uint256 unreleasedTokens);

    /**
     * @dev Creates a contract.
     *
     * @param token_ address of the ERC20 token contract
     */
    constructor(address token_) {
        require(token_ != address(0));
        _token = IERC20(token_);
    }

    /**
     * @dev Returns a schedule by ID.
     *
     * @param scheduleId - a vesting schedule ID
     */
    function getScheduleById(bytes32 scheduleId) public view returns(Schedule memory) {
        return schedules[scheduleId];
    }

    /**
     * @dev Returns a schedule by beneficiary address.
     *
     * @param account - a beneficiary address
     * @param index - index of schedule
     */
    function getScheduleByBeneficiary(address account, uint256 index) public view returns(Schedule memory) {
        return schedules[generateScheduleId(account, index)];
    }

    /**
     * @dev Returns the number of schedules for the beneficiary.
     *
     * @param account - a beneficiary address
     */
    function getTotalScheduleForBeneficiary(address account) public view returns(uint256) {
        return beneficiaryCounts[account];
    }

    /**
     * @dev Returns the total amount of schedules.
     */
    function getTotalSchedules() public view returns(uint256) {
        return totalSchedules;
    }

    /**
     * @dev Returns the total number of tokens in this contract.
     */
    function getTotalTokens() public view returns(uint256) {
        return _token.balanceOf(address(this));
    }

    /**
     * @dev Returns the total number of reserved vesting tokens.
     */
    function getReservedTokens() public view returns(uint256) {
        return reservedTokens;
    }

    /**
     * @dev Returns the total number of available tokens.
     */
    function getAvailableTokens() public view returns(uint256) {
        return getTotalTokens() - getReservedTokens();
    }

    /**
    * @dev Creates a new vesting schedule.
    *
    * @param _beneficiary - address of the beneficiary
    * @param _start - start time of the vesting period in seconds
    * @param _cliff - duration in seconds of the cliff
    * @param _periods - array of vesting periods
    * @param _revocable - whether the vesting is revocable or not
    *
    * @return vesting schedule id
    */
    function createSchedule(
        address _beneficiary,
        uint256 _start,
        uint256 _cliff,
        SchedulePeriod[] memory _periods,
        bool _revocable
    ) public onlyOwner returns(bytes32) {
        require(_beneficiary != address(0), "HENTokenVesting: Zero address");

        uint256 totalAmount;
        uint256 totalDuration;

        for (uint256 i=0; i<_periods.length; i++) {
            totalDuration += _periods[i].duration;
            totalAmount   += _periods[i].amount;
        }

        require(totalDuration > 0, "HENTokenVesting: Empty duration");
        require(totalAmount > 0, "HENTokenVesting: Empty amount");
        require(totalAmount < getAvailableTokens(), "HENTokenVesting: Not enough sufficient tokens");

        bytes32 scheduleId        = generateScheduleId(_beneficiary, beneficiaryCounts[_beneficiary]++);
        Schedule storage schedule = schedules[scheduleId];

        schedule.beneficiary = _beneficiary;
        schedule.start       = _start;
        schedule.cliff       = _cliff;
        schedule.revocable   = _revocable;
        schedule.amount      = totalAmount;
        schedule.duration    = totalDuration;
        for (uint256 i=0; i<_periods.length; i++) {
            schedule.periods.push(
                SchedulePeriod({
                    duration: _periods[i].duration,
                    amount:   _periods[i].amount
                })
            );
        }

        reservedTokens += totalAmount;
        totalSchedules++;

        emit CreatedSchedule(scheduleId);

        return scheduleId;
    }

    /**
    * @dev Releases vested amount of tokens.
    *
    * @param scheduleId - a vesting schedule ID
    * @param amount - the amount to release
    *
    * @return amount of released tokens
    */
    function release(bytes32 scheduleId, uint amount) public returns(uint) {
        Schedule storage schedule = schedules[scheduleId];

        require(
            (_msgSender() == schedule.beneficiary) || isOwner(_msgSender()),
            "HENTokenVesting: Only beneficiary or owner can release vested tokens"
        );

        require(schedule.beneficiary != address(0), "HENTokenVesting: Zero address");
        require(!schedule.revoked, "HENTokenVesting: Schedule is revoked");
        require(amount != 0, "HENTokenVesting: Zero amount");
        require(amount <= computeReleasableAmount(scheduleId), "HENTokenVesting: Not enough vesting tokens");

        address payable beneficiaryPayable = payable(schedule.beneficiary);
        _token.safeTransfer(beneficiaryPayable, amount);
        
        schedule.released += amount;
        reservedTokens -= amount;

        emit Released(scheduleId, amount);

        return amount;
    }

    /**
    * @dev Releases all vested amount of tokens so far.
    *
    * @param scheduleId - a vesting schedule ID
    *
    * @return amount of released tokens
    */
    function releaseAll(bytes32 scheduleId) public returns(uint) {
        return release(scheduleId, computeReleasableAmount(scheduleId));
    }

    /**
    * @dev Revokes a vesting schedule.
    *
    * @param scheduleId - a vesting schedule ID
    *
    * @return amount of unreleased tokens
    */
    function revoke(bytes32 scheduleId) public onlyOwner returns(uint) {
        Schedule storage schedule = schedules[scheduleId];

        require(schedule.beneficiary != address(0), "HENTokenVesting: Zero address");
        require(!schedule.revoked, "HENTokenVesting: Schedule is already revoked");
        require(schedule.revocable, "HENTokenVesting: Schedule is not revokable");

        schedule.revoked = true;

        uint256 unreleased = schedule.amount - schedule.released;
        reservedTokens -= unreleased;

        emit Revoked(scheduleId, unreleased);

        return unreleased;
    }

    /**
    * @dev Withdraws tokens
    *
    * @param amount the amount to withdraw
    */
    function withdraw(uint256 amount) public onlyOwner {
        require(this.getAvailableTokens() >= amount, "HENTokenVesting: not enough withdrawable funds");

        _token.safeTransfer(_msgSender(), amount);
    }

    /**
    * @dev Computes the releasable amount of tokens for a vesting schedule.
    *
    * @return amount of releasable tokens
    */
    function computeReleasableAmount(bytes32 scheduleId) public view returns(uint256) {
        Schedule memory schedule = schedules[scheduleId];

        if (getCurrentTime() < schedule.start || schedule.cliff > getCurrentTime() || schedule.revoked) {
            return 0;
        }

        uint256 releasableAmount;
        uint256 elapsedPeriodsTime;
        uint256 elapsedTime = getCurrentTime() - schedule.start;

        for (uint256 i=0; i<schedule.periods.length; i++) {
            elapsedPeriodsTime += schedule.periods[i].duration;
            if (elapsedPeriodsTime > elapsedTime) {
                break;
            }

            releasableAmount += schedule.periods[i].amount;
        }
        
        return releasableAmount > schedule.released
            ? releasableAmount - schedule.released
            : 0;
    }

    /**
    * @dev Generates the vesting schedule identifier.
    *
    * @param account - account address
    * @param index - next schedule index
    *
    * @return unique vesting schedule id
    */
    function generateScheduleId(address account, uint256 index) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(account, index));
    }
}