const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    TEST_TOKEN_AMOUNT = 1000000;
let
    acc1,
    acc2,
    token,
    vesting;

describe('HEG Vesting: Transfer and balance tests', function () {

    beforeEach(async function () {
        [acc1, acc2] = await ethers.getSigners();
        const HEGToken = await ethers.getContractFactory("HEGToken", acc1);
        token = await HEGToken.deploy(0, [[0, TEST_TOKEN_AMOUNT]], [acc1.address], 1);
        await token.deployed();
        const HEGVesting = await ethers.getContractFactory("MockHEGVesting", acc1);
        vesting = await HEGVesting.deploy(token.address, [acc1.address], 1);
        await vesting.deployed();
        await token.requestMinting(vesting.address, TEST_TOKEN_AMOUNT);
        await token.mint(0);
    });

    // ----------------------------------------------------------------------------
    it(TEST_TOKEN_AMOUNT + " HEG on the contract", async function() {
        expect(await vesting.getTotalSchedules()).to.be.eq(0);
        expect(await vesting.getTotalEnabledSchedules()).to.be.eq(0);
        expect(await vesting.getTotalTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalReservedTokens()).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokens()).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokens()).to.be.eq(0);
        expect(await vesting.getTotalAvailableTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
    });

    // ----------------------------------------------------------------------------
    it("requestCreation", async function() {
        await vesting.requestCreation(acc2.address, 0, [[1, TEST_TOKEN_AMOUNT]], true);

        expect(await vesting.getTotalSchedules()).to.be.eq(1);
        expect(await vesting.getTotalEnabledSchedules()).to.be.eq(0);
        expect(await vesting.getTotalTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalReservedTokens()).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokens()).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokens()).to.be.eq(0);
        expect(await vesting.getTotalAvailableTokens()).to.be.eq(TEST_TOKEN_AMOUNT);

        expect(await vesting.getTotalSchedulesByAccount(acc2.address)).to.be.eq(1);
        expect(await vesting.getTotalReservedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokensByAccount(acc2.address)).to.be.eq(0);
    });

    // ----------------------------------------------------------------------------
    it("requestCreation -> create", async function() {
        await vesting.requestCreation(acc2.address, 0, [[1, TEST_TOKEN_AMOUNT]], true);
        await vesting.create(await vesting.generateScheduleId(acc2.address, 0));

        expect(await vesting.getTotalSchedules()).to.be.eq(1);
        expect(await vesting.getTotalEnabledSchedules()).to.be.eq(1);
        expect(await vesting.getTotalTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalReservedTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalReleasedTokens()).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokens()).to.be.eq(0);
        expect(await vesting.getTotalAvailableTokens()).to.be.eq(0);

        expect(await vesting.getTotalSchedulesByAccount(acc2.address)).to.be.eq(1);
        expect(await vesting.getTotalReservedTokensByAccount(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalReleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokensByAccount(acc2.address)).to.be.eq(0);

        vesting.setCurrentTime(1);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);
    });

    // ----------------------------------------------------------------------------
    it("requestCreation -> create -> revoke", async function() {
        let scheduleId = await vesting.generateScheduleId(acc2.address, 0);
        await vesting.requestCreation(acc2.address, 0, [[1, TEST_TOKEN_AMOUNT]], true);
        await vesting.create(scheduleId);
        await vesting.requestRevocation(scheduleId);
        await vesting.revoke(scheduleId);

        expect(await vesting.getTotalSchedules()).to.be.eq(1);
        expect(await vesting.getTotalEnabledSchedules()).to.be.eq(1);
        expect(await vesting.getTotalTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalReservedTokens()).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokens()).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalAvailableTokens()).to.be.eq(TEST_TOKEN_AMOUNT);

        expect(await vesting.getTotalSchedulesByAccount(acc2.address)).to.be.eq(1);
        expect(await vesting.getTotalReservedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokensByAccount(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);

        vesting.setCurrentTime(1);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(0);
    });

    // ----------------------------------------------------------------------------
    it("requestCreation -> create -> release", async function() {
        let scheduleId = await vesting.generateScheduleId(acc2.address, 0);
        await vesting.requestCreation(acc2.address, 0, [[1, TEST_TOKEN_AMOUNT]], true);
        await vesting.create(scheduleId);
        vesting.setCurrentTime(1);
        await vesting.release(scheduleId, TEST_TOKEN_AMOUNT);

        expect(await vesting.getTotalSchedules()).to.be.eq(1);
        expect(await vesting.getTotalEnabledSchedules()).to.be.eq(1);
        expect(await vesting.getTotalTokens()).to.be.eq(0);
        expect(await vesting.getTotalReservedTokens()).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalRevokedTokens()).to.be.eq(0);
        expect(await vesting.getTotalAvailableTokens()).to.be.eq(0);

        expect(await vesting.getTotalSchedulesByAccount(acc2.address)).to.be.eq(1);
        expect(await vesting.getTotalReservedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokensByAccount(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokensByAccount(acc2.address)).to.be.eq(0);

        expect(await token.balanceOf(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);
    });

    // ----------------------------------------------------------------------------
    it("withdraw", async function() {
        await vesting.requestWithdrawal(acc2.address, TEST_TOKEN_AMOUNT);
        await vesting.withdraw(0);

        expect(await vesting.getTotalSchedules()).to.be.eq(0);
        expect(await vesting.getTotalEnabledSchedules()).to.be.eq(0);
        expect(await vesting.getTotalTokens()).to.be.eq(0);
        expect(await vesting.getTotalReservedTokens()).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokens()).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokens()).to.be.eq(0);
        expect(await vesting.getTotalAvailableTokens()).to.be.eq(0);

        expect(await vesting.getTotalSchedulesByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalReservedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokensByAccount(acc2.address)).to.be.eq(0);

        expect(await token.balanceOf(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);
    });

    // ----------------------------------------------------------------------------
    it("requestCreation -> withdraw", async function() {
        await vesting.requestCreation(acc2.address, 0, [[1, TEST_TOKEN_AMOUNT]], true);
        await vesting.requestWithdrawal(acc2.address, TEST_TOKEN_AMOUNT);
        await vesting.withdraw(0);

        expect(await vesting.getTotalSchedules()).to.be.eq(1);
        expect(await vesting.getTotalEnabledSchedules()).to.be.eq(0);
        expect(await vesting.getTotalTokens()).to.be.eq(0);
        expect(await vesting.getTotalReservedTokens()).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokens()).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokens()).to.be.eq(0);
        expect(await vesting.getTotalAvailableTokens()).to.be.eq(0);

        expect(await vesting.getTotalSchedulesByAccount(acc2.address)).to.be.eq(1);
        expect(await vesting.getTotalReservedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokensByAccount(acc2.address)).to.be.eq(0);

        expect(await token.balanceOf(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);

        await expect(vesting.create(await vesting.generateScheduleId(acc2.address, 0)))
            .to.be.revertedWith("HEGVesting: Not enough sufficient tokens.");
    });

    // ----------------------------------------------------------------------------
    it("requestCreation -> create -> withdraw", async function() {
        await vesting.requestCreation(acc2.address, 0, [[1, TEST_TOKEN_AMOUNT]], true);
        await vesting.create(await vesting.generateScheduleId(acc2.address, 0));
        await vesting.requestWithdrawal(acc2.address, TEST_TOKEN_AMOUNT);
        await expect(vesting.withdraw(0))
            .to.be.revertedWith("HEGVesting: Not enough funds.");

        expect(await token.balanceOf(acc2.address)).to.be.eq(0);
    });

    // ----------------------------------------------------------------------------
    it("create -> revoke -> withdraw", async function() {
        let scheduleId = await vesting.generateScheduleId(acc2.address, 0);
        await vesting.requestCreation(acc2.address, 0, [[1, TEST_TOKEN_AMOUNT]], true);
        await vesting.create(scheduleId);
        await vesting.requestRevocation(scheduleId);
        await vesting.revoke(scheduleId);
        await vesting.requestWithdrawal(acc2.address, TEST_TOKEN_AMOUNT);
        await vesting.withdraw(0);

        expect(await vesting.getTotalSchedules()).to.be.eq(1);
        expect(await vesting.getTotalEnabledSchedules()).to.be.eq(1);
        expect(await vesting.getTotalTokens()).to.be.eq(0);
        expect(await vesting.getTotalReservedTokens()).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokens()).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokens()).to.be.eq(TEST_TOKEN_AMOUNT);
        expect(await vesting.getTotalAvailableTokens()).to.be.eq(0);

        expect(await vesting.getTotalSchedulesByAccount(acc2.address)).to.be.eq(1);
        expect(await vesting.getTotalReservedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalReleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalUnreleasedTokensByAccount(acc2.address)).to.be.eq(0);
        expect(await vesting.getTotalRevokedTokensByAccount(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);

        expect(await token.balanceOf(acc2.address)).to.be.eq(TEST_TOKEN_AMOUNT);
    });
});
