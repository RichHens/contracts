const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    MIN_REQUEST_REQUIRED = 3,
    MAX_ROYALTY_FRACTION = 10000,
    ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
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

describe('NFTChicken: Royalty', function () {
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

        // await token.connect(admin1).requestAddingMinter(minter.address, 0);
        // await token.connect(admin2).approveAddingMinterRequest(minter.address);
        // await token.connect(admin1).addMinter(minter.address);
        // await token.connect(minter).safeMint(admin1.address);
    });

    context('Access logic', function () {
        /**
         * Request tests
         */
        describe('Requests', function () {
            // ----------------------------------------------------------------------------
            it("enough requests (requests == MIN_REQUEST_REQUIRED)", async function () {
                await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
                for (let i = 1; i < MIN_REQUEST_REQUIRED; i++) {
                    await approveSettingRoyaltyRequestSuccess(admins[i], 0);
                }
                await setRoyaltySuccess(admin1, 0);

                expect(await token.getTotalRoyaltyRequests())
                    .to.be.eq(1);
                let royalty = await token.getCurrentRoyalty();
                expect(royalty[0]).to.be.eq(notAdmin.address);
                expect(royalty[1]).to.be.eq(MAX_ROYALTY_FRACTION);
            });

            // ----------------------------------------------------------------------------
            it("not enough requests (requests == MIN_REQUEST_REQUIRED - 1)", async function() {
                await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
                for (let i=1; i<MIN_REQUEST_REQUIRED - 1; i++) {
                    await approveSettingRoyaltyRequestSuccess(admins[i], 0);
                }
                await setRoyaltyFailed(admin1, 0, "NFTChicken: Not enough approvals.");

                expect(await token.getTotalRoyaltyRequests())
                    .to.be.eq(1);
                let royalty = await token.getCurrentRoyalty();
                expect(royalty[0]).to.be.eq(ZERO_ADDRESS);
                expect(royalty[1]).to.be.eq(0);
            });

            // ----------------------------------------------------------------------------
            it("more than enough requests (requests == MIN_REQUEST_REQUIRED + 1)", async function() {
                await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
                for (let i = 1; i < MIN_REQUEST_REQUIRED + 1; i++) {
                    await approveSettingRoyaltyRequestSuccess(admins[i], 0);
                }
                await setRoyaltySuccess(admin1, 0);

                expect(await token.getTotalRoyaltyRequests())
                    .to.be.eq(1);
                let royalty = await token.getCurrentRoyalty();
                expect(royalty[0]).to.be.eq(notAdmin.address);
                expect(royalty[1]).to.be.eq(MAX_ROYALTY_FRACTION);
            });

            // ----------------------------------------------------------------------------
            it("approve for already approved", async function() {
                await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
                await approveSettingRoyaltyRequestFailed(admin1, 0, "NFTChicken: Approve already exists.");
            });

            // ----------------------------------------------------------------------------
            it("approve for non existed request", async function() {
                await approveSettingRoyaltyRequestFailed(admin1, 0, "NFTChicken: Request does not exist.");
            });

            // ----------------------------------------------------------------------------
            it("request for zero address", async function() {
                await requestSettingRoyaltyFailed(admin1, ZERO_ADDRESS, MAX_ROYALTY_FRACTION, "NFTChicken: Zero address.");
            });

            // ----------------------------------------------------------------------------
            it("request for wrong royalty fraction", async function() {
                await requestSettingRoyaltyFailed(admin1, notAdmin.address, MAX_ROYALTY_FRACTION + 1, "NFTChicken: Wrong royalty fraction range.");
            });
        });

        /**
         * Revocation tests
         */
        describe('Revocations', function () {
            // ----------------------------------------------------------------------------
            it("enough requests -> revoke one -> ban failed", async function() {
                await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
                for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
                    await approveSettingRoyaltyRequestSuccess(admins[i], 0);
                }
                await revokeSettingRoyaltyRequestSuccess(admin1, 0);
                await setRoyaltyFailed(admin1, 0, "NFTChicken: Not enough approvals.");

                expect(await token.getTotalRoyaltyRequests())
                    .to.be.eq(1);
                let royalty = await token.getCurrentRoyalty();
                expect(royalty[0]).to.be.eq(ZERO_ADDRESS);
                expect(royalty[1]).to.be.eq(0);
            });

            // ----------------------------------------------------------------------------
            it("enough requests -> revoke one -> return it -> ban success", async function() {
                await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
                for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
                    await approveSettingRoyaltyRequestSuccess(admins[i], 0);
                }
                await revokeSettingRoyaltyRequestSuccess(admin1, 0);
                await approveSettingRoyaltyRequestSuccess(admin1, 0);
                await setRoyaltySuccess(admin1, 0);

                expect(await token.getTotalRoyaltyRequests())
                    .to.be.eq(1);
                let royalty = await token.getCurrentRoyalty();
                expect(royalty[0]).to.be.eq(notAdmin.address);
                expect(royalty[1]).to.be.eq(MAX_ROYALTY_FRACTION);
            });

            // ----------------------------------------------------------------------------
            it("revocation does not exist", async function() {
                await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
                await revokeSettingRoyaltyRequestFailed(admin2, 0, "NFTChicken: Approve does not exist.");
            });
        });
    });


    context('Calculation', function () {
        beforeEach(async function () {
            await token.connect(admin1).requestAddingMinter(minter.address, 0)
            for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
                await token.connect(admins[i]).approveAddingMinterRequest(minter.address)
            }
            await token.connect(admin1).addMinter(minter.address)

            await token.connect(minter).safeMint(notAdmin.address);
            await token.connect(minter).safeMint(admin1.address);
            await token.connect(minter).safeMint(minter.address);
        });

        // ----------------------------------------------------------------------------
        // 10000=100%, 100=10%, 10=0.1%, 1=0.01%
        it("check 100% royalty", async function () {
            await requestSettingRoyaltySuccess(admin1, notAdmin.address, 10000);
            for (let i = 1; i < MIN_REQUEST_REQUIRED; i++) {
                await approveSettingRoyaltyRequestSuccess(admins[i], 0);
            }
            await setRoyaltySuccess(admin1, 0);

            let royalty = await token.royaltyInfo(0, 5000);
            expect(royalty[0]).to.be.eq(notAdmin.address);
            expect(royalty[1]).to.be.eq(5000);
        });

        it("check 1% royalty", async function () {
            await requestSettingRoyaltySuccess(admin1, notAdmin.address, 100);
            for (let i = 1; i < MIN_REQUEST_REQUIRED; i++) {
                await approveSettingRoyaltyRequestSuccess(admins[i], 0);
            }
            await setRoyaltySuccess(admin1, 0);

            let royalty = await token.royaltyInfo(0, 5000);
            expect(royalty[0]).to.be.eq(notAdmin.address);
            expect(royalty[1]).to.be.eq(50);
        });

        it("check 0.1% royalty", async function () {
            await requestSettingRoyaltySuccess(admin1, notAdmin.address, 10);
            for (let i = 1; i < MIN_REQUEST_REQUIRED; i++) {
                await approveSettingRoyaltyRequestSuccess(admins[i], 0);
            }
            await setRoyaltySuccess(admin1, 0);

            let royalty = await token.royaltyInfo(0, 5000);
            expect(royalty[0]).to.be.eq(notAdmin.address);
            expect(royalty[1]).to.be.eq(5);
        });

        it("check 0.01% royalty", async function () {
            await requestSettingRoyaltySuccess(admin1, notAdmin.address, 1);
            for (let i = 1; i < MIN_REQUEST_REQUIRED; i++) {
                await approveSettingRoyaltyRequestSuccess(admins[i], 0);
            }
            await setRoyaltySuccess(admin1, 0);

            let royalty = await token.royaltyInfo(0, 5000);
            expect(royalty[0]).to.be.eq(notAdmin.address);
            expect(royalty[1]).to.be.eq(0);
        });

        it("check zero royalty for admin owner", async function () {
            await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
            for (let i = 1; i < MIN_REQUEST_REQUIRED; i++) {
                await approveSettingRoyaltyRequestSuccess(admins[i], 0);
            }
            await setRoyaltySuccess(admin1, 0);

            let royalty = await token.royaltyInfo(1, 5000);
            expect(royalty[0]).to.be.eq(notAdmin.address);
            expect(royalty[1]).to.be.eq(0);
        });

        it("check zero royalty for minter owner", async function () {
            await requestSettingRoyaltySuccess(admin1, notAdmin.address, MAX_ROYALTY_FRACTION);
            for (let i = 1; i < MIN_REQUEST_REQUIRED; i++) {
                await approveSettingRoyaltyRequestSuccess(admins[i], 0);
            }
            await setRoyaltySuccess(admin1, 0);

            let royalty = await token.royaltyInfo(2, 5000);
            expect(royalty[0]).to.be.eq(notAdmin.address);
            expect(royalty[1]).to.be.eq(0);
        });
    });
});


/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function requestSettingRoyaltySuccess(admin, receiver, fraction, requestIndex=0) {
    await expect(
        token.connect(admin).requestSettingRoyalty(receiver, fraction)
    )
        .to.emit(token, 'SettingRoyaltyRequest')
        .withArgs(receiver, fraction, requestIndex, admin.address);
}

async function requestSettingRoyaltyFailed(admin, receiver, fraction, message) {
    await expect(
        token.connect(admin).requestSettingRoyalty(receiver, fraction)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function approveSettingRoyaltyRequestSuccess(admin, requestIndex) {
    await expect(
        token.connect(admin).approveSettingRoyaltyRequest(requestIndex)
    )
        .to.emit(token, 'SettingRoyaltyApproval')
        .withArgs(requestIndex, admin.address);
}

async function approveSettingRoyaltyRequestFailed(admin, requestIndex, message) {
    await expect(
        token.connect(admin).approveSettingRoyaltyRequest(requestIndex)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function revokeSettingRoyaltyRequestSuccess(admin, requestIndex) {
    await expect(
        token.connect(admin).revokeSettingRoyaltyRequest(requestIndex)
    )
        .to.emit(token, 'SettingRoyaltyRevocation')
        .withArgs(requestIndex, admin.address);
}

async function revokeSettingRoyaltyRequestFailed(admin, requestIndex, message) {
    await expect(
        token.connect(admin).revokeSettingRoyaltyRequest(requestIndex)
    )
        .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function setRoyaltySuccess(admin, requestIndex) {
    await expect(
        token.connect(admin).setRoyalty(requestIndex)
    )
        .to.emit(token, 'SettingRoyalty')
        .withArgs(requestIndex, admin.address);
}

async function setRoyaltyFailed(admin, requestIndex, message) {
    await expect(
        token.connect(admin).setRoyalty(requestIndex)
    )
        .to.be.revertedWith(message);
}
