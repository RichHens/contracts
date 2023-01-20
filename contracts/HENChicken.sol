// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "./ERC165.sol";
import "./IERC721.sol";
import "./IERC721Receiver.sol";
import "./IERC721Metadata.sol";

contract HENChicken is ERC165, IERC721, IERC721Metadata {

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;
    // Mapping owner address to token count
    mapping(address => uint256) private _balances;
    // Mapping from token ID to approved address
    mapping(uint256 => address) private _tokenApprovals;
    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    mapping(uint => mapping(address => bool)) private _roles;
    uint public constant ROLE_ADMIN = 0;
    uint public constant ROLE_MINTER = 1;

    //mapping(address => mapping(bytes32 => mapping(address => bool))) private _userRequests;
    mapping(uint => mapping(address => address[])) private _userRequests;
    uint private _minApprovalsRequired;

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
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function name() public view virtual override returns (string memory) {
        return 'HENChicken';
    }

    function symbol() public view virtual override returns (string memory) {
        return 'HEN';
    }

    function tokenURI(uint256 tokenId) public view tokenExists(tokenId) returns (string memory) {
        //string memory baseURI = _baseURI();
        //return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
        return "";
    }

    function _baseURI() internal view virtual returns (string memory) {
        return "https://richhens.com/chickens/";
    }

    function ownerOf(uint256 tokenId) public view tokenExists(tokenId) returns (address) {
        return _owners[tokenId];
    }

    function balanceOf(address owner) public view returns(uint) {
        require(owner != address(0), "HENChicken: address zero is not a valid owner.");

        return _balances[owner];
    }

    function getApproved(uint tokenId) public view tokenExists(tokenId) returns(address) {
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) public view returns(bool) {
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

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId), "HENChicken: caller is not token owner or approved.");

        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint tokenId, bytes memory data) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "HENChicken: caller is not token owner or approved.");

        _safeTransfer(from, to, tokenId, data);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
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

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "HENChicken: transfer from incorrect owner.");
        require(to != address(0), "HENChicken: transfer to the zero address.");

        delete _tokenApprovals[tokenId];

        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal virtual {
        _transfer(from, to, tokenId);

        require(_checkOnERC721Received(from, to, tokenId, data), "HENChicken: transfer to non ERC721Receiver implementer.");
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 ret) {
                return ret == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("HENChicken: transfer to non ERC721Receiver implementer");
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

       emit DeletingUser(role, account, msg.sender);
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
