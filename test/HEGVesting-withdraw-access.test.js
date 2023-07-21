const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    MIN_REQUESTS_REQUIRED = 3;
let
    admin1,
    admin2,
    admin3,
    admin4,
    admin5,
    notAdmin,
    admins = [],
    token,
    vesting,
    testScheduleId;


/**
 * ------------------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------------------
 */
describe('HEG Vesting: Creation vesting access tests', function () {
    beforeEach(async function () {
        [admin1, admin2, admin3, admin4, admin5, notAdmin] = await ethers.getSigners();
        admins = [admin1, admin2, admin3, admin4, admin5];
        // the first admin must be the owner of the contract
        // must be two more admins than in MIN_REQUESTS_REQUIRED (see the test ban checking  -> more than enough)
        const HEGToken = await ethers.getContractFactory("HEGToken", admin1);
        token = await HEGToken.deploy(0, [[0, 1000000]], [admin1.address, admin2.address], 1);
        await token.deployed();
        const HEGVesting = await ethers.getContractFactory("MockHEGVesting", admin1);
        vesting = await HEGVesting.deploy(
            token.address,
            [
                admin1.address,
                admin2.address,
                admin3.address,
                admin4.address,
                admin5.address
            ],
            MIN_REQUESTS_REQUIRED
        );
        await vesting.deployed();
        await token.requestMinting(vesting.address, 1000000);
        await token.mint(0);

        testScheduleId = await vesting.generateScheduleId(notAdmin.address, 0);
    });


    /**
     * Request tests
     */
    describe('Request tests', function () {
        // ----------------------------------------------------------------------------
        it("enough approvals (approvals == MIN_REQUESTS_REQUIRED)", async function() {
            await requestWithdrawalSuccess(admin1);
            for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
                await approveRequestWithdrawalSuccess(admins[i]);
            }
            await withdrawSuccess(admin1);
        });

        // ----------------------------------------------------------------------------
        it("not enough approvals (approvals == MIN_REQUESTS_REQUIRED - 1)", async function() {
            await requestWithdrawalSuccess(admin1);
            for (let i=1; i<MIN_REQUESTS_REQUIRED - 1; i++) {
                await approveRequestWithdrawalSuccess(admins[i]);
            }
            await withdrawFailed(admin1, "HEGVesting: Not enough approves.");
        });

        // ----------------------------------------------------------------------------
        it("more than enough approvals (approvals == MIN_REQUESTS_REQUIRED + 1)", async function() {
            await requestWithdrawalSuccess(admin1);
            for (let i=1; i<MIN_REQUESTS_REQUIRED + 1; i++) {
                await approveRequestWithdrawalSuccess(admins[i]);
            }
            await withdrawSuccess(admin1);
        });

        // ----------------------------------------------------------------------------
        it("try to withdraw a request twice", async function() {
            await requestWithdrawalSuccess(admin1);
            for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
                await approveRequestWithdrawalSuccess(admins[i]);
            }
            await withdrawSuccess(admin1);
            await withdrawFailed(admin1, "HEGVesting: Request is already executed.");
        });
    });


    /**
     * Approval tests
     */
    describe('Approvals tests', function () {
        // ----------------------------------------------------------------------------
        it("try to approve twice one request", async function() {
            await requestWithdrawalSuccess(admin1);
            await approveRequestWithdrawalFailed(admin1, "HEGVesting: Request is already approved.");
            await approveRequestWithdrawalSuccess(admin2);
            await approveRequestWithdrawalFailed(admin2, "HEGVesting: Request is already approved.");
        });

        // ----------------------------------------------------------------------------
        it("try to approve a non-existent request", async function() {
            await requestWithdrawalSuccess(admin1, 0);
            await approveRequestWithdrawalFailed(admin1, "HEGVesting: Request does not exist.", 1);
        });

        // ----------------------------------------------------------------------------
        it("try to approve an already executed request", async function() {
            await requestWithdrawalSuccess(admin1);
            for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
                await approveRequestWithdrawalSuccess(admins[i]);
            }
            await withdrawSuccess(admin1);
            await withdrawFailed(admin1, "HEGVesting: Request is already executed.");
        });
    });


    /**
     * Revocation checking
     */
    describe('Revocation tests', function () {
        // ----------------------------------------------------------------------------
        it("enough approves -> revoke one -> withdrawal failed", async function() {
            await requestWithdrawalSuccess(admin1);
            for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
                await approveRequestWithdrawalSuccess(admins[i]);
            }
            await revokeWithdrawalRequestSuccess(admin1);
            await withdrawFailed(admin1, "HEGVesting: Not enough approves.");
        });

        // ----------------------------------------------------------------------------
        it("enough approves -> revoke one -> return it -> withdrawal success", async function() {
            await requestWithdrawalSuccess(admin1);
            for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
                await approveRequestWithdrawalSuccess(admins[i]);
            }
            await revokeWithdrawalRequestSuccess(admin1);
            await approveRequestWithdrawalSuccess(admin1);
            await withdrawSuccess(admin1);
        });

        // ----------------------------------------------------------------------------
        it("try to revoke a non-existing request", async function() {
            await requestWithdrawalSuccess(admin1, 0);
            await revokeWithdrawalRequestFailed(admin1, "HEGVesting: Request does not exist.", 1);
        });

        // ----------------------------------------------------------------------------
        it("try to revoke already executed request", async function() {
            await requestWithdrawalSuccess(admin1);
            for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
                await approveRequestWithdrawalSuccess(admins[i]);
            }
            await withdrawSuccess(admin1);
            await revokeWithdrawalRequestFailed(admin1, "HEGVesting: Request is already executed.");
        });
    });

    /**
     * onlyAdmin tests
     */
    describe('onlyAdmin tests', function () {
        // ----------------------------------------------------------------------------
        it("withdraw", async function() {
            await withdrawFailed(notAdmin, "HEGVesting: You are not an admin.");
        });

        // ----------------------------------------------------------------------------
        it("requestWithdrawal", async function() {
            await requestWithdrawalFailed(notAdmin, "HEGVesting: You are not an admin.");
        });

        // ----------------------------------------------------------------------------
        it("approveRequestWithdrawal", async function() {
            await approveRequestWithdrawalFailed(notAdmin, "HEGVesting: You are not an admin.");
        });

        // ----------------------------------------------------------------------------
        it("revokeWithdrawalRequest", async function() {
            await revokeWithdrawalRequestFailed(notAdmin, "HEGVesting: You are not an admin.");
        });
    });

});



/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function requestWithdrawalSuccess(acc, rIdx=0) {
    await expect(
        vesting.connect(acc).requestWithdrawal(notAdmin.address, 100)
    )
        .to.emit(vesting, 'WithdrawalRequestCreation')
        .withArgs(acc.address, rIdx, notAdmin.address, 100);
}

async function requestWithdrawalFailed(acc, message) {
    await expect(
        vesting.connect(acc).requestWithdrawal(notAdmin.address, 100)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function approveRequestWithdrawalSuccess(acc, rIdx=0) {
    await expect(
        vesting.connect(acc).approveRequestWithdrawal(rIdx)
    )
        .to.emit(vesting, 'WithdrawalRequestApproval')
        .withArgs(acc.address, rIdx);
}

async function approveRequestWithdrawalFailed(acc, message, rIdx=0) {
    await expect(
        vesting.connect(acc).approveRequestWithdrawal(rIdx)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function revokeWithdrawalRequestSuccess(acc, rIdx=0) {
    await expect(
        vesting.connect(acc).revokeWithdrawalRequest(rIdx)
    )
        .to.emit(vesting, 'WithdrawalRequestRevocation')
        .withArgs(acc.address, rIdx);
}

async function revokeWithdrawalRequestFailed(acc, message, rIdx=0) {
    await expect(
        vesting.connect(acc).revokeWithdrawalRequest(rIdx)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function withdrawSuccess(acc, rIdx=0) {
    await expect(
        vesting.connect(acc).withdraw(rIdx)
    )
        .to.emit(vesting, 'Withdrawal')
        .withArgs(acc.address, rIdx);
}

async function withdrawFailed(acc, message, rIdx=0) {
    await expect(
        vesting.connect(acc).withdraw(rIdx)
    )
        .to.be.revertedWith(message);
}