const { expect } = require("chai");
const { ethers } = require("hardhat");

const
  MIN_REQUEST_REQUIRED = 3;
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
 * Helpers: create schedule
 */
async function createSchedule(index, revocable) {
  let scheduleId = await vesting.generateScheduleId(notAdmin.address, index);
  await vesting.requestCreation(notAdmin.address, 0, [[0,1],[1,1]], revocable);
  for (let i=1; i<MIN_REQUEST_REQUIRED; i++) {
    await vesting.connect(admins[i]).approveCreationRequest(scheduleId);
  }
  await vesting.create(scheduleId);
  return scheduleId;
}

/**
 * Helpers: requestRevocation
 */
async function requestRevocationSuccess(acc, scheduleId) {
  await expect(
    vesting.connect(acc).requestRevocation(scheduleId)
  )
    .to.emit(vesting, 'RevocationRequest')
    .withArgs(acc.address, scheduleId);
}

async function requestRevocationFailed(acc, scheduleId, message) {
  await expect(
    vesting.connect(acc).requestRevocation(scheduleId)
  )
    .to.be.revertedWith(message);
}

/**
 * Helpers: revoke
 */
async function revokeSuccess(acc, scheduleId) {
  await expect(
    vesting.connect(acc).revoke(scheduleId)
  )
    .to.emit(vesting, 'Revocation')
    .withArgs(acc.address, scheduleId, 2);
}

async function revokeFailed(acc, scheduleId, message) {
  await expect(
    vesting.connect(acc).revoke(scheduleId)
  )
    .to.be.revertedWith(message);
}

/**
 * Helpers: revokeRevocationRequest
 */
async function revokeRevocationRequestSuccess(acc, scheduleId) {
  await expect(
    vesting.connect(acc).revokeRevocationRequest(scheduleId)
  )
    .to.emit(vesting, 'RevocationRequestRevocation')
    .withArgs(acc.address, scheduleId);
}

async function revokeRevocationRequestFailed(acc, scheduleId, message) {
  await expect(
    vesting.connect(acc).revokeRevocationRequest(scheduleId)
  )
    .to.be.revertedWith(message);
}


/**
 * Testing
 */
describe('HEN Vesting: Revocation vesting access tests', function () {

  beforeEach(async function () {
    [admin1, admin2, admin3, admin4, admin5, notAdmin] = await ethers.getSigners();
    admins = [admin1, admin2, admin3, admin4, admin5];
    // the first admin must be the owner of the contract
    // must be two more admins than in MIN_REQUEST_REQUIRED (see the test ban checking  -> more than enough)
    const HENToken = await ethers.getContractFactory("HENToken", admin1);
    token = await HENToken.deploy(0, [[0, 1000000]], [admin1.address, admin2.address], 1);
    await token.deployed();

    const HENVesting = await ethers.getContractFactory("MockHENVesting", admin1);
    vesting = await HENVesting.deploy(
      token.address,
      [
        admin1.address,
        admin2.address,
        admin3.address,
        admin4.address,
        admin5.address
      ],
      MIN_REQUEST_REQUIRED
    );
    await vesting.deployed();

    await token.requestMinting(vesting.address, 1000000);
    await token.mint(0);

    testScheduleId = await createSchedule(0, true);
  });


  /**
   * Request tests
   */
  describe('Request tests', function () {
    // ----------------------------------------------------------------------------
    it("enough approvals (approvals == minApprovalsRequired)", async function() {
      for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
        await requestRevocationSuccess(admins[i], testScheduleId);
      }
      await revokeSuccess(admin1, testScheduleId);
    });

    // ----------------------------------------------------------------------------
    it("not enough approvals (approvals == minApprovalsRequired - 1)", async function() {
      for (let i=0; i<MIN_REQUEST_REQUIRED - 1; i++) {
        await requestRevocationSuccess(admins[i], testScheduleId);
      }
      await revokeFailed(admin1, testScheduleId, "HENVesting: Not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("more than enough approvals (approvals == minApprovalsRequired + 1)", async function() {
      for (let i=0; i<MIN_REQUEST_REQUIRED + 1; i++) {
        await requestRevocationSuccess(admins[i], testScheduleId);
      }
      await revokeSuccess(admin1, testScheduleId);
    });

    // ----------------------------------------------------------------------------
    it("try to create a request twice", async function() {
      await requestRevocationSuccess(admin1, testScheduleId);
      await requestRevocationFailed(admin1, testScheduleId, "HENVesting: Revocation is already requested.");
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-revocable schedule", async function() {
      await requestRevocationFailed(
        admin1,
        await createSchedule(1, false),
        "HENVesting: Schedule is not revocable."
      );
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-existent request", async function() {
      await requestRevocationFailed(
        admin1,
        await vesting.generateScheduleId(notAdmin.address, 1),
        "HENVesting: Schedule does not exist."
      );
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-created request", async function() {
      await vesting.requestCreation(notAdmin.address, 0, [[0,1],[1,1]], true);
      await requestRevocationFailed(
        admin1,
        await vesting.generateScheduleId(notAdmin.address, 1),
        "HENVesting: Schedule is not created."
      );
    });
  });


  /**
   * Revocation tests
   */
  describe('Revocation tests', function () {
    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> revocation failed", async function() {
      for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
        await requestRevocationSuccess(admins[i], testScheduleId);
      }
      await revokeRevocationRequestSuccess(admin1, testScheduleId);
      await revokeFailed(admin1, testScheduleId, "HENVesting: Not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> revocation success", async function() {
      for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
        await requestRevocationSuccess(admins[i], testScheduleId);
      }
      await revokeRevocationRequestSuccess(admin1, testScheduleId);
      await requestRevocationSuccess(admin1, testScheduleId);
      await revokeSuccess(admin1, testScheduleId);
    });

    // ----------------------------------------------------------------------------
    it("try to revoke already revoked request", async function() {
      for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
        await requestRevocationSuccess(admins[i], testScheduleId);
      }
      await revokeSuccess(admin1, testScheduleId);
      await revokeFailed(admin1, testScheduleId, "HENVesting: Schedule does not exist.")
    });
  });


  /**
   * onlyAdmin tests
   */
  describe('onlyAdmin tests', function () {
    // ----------------------------------------------------------------------------
    it("revoke", async function() {
      await revokeFailed(notAdmin, testScheduleId, "HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("requestRevocation", async function() {
      await requestRevocationFailed(notAdmin, testScheduleId, "HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("revokeRevocationRequest", async function() {
      await revokeRevocationRequestFailed(notAdmin, testScheduleId, "HENVesting: You are not an admin.");
    });
  });

});