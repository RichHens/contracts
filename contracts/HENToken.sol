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
        uint banVoted;
    }


    // ...
    mapping(address => Minter) private minters;
    // ...
    uint private totalMinters;
    // ...
    uint private minVotesRequired;


    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;
    uint private _totalSupply;


    modifier onlyMinter() {
        require(minters[msg.sender].enabled, "HENToken: You are not a minter");
        _;
    }

    // add a voter here
    event BanRequest(address indexed account);
    event BanRevoke(address indexed account);
    event Ban(address indexed account);

    constructor(
        // uint _mintingStartAt,
        // MintingPeriod[] memory _mintingPeriods,
        address[] memory _minters,
        uint _minVotesRequired
    ) {
        require(_minters.length > 0, "HENToken: Minters are required.");
        require(
            _minVotesRequired > 0 &&
            _minVotesRequired <= _minters.length,
            "HENToken: Invalid number of minimum votes."
        );

        for (uint i=0; i<_minters.length; i++) {
            require(_minters[i] != address(0), "HENToken: Zero address.");
            require(!minters[_minters[i]].enabled, "HENToken: Minters are not unique.");

            Minter storage minter = minters[_minters[i]];
            minter.enabled = true;
        }

        totalMinters = _minters.length;
        minVotesRequired = _minVotesRequired;
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

    // ..............................................
    // ..............................................

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
        require(minters[account].enabled, "HENToken: The account is not a minter.");
        require(account != msg.sender, "HENToken: It is forbidden to ban yourself.");
        require(!minters[account].banVotes[msg.sender], "HENToken: The request already exists.");
        
        minters[account].banVotes[msg.sender] = true;
        minters[account].banVoted++;

        emit BanRequest(account);
    }

    function revokeMinterBan(address account) external onlyMinter {
        require(minters[account].banVotes[msg.sender], "HENToken: The request does not exists.");

        minters[account].banVotes[msg.sender] = false;
        minters[account].banVoted--;

        emit BanRevoke(account);
    }

    function banMinter(address account) external onlyMinter {
        require(minters[account].enabled, "HENToken: The account is not a minter.");
        require(account != msg.sender, "HENToken: It is forbidden to ban yourself.");
        require(minters[account].banVoted >= minVotesRequired, "HENToken: Not enough votes.");
        
        minters[account].enabled = false;
        totalMinters--;

        emit Ban(account);
    }

    function getTotalMinters() public view returns (uint) {
        return totalMinters;
    }

    function isMinter(address account) public view returns (bool) {
        return minters[account].enabled;
    }



}