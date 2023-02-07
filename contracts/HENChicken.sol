// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./ERC165.sol";
import "./IERC721.sol";
import "./IERC721Enumerable.sol";
import "./IERC721Receiver.sol";
import "./IERC721Metadata.sol";

contract HENChicken is ERC165, IERC721Enumerable, IERC721Metadata {
    /**
     * Token storage
     */
    mapping(uint => address) private _owners;
    mapping(address => uint) private _balances;
    mapping(uint => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /**
     * Metadata
     */
    mapping(uint => string) private _tokenURIs;

    /**
     * Token counter
     */
    uint private _nextTokenId;

    /**
     * User management
     */
    struct MinterCreationRequest {
        mapping(address => bool) accounts;
        uint approveCounter;
        uint mintingLimit;
    }
    mapping(address => MinterCreationRequest) private _minterCreationRequests;
    mapping(uint => mapping(address => address[])) private _userDeleteRequests;
    uint private _minApprovalsRequired;

    /**
     * Enumerable
     */
    uint[] private _allTokens;
    mapping(address => uint[]) private _ownedTokens;
    mapping(uint => uint) private _allTokensIndex;
    mapping(uint => uint) private _ownedTokensIndex;

    /**
     * Minting limit
     */
    mapping(address => uint8) public _lastMintedWeekDay;
    mapping(address => uint) public _mintedToday;
    mapping(address => uint) public _minterLimits;

    /**
     * Roles
     */
    mapping(uint => mapping(address => bool)) private _roles;
    uint public constant ROLE_ADMIN = 0;
    uint public constant ROLE_MINTER = 1;

    /**
     * Pausable
     */
    bool private _paused;
    address[] private _unpauseRequests;

    event AddingMinterRequest(address indexed account, address indexed requester, uint mintintLimit);
    event AddingMinterApprove(address indexed account, address indexed requester);
    event AddingMinterRevocation(address indexed account, address indexed requester);
    event AddingMinter(address indexed account, address indexed requester);
    event DeletingUserRequest(uint role, address indexed account, address indexed requester);
    event DeletingUserRevocation(uint role, address indexed account, address indexed requester);
    event DeletingUser(uint role, address indexed account, address indexed requester);
    event Pause(address indexed requester);
    event UnpauseRequest(address indexed requester);
    event UnpauseRevocation(address indexed requester);
    event Unpause(address indexed requester);

    modifier tokenExists(uint tokenId) {
        require(_exists(tokenId), "HENChicken: Token does not exist.");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ROLE_ADMIN, msg.sender), "HENChicken: You are not an admin.");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(ROLE_MINTER, msg.sender), "HENChicken: You are not a minter.");
        _;
    }

    modifier unpaused() {
        require(!_paused, "HENChicken: Paused.");
        _;
    }

    constructor(address[] memory admins, uint minApprovalsRequired) {
        require(admins.length > 0, "HENVesting: Admins are required.");
        require(
            minApprovalsRequired > 0 &&
            minApprovalsRequired <= admins.length,
            "HENChicken: Invalid number of minimum votes."
        );

        for (uint i=0; i<admins.length; i++) {
            require(admins[i] != address(0), "HENChicken: Zero address.");
            require(!_roles[ROLE_ADMIN][admins[i]], "HENChicken: Admins are not unique.");

            _roles[ROLE_ADMIN][admins[i]] = true;
        }

        _minApprovalsRequired = minApprovalsRequired;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Token storage
    // ---------------------------------------------------------------------------------------------------------------
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721Enumerable).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function name() public pure returns (string memory) {
        return 'HENChicken';
    }

    function symbol() public pure returns (string memory) {
        return 'HEN';
    }

    function tokenURI(uint tokenId) public view tokenExists(tokenId) returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function ownerOf(uint tokenId) public view tokenExists(tokenId) returns (address) {
        return _owners[tokenId];
    }

    function balanceOf(address owner) public view returns(uint) {
        require(owner != address(0), "HENChicken: Address zero is not a valid owner.");

        return _balances[owner];
    }

    function getApproved(uint tokenId) public view tokenExists(tokenId) returns (address) {
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function approve(address to, uint tokenId) external {
        address _owner = ownerOf(tokenId);

        require(to != _owner, "HENChicken: approval to current owner");

        require(
            _owner == msg.sender || isApprovedForAll(_owner, msg.sender),
            "HENChicken: approve caller is not token owner or approved for all."
        );

        _tokenApprovals[tokenId] = to;

        emit Approval(_owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(msg.sender != operator, "HENChicken: approve to caller.");

        _operatorApprovals[msg.sender][operator] = approved;

        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId), "HENChicken: caller is not token owner or approved.");

        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint tokenId, bytes memory data) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "HENChicken: caller is not token owner or approved.");

        _safeTransfer(from, to, tokenId, data);
    }

    function safeTransferFrom(address from, address to, uint tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeMassMint(address to, uint amount, string[] calldata tokenURLs) public onlyMinter returns (uint) {
        require(_checkOnERC721Received(address(0), to, _nextTokenId, ""), "HENChicken: Transfer to non ERC721Receiver implementer.");

        _massMint(to, amount, tokenURLs);

        return _nextTokenId - 1;
    }

    function safeMint(address to, string calldata tokenURL) public onlyMinter returns (uint) {
        require(_checkOnERC721Received(address(0), to, _nextTokenId, ""), "HENChicken: Transfer to non ERC721Receiver implementer.");

        _mint(to, tokenURL);

        return _nextTokenId - 1;
    }

    function _exists(uint tokenId) internal view returns(bool) {
        return _owners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint tokenId) internal view returns(bool) {
        address owner = ownerOf(tokenId);

        return (
            spender == owner ||
            isApprovedForAll(owner, spender) ||
            getApproved(tokenId) == spender
        );
    }

    function _transfer(address from, address to, uint tokenId) internal unpaused {
        require(ownerOf(tokenId) == from, "HENChicken: transfer from incorrect owner.");
        require(to != address(0), "HENChicken: transfer to the zero address."); // ???

        _beforeTokenTransfer(from, to, tokenId);

        delete _tokenApprovals[tokenId];

        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _safeTransfer(address from, address to, uint tokenId, bytes memory data) internal {
        _transfer(from, to, tokenId);

        require(_checkOnERC721Received(from, to, tokenId, data), "HENChicken: transfer to non ERC721Receiver implementer.");
    }

    function _mint(address to, string calldata tokenURL) internal unpaused {
        require(to != address(0), "HENChicken: mint to the zero address.");
        require(!_isMintingLimited(msg.sender, 1), "HENChicken: riched the token limit.");

        _beforeTokenTransfer(address(0), to, _nextTokenId);

        _owners[_nextTokenId] = to;
        _tokenURIs[_nextTokenId] = tokenURL;

        _balances[to]++;

        emit Transfer(address(0), to, _nextTokenId);

        _nextTokenId++;
    }

    function _massMint(address to, uint amount, string[] calldata tokenURLs) internal unpaused {
        require(to != address(0), "HENChicken: Mint to the zero address.");
        require(!_isMintingLimited(msg.sender, amount), "HENChicken: Minting limit.");

        uint _tokenURLIndex = 0;

        for (uint i=0; i<amount; i++) {
            _beforeTokenTransfer(address(0), to, _nextTokenId);

            _owners[_nextTokenId] = to;
            _tokenURIs[_nextTokenId] = tokenURLs[_tokenURLIndex];

            emit Transfer(address(0), to, _nextTokenId);

            _nextTokenId++;
            _tokenURLIndex = _tokenURLIndex < tokenURLs.length - 1
                ? _tokenURLIndex + 1
                : 0
            ;
        }

        _balances[to] += amount;
    }

    function _beforeTokenTransfer(address from, address to, uint tokenId) internal {
        if(from == address(0)) {
            _addTokenToAllTokensEnumeration(tokenId);
        } else if(from != to) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
        }

        if(to == address(0)) {
            _removeTokenFromAllTokensEnumeration(tokenId);
        } else if(to != from) {
            _addTokenToOwnerEnumeration(to, tokenId);
        }
    }

    function _isMintingLimited(address account, uint amount) internal returns (bool) {
        uint8 weekDay = _getCurrentWeekday();
        if (_lastMintedWeekDay[account] != weekDay) {
            _mintedToday[account] = 0;
            _lastMintedWeekDay[account] = weekDay;
        }

        if (_minterLimits[account] == 0 || _mintedToday[account] + amount <= _minterLimits[account]) {
            _mintedToday[account] += amount;
            return false;
        }

        return true;
    }

    function _getCurrentWeekday() private view returns (uint8) {
        return uint8((block.timestamp / 86400 + 4) % 7);
    }

    function _checkOnERC721Received(address from, address to, uint tokenId, bytes memory data) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 ret) {
                return ret == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("HENChicken: transfer to non ERC721Receiver implementer.");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }


    // ---------------------------------------------------------------------------------------------------------------
    // Enumerable interface
    // ---------------------------------------------------------------------------------------------------------------
    function totalSupply() public view returns (uint) {
        return _allTokens.length;
    }

    function tokenByIndex(uint index) external view returns (uint) {
        require(index < totalSupply(), "HENChicken: Out of bonds.");

        return _allTokens[index];
    }

    function tokenOfOwnerByIndex(address owner, uint index) external view returns (uint) {
        require(index < balanceOf(owner), "HENChicken: Out of bonds.");

        return _ownedTokens[owner][index];
    }

    function tokensByOwner(address owner) external view returns (uint[] memory) {
        return _ownedTokens[owner];
    }

    function _addTokenToAllTokensEnumeration(uint tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }

    function _removeTokenFromAllTokensEnumeration(uint tokenId) private {
        uint lastTokenIndex = _allTokens.length - 1;
        uint tokenIndex = _allTokensIndex[tokenId];

        uint lastTokenId = _allTokens[lastTokenIndex];

        _allTokens[tokenIndex] = lastTokenId;
        _allTokensIndex[lastTokenId] = tokenIndex;

        delete _allTokensIndex[tokenId];
        _allTokens.pop();
    }

    function _addTokenToOwnerEnumeration(address to, uint tokenId) private {
        uint _length = balanceOf(to);

        _ownedTokensIndex[tokenId] = _length;
        _ownedTokens[to].push(tokenId);
    }

    function _removeTokenFromOwnerEnumeration(address from, uint tokenId) private {
        uint lastTokenIndex = balanceOf(from) - 1;
        uint tokenIndex = _ownedTokensIndex[tokenId];

        if (tokenIndex != lastTokenIndex) {
            uint lastTokenId = _ownedTokens[from][lastTokenIndex];
            _ownedTokens[from][tokenIndex] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = tokenIndex;
        }

        delete _ownedTokensIndex[tokenId];
        _ownedTokens[from].pop();
    }


    // ---------------------------------------------------------------------------------------------------------------
    // Pausable interface
    // ---------------------------------------------------------------------------------------------------------------
    function pause() external onlyAdmin {
        _paused = true;

        emit Pause(msg.sender);
    }

    function requestUnpause() external onlyAdmin {
        require(_paused, "HENChicken: Not paused.");
        require(!_addressInArray(_unpauseRequests, msg.sender), "HENChicken: Request already exists.");

        _unpauseRequests.push(msg.sender);

        emit UnpauseRequest(msg.sender);
    }

    function revokeUnpauseRequest() external onlyAdmin {
        require(_addressInArray(_unpauseRequests, msg.sender), "HENChicken: Request does not exist.");

        _deleteAddressInArray(_unpauseRequests, msg.sender);

        emit UnpauseRevocation(msg.sender);
    }

    function unpause() external onlyAdmin {
        require(_paused, "HENChicken: Not unpaused.");
        require(_unpauseRequests.length >= _minApprovalsRequired, "HENChicken: Not enough requests.");

        _paused = false;
        delete _unpauseRequests;

        emit Unpause(msg.sender);
    }


    // ---------------------------------------------------------------------------------------------------------------
    // User management
    // ---------------------------------------------------------------------------------------------------------------
    function hasRole(uint role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    function requestAddingMinter(address account, uint mintingLimit) external onlyAdmin {
        require(!hasRole(ROLE_MINTER, account), "HENChicken: User already exists.");
        require(_minterCreationRequests[account].approveCounter == 0, "HENChicken: Request already exists.");

        _minterCreationRequests[account].accounts[msg.sender] = true;
        _minterCreationRequests[account].approveCounter = 1;
        _minterCreationRequests[account].mintingLimit = mintingLimit;

        emit AddingMinterRequest(account, msg.sender, mintingLimit);
    }

    function approveAddingMinterRequest(address account) external onlyAdmin {
        require(_minterCreationRequests[account].approveCounter > 0, "HENChicken: Request does not exist.");
        require(!_minterCreationRequests[account].accounts[msg.sender], "HENChicken: Approve aleady exists.");

        _minterCreationRequests[account].accounts[msg.sender] = true;
        _minterCreationRequests[account].approveCounter++;

        emit AddingMinterApprove(account, msg.sender);
    }

    function revokeAddingMinterRequest(address account) external onlyAdmin {
        require(_minterCreationRequests[account].accounts[msg.sender], "HENChicken: Approve does not exist.");

        _minterCreationRequests[account].accounts[msg.sender] = false;
        _minterCreationRequests[account].approveCounter--;

        if (_minterCreationRequests[account].approveCounter == 0) {
            delete _minterCreationRequests[account];
        }

        emit AddingMinterRevocation(account, msg.sender);
    }

    function addMinter(address account) external onlyAdmin {
        require(!hasRole(ROLE_MINTER, account), "HENChicken: User already exists.");
        require(_minterCreationRequests[account].approveCounter >= _minApprovalsRequired, "HENChicken: Not enough approvals.");

        _roles[ROLE_MINTER][account] = true;
        _minterLimits[account] = _minterCreationRequests[account].mintingLimit;
        delete _minterCreationRequests[account];

        emit AddingMinter(account, msg.sender);
    }

    function requestDeletingUser(uint role, address account) external onlyAdmin {
        require(role == ROLE_ADMIN || role == ROLE_MINTER, "HENChicken: Role does not exist.");
        require(hasRole(role, account), "HENChicken: User does not exist.");
        require(!_addressInArray(_userDeleteRequests[role][account], msg.sender), "HENChicken: Request already exists.");

        _userDeleteRequests[role][account].push(msg.sender);

        emit DeletingUserRequest(role, account, msg.sender);
    }

    function revokeDeletingUserRequest(uint role, address account) external onlyAdmin {
        require(_addressInArray(_userDeleteRequests[role][account], msg.sender), "HENChicken: Request doesn't exist.");

        _deleteAddressInArray(_userDeleteRequests[role][account], msg.sender);

        emit DeletingUserRevocation(role, account, msg.sender);
    }

    function deleteUser(uint role, address account) external onlyAdmin {
        require(hasRole(role, account), "HENChicken: User does not exist.");
        require(_userDeleteRequests[role][account].length >= _minApprovalsRequired, "HENChicken: Not enough requests.");

       _roles[role][account] = false;
       delete _userDeleteRequests[role][account];

       delete _minterLimits[account];
       delete _mintedToday[account];

       emit DeletingUser(role, account, msg.sender);
    }    

    function _addressInArray(address[] storage arr, address account) internal view returns (bool) {
       for (uint i=0; i<arr.length; i++) {
            if (arr[i] == account) {
               return true;
            }
       }

       return false;
    }

    function _deleteAddressInArray(address[] storage arr, address account) internal {
        bool found = false;

        for (uint i=0; i<arr.length-1; i++) {
            if (arr[i] == account) {
                found = true;
            }
            if (found) {
                arr[i] = arr[i+1];
            }
        }
        if (found || arr[arr.length-1] == account) {
            arr.pop();
        }
    }

}
