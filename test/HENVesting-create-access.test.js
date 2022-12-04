const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('HEN Vesting: Creation vesting access tests', function () {
  const minRequestsRequired = 3;

  let acc1, acc2, acc3, acc4, acc5, accNotAdmin, admins, token, vesting;

  beforeEach(async function () {
    [acc1, acc2, acc3, acc4, acc5, accNotAdmin] = await ethers.getSigners();
    admins = [acc1, acc2, acc3, acc4, acc5];
    // the first admin must be the owner of the contract
    // must be two more admins than in minRequestsRequired (see the test ban checking  -> more than enough)
    const HENToken = await ethers.getContractFactory("HENToken", acc1);
    token = await HENToken.deploy(0, [[0,1000000]], [acc1.address, acc2.address], 1);
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
  });


  /**
   * Creating with varying number of approvals
   */
  describe('creating checking', function () {
    // ----------------------------------------------------------------------------
    it("enough approvals (approvals == minApprovalsRequired)", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      for (let i=1; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).approveCreationRequest(scheduleId))
          .to.emit(vesting, 'CreationRequestApproval')
          .withArgs(admins[i].address, scheduleId);
      }

      await expect(vesting.create(scheduleId))
        .to.emit(vesting, 'Creation')
        .withArgs(acc1.address, scheduleId, 2);
    });

    // ----------------------------------------------------------------------------
    it("not enough approvals (approvals == minApprovalsRequired - 1)", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      for (let i=1; i<minRequestsRequired - 1; i++) {
        await expect(vesting.connect(admins[i]).approveCreationRequest(scheduleId))
          .to.emit(vesting, 'CreationRequestApproval')
          .withArgs(admins[i].address, scheduleId);
      }

      await expect(vesting.create(scheduleId))
        .to.be.revertedWith("HENVesting: not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("more than enough approvals (approvals == minApprovalsRequired + 1)", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      for (let i=1; i<minRequestsRequired + 1; i++) {
        await expect(vesting.connect(admins[i]).approveCreationRequest(scheduleId))
          .to.emit(vesting, 'CreationRequestApproval')
          .withArgs(admins[i].address, scheduleId);
      }

      await expect(vesting.create(scheduleId))
        .to.emit(vesting, 'Creation')
        .withArgs(acc1.address, scheduleId, 2);
    });

    // ----------------------------------------------------------------------------
    it("try to create twice one request", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      for (let i=1; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).approveCreationRequest(scheduleId))
          .to.emit(vesting, 'CreationRequestApproval')
          .withArgs(admins[i].address, scheduleId);
      }

      await expect(vesting.create(scheduleId))
        .to.emit(vesting, 'Creation')
        .withArgs(acc1.address, scheduleId, 2);

      await expect(vesting.create(scheduleId))
        .to.be.revertedWith("HENVesting: schedule is already created.");
    });
  });


  /**
   * Approval checking
   */
  describe('approval checking', function () {
    // ----------------------------------------------------------------------------
    it("try to approve twice one request", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      await expect(vesting.approveCreationRequest(scheduleId))
        .to.be.revertedWith("HENVesting: request is already approved.");

      await expect(vesting.connect(admins[1]).approveCreationRequest(scheduleId))
        .to.emit(vesting, 'CreationRequestApproval')
        .withArgs(admins[1].address, scheduleId);

      await expect(vesting.connect(admins[1]).approveCreationRequest(scheduleId))
        .to.be.revertedWith("HENVesting: request is already approved.");
    });

    // ----------------------------------------------------------------------------
    it("try to approve a non-existing request", async function() {
      let
        scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0),
        wrongScheduleId = await vesting.generateScheduleId(accNotAdmin.address, 1);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      await expect(vesting.approveCreationRequest(wrongScheduleId))
        .to.be.revertedWith("HENVesting: schedule does not exist.");
    });

    // ----------------------------------------------------------------------------
    it("try to approve already created request", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      for (let i=1; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).approveCreationRequest(scheduleId))
          .to.emit(vesting, 'CreationRequestApproval')
          .withArgs(admins[i].address, scheduleId);
      }

      await expect(vesting.create(scheduleId))
        .to.emit(vesting, 'Creation')
        .withArgs(acc1.address, scheduleId, 2);

      await expect(vesting.create(scheduleId))
        .to.be.revertedWith("HENVesting: schedule is already created.");
    });
  });


  /**
   * Revocation checking
   */
  describe('revocation checking', function () {
    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> creating failed", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      for (let i=1; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).approveCreationRequest(scheduleId))
          .to.emit(vesting, 'CreationRequestApproval')
          .withArgs(admins[i].address, scheduleId);
      }

      await expect(vesting.revokeCreationRequest(scheduleId))
        .to.emit(vesting, 'CreationRequestRevocation')
        .withArgs(acc1.address, scheduleId);

      await expect(vesting.create(scheduleId))
        .to.be.revertedWith("HENVesting: not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> return it -> creation success", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      for (let i=1; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).approveCreationRequest(scheduleId))
          .to.emit(vesting, 'CreationRequestApproval')
          .withArgs(admins[i].address, scheduleId);
      }

      await expect(vesting.revokeCreationRequest(scheduleId))
        .to.emit(vesting, 'CreationRequestRevocation')
        .withArgs(acc1.address, scheduleId);

      await expect(vesting.approveCreationRequest(scheduleId))
        .to.emit(vesting, 'CreationRequestApproval')
        .withArgs(acc1.address, scheduleId);

      await expect(vesting.create(scheduleId))
        .to.emit(vesting, 'Creation')
        .withArgs(acc1.address, scheduleId, 2);
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-existing request", async function() {
      let
        scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0),
        wrongScheduleId = await vesting.generateScheduleId(accNotAdmin.address, 1);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      await expect(vesting.revokeCreationRequest(wrongScheduleId))
        .to.be.revertedWith("HENVesting: schedule does not exist.");
    });

    // ----------------------------------------------------------------------------
    it("try to revoke already created request", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.emit(vesting, 'CreationRequest')
        .withArgs(acc1.address, scheduleId);

      for (let i=1; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).approveCreationRequest(scheduleId))
          .to.emit(vesting, 'CreationRequestApproval')
          .withArgs(admins[i].address, scheduleId);
      }

      await expect(vesting.create(scheduleId))
        .to.emit(vesting, 'Creation')
        .withArgs(acc1.address, scheduleId, 2);

      await expect(vesting.revokeCreationRequest(scheduleId))
        .to.be.revertedWith("HENVesting: schedule is already created.");
    });
  });

  /**
   * onlyAdmin checking
   */
  describe('checking if only admin can call functions', function () {
    // ----------------------------------------------------------------------------
    it("create", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.connect(accNotAdmin).create(scheduleId))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("requestCreation", async function() {
      await expect(vesting.connect(accNotAdmin).requestCreation(accNotAdmin.address, 0, [[0,1],[1,1]], false))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("approveCreationRequest", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.connect(accNotAdmin).approveCreationRequest(scheduleId))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("revokeCreationRequest", async function() {
      let scheduleId = await vesting.generateScheduleId(accNotAdmin.address, 0);

      await expect(vesting.connect(accNotAdmin).revokeCreationRequest(scheduleId))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });
  });

});