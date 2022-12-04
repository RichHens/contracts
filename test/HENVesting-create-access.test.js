const { expect } = require("chai");
const { ethers } = require("hardhat");
const {not} = require("ramda");

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
 * Helpers: requestCreation
 */
async function requestCreationSuccess(acc, scheduleId) {
  await expect(
    vesting.connect(acc).requestCreation(notAdmin.address, 0, [[0,1],[1,1]], false)
  )
    .to.emit(vesting, 'CreationRequest')
    .withArgs(acc.address, scheduleId);
}

async function requestCreationFailed(acc, scheduleId, message) {
  await expect(
    vesting.connect(acc).requestCreation(notAdmin.address, 0, [[0,1],[1,1]], false)
  )
    .to.be.revertedWith(message);
}

/**
 * Helpers: approveCreationRequest
 */
async function approveCreationRequestSuccess(acc, scheduleId) {
  await expect(
    vesting.connect(acc).approveCreationRequest(scheduleId)
  )
    .to.emit(vesting, 'CreationRequestApproval')
    .withArgs(acc.address, scheduleId);
}

async function approveCreationRequestFailed(acc, scheduleId, message) {
  await expect(
    vesting.connect(acc).approveCreationRequest(scheduleId)
  )
    .to.be.revertedWith(message);
}

/**
 * Helpers: revokeCreationRequest
 */
async function revokeCreationRequestSuccess(acc, scheduleId) {
  await expect(
    vesting.connect(acc).revokeCreationRequest(scheduleId)
  )
    .to.emit(vesting, 'CreationRequestRevocation')
    .withArgs(acc.address, scheduleId);
}

async function revokeCreationRequestFailed(acc, scheduleId, message) {
  await expect(
    vesting.connect(acc).revokeCreationRequest(scheduleId)
  )
    .to.be.revertedWith(message);
}

/**
 * Helpers: create
 */
async function createSuccess(acc, scheduleId) {
  await expect(
    vesting.connect(acc).create(scheduleId)
  )
    .to.emit(vesting, 'Creation')
    .withArgs(admin1.address, scheduleId, 2);
}

async function createFailed(acc, scheduleId, message) {
  await expect(
    vesting.connect(acc).create(scheduleId)
  )
    .to.be.revertedWith(message);
}


/**
 * Testing
 */
describe('HEN Vesting: Creation vesting access tests', function () {
  beforeEach(async function () {
    [admin1, admin2, admin3, admin4, admin5, notAdmin] = await ethers.getSigners();
    admins = [admin1, admin2, admin3, admin4, admin5];
    // the first admin must be the owner of the contract
    // must be two more admins than in MIN_REQUESTS_REQUIRED (see the test ban checking  -> more than enough)
    const HENToken = await ethers.getContractFactory("HENToken", admin1);
    token = await HENToken.deploy(0, [[0,1000000]], [admin1.address, admin2.address], 1);
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
    it("enough approvals (approvals == minApprovalsRequired)", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
        await approveCreationRequestSuccess(admins[i], testScheduleId);
      }
      await createSuccess(admin1, testScheduleId);
    });

    // ----------------------------------------------------------------------------
    it("not enough approvals (approvals == minApprovalsRequired - 1)", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      for (let i=1; i<MIN_REQUESTS_REQUIRED - 1; i++) {
        await approveCreationRequestSuccess(admins[i], testScheduleId);
      }
      await createFailed(admin1, testScheduleId, "HENVesting: Not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("more than enough approvals (approvals == minApprovalsRequired + 1)", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      for (let i=1; i<MIN_REQUESTS_REQUIRED + 1; i++) {
        await approveCreationRequestSuccess(admins[i], testScheduleId);
      }
      await createSuccess(admin1, testScheduleId);
    });

    // ----------------------------------------------------------------------------
    it("try to create a request twice", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
        await approveCreationRequestSuccess(admins[i], testScheduleId);
      }
      await createSuccess(admin1, testScheduleId);
      await createFailed(admin1, testScheduleId, "HENVesting: Schedule is already created.");
    });
  });


  /**
   * Approval tests
   */
  describe('Approvals tests', function () {
    // ----------------------------------------------------------------------------
    it("try to approve twice one request", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      await approveCreationRequestFailed(admin1, testScheduleId, "HENVesting: Request is already approved.");
      await approveCreationRequestSuccess(admin2, testScheduleId);
      await approveCreationRequestFailed(admin2, testScheduleId, "HENVesting: Request is already approved.");
    });

    // ----------------------------------------------------------------------------
    it("try to approve a non-existent request", async function() {
      let wrongScheduleId = await vesting.generateScheduleId(notAdmin.address, 1);
      await requestCreationSuccess(admin1, testScheduleId);
      await approveCreationRequestFailed(admin1, wrongScheduleId, "HENVesting: Schedule does not exist.");
    });

    // ----------------------------------------------------------------------------
    it("try to approve an already created request", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
        await approveCreationRequestSuccess(admins[i], testScheduleId);
      }
      await createSuccess(admin1, testScheduleId);
      await createFailed(admin1, testScheduleId, "HENVesting: Schedule is already created.");
    });
  });


  /**
   * Revocation checking
   */
  describe('Revocation tests', function () {
    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> creating failed", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
        await approveCreationRequestSuccess(admins[i], testScheduleId);
      }
      await revokeCreationRequestSuccess(admin1, testScheduleId);
      await createFailed(admin1, testScheduleId, "HENVesting: Not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> return it -> creation success", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
        await approveCreationRequestSuccess(admins[i], testScheduleId);
      }
      await revokeCreationRequestSuccess(admin1, testScheduleId);
      await approveCreationRequestSuccess(admin1, testScheduleId);
      await createSuccess(admin1, testScheduleId);
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-existing request", async function() {
      let wrongScheduleId = await vesting.generateScheduleId(notAdmin.address, 1);
      await requestCreationSuccess(admin1, testScheduleId);
      await revokeCreationRequestFailed(admin1, wrongScheduleId, "HENVesting: Schedule does not exist.");
    });

    // ----------------------------------------------------------------------------
    it("try to revoke already created request", async function() {
      await requestCreationSuccess(admin1, testScheduleId);
      for (let i=1; i<MIN_REQUESTS_REQUIRED; i++) {
        await approveCreationRequestSuccess(admins[i], testScheduleId);
      }
      await createSuccess(admin1, testScheduleId);
      await revokeCreationRequestFailed(admin1, testScheduleId, "HENVesting: Schedule is already created.");
    });
  });

  /**
   * onlyAdmin tests
   */
  describe('onlyAdmin tests', function () {
    // ----------------------------------------------------------------------------
    it("create", async function() {
      await createFailed(notAdmin, testScheduleId, "HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("requestCreation", async function() {
      await requestCreationFailed(notAdmin, testScheduleId, "HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("approveCreationRequest", async function() {
      await approveCreationRequestFailed(notAdmin, testScheduleId, "HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("revokeCreationRequest", async function() {
      await revokeCreationRequestFailed(notAdmin, testScheduleId, "HENVesting: You are not an admin.");
    });
  });

});