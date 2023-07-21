const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    MIN_APPROVALS_REQUIRED = 3;
let
    minter1,
    minter2,
    minter3,
    minter4,
    minter5,
    notMinter,
    minters = [],
    token;


/**
 * ------------------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------------------
 */
describe('HEG Token: Minting request access tests', function () {

    beforeEach(async function () {
        [minter1, minter2, minter3, minter4, minter5, notMinter] = await ethers.getSigners();
        // the first minter must be the owner of the contract
        minters = [minter1, minter2, minter3, minter4, minter5];
        const HEGToken = await ethers.getContractFactory("MockHEGToken", minter1);
        token = await HEGToken.deploy(
            0,
            [[0, 1000]],
            [
                minter1.address,
                minter2.address,
                minter3.address,
                minter4.address,
                minter5.address
            ],
            MIN_APPROVALS_REQUIRED
        );
        await token.deployed();
        await token.setCurrentTime(0);
    });


    /**
     * Minting with varying number of approvals
     */
    describe('Request tests', function () {
        // ----------------------------------------------------------------------------
        it("enough approvals (approvals == MIN_APPROVALS_REQUIRED)", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await mintSuccess(minter1, rIdx, notMinter.address, 1);
            expect(await token.balanceOf(notMinter.address))
                .to.be.eq(1);
        });

        // ----------------------------------------------------------------------------
        it("not enough approvals (approvals == MIN_APPROVALS_REQUIRED - 1)", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED - 1; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await mintFailed(minter1, rIdx, "HEGToken: Not enough approves.");
        });

        // ----------------------------------------------------------------------------
        it("more than enough approvals (approvals == MIN_APPROVALS_REQUIRED + 1)", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED + 1; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await mintSuccess(minter1, rIdx, notMinter.address, 1);
            expect(await token.balanceOf(notMinter.address))
                .to.be.eq(1);
        });

        // ----------------------------------------------------------------------------
        it("try to mint twice one minting request", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await mintSuccess(minter1, rIdx, notMinter.address, 1);
            await mintFailed(minter1, rIdx, "HEGToken: Request is already executed.");
        });
    });


    /**
     * Approval checking
     */
    describe('Approval tests', function () {
        // ----------------------------------------------------------------------------
        it("try to approve twice one minting request", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            await approveMintingRequestFailed(minter1, rIdx, "HEGToken: Request is already approved.");
            await approveMintingRequestSuccess(minter2, rIdx);
            await approveMintingRequestFailed(minter2, rIdx, "HEGToken: Request is already approved.");
        });

        // ----------------------------------------------------------------------------
        it("try to approve a non-existing minting request", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            await approveMintingRequestFailed(minter1, rIdx + 1, "HEGToken: Request does not exist.");
        });

        // ----------------------------------------------------------------------------
        it("try to approve already executed minting", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await mintSuccess(minter1, rIdx, notMinter.address, 1);
            await approveMintingRequestFailed(minters[minters.length - 1], rIdx, "HEGToken: Request is already executed.");
        });
    });


    /**
     * Revocation checking
     */
    describe('Revocation tests', function () {
        // ----------------------------------------------------------------------------
        it("enough approves -> revoke one -> minting failed", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await revokeMintingRequestSuccess(minter1, rIdx);
            await mintFailed(minter1, rIdx, "HEGToken: Not enough approves.");
        });

        // ----------------------------------------------------------------------------
        it("enough approves -> revoke one -> return it -> minting success", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await revokeMintingRequestSuccess(minter1, rIdx);
            await approveMintingRequestSuccess(minter1, rIdx);
            await mintSuccess(minter1, rIdx, notMinter.address, 1);
            expect(await token.balanceOf(notMinter.address))
                .to.be.eq(1);
        });

        // ----------------------------------------------------------------------------
        it("revocation does not exist", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            await revokeMintingRequestFailed(minter2, rIdx, "HEGToken: Request is not approved.");
        });

        // ----------------------------------------------------------------------------
        it("try to revoke a non-existing minting request", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await revokeMintingRequestFailed(minter1, rIdx + 1, "HEGToken: Request does not exist.");
        });

        // ----------------------------------------------------------------------------
        it("try to revoke already executed minting", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await mintSuccess(minter1, rIdx, notMinter.address, 1);
            await revokeMintingRequestFailed(minter1, rIdx, "HEGToken: Request is already executed.");
        });
    });


    /**
     * onlyMinter checking
     */
    describe('checking if only minter can call functions', function () {
        // ----------------------------------------------------------------------------
        it("mintingRequest", async function() {
            await requestMintingFailed(notMinter, notMinter.address, 1, "HEGToken: You are not a minter.");
        });

        // ----------------------------------------------------------------------------
        it("approveMintingRequest", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            await approveMintingRequestFailed(notMinter, rIdx, "HEGToken: You are not a minter.");
        });

        // ----------------------------------------------------------------------------
        it("revokeMintingRequest", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            await revokeMintingRequestFailed(notMinter, rIdx, "HEGToken: You are not a minter.");
        });

        // ----------------------------------------------------------------------------
        it("mint", async function() {
            let rIdx = (await requestMintingSuccess(minter1, notMinter.address, 1));
            for (let i=1; i<MIN_APPROVALS_REQUIRED; i++) {
                await approveMintingRequestSuccess(minters[i], rIdx);
            }
            await mintFailed(notMinter, rIdx, "HEGToken: You are not a minter.");
        });

        /*    // ----------------------------------------------------------------------------
            it("getTotalMintingRequests", async function() {
              await expect(token.connect(notMinter).getTotalMintingRequests())
                .to.be.revertedWith("HEGToken: You are not a minter.");
            });

            // ----------------------------------------------------------------------------
            it("getMintingRequest", async function() {
              await expect(token.connect(notMinter).getMintingRequest(0))
                .to.be.revertedWith("HEGToken: You are not a minter.");
            });

            // ----------------------------------------------------------------------------
            it("getAllMintingRequests", async function() {
              await expect(token.connect(notMinter).getAllMintingRequests())
                .to.be.revertedWith("HEGToken: You are not a minter.");
            });*/
    });

});



/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function requestMintingSuccess(minter, address, amount) {
    let rIdx = Number(await token.getTotalMintingRequests());

    await expect(
        token.connect(minter).requestMinting(address, amount)
    )
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(minter.address, rIdx, address, amount);

    return rIdx;
}

async function requestMintingFailed(minter, address, amount, message) {
    await expect(
        token.connect(minter).requestMinting(address, amount)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function approveMintingRequestSuccess(minter, rIdx) {
    await expect(
        token.connect(minter).approveMintingRequest(rIdx)
    )
        .to.emit(token, 'MintingRequestApproval')
        .withArgs(minter.address, rIdx);
}

async function approveMintingRequestFailed(minter, rIdx, message) {
    await expect(
        token.connect(minter).approveMintingRequest(rIdx)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function revokeMintingRequestSuccess(minter, rIdx) {
    await expect(
        token.connect(minter).revokeMintingRequest(rIdx)
    )
        .to.emit(token, 'MintingRequestRevocation')
        .withArgs(minter.address, rIdx);
}

async function revokeMintingRequestFailed(minter, rIdx, message) {
    await expect(
        token.connect(minter).revokeMintingRequest(rIdx)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function mintSuccess(minter, rIdx, address, amount) {
    await expect(
        token.connect(minter).mint(rIdx)
    )
        .to.emit(token, 'Minting')
        .withArgs(minter.address, rIdx, address, amount);
}

async function mintFailed(minter, rIdx, message) {
    await expect(
        token.connect(minter).mint(rIdx)
    )
        .to.be.revertedWith(message);
}
