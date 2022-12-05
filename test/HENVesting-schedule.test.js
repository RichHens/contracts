const { expect } = require("chai");
const { ethers } = require("hardhat");

const
  RUN_TIME = 0,
  ZERO_ADDRESS = '0x0000000000000000000000000000000000000000',
  TEST_PERIODS = [[1800,1000],[3600,2000]];
let
  acc1,
  acc2,
  acc3,
  token,
  vesting;


/**
 * ------------------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------------------
 */
describe('HEN Vesting: Schedule tests', function () {

  beforeEach(async function () {
    [acc1, acc2, acc3] = await ethers.getSigners();
    const HENToken = await ethers.getContractFactory("HENToken", acc1);
    token = await HENToken.deploy(0, [[0, 1000000]], [acc1.address], 1);
    await token.deployed();
    const HENVesting = await ethers.getContractFactory("MockHENVesting", acc1);
    vesting = await HENVesting.deploy(token.address, [acc1.address], 1);
    await vesting.deployed();
    vesting.setCurrentTime(RUN_TIME);
    await token.requestMinting(vesting.address, 1000000);
    await token.mint(0);
  });

  // ----------------------------------------------------------------------------
  it("create request to zero address", async function() {
    await vesting.setCurrentTime(RUN_TIME + TEST_PERIODS[TEST_PERIODS.length - 1][0]);
    await creationFailed(acc1, ZERO_ADDRESS, TEST_PERIODS, "HENVesting: Zero address.");
  });

  // ----------------------------------------------------------------------------
  it("create request with zero amount/duration", async function() {
    await creationFailed(acc1, acc2.address, [[0,100],[1800,100]], "HENVesting: Empty duration.");
    await creationFailed(acc1, acc2.address, [[1800,100],[1800,0]], "HENVesting: Empty amount.");
  });

  // ----------------------------------------------------------------------------
  it("release something one second before the first period", async function() {
    let
      scheduleId = await creationSuccess(acc1, acc2.address, TEST_PERIODS, false);

    vesting.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0] - 1);

    await releaseFailed(acc2, scheduleId, 1, "HENVesting: Not enough sufficient tokens.");
    expect(await token.balanceOf(acc2.address))
      .to.be.eq(0);
  });

  // ----------------------------------------------------------------------------
  it("release a revoked vesting", async function() {
    let scheduleId = await creationSuccess(acc1, acc2.address, TEST_PERIODS, true);

    await vesting.requestRevocation(scheduleId);
    await vesting.revoke(scheduleId);

    vesting.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0]);
    await releaseFailed(acc2, scheduleId, 1, "HENVesting: Schedule is revoked.");
  });

  // ----------------------------------------------------------------------------
  it("release access (only admin and beneficiary car release)", async function() {
    let scheduleId = await creationSuccess(acc1, acc2.address, TEST_PERIODS, true);

    vesting.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0]);
    await releaseSuccess(acc1, scheduleId, 1);
    await releaseSuccess(acc2, scheduleId, 1);
    await releaseFailed(acc3, scheduleId, 1, "HENVesting: Only beneficiary or admin can release vested tokens.");
  });


  /**
   * Minting in the first period tests
   */
  describe('Creation/Release tests for the first period', function () {
    // ----------------------------------------------------------------------------
    it("release half of the tokens, then the rest", async function() {
      let
        amount = Math.floor(TEST_PERIODS[0][1] / 2),
        balance = Number(await token.balanceOf(acc2.address)),
        scheduleId = await creationSuccess(acc1, acc2.address, TEST_PERIODS, false);

      vesting.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0]);

      // first half
      await releaseSuccess(acc2, scheduleId, amount);
      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);

      // the remaining tokens
      amount = TEST_PERIODS[0][1] - amount;
      await releaseSuccess(acc2, scheduleId, amount);
      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);
    });

    // ----------------------------------------------------------------------------
    it("release half of the tokens, then the rest + one extra token", async function() {
      let
        amount = Math.floor(TEST_PERIODS[0][1] / 2),
        balance = Number(await token.balanceOf(acc2.address)),
        scheduleId = await creationSuccess(acc1, acc2.address, TEST_PERIODS, false);

      vesting.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0]);

      // first half
      await releaseSuccess(acc2, scheduleId, amount);
      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);

      // the remaining tokens + one
      amount = TEST_PERIODS[0][1] - amount + 1;
      await releaseFailed(acc2, scheduleId, amount, "HENVesting: Not enough sufficient tokens.");
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);
    });

    // ----------------------------------------------------------------------------
    it("release zero tokens", async function() {
      let scheduleId = await creationSuccess(acc1, acc2.address, TEST_PERIODS, false);
      vesting.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0]);
      await releaseFailed(acc2, scheduleId, 0, "HENVesting: Zero amount.");
    });
  });


  /**
   * Minting in the last period tests
   */
  describe('Creation/Release tests for the last period', function () {
    // ----------------------------------------------------------------------------
    it("release all tokens", async function() {
      let
        amount = 0,
        duration = 0,
        balance = Number(await token.balanceOf(acc2.address)),
        scheduleId = await creationSuccess(acc1, acc2.address, TEST_PERIODS, false);

      for (let i=0; i<TEST_PERIODS.length; i++) {
        duration += TEST_PERIODS[i][0];
        amount += TEST_PERIODS[i][1];
      }

      vesting.setCurrentTime(duration);
      await releaseSuccess(acc2, scheduleId, amount);
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance + amount);
    });

    // ----------------------------------------------------------------------------
    it("release all tokens + one extra", async function() {
      let
        amount = 0,
        duration = 0,
        balance = Number(await token.balanceOf(acc2.address)),
        scheduleId = await creationSuccess(acc1, acc2.address, TEST_PERIODS, false);

      for (let i=0; i<TEST_PERIODS.length; i++) {
        duration += TEST_PERIODS[i][0];
        amount += TEST_PERIODS[i][1];
      }

      vesting.setCurrentTime(duration);
      await releaseFailed(acc2, scheduleId, amount + 1, "HENVesting: Not enough sufficient tokens.");
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);
    });
  });

});



/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function creationSuccess(admin, address, periods, revocable, index=0) {
  let
    scheduleId = await vesting.generateScheduleId(address, index),
    totalAmount = 0;

  for (let i=0; i<periods.length; i++) {
    totalAmount += periods[i][1];
  }

  await expect(
    vesting.connect(admin).requestCreation(address, RUN_TIME, periods, revocable)
  )
    .to.emit(vesting, 'CreationRequest')
    .withArgs(admin.address, scheduleId, address, totalAmount);

  await expect(
    vesting.connect(admin).create(scheduleId)
  )
    .to.emit(vesting, 'Creation')
    .withArgs(admin.address, scheduleId, totalAmount);

  return scheduleId;
}

async function creationFailed(admin, address, periods, message) {
  await expect(
    vesting.connect(admin).requestCreation(address, RUN_TIME, periods, false)
  )
    .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function releaseSuccess(acc, scheduleId, amount) {
  await expect(
    vesting.connect(acc).release(scheduleId, amount)
  )
    .to.emit(vesting, 'Release')
    .withArgs(acc.address, scheduleId, amount);
}

async function releaseFailed(acc, scheduleId, amount, message) {
  await expect(
    vesting.connect(acc).release(scheduleId, amount)
  )
    .to.be.revertedWith(message);
}
