const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('HEN Vesting: Revocation vesting access tests', function () {
  const minRequestsRequired = 3;

  let acc1, acc2, acc3, acc4, acc5, accNotAdmin, admins, token, vesting, testScheduleId;

  beforeEach(async function () {
    [acc1, acc2, acc3, acc4, acc5, accNotAdmin] = await ethers.getSigners();
    admins = [acc1, acc2, acc3, acc4, acc5];
    // the first admin must be the owner of the contract
    // must be two more admins than in minRequestsRequired (see the test ban checking  -> more than enough)
    const HENToken = await ethers.getContractFactory("HENToken", acc1);
    token = await HENToken.deploy(0, [[0, 1000000]], [acc1.address, acc2.address], 1);
    await token.deployed();

    const HENVesting = await ethers.getContractFactory("MockHENVesting", acc1);
    vesting = await HENVesting.deploy(
      token.address,
      [
        acc1.address,
        acc2.address,
        acc3.address,
        acc4.address,
        acc5.address
      ],
      minRequestsRequired
    );
    await vesting.deployed();

    await token.requestMinting(vesting.address, 1000000);
    await token.mint(0);

    testScheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);
    await vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], true);
    for (let i=1; i<minRequestsRequired; i++) {
      await vesting.connect(admins[i]).approveCreationRequest(testScheduleId);
    }
    vesting.create(testScheduleId);
  });


  /**
   * Creating with varying number of approvals
   */
  describe('creation request checking', function () {
    // ----------------------------------------------------------------------------
    it("enough approvals (approvals == minApprovalsRequired)", async function() {
      for (let i=0; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).requestRevocation(testScheduleId))
          .to.emit(vesting, 'RevocationRequest')
          .withArgs(admins[i].address, testScheduleId);
      }

      await expect(vesting.revoke(testScheduleId))
        .to.emit(vesting, 'Revocation')
        .withArgs(acc1.address, testScheduleId, 2);
    });

    // ----------------------------------------------------------------------------
    it("not enough approvals (approvals == minApprovalsRequired - 1)", async function() {
      for (let i=0; i<minRequestsRequired - 1; i++) {
        await expect(vesting.connect(admins[i]).requestRevocation(testScheduleId))
          .to.emit(vesting, 'RevocationRequest')
          .withArgs(admins[i].address, testScheduleId);
      }

      await expect(vesting.revoke(testScheduleId))
        .to.be.revertedWith("HENVesting: not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("more than enough approvals (approvals == minApprovalsRequired + 1)", async function() {
      for (let i=0; i<minRequestsRequired + 1; i++) {
        await expect(vesting.connect(admins[i]).requestRevocation(testScheduleId))
          .to.emit(vesting, 'RevocationRequest')
          .withArgs(admins[i].address, testScheduleId);
      }

      await expect(vesting.revoke(testScheduleId))
        .to.emit(vesting, 'Revocation')
        .withArgs(acc1.address, testScheduleId, 2);
    });

    // ----------------------------------------------------------------------------
    it("try to create twice one request", async function() {
      await expect(vesting.requestRevocation(testScheduleId))
        .to.emit(vesting, 'RevocationRequest')
        .withArgs(acc1.address, testScheduleId);

      await expect(vesting.requestRevocation(testScheduleId))
        .to.be.revertedWith("HENVesting: revocation is already requested.");
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-revocable schedule", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 1);

      await vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false);
      for (let i=1; i<minRequestsRequired; i++) {
        await vesting.connect(admins[i]).approveCreationRequest(scheduleId);
      }
      vesting.create(scheduleId);

      await expect(vesting.requestRevocation(scheduleId))
        .to.be.revertedWith("HENVesting: Schedule is not revocable.");;
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-existing request", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 1);

      await expect(vesting.requestRevocation(scheduleId))
        .to.be.revertedWith("HENVesting: schedule does not exist.");;
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-created request", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 1);

      await vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], true);

      await expect(vesting.requestRevocation(scheduleId))
        .to.be.revertedWith("HENVesting: Schedule is not created.");
    });
  });


  /**
   * Revocation checking
   */
  describe('revocation request checking', function () {
    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> revocation failed", async function() {
      for (let i=0; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).requestRevocation(testScheduleId))
          .to.emit(vesting, 'RevocationRequest')
          .withArgs(admins[i].address, testScheduleId);
      }

      await expect(vesting.revokeRevocationRequest(testScheduleId))
        .to.emit(vesting, 'RevocationRequestRevocation')
        .withArgs(acc1.address, testScheduleId);

      await expect(vesting.revoke(testScheduleId))
        .to.be.revertedWith("HENVesting: not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> revocation success", async function() {
      for (let i=0; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).requestRevocation(testScheduleId))
          .to.emit(vesting, 'RevocationRequest')
          .withArgs(admins[i].address, testScheduleId);
      }

      await expect(vesting.revokeRevocationRequest(testScheduleId))
        .to.emit(vesting, 'RevocationRequestRevocation')
        .withArgs(acc1.address, testScheduleId);

      await expect(vesting.requestRevocation(testScheduleId))
        .to.emit(vesting, 'RevocationRequest')
        .withArgs(acc1.address, testScheduleId);

      await expect(vesting.revoke(testScheduleId))
        .to.emit(vesting, 'Revocation')
        .withArgs(acc1.address, testScheduleId, 2);
    });

    // ----------------------------------------------------------------------------
    it("try to revoke already revoked request", async function() {
      for (let i=0; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).requestRevocation(testScheduleId))
          .to.emit(vesting, 'RevocationRequest')
          .withArgs(admins[i].address, testScheduleId);
      }

      await expect(vesting.revoke(testScheduleId))
        .to.emit(vesting, 'Revocation')
        .withArgs(acc1.address, testScheduleId, 2);

      await expect(vesting.revoke(testScheduleId))
        .to.be.revertedWith("HENVesting: schedule does not exist.");
    });
  });


  /**
   * onlyAdmin checking
   */
  describe('checking if only admin can call functions', function () {
    // ----------------------------------------------------------------------------
    it("revoke", async function() {
      await expect(vesting.connect(accNotAdmin).revoke(testScheduleId))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("requestRevocation", async function() {
      await expect(vesting.connect(accNotAdmin).requestRevocation(testScheduleId))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("revokeRevocationRequest", async function() {
      await expect(vesting.connect(accNotAdmin).revokeRevocationRequest(testScheduleId))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });
  });

});