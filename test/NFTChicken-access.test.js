const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    MIN_REQUEST_REQUIRED = 3,
    ROLE_ADMIN = 0,
    ROLE_MINTER = 1,
    ROLE_FAKE = 999;
let
    admin1,
    admin2,
    admin3,
    admin4,
    admin5,
    admins = [],
    notAdmin,
    minter,
    token;

describe('NFTChicken: Access', function () {
    beforeEach(async function () {
        [admin1, admin2, admin3, admin4, admin5, notAdmin, minter] = await ethers.getSigners();
        admins = [admin1, admin2, admin3, admin4, admin5];
        const NFTChicken = await ethers.getContractFactory("MockNFTChicken", admin1);
        // the first admin must be the owner of the contract
        // must be two more admins than in MIN_REQUEST_REQUIRED (see the test ban checking -> more than enough)
        token = await NFTChicken.deploy(
            [
                admin1.address,
                admin2.address,
                admin3.address,
                admin4.address,
                admin5.address
            ],
            MIN_REQUEST_REQUIRED,
            "https://richhens.com/"
        );
        await token.deployed();
    });

    context('Adding request logic', function () {
        /**
         * Request tests
         */
        describe('Requests', function () {
            // ----------------------------------------------------------------------------
            it("enough requests (requests == MIN_REQUEST_REQUIRED)", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
                    await approveAddingMinterRequestSuccess(admins[i], minter);
                }
                await addMinterSuccess(admin1, minter);
                expect(await token.hasRole(ROLE_MINTER, minter.address))
                    .to.be.eq(true);
            });

            // ----------------------------------------------------------------------------
            it("not enough requests (requests == MIN_REQUEST_REQUIRED - 1)", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                for (let i=1; i<MIN_REQUEST_REQUIRED - 1; i++) {
                    await approveAddingMinterRequestSuccess(admins[i], minter);
                }
                await addMinterFailed(admin1, minter, "NFTChicken: Not enough approvals.");
                expect(await token.hasRole(ROLE_MINTER, minter.address))
                    .to.be.eq(false);
            });

            // ----------------------------------------------------------------------------
            it("more than enough requests (requests == MIN_REQUEST_REQUIRED + 1)", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                for (let i=1; i<MIN_REQUEST_REQUIRED + 1; i++) {
                    await approveAddingMinterRequestSuccess(admins[i], minter);
                }
                await addMinterSuccess(admin1, minter);
                expect(await token.hasRole(ROLE_MINTER, minter.address))
                    .to.be.eq(true);
            });

            // ----------------------------------------------------------------------------
            it("two requests for the same user (ver 1)", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                await requestAddingMinterFailed(admin1, minter, "NFTChicken: Approve already exists.");
            });

            // ----------------------------------------------------------------------------
            it("two requests for the same user (ver 2)", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                await approveAddingMinterRequestSuccess(admin2, minter);
                await approveAddingMinterRequestFailed(admin2, minter, "NFTChicken: Approve already exists.");
            });

            // ----------------------------------------------------------------------------
            it("request for user who already the minter", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
                    await approveAddingMinterRequestSuccess(admins[i], minter);
                }
                await addMinterSuccess(admin1, minter);

                await requestAddingMinterFailed(admin1, minter, "NFTChicken: User already exists.");
            });

            // ----------------------------------------------------------------------------
            it("request for user who already the admin", async function() {
                await requestAddingMinterSuccess(admin1, admin1);
                for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
                    await approveAddingMinterRequestSuccess(admins[i], admin1);
                }
                await addMinterSuccess(admin1, admin1);
            });
        });

        /**
         * Revocation tests
         */
        describe('Revocations', function () {
            // ----------------------------------------------------------------------------
            it("enough requests -> revoke one -> ban failed", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
                    await approveAddingMinterRequestSuccess(admins[i], minter);
                }
                await revokeAddingMinterRequestSuccess(admin1, minter);
                await addMinterFailed(admin1, minter, "NFTChicken: Not enough approvals.");
                expect(await token.hasRole(ROLE_MINTER, minter.address))
                    .to.be.eq(false);
            });

            // ----------------------------------------------------------------------------
            it("enough requests -> revoke one -> return it -> ban success", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
                    await approveAddingMinterRequestSuccess(admins[i], minter);
                }
                await revokeAddingMinterRequestSuccess(admin1, minter);
                await approveAddingMinterRequestSuccess(admin1, minter);
                await addMinterSuccess(admin1, minter);
                expect(await token.hasRole(ROLE_MINTER, minter.address))
                    .to.be.eq(true);
            });

            // ----------------------------------------------------------------------------
            it("revocation does not exist", async function() {
                await requestAddingMinterSuccess(admin1, minter);
                await revokeAddingMinterRequestFailed(admin2, minter, "NFTChicken: Approve does not exist.");
            });
        });
    });

    context('Deleting request logic', function () {
        /**
         * Request tests
         */
        describe('Requests', function () {
            // ----------------------------------------------------------------------------
            it("enough requests (requests == MIN_REQUEST_REQUIRED)", async function() {
                let banAccount = admins[MIN_REQUEST_REQUIRED];
                for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
                    await requestDeletingUserSuccess(admins[i], ROLE_ADMIN, banAccount);
                }
                await deleteUserSuccess(admin1, ROLE_ADMIN, banAccount);
                expect(await token.hasRole(ROLE_ADMIN, banAccount.address))
                    .to.be.eq(false);
            });

            // ----------------------------------------------------------------------------
            it("not enough requests (requests == MIN_REQUEST_REQUIRED - 1)", async function() {
                let banAccount = admins[MIN_REQUEST_REQUIRED];
                for (let i=0; i<MIN_REQUEST_REQUIRED - 1; i++) {
                    await requestDeletingUserSuccess(admins[i], ROLE_ADMIN, banAccount);
                }
                await deleteUserFailed(admin1, ROLE_ADMIN, banAccount, "NFTChicken: Not enough requests.");
                expect(await token.hasRole(ROLE_ADMIN, banAccount.address))
                    .to.be.eq(true);
            });

            // ----------------------------------------------------------------------------
            it("more than enough requests (requests == MIN_REQUEST_REQUIRED + 1)", async function() {
                let banAccount = admins[MIN_REQUEST_REQUIRED + 1];
                for (let i=0; i<MIN_REQUEST_REQUIRED + 1; i++) {
                    await requestDeletingUserSuccess(admins[i], ROLE_ADMIN, banAccount);
                }
                await deleteUserSuccess(admin1, ROLE_ADMIN, banAccount);
                expect(await token.hasRole(ROLE_ADMIN, banAccount.address))
                    .to.be.eq(false);
            });

            // ----------------------------------------------------------------------------
            it("two requests for the same user", async function() {
                let banAccount = admins[1];
                await requestDeletingUserSuccess(admin1, ROLE_ADMIN, banAccount);
                await requestDeletingUserFailed(admin1, ROLE_ADMIN, banAccount, "NFTChicken: Request already exists.");
            });

            // ----------------------------------------------------------------------------
            it("request for user without a role", async function() {
                await requestDeletingUserFailed(admin1, ROLE_ADMIN, notAdmin, "NFTChicken: User does not exist.");
            });
        });

        /**
         * Revocation tests
         */
        describe('Revocations', function () {
            // ----------------------------------------------------------------------------
            it("enough requests -> revoke one -> ban failed", async function() {
                let banAccount = admins[MIN_REQUEST_REQUIRED];
                for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
                    await requestDeletingUserSuccess(admins[i], ROLE_ADMIN, banAccount);
                }
                await revokeDeletingUserRequestSuccess(admin1, ROLE_ADMIN, banAccount);
                await deleteUserFailed(admin1, ROLE_ADMIN, banAccount, "NFTChicken: Not enough requests.");
                expect(await token.hasRole(ROLE_ADMIN, banAccount.address))
                    .to.be.eq(true);
            });

            // ----------------------------------------------------------------------------
            it("enough requests -> revoke one -> return it -> ban success", async function() {
                let banAccount = admins[MIN_REQUEST_REQUIRED];
                for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
                    await requestDeletingUserSuccess(admins[i], ROLE_ADMIN, banAccount);
                }
                await revokeDeletingUserRequestSuccess(admin1, ROLE_ADMIN, banAccount);
                await requestDeletingUserSuccess(admin1, ROLE_ADMIN, banAccount);
                await deleteUserSuccess(admin1, ROLE_ADMIN, banAccount);
                expect(await token.hasRole(ROLE_ADMIN, banAccount.address))
                    .to.be.eq(false);
            });

            // ----------------------------------------------------------------------------
            it("revocation does not exist", async function() {
                await requestDeletingUserSuccess(admin1, ROLE_ADMIN, admin3);
                await revokeDeletingUserRequestFailed(admin2, ROLE_ADMIN, admin3, "NFTChicken: Request doesn't exist.");
            });
        });
    });


    context('Deleting logic', function () {
        beforeEach(async function () {
            token.connect(admin1).requestAddingMinter(admin1.address, 0);
            token.connect(admin2).approveAddingMinterRequest(admin1.address);
            token.connect(admin3).approveAddingMinterRequest(admin1.address);
            token.connect(admin1).addMinter(admin1.address);
        });

        // ----------------------------------------------------------------------------
        it("delete minter", async function() {
            for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
                await requestDeletingUserSuccess(admins[i], ROLE_MINTER, admin1);
            }
            await deleteUserSuccess(admin1, ROLE_MINTER, admin1);
            expect(await token.hasRole(ROLE_MINTER, admin1.address))
                .to.be.eq(false);
            expect(await token.hasRole(ROLE_ADMIN, admin1.address))
                .to.be.eq(true);
        });

        // ----------------------------------------------------------------------------
        it("delete minter, then admin for the same address", async function() {
            for (let i=1; i<=MIN_REQUEST_REQUIRED; i++) {
                await requestDeletingUserSuccess(admins[i], ROLE_MINTER, admin1);
            }
            await deleteUserSuccess(admin2, ROLE_MINTER, admin1);
            expect(await token.hasRole(ROLE_MINTER, admin1.address))
                .to.be.eq(false);

            for (let i=1; i<=MIN_REQUEST_REQUIRED; i++) {
                await requestDeletingUserSuccess(admins[i], ROLE_ADMIN, admin1);
            }
            await deleteUserSuccess(admin2, ROLE_ADMIN, admin1);
            expect(await token.hasRole(ROLE_ADMIN, admin1.address))
                .to.be.eq(false);
        });

        // ----------------------------------------------------------------------------
        it("delete two times the same minter", async function() {
            for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
                await requestDeletingUserSuccess(admins[i], ROLE_MINTER, admin1);
            }
            await deleteUserSuccess(admin1, ROLE_MINTER, admin1);
            expect(await token.hasRole(ROLE_MINTER, admin1.address))
                .to.be.eq(false);
            await deleteUserFailed(admin1, ROLE_MINTER, admin1, "NFTChicken: User does not exist.");
        });

        // ----------------------------------------------------------------------------
        it("request delete yourself as admin", async function() {
            await requestDeletingUserFailed(admin1, ROLE_ADMIN, admin1, "NFTChicken: It is forbidden to ban yourself.");
        });

        // ----------------------------------------------------------------------------
        it("request delete yourself as minter", async function() {
            await requestDeletingUserSuccess(admin1, ROLE_MINTER, admin1);
        });

        // ----------------------------------------------------------------------------
        it("request delete fake role", async function() {
            await requestDeletingUserFailed(admin1, ROLE_FAKE, admin1, "NFTChicken: Role does not exist.");
        });
    });

    /**
     * onlyAdmin tests
     */
    context('Access to functions', function () {
        beforeEach(async function () {
            token.connect(admin1).requestAddingMinter(minter.address, 0);
            token.connect(admin2).approveAddingMinterRequest(minter.address);
            token.connect(admin3).approveAddingMinterRequest(minter.address);
            token.connect(admin1).addMinter(minter.address);
        });

        describe('onlyAdmin tests', function () {
            // ----------------------------------------------------------------------------
            it("requestAddingMinter", async function () {
                await requestAddingMinterFailed(minter, notAdmin, "NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("approveAddingMinterRequest", async function () {
                await approveAddingMinterRequestFailed(minter, notAdmin, "NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("revokeAddingMinterRequest", async function () {
                await revokeAddingMinterRequestFailed(minter, notAdmin, "NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("addMinter", async function () {
                await addMinterFailed(minter, notAdmin, "NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("requestDeletingUser", async function () {
                await requestDeletingUserFailed(notAdmin, ROLE_ADMIN, minter, "NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("revokeDeletingUserRequest", async function () {
                await revokeDeletingUserRequestFailed(notAdmin, ROLE_ADMIN, minter, "NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("deleteUser", async function () {
                await deleteUserFailed(notAdmin, ROLE_ADMIN, minter, "NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("pause", async function () {
                await expect(token.connect(notAdmin).pause())
                    .to.be.revertedWith("NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("requestUnpause", async function () {
                await expect(token.connect(notAdmin).requestUnpause())
                    .to.be.revertedWith("NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("revokeUnpauseRequest", async function () {
                await expect(token.connect(notAdmin).revokeUnpauseRequest())
                    .to.be.revertedWith("NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("unpause", async function () {
                await expect(token.connect(notAdmin).unpause())
                    .to.be.revertedWith("NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("requestSettingRoyalty", async function () {
                await expect(token.connect(notAdmin).requestSettingRoyalty(notAdmin.address, 1000))
                    .to.be.revertedWith("NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("approveSettingRoyaltyRequest", async function () {
                await expect(token.connect(notAdmin).approveSettingRoyaltyRequest(0))
                    .to.be.revertedWith("NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("revokeSettingRoyaltyRequest", async function () {
                await expect(token.connect(notAdmin).revokeSettingRoyaltyRequest(0))
                    .to.be.revertedWith("NFTChicken: You are not an admin.");
            });

            // ----------------------------------------------------------------------------
            it("setRoyalty", async function () {
                await expect(token.connect(notAdmin).setRoyalty(0))
                    .to.be.revertedWith("NFTChicken: You are not an admin.");
            });
        });

        describe('onlyMinter tests', function () {
            // ----------------------------------------------------------------------------
            it("safeMint", async function () {
                await expect(token.connect(notAdmin).safeMint(admin3.address))
                    .to.be.revertedWith("NFTChicken: You are not a minter.");
            });

            // ----------------------------------------------------------------------------
            it("safeMassMint", async function () {
                await expect(token.connect(admin1).safeMassMint(admin3.address, 10))
                    .to.be.revertedWith("NFTChicken: You are not a minter.");
            });
        });
    });

});



/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function requestAddingMinterSuccess(admin, account) {
    await expect(
        token.connect(admin).requestAddingMinter(account.address, 0)
    )
        .to.emit(token, 'AddingMinterRequest')
        .withArgs(account.address, admin.address, 0);
}

async function requestAddingMinterFailed(admin, account, message) {
    await expect(
        token.connect(admin).requestAddingMinter(account.address, 0)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function approveAddingMinterRequestSuccess(admin, account) {
    await expect(
        token.connect(admin).approveAddingMinterRequest(account.address)
    )
        .to.emit(token, 'AddingMinterApproval')
        .withArgs(account.address, admin.address);
}

async function approveAddingMinterRequestFailed(admin, account, message) {
    await expect(
        token.connect(admin).approveAddingMinterRequest(account.address)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function revokeAddingMinterRequestSuccess(admin, account) {
    await expect(
        token.connect(admin).revokeAddingMinterRequest(account.address)
    )
        .to.emit(token, 'AddingMinterRevocation')
        .withArgs(account.address, admin.address);
}

async function revokeAddingMinterRequestFailed(admin, account, message) {
    await expect(
        token.connect(admin).revokeAddingMinterRequest(account.address)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function addMinterSuccess(admin, account) {
    await expect(
        token.connect(admin).addMinter(account.address)
    )
        .to.emit(token, 'AddingMinter')
        .withArgs(account.address, admin.address);
}

async function addMinterFailed(admin, account, message) {
    await expect(
        token.connect(admin).addMinter(account.address)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function requestDeletingUserSuccess(admin, role, account) {
    await expect(
        token.connect(admin).requestDeletingUser(role, account.address)
    )
        .to.emit(token, 'DeletingUserRequest')
        .withArgs(role, account.address, admin.address);
}

async function requestDeletingUserFailed(admin, role, account, message) {
    await expect(
        token.connect(admin).requestDeletingUser(role, account.address)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function revokeDeletingUserRequestSuccess(admin, role, account) {
    await expect(
        token.connect(admin).revokeDeletingUserRequest(role, account.address)
    )
        .to.emit(token, 'DeletingUserRevocation')
        .withArgs(role, account.address, admin.address);
}

async function revokeDeletingUserRequestFailed(admin, role, account, message) {
    await expect(
        token.connect(admin).revokeDeletingUserRequest(role, account.address)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function deleteUserSuccess(admin, role, account) {
    await expect(
        token.connect(admin).deleteUser(role, account.address)
    )
        .to.emit(token, 'DeletingUser')
        .withArgs(role, account.address, admin.address);
}

async function deleteUserFailed(admin, role, account, message) {
    await expect(
        token.connect(admin).deleteUser(role, account.address)
    )
        .to.be.revertedWith(message);
}