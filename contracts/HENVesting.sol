// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./Access.sol";


/**
 * @title HENVesting
 */
contract HENVesting /*is Context, Access*/ {
    using SafeERC20 for IERC20;
    /**
     * The struct of one admin.
     */
    struct Admin {
        // enabled/disabled flag
        bool enabled;
        // the number of admins that request a ban on this account
        uint numBanRequests;
    }

    /**
     * Structure of one period for the schedule.
     */
    struct SchedulePeriod {
        // duration of vesting period in seconds
        uint256 duration;
        // the number of tokens to be released after the end of the period
        uint256 amount;
    }

    /**
     * Structure of the schedule for one vesting.
     */
    struct Schedule {
        // beneficiary account address
        address account;
        // schedule start time (unix timestamp)
        uint256 startAt;
        // array of schedule periods
        SchedulePeriod[] periods;
        // total duration of all periods (in seconds)
        uint256 duration;
        // total number of reserved tokens for all periods
        uint256 reservedTokens;
        // number of released tokens
        uint256 releasedTokens;
        // number of revoked tokens. if value > 0 that means this schedule is revoked.
        uint256 revokedTokens;
        // is this schedule revocable?
        bool isRevocable;
    }

    // address of the ERC20 token
    IERC20 immutable private _token;

    // total number of reserved tokens for all schedules
    uint256 private totalReservedTokens;
    // total number of released tokens for all schedules
    uint256 private totalReleasedTokens;
    // total number of revoked tokens for all schedules
    uint256 private totalRevokedTokens;
    // total number of schedules for all beneficiaries
    uint256 private totalSchedules;
    // total number of beneficiaries
    uint256 private totalBeneficiaries;
    // map: scheduleId -> schedule
    mapping(bytes32 => Schedule) private schedules;
    // map: account -> total number of schedules
    mapping(address => uint256) private beneficiaries;

    // list of all administrators (address => Admin struct)
    mapping(address => Admin) private _admins;
    // list of all addresses that request for admin ban (account for ban => (requester account => isRequested))
    mapping(address => mapping(address => bool)) private _adminBanRequests;
    // total number of administrators
    uint private _totalAdmins;
    // how many admins must approve a create/revoke/withdraw/ban request
    uint private _minApprovalsRequired;

    event BanRequest(address indexed requester, address indexed account);
    event BanRevocation(address indexed requester, address indexed account);
    event Ban(address indexed requester, address indexed account);

    event Created(bytes32 scheduleId);
    event Released(bytes32 scheduleId, uint256 releasedTokens);
    event Revoked(bytes32 scheduleId, uint256 unreleasedTokens);
    event Withdrew(uint256 amount);


    constructor(
        address token,
        address[] memory admins,
        uint minApprovalsRequired
    ) {
        require(token != address(0));
        require(admins.length > 0, "HENVesting: Admins are required.");
        require(
            minApprovalsRequired > 0 &&
            minApprovalsRequired <= admins.length,
            "HENVesting: Invalid number of minimum votes."
        );

        for (uint i=0; i<admins.length; i++) {
            require(admins[i] != address(0), "HENVesting: Zero address.");
            require(!_admins[admins[i]].enabled, "HENVesting: Admins are not unique.");

            Admin storage admin = _admins[admins[i]];
            admin.enabled = true;
        }

        _totalAdmins = admins.length;
        _minApprovalsRequired = minApprovalsRequired;

        _token = IERC20(token);
    }

    /**
     * @dev Returns the schedule by ID.
     *
     * @param scheduleId - uniq schedule ID
     */
    function getScheduleById(bytes32 scheduleId) public view returns(Schedule memory) {
        return schedules[scheduleId];
    }

    /**
     * @dev Returns the schedule by a beneficiary address.
     *
     * @param account - a beneficiary address
     * @param index - index of schedule
     */
    function getScheduleByAccount(address account, uint256 index) public view returns(Schedule memory) {
        return schedules[generateScheduleId(account, index)];
    }

    /**
     * @dev Returns a list of shedule ID for the beneficiary by its address.
     *
     * @param account - a beneficiary address
     */
    // function getScheduleIdsByAccount(address account) public view returns(bytes32[] memory) {
    //     bytes32[] memory ids;
    //     for (uint256 i=0; i<totalBeneficiaries; i++) {
    //         ids.push(generateScheduleId(account, i));
    //     }
    //     return ids;
    // }

    /**
     * @dev Returns the total amount of schedules.
     */
    function getTotalSchedules() public view returns(uint256) {
        return totalSchedules;
    }

    /**
     * @dev Returns the total number of tokens in this contract (balance of the contract).
     */
    function getTotalTokens() public view returns(uint256) {
        return _token.balanceOf(address(this));
    }

    /**
     * @dev Returns the total number of reserved tokens.
     */
    function getTotalReservedTokens() public view returns(uint256) {
        return totalReservedTokens;
    }

    /**
     * @dev Returns the total number of released tokens.
     */
    function getTotalReleasedTokens() public view returns(uint256) {
        return totalReleasedTokens;
    }

    /**
     * @dev Returns the total number of revoked tokens.
     */
    function getTotalRevokedTokens() public view returns(uint256) {
        return totalRevokedTokens;
    }

    /**
     * @dev Returns the total number of available tokens.
     */
    function getTotalAvailableTokens() public view returns(uint256) {
        return getTotalTokens() - getTotalReservedTokens();
    }

    /**
     * @dev Returns the total amount of schedules for the beneficiary.
     *
     * @param account - a beneficiary address
     */
    function getTotalSchedulesByAccount(address account) public view returns(uint256) {
        return beneficiaries[account];
    }

    /**
     * @dev Returns the total number of reserved tokens for the benificiary.
     *
     * @param account - a beneficiary address
     */
    function getTotalReservedTokensByAccount(address account) public view returns(uint256) {
        Schedule memory schedule;
        uint256 totalAmount;
        for (uint256 i=0; i<beneficiaries[account]; i++) {
            schedule = schedules[generateScheduleId(account, i)];
            totalAmount += schedule.reservedTokens;
        }
        return totalAmount;
    }

    /**
     * @dev Returns the total number of released tokens for the benificiary.
     *
     * @param account - a beneficiary address
     */
    function getTotalReleasedTokensByAccount(address account) public view returns(uint256) {
        Schedule memory schedule;
        uint256 totalAmount;
        for (uint256 i=0; i<beneficiaries[account]; i++) {
            schedule = schedules[generateScheduleId(account, i)];
            totalAmount += schedule.releasedTokens;
        }
        return totalAmount;
    }

    /**
     * @dev Returns the total number of tokens which ready to release for the benificiary.
     *
     * @param account - a beneficiary address
     */
    function getTotalUnreleasedTokensByAccount(address account) public view returns(uint256) {
        uint256 totalAmount;
        for (uint256 i=0; i<beneficiaries[account]; i++) {
            totalAmount += computeReleasableAmount(generateScheduleId(account, i));
        }
        return totalAmount;
    }

    /**
     * @dev Returns the total number of revoked tokens for the benificiary.
     *
     * @param account - a beneficiary address
     */
    function getTotalRevokedTokensByAccount(address account) public view returns(uint256) {
        Schedule memory schedule;
        uint256 totalAmount;
        for (uint256 i=0; i<beneficiaries[account]; i++) {
            schedule = schedules[generateScheduleId(account, i)];
            totalAmount += schedule.revokedTokens;
        }
        return totalAmount;
    }

    /**
    * @dev Creates a new vesting schedule.
    *
    * @param account - address of the beneficiary
    * @param startAt - start time of the vesting period in seconds
    * @param periods - array of vesting periods
    * @param isRevocable - whether the vesting is revocable or not
    *
    * @return vesting schedule id
    */
    function create(
        address account,
        uint256 startAt,
        SchedulePeriod[] memory periods,
        bool isRevocable
    ) public onlyAdmin returns(bytes32) {
        require(account != address(0), "HENVesting: Zero address");

        uint256 totalAmount;
        uint256 totalDuration;

        for (uint256 i=0; i<periods.length; i++) {
            totalDuration += periods[i].duration;
            totalAmount   += periods[i].amount;
        }

        require(totalDuration > 0, "HENVesting: Empty duration");
        require(totalAmount > 0, "HENVesting: Empty amount");
        require(totalAmount < getTotalAvailableTokens(), "HENVesting: Not enough sufficient tokens");

        bytes32 scheduleId = generateScheduleId(account, beneficiaries[account]);
        Schedule storage schedule = schedules[scheduleId];

        schedule.account        = account;
        schedule.startAt        = startAt;
        schedule.isRevocable    = isRevocable;
        schedule.reservedTokens = totalAmount;
        schedule.duration       = totalDuration;
        for (uint256 i=0; i<periods.length; i++) {
            schedule.periods.push(
                SchedulePeriod({
                    duration: periods[i].duration,
                    amount:   periods[i].amount
                })
            );
        }

        if (beneficiaries[account] == 0) {
            totalBeneficiaries++;
        }
        beneficiaries[account]++;
        totalSchedules++;
        totalReservedTokens += totalAmount;

        emit Created(scheduleId);

        return scheduleId;
    }

    /**
    * @dev Releases tokens.
    *
    * @param scheduleId - a vesting schedule ID
    * @param amount - the amount to release
    *
    * @return amount of released tokens
    */
    function release(bytes32 scheduleId, uint amount) public returns(uint) {
        Schedule storage schedule = schedules[scheduleId];

        require(
            (msg.sender == schedule.account) || isAdmin(msg.sender),
            "HENVesting: Only beneficiary or owner can release vested tokens"
        );

        require(schedule.account != address(0), "HENVesting: Zero address");
        require(schedule.revokedTokens == 0, "HENVesting: Schedule is revoked");
        require(amount != 0, "HENVesting: Zero amount");
        require(amount <= computeReleasableAmount(scheduleId), "HENVesting: Not enough vesting tokens");

        address payable accountPayable = payable(schedule.account);
        _token.safeTransfer(accountPayable, amount);
        
        schedule.reservedTokens -= amount;
        schedule.releasedTokens += amount;
        totalReservedTokens -= amount;
        totalReleasedTokens += amount;

        emit Released(scheduleId, amount);

        return amount;
    }

    /**
    * @dev Releases all ready to release tokens in the schedule.
    *
    * @param scheduleId - a vesting schedule ID
    *
    * @return amount of released tokens
    */
    function releaseAllByScheduleId(bytes32 scheduleId) public returns(uint) {
        return release(scheduleId, computeReleasableAmount(scheduleId));
    }

    /**
    * @dev Releases all ready to release tokens in all beneficiary schedules.
    *
    * @param account - a beneficiary address
    *
    * @return amount of released tokens
    */
    function releaseAllByAccount(address account) public returns(uint) {
        bytes32 scheduleId;
        uint256 totalAmount;
        for (uint256 i=0; i<beneficiaries[account]; i++) {
            scheduleId   = generateScheduleId(account, i);
            totalAmount += release(scheduleId, computeReleasableAmount(scheduleId));
        }
        return totalAmount;
    }

    /**
    * @dev Revokes a vesting schedule.
    *
    * @param scheduleId - a vesting schedule ID
    *
    * @return amount of unreleased tokens
    */
    function revoke(bytes32 scheduleId) public onlyAdmin returns(uint) {
        Schedule storage schedule = schedules[scheduleId];

        require(schedule.account != address(0), "HENVesting: Zero address");
        require(schedule.isRevocable, "HENVesting: Schedule is not revocable");
        require(schedule.revokedTokens == 0, "HENVesting: Schedule is already revoked");
        require(schedule.reservedTokens > 0, "HENVesting: Nothing to revoke");

        schedule.revokedTokens  = schedule.reservedTokens;
        schedule.reservedTokens = 0;
        totalRevokedTokens  += schedule.revokedTokens;
        totalReservedTokens -= schedule.revokedTokens;

        emit Revoked(scheduleId, schedule.revokedTokens);

        return schedule.revokedTokens;
    }

    /**
    * @dev Withdraws tokens
    *
    * @param amount the amount to withdraw
    */
    function withdraw(uint256 amount) public onlyAdmin {
        require(this.getTotalAvailableTokens() >= amount, "HENVesting: not enough withdrawable funds");

        _token.safeTransfer(msg.sender, amount);

        emit Withdrew(amount);
    }

    /**
    * @dev Computes ready to release tokens for the vesting schedule.
    *
    * @return amount of releasable tokens
    */
    function computeReleasableAmount(bytes32 scheduleId) public view returns(uint256) {
        Schedule memory schedule = schedules[scheduleId];

        if (getCurrentTime() < schedule.startAt || schedule.revokedTokens > 0) {
            return 0;
        }

        uint256 releasableAmount;
        uint256 elapsedPeriodsTime;
        uint256 elapsedTime = getCurrentTime() - schedule.startAt;

        for (uint256 i=0; i<schedule.periods.length; i++) {
            elapsedPeriodsTime += schedule.periods[i].duration;
            if (elapsedPeriodsTime > elapsedTime) {
                break;
            }

            releasableAmount += schedule.periods[i].amount;
        }
        
        return releasableAmount > schedule.releasedTokens
            ? releasableAmount - schedule.releasedTokens
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

    // ---------------------------------------------------------------------------------------------------------------
    // Work with admins
    // ---------------------------------------------------------------------------------------------------------------
    modifier onlyAdmin() {
        require(_admins[msg.sender].enabled, "HENVesting: You are not an admin.");
        _;
    }

    /**
     * Requests the ban for the admin.
     * It's needed _minApprovalsRequired confirms to allow the ban.
     */
    function requestAdminBan(address account) external onlyAdmin {
        require(_admins[account].enabled, "HENVesting: The account is not an admin.");
        require(account != msg.sender, "HENVesting: It is forbidden to ban yourself.");
        require(!_adminBanRequests[account][msg.sender], "HENVesting: The request already exists.");

        _adminBanRequests[account][msg.sender] = true;
        _admins[account].numBanRequests++;

        emit BanRequest(msg.sender, account);
    }

    /**
     * Revokes a previous ban request
     */
    function revokeAdminBanRequest(address account) external onlyAdmin {
        require(_adminBanRequests[account][msg.sender], "HENVesting: The request does not exists.");

        _adminBanRequests[account][msg.sender] = false;
        _admins[account].numBanRequests--;

        emit BanRevocation(msg.sender, account);
    }

    /**
     * Bans the admin
     * It's needed _minApprovalsRequired confirms to allow the ban.
     */
    function banAdmin(address account) external onlyAdmin {
        require(_admins[account].enabled, "HENVesting: The account is not an admin.");
        require(account != msg.sender, "HENVesting: It is forbidden to ban yourself.");
        require(_admins[account].numBanRequests >= _minApprovalsRequired, "HENVesting: Not enough requests.");

        _admins[account].enabled = false;
        _totalAdmins--;

        emit Ban(msg.sender, account);
    }

    /**
     * Returns the total number of admin
     */
    function getTotalAdmins() external view returns (uint) {
        return _totalAdmins;
    }

    /**
     * Check if the account is an admin
     */
    function isAdmin(address account) public view returns (bool) {
        return _admins[account].enabled;
    }


    // ---------------------------------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------------------------------
    /**
     * @dev Returns time of the current block. (for using in mock)
     */
    function getCurrentTime() public virtual view returns(uint256) {
        return block.timestamp;
    }
}