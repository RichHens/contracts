# HENToken (ERC20 Token)

### Multi-signature strategy

All significant functions in the contract are protected by multi-signature strategy.
Responsibility is shares between minters.
The list of minter wallets and the required number of signatures is set during the deployment process and is immutable.

```Solidity 
constructor(
    uint mintingStartAt,
    MintingPeriod[] memory mintingPeriods,
    address[] memory minters,  // <- the list of minter wallets
    uint minApprovalsRequired  // <- the required number of signatures
)
```

However, any minter can be banned by other minters with the required number of requires. 
Any minter can make require for ban by the method

```Solidity 
function requestMinterBan(address account) external onlyMinter
```
if *minApprovalsRequired* requests are reached from different minters, then this minter can be banned by the method. 

```Solidity 
function banMinter(address account) external onlyMinter
```
The minter will be permanently banned. There are no unban options. 
But, until the method *banMinter* is executed, the request can be revoked by the method.

```Solidity 
function revokeMinterBanRequest(address account) external onlyMinter
```

### Minting
The minting is on schedule. The schedule is set during the deployment process and is immutable.
```Solidity 
constructor(
    uint mintingStartAt,  // <- minting start time (unix timestamp)
    MintingPeriod[] memory mintingPeriods, // <- minting periods
    address[] memory minters,
    uint minApprovalsRequired
)
```

*mintingPeriods* is an array of *MintingPeriod* structures.
Each period follows one another from the *mintingStartAt*.
```Solidity
    struct MintingPeriod {
    // duration of minting period in seconds
    uint duration;
    // the number of tokens to be minted after the end of the period
    uint amount;
}
```

The minting process is based on a multi-signature strategy,
so there are three method to collect *minApprovalsRequired* requests.
```Solidity
/**
 * Creates and approves a minting request.
 * 
 * @param recipient - address for transferring tokens
 * @param amount    - number of tokens  
 * @return          - index of request (rIdx)
 */
function requestMinting(address recipient, uint amount) external onlyMinter returns (uint);

/**
 * Approves the minting request.
 *
 * @param - index of request (rIdx)
 *
 * @return - number of approves of the request so far
 */
function approveMintingRequest(uint rIdx) external onlyMinter returns (uint);

/**
 * Revokes the already approved request.
 *
 * @param - index of request (rIdx)
  */
function revokeMintingRequest(uint rIdx) external onlyMinter;
```

When the request has *minApprovalsRequired* approvals, and it's time,
the *mint* method becomes executable.
```Solidity
function mint(uint rIdx) external onlyMinter;
```

# HENVesting

### Multi-signature strategy

As with the HENToken contract, all significant functions in the HENVesting contract are also protected by multi-signature strategy.
Responsibility is shares between admins.
The list of admin wallets and the required number of signatures is set during the deployment process and is immutable.

```Solidity
constructor(
    address token,
    address[] memory admins,   // <- the list of admin wallets
    uint minApprovalsRequired  // <- the required number of signatures
)
```

The idea of administrative control is the same as in HENToken (see above), but instead of the concept of a minter, 
the concept of an administrator is used. The control methods are similar:
```Solidity
function requestAdminBan(address account) external onlyAdmin;
function revokeAdminBanRequest(address account) external onlyAdmin;
function banAdmin(address account) external onlyAdmin;
```

### Creating a vesting schedule

The creating process is based on a multi-signature strategy. For creation a schedule request uses method:
```Solidity
    /**
     * Creates a vesting request.
     *
     * @param account - address of the beneficiary
     * @param startAt - start time of the schedule (unix timestamp)
     * @param periods - array of vesting periods
     * @param revocable - whether the vesting is revocable or not
     *
     * @return vesting schedule id
     */
    function requestCreation(
        address account,
        uint startAt,
        SchedulePeriod[] memory periods,
        bool revocable
    ) external onlyAdmin returns (bytes32);

    /**
     * Structure of one period for the schedule.
     */
    struct SchedulePeriod {
        // duration of vesting period in seconds
        uint duration;
        // the number of tokens to be released after the end of the period
        uint amount;
    }
```
The idea of periods as the same as the minting in HENToken (see above). 
The schedule starts from the *startAt* time,
and after each period, it is allowed to withdraw the specified tokens to the specified address.
There are two methods in order to collect *minApprovalsRequired*.
```Solidity
function approveCreationRequest(bytes32 scheduleId) external onlyAdmin returns (uint);
function revokeCreationRequest(bytes32 scheduleId) external onlyAdmin;
```

Once enough approvals have been collected, the *create* method can be used to enable this schedule.
```Solidity
function create(bytes32 scheduleId) external onlyAdmin;
```

### Revocation a vesting schedule
If the vesting schedule is set to *revocable*,
there is an option to stop it and return all unreleased tokens to the contract account.
This process is also based on a multi-signature strategy.
There are functions with the same concept as before to collect approvals and execute the revocation.
```Solidity
function requestRevocation(bytes32 scheduleId) external onlyAdmin;
function revokeRevocationRequest(bytes32 scheduleId) external onlyAdmin;
function revoke(bytes32 scheduleId) external onlyAdmin returns (uint);
```
If the vesting schedule is set to non-revocable, there are no options to stop it.

### Release tokens

As soon as the time comes, it becomes possible to transfer vesting tokens.
The function *release* can be executed by any admin or a beneficiary of this vesting.
The transaction can only be made to the beneficiary wallet.
```Solidity
/**
 * Releases tokens.
 *
 * @param scheduleId - a vesting schedule ID
 * @param amount      - the amount to release
 *
 * @return amount of released tokens
 */
function release(bytes32 scheduleId, uint amount) public returns (uint);
```

Some helpful functions:
```Solidity
/**
 * Releases all ready to release tokens.
 *
 * @param scheduleId - a vesting schedule ID
 *
 * @return amount of released tokens
 */
function releaseAllByAccount(address account) external returns (uint);

/**
 * Releases all ready to release tokens in all beneficiary schedules.
 *
 * @param account - a beneficiary address
 *
 * @return amount of released tokens
 */
function releaseAllByAccount(address account) external returns (uint) {
```

### Withdraw tokens
All unused tokens can be withdrawn from the contract.
This process is also based on a multi-signature strategy like the others.
```Solidity
/**
 * Creates a withdrawal request. Each request gets an index "rIdx".
 *
 * @param recipient - address for withdrawal of tokens
 * @param amount    - number of tokens
 *
 * @return - index of the request (rIdx) 
 */
function requestWithdrawal(address recipient, uint amount) external onlyAdmin returns (uint);

/**
 * Approves the minting request.
 */
function approveRequestWithdrawal(uint rIdx) external onlyAdmin returns (uint);

/**
 * Revokes the already approved request.
 */
function revokeWithdrawalRequest(uint rIdx) external onlyAdmin;

/**
* Withdraws tokens
*/
function withdraw(uint rIdx) external onlyAdmin;
```

# HENChicken (ERC721 Token)

### User management and minting NFT
Contract support two types of users - admins and minters.
Users with admin roles can be set in the constructor only and can't be added later.
```Solidity 
    constructor(address[] memory admins, uint minApprovalsRequired)
```

While admin users cannot be added, they can be deleted just like minters by the multi-signature.
```Solidity 
    /**
     * Requests/Approves a user deleting.
     *
     * @param role - the user role
     * @param account - the minter user account
     */
    function requestDeletingUser(uint role, address account) external onlyAdmin 
    
    /**
     * Revokes the previous request of deleting a user.
     *
     * @param role - the user role
     * @param account - the minter user account
     */
    function revokeDeletingUserRequest(uint role, address account) external onlyAdmin
    
    /**
     * Deletes a minter from the minter deleting request.
     * It's needed _minApprovalsRequired confirms to allow it.
     *
     * @param role - the user role
     * @param account - the minter user account
     */
     function deleteUser(uint role, address account) external onlyAdmin
```

Admin users can add users with minter roles.
This process is also based on the multi-signature strategy.
```Solidity 
    /**
     * Requests to add a minter user.
     *
     * @param account - the minter user account
     * @param mintingLimit - how many NFT cat mint the minter per day (0 - no limit)
     */
    function requestAddingMinter(address account, uint mintingLimit) external onlyAdmin
    
    /**
     * Approves of the minter adding request
     *
     * @param account - the minter user account from requestAddingMinter() request
     */
    function approveAddingMinterRequest(address account) external onlyAdmin
    
    /**
     * Revokes the previous request of adding a minter.
     *
     * @param account - the minter user account from requestAddingMinter()/approveAddingMinterRequest()
     */
    function revokeAddingMinterRequest(address account) external onlyAdmin
    
    /**
     * Adds the minter from the minter adding request.
     * It's needed _minApprovalsRequired confirms to allow it.
     *
     * @param account - the minter user account from requestAddingMinter()/approveAddingMinterRequest()
     */
    function function addMinter(address account) external onlyAdmin
```

Only minter users can mint NFT.
```Solidity 
    /**
     * Mints one NFT
     *
     * @param to - address to send minted NFT
     * @param tokenURL - NFT URL
     *
     * @returns NFT ID
     */
    function safeMint(address to, string calldata tokenURL) public onlyMinter returns (uint)
    
    /**
     * Mints many NFT
     *
     * @param to - address to send minted NFT
     * @param amount - amount NFT to mint
     * @param tokenURL - Array of NFT URL, they will be distributed evenly among all NFTs
     *
     * @returns last created NFT ID
     */
    function safeMassMint(address to, uint amount, string[] calldata tokenURLs) public onlyMinter returns (uint)
```

The number of NFTs that can be minted by a minter may be limited  while the process of its creation.
See requestAddingMinter() function.

### Pausable interface
Any admin can pause all transactions (transfers and mints).
```Solidity 
    /**
     * Pauses all transactions
     */
    function pause() external onlyAdmin
```

It can be unpaused by the multi-signature.
```Solidity 
    /**
     * Requests unpause
     */
    function requestUnpause() external onlyAdmin
    
    /**
     * Revokes previous unpause request
     */
    function revokeUnpauseRequest() external onlyAdmin
    
    /**
     * Unpauses.
     * It's needed _minApprovalsRequired requests to unpause the contract.
     */
```