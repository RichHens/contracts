# HENToken

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

# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy-token.js
# npx hardhat run --network testnet scripts/deploy-token.js
```
