// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import "./IERC20.sol";

/**
 * @title HENToken
 */
contract HENToken is IERC20 {

    struct Minter {
        bool enabled;
        mapping(address => bool) banVotes;
        uint numBanApprovals;
    }

    struct MintingRequest {
        address recipient;
        uint amount;
        mapping(address => bool) votes;
        uint numApprovals;
        bool executed;
    }

    /**
     * Struct of one minting period.
     */
    struct MintingPeriod {
        // duration of minting period in seconds
        uint duration;
        // the number of tokens to be minted after the end of the period
        uint amount;
    }

    // minting start time in seconds
    uint private _mintingStartAt;
    // array of minting periods
    MintingPeriod[] private _mintingPeriods;

    // ...
    mapping(address => Minter) private _minters;
    // ...
    uint private _totalMinters;
    // ...
    uint private _minVotesRequired;


    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;
    uint private _totalSupply;

    // ...
    MintingRequest[] private _mintingRequests;


    modifier onlyMinter() {
        require(_minters[msg.sender].enabled, "HENToken: You are not a minter");
        _;
    }

    event BanRequest(address indexed voter, address indexed account);
    event BanRevocation(address indexed voter, address indexed account);
    event Ban(address indexed voter, address indexed account);

    event MintingRequestCreation(address indexed minter, uint indexed rIdx, address indexed recipient, uint amount);
    event MintingRequestApproval(address indexed minter, uint indexed rIdx);
    event MintingRequestRevocation(address indexed minter, uint indexed rIdx);
    event Minting(address indexed minter, uint indexed rIdx, address indexed recipient, uint amount);

    constructor(
        uint mintingStartAt,
        MintingPeriod[] memory mintingPeriods,
        address[] memory minters,
        uint minVotesRequired
    ) {
        require(minters.length > 0, "HENToken: Minters are required.");
        require(
            minVotesRequired > 0 &&
            minVotesRequired <= minters.length,
            "HENToken: Invalid number of minimum votes."
        );

        for (uint i=0; i<minters.length; i++) {
            require(minters[i] != address(0), "HENToken: Zero address.");
            require(!_minters[minters[i]].enabled, "HENToken: Minters are not unique.");

            Minter storage minter = _minters[minters[i]];
            minter.enabled = true;
        }

        _totalMinters = minters.length;
        _minVotesRequired = minVotesRequired;

        _mintingStartAt = mintingStartAt;
        for (uint256 i=0; i<mintingPeriods.length; i++) {
            _mintingPeriods.push(mintingPeriods[i]);
        }
    }

    // ..............................................
    // ..............................................
    function requestMinting(address recipient, uint amount) external onlyMinter returns (uint) {
        uint rIdx = _mintingRequests.length;

        MintingRequest storage request = _mintingRequests[rIdx];
        request.recipient = recipient;
        request.amount = amount;
        request.votes[msg.sender] = true;
        request.numApprovals = 1;
        request.executed = false;

        emit MintingRequestCreation(msg.sender, rIdx, recipient, amount);

        return rIdx;
    }

    function approveMintingRequest(uint rIdx) external onlyMinter returns (uint) {
        require(rIdx < _mintingRequests.length, "HENToken: request does not exist.");
        require(!_mintingRequests[rIdx].executed, "HENToken: request is already executed.");
        require(!_mintingRequests[rIdx].votes[msg.sender], "HENToken: request is already approved.");

        _mintingRequests[rIdx].votes[msg.sender] = true;
        _mintingRequests[rIdx].numApprovals++;

        emit MintingRequestApproval(msg.sender, rIdx);

        return _mintingRequests[rIdx].numApprovals;
    }

    function revokeMintingRequest(uint rIdx) external onlyMinter {
        require(rIdx < _mintingRequests.length, "HENToken: request does not exist.");
        require(!_mintingRequests[rIdx].executed, "HENToken: request is already executed.");
        require(_mintingRequests[rIdx].votes[msg.sender], "HENToken: request is not approved.");

        _mintingRequests[rIdx].votes[msg.sender] = false;
        _mintingRequests[rIdx].numApprovals--;

        emit MintingRequestRevocation(msg.sender, rIdx);
    }

    function mint(uint rIdx) external onlyMinter {
        require(rIdx < _mintingRequests.length, "HENToken: request does not exist.");
        require(!_mintingRequests[rIdx].executed, "HENToken: request is already executed.");
        require(_mintingRequests[rIdx].numApprovals >= _minVotesRequired, "HENToken: not enough approves.");
        require(_mintingRequests[rIdx].amount <= (totalAvailable() - totalSupply()), "HENToken: Too many tokens to mint");

        _mint(_mintingRequests[rIdx].recipient, _mintingRequests[rIdx].amount);

        emit Minting(msg.sender, rIdx, _mintingRequests[rIdx].recipient, _mintingRequests[rIdx].amount);
    }

    /**
     * @dev Returns the limit of tokens that can be minted for all time.
     */
    function limitSupply() public view returns(uint) {
        uint256 limitAmount;

        for (uint256 i=0; i<_mintingPeriods.length; i++) {
            limitAmount += _mintingPeriods[i].amount;
        }

        return limitAmount;
    }

    /**
     * @dev Returns the amount of tokens that can be minted so far.
     */
    function totalAvailable() public view returns(uint) {
        if (getCurrentTime() < _mintingStartAt) {
            return 0;
        }

        uint256 availableAmount;
        uint256 elapsedPeriodsTime;
        uint256 elapsedTime = getCurrentTime() - _mintingStartAt;

        for (uint256 i=0; i<_mintingPeriods.length; i++) {
            elapsedPeriodsTime += _mintingPeriods[i].duration;
            if (elapsedPeriodsTime > elapsedTime) {
                break;
            }

            availableAmount += _mintingPeriods[i].amount;
        }

        return availableAmount;
    }

    /**
     * @dev Returns minting start time in seconds.
     */
    function getMintingStartAt() public view returns(uint) {
        return _mintingStartAt;
    }

    /**
     * @dev Returns minting period by an index.
     */
    function getMintingPeriod(uint256 index) public view returns(MintingPeriod memory) {
        return _mintingPeriods[index];
    }

    /**
     * @dev Returns minting periods
     */
    function getMintingPeriods() public view returns(MintingPeriod[] memory) {
        return _mintingPeriods;
    }

    /**
     * @dev Returns all minting periods.
     */
    function getTotalMintingPeriods() public view returns(uint) {
        return _mintingPeriods.length;
    }

    // ..............................................
    // ..............................................
    /**
     * @dev Returns the name of the token.
     */
    function name() external pure returns (string memory) {
        return "HEN Token";
    }

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external pure returns (string memory) {
        return "HEN";
    }

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external pure returns (uint8) {
        return 8;
    }


    // ---------------------------------------------------------------------------------------------------------------
    // ERC20 implementation
    // ---------------------------------------------------------------------------------------------------------------
    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view returns (uint) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view returns (uint) {
        return _balances[account];
    }

    function _mint(address account, uint amount) internal {
        require(account != address(0), "HENToken: Zero address.");

        _totalSupply += amount;
        _balances[account] += amount;

        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev See {IERC20-transfer}.
     */
    function transfer(address to, uint amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     */
    function transferFrom(address from, address to, uint amount) public returns (bool) {
        require(_allowances[from][to] >= amount, "HENToken: insufficient allowance.");

        _allowances[from][to] -= amount;
        _transfer(from, to, amount);

        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view returns (uint) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     */
    function approve(address spender, uint amount) public returns (bool) {
        require(spender != address(0), "HENToken: Zero address.");

        _allowances[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);

        return true;
    }

    /**
     * @dev Moves `amount` of tokens from `from` to `to`.
     */
    function _transfer(address from, address to, uint amount) internal {
        require(from != address(0), "HENToken: Zero address.");
        require(to != address(0), "HENToken: Zero address.");

        require(_balances[from] >= amount, "HENToken: transfer amount exceeds balance.");
        _balances[from] -= amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    // ..............................................
    // ..............................................
    function requestMinterBan(address account) external onlyMinter {
        require(_minters[account].enabled, "HENToken: The account is not a minter.");
        require(account != msg.sender, "HENToken: It is forbidden to ban yourself.");
        require(!_minters[account].banVotes[msg.sender], "HENToken: The request already exists.");
        
        _minters[account].banVotes[msg.sender] = true;
        _minters[account].numBanApprovals++;

        emit BanRequest(msg.sender, account);
    }

    function revokeMinterBan(address account) external onlyMinter {
        require(_minters[account].banVotes[msg.sender], "HENToken: The request does not exists.");

        _minters[account].banVotes[msg.sender] = false;
        _minters[account].numBanApprovals--;

        emit BanRevocation(msg.sender, account);
    }

    function banMinter(address account) external onlyMinter {
        require(_minters[account].enabled, "HENToken: The account is not a minter.");
        require(account != msg.sender, "HENToken: It is forbidden to ban yourself.");
        require(_minters[account].numBanApprovals >= _minVotesRequired, "HENToken: Not enough votes.");
        
        _minters[account].enabled = false;
        _totalMinters--;

        emit Ban(msg.sender, account);
    }

    function getTotalMinters() public view returns (uint) {
        return _totalMinters;
    }

    function isMinter(address account) public view returns (bool) {
        return _minters[account].enabled;
    }

    /**
     * @dev Returns time of the current block.
     */
    function getCurrentTime() public virtual view returns(uint256) {
        return block.timestamp;
    }
}