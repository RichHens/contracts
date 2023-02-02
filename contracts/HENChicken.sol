// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./ERC165.sol";
import "./IERC721.sol";
import "./IERC721Enumerable.sol";
import "./IERC721Receiver.sol";
import "./IERC721Metadata.sol";

contract HENChicken is ERC165, IERC721Enumerable, IERC721Metadata {

    // Mapping from token ID to owner address
    mapping(uint => address) private _owners;
    // Mapping owner address to token count
    mapping(address => uint) private _balances;
    // Mapping from token ID to approved address
    mapping(uint => address) private _tokenApprovals;
    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    mapping(uint => mapping(address => bool)) private _roles;
    uint public constant ROLE_ADMIN = 0;
    uint public constant ROLE_MINTER = 1;

    //mapping(address => mapping(bytes32 => mapping(address => bool))) private _userRequests;
    mapping(uint => mapping(address => address[])) private _userRequests;
    uint private _minApprovalsRequired;

    mapping(uint => string) private _tokenURIs;

    uint private _currentTokenId;

    uint[] private _allTokens;
    //mapping(address => mapping(uint => uint)) private _ownedTokens;
    mapping(address => uint[]) public _ownedTokens;
    mapping(uint => uint) private _allTokensIndex;
    mapping(uint => uint) public _ownedTokensIndex;

    event AddingUserRequest(uint role, address indexed account, address indexed requester);
    event AddingUserRevocation(uint role, address indexed account, address indexed requester);
    event AddingUser(uint role, address indexed account, address indexed requester);
    event DeletingUserRequest(uint role, address indexed account, address indexed requester);
    event DeletingUserRevocation(uint role, address indexed account, address indexed requester);
    event DeletingUser(uint role, address indexed account, address indexed requester);

    modifier tokenExists(uint tokenId) {
        require(_exists(tokenId), "HENChicken: Token does not exist.");
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
        //return string(abi.encodePacked("ipfs://", _tokenURIs[tokenId]));
        return _tokenURIs[tokenId];
    }

    // function _baseURI() internal view returns (string memory) {
    //     return "ipfs://";
    // }

    function ownerOf(uint tokenId) public view tokenExists(tokenId) returns (address) {
        return _owners[tokenId];
    }

    function balanceOf(address owner) public view returns(uint) {
        require(owner != address(0), "HENChicken: address zero is not a valid owner.");

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

    function safeMint(address to, string calldata tokenURL) public onlyMinter returns (uint) {
        _safeMint(to, _currentTokenId);
        _setTokenURI(_currentTokenId, tokenURL);

        _currentTokenId++;

        return _currentTokenId;
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

    function _transfer(address from, address to, uint tokenId) internal {
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

    function _mint(address to, uint tokenId) internal {
        require(to != address(0), "HENChicken: mint to the zero address.");
        require(!_exists(tokenId), "HENChicken: token already minted.");

        _beforeTokenTransfer(address(0), to, tokenId);

        _owners[tokenId] = to;
        _balances[to]++;

        emit Transfer(address(0), to, tokenId);
    }

    function _safeMint(address to, uint tokenId, bytes memory data) internal {
        _mint(to, tokenId);

        require(_checkOnERC721Received(address(0), to, tokenId, data), "HENChicken: transfer to non ERC721Receiver implementer.");
    }

    function _safeMint(address to, uint tokenId) internal {
        _safeMint(to, tokenId, "");
    }
    
    function _setTokenURI(uint tokenId, string memory _tokenURI) internal tokenExists(tokenId) {
        require(_exists(tokenId), "HENChicken: URI set of nonexistent token");

        _tokenURIs[tokenId] = _tokenURI;
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
    // Enumerable section
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
        //_ownedTokens[to][_length] = tokenId;
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
        //delete _ownedTokens[from][lastTokenIndex];
        _ownedTokens[from].pop();
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Roles section
    // ---------------------------------------------------------------------------------------------------------------
    modifier onlyAdmin() {
        require(hasRole(ROLE_ADMIN, msg.sender), "HENChicken: You are not an admin.");
        _;
    }

    modifier onlyMinter() {
        require(hasRole(ROLE_MINTER, msg.sender), "HENChicken: You are not a minter.");
        _;
    }

    function hasRole(uint role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    function requestAddingUser(uint role, address account) external onlyAdmin {
        require(role == ROLE_MINTER, "HENChicken: Not allowed to add this role.");
        require(!hasRole(role, account), "HENChicken: User already exists.");
        require(!_userRequestExists(role, account, msg.sender), "HENChicken: Request already exists.");

        _userRequests[role][account].push(msg.sender);

        emit AddingUserRequest(role, account, msg.sender);
    }

    function revokeAddingUserRequest(uint role, address account) external onlyAdmin {
        require(_userRequestExists(role, account, msg.sender), "HENChicken: Request doesn't exist.");

        _deleteUserRequest(role, account, msg.sender);

        emit AddingUserRevocation(role, account, msg.sender);
    }

    function addUser(uint role, address account) external onlyAdmin {
        require(role == ROLE_MINTER, "HENChicken: Not allowed to add this role.");
        require(!hasRole(role, account), "HENChicken: User already exists.");
        require(_userRequests[role][account].length >= _minApprovalsRequired, "HENChicken: Not enough requests.");

       _roles[role][account] = true;
       delete _userRequests[role][account];

       emit AddingUser(role, account, msg.sender);
    }

    function requestDeletingUser(uint role, address account) external onlyAdmin {
        require(role == ROLE_ADMIN || role == ROLE_MINTER, "HENChicken: Not allowed to add this role.");
        require(hasRole(role, account), "HENChicken: User does not exist.");
        require(!_userRequestExists(role, account, msg.sender), "HENChicken: Request already exists.");

        _userRequests[role][account].push(msg.sender);

        emit DeletingUserRequest(role, account, msg.sender);
    }

    function revokeDeletingUserRequest(uint role, address account) external onlyAdmin {
        require(_userRequestExists(role, account, msg.sender), "HENChicken: Request doesn't exist.");

        _deleteUserRequest(role, account, msg.sender);

        emit DeletingUserRevocation(role, account, msg.sender);
    }

    function deleteUser(uint role, address account) external onlyAdmin {
        require(role == ROLE_ADMIN || role == ROLE_MINTER, "HENChicken: Not allowed to add this role.");
        require(hasRole(role, account), "HENChicken: User does not exist.");
        require(_userRequests[role][account].length >= _minApprovalsRequired, "HENChicken: Not enough requests.");

       _roles[role][account] = false;
       delete _userRequests[role][account];

       emit AddingUser(role, account, msg.sender);
    }    

//    function getRequesters(uint role, address account) public view returns (address[] memory) {
//        return _userRequests[role][account];
//    }

    function _userRequestExists(uint role, address account, address requester) internal view returns (bool) {
       for (uint i=0; i<_userRequests[role][account].length; i++) {
           if (_userRequests[role][account][i] == requester) {
               return true;
           }
       }

       return false;
    }

    function _deleteUserRequest(uint role, address account, address requester) internal {
        bool found = false;
        uint userRequestLength = _userRequests[role][account].length;

        for (uint i=0; i<userRequestLength-1; i++) {
            if (_userRequests[role][account][i] == requester) {
                found = true;
            }
            if (found) {
                _userRequests[role][account][i] = _userRequests[role][account][i+1];
            }
        }

        if (found || _userRequests[role][account][userRequestLength-1] == requester) {
            _userRequests[role][account].pop();
        }
    }

}
