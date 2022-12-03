const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('HEN Vesting: Admin tests', function () {
  const minRequestsRequired = 3;

  let acc1, acc2, acc3, acc4, acc5, accNotAdmin, admins, token, vesting;

  beforeEach(async function () {
    [acc1, acc2, acc3, acc4, acc5, accNotAdmin] = await ethers.getSigners();
    admins = [acc1, acc2, acc3, acc4, acc5];
    // the first admin must be the owner of the contract
    // must be two more admins than in minRequestsRequired (see the test ban checking -> more than enough)
    const HENToken = await ethers.getContractFactory("HENToken", acc1);
    token = await HENToken.deploy(0, [], [acc1.address, acc2.address], 1);
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
  });


  /**
   * Ban tests
   */
  describe('ban checking', function () {
    // ----------------------------------------------------------------------------
    it("enough requests (requests == minRequestsRequired)", async function() {
      let banAccount = admins[minRequestsRequired];

      for (let i=0; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).requestAdminBan(banAccount.address))
          .to.emit(vesting, 'BanRequest')
          .withArgs(admins[i].address, banAccount.address);
      }

      await expect(vesting.banAdmin(banAccount.address))
        .to.emit(vesting, 'Ban')
        .withArgs(acc1.address, banAccount.address);

      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(false);
    });

    // ----------------------------------------------------------------------------
    it("not enough requests (requests == minRequestsRequired - 1)", async function() {
      let banAccount = admins[minRequestsRequired - 1];

      for (let i=0; i<minRequestsRequired - 1; i++) {
        await expect(vesting.connect(admins[i]).requestAdminBan(banAccount.address))
          .to.emit(vesting, 'BanRequest')
          .withArgs(admins[i].address, banAccount.address);
      }

      await expect(vesting.banAdmin(banAccount.address))
        .to.be.revertedWith("HENVesting: Not enough requests.");

      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(true);
    });

    // ----------------------------------------------------------------------------
    it("more than enough requests (requests == minRequestsRequired + 1)", async function() {
      let banAccount = admins[minRequestsRequired + 1];

      for (let i=0; i<minRequestsRequired + 1; i++) {
        await expect(vesting.connect(admins[i]).requestAdminBan(banAccount.address))
          .to.emit(vesting, 'BanRequest')
          .withArgs(admins[i].address, banAccount.address);
      }

      await expect(vesting.banAdmin(banAccount.address))
        .to.emit(vesting, 'Ban')
        .withArgs(acc1.address, banAccount.address);

      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(false);
    });

    // ----------------------------------------------------------------------------
    it("two admin requests for the same admin", async function() {
      let banAccount = admins[1];

      await expect(vesting.requestAdminBan(banAccount.address))
        .to.emit(vesting, 'BanRequest')
        .withArgs(acc1.address, banAccount.address);

      await expect(vesting.requestAdminBan(banAccount.address))
        .to.be.revertedWith("HENVesting: The request already exists.");
    });

    // ----------------------------------------------------------------------------
    it("two bans for the same admin", async function() {
      let banAccount = admins[minRequestsRequired];

      for (let i=0; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).requestAdminBan(banAccount.address))
          .to.emit(vesting, 'BanRequest')
          .withArgs(admins[i].address, banAccount.address);
      }

      await expect(vesting.banAdmin(banAccount.address))
        .to.emit(vesting, 'Ban')
        .withArgs(acc1.address, banAccount.address);

      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(false);

      await expect(vesting.banAdmin(banAccount.address))
        .to.be.revertedWith("HENVesting: The account is not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("ban not an admin", async function() {
      await expect(vesting.requestAdminBan(accNotAdmin.address))
        .to.be.revertedWith("HENVesting: The account is not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("ban yourself", async function() {
      await expect(vesting.requestAdminBan(acc1.address))
        .to.be.revertedWith("HENVesting: It is forbidden to ban yourself.");
    });
  });


  /**
   * Revoke tests
   */
  describe('revoke checking', function () {
    // ----------------------------------------------------------------------------
    it("enough requests -> revoke one -> ban failed", async function() {
      let banAccount = admins[minRequestsRequired];

      for (let i=0; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).requestAdminBan(banAccount.address))
          .to.emit(vesting, 'BanRequest')
          .withArgs(admins[i].address, banAccount.address);
      }

      await expect(vesting.connect(admins[0]).revokeAdminBanRequest(banAccount.address))
        .to.emit(vesting, 'BanRevocation')
        .withArgs(admins[0].address, banAccount.address);

      await expect(vesting.banAdmin(banAccount.address))
        .to.be.revertedWith("HENVesting: Not enough requests.");

      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(true);
    });

    // ----------------------------------------------------------------------------
    it("enough requests -> revoke one -> return it -> ban failed", async function() {
      let banAccount = admins[minRequestsRequired];

      for (let i=0; i<minRequestsRequired; i++) {
        await expect(vesting.connect(admins[i]).requestAdminBan(banAccount.address))
          .to.emit(vesting, 'BanRequest')
          .withArgs(admins[i].address, banAccount.address);
      }

      await expect(vesting.connect(admins[0]).revokeAdminBanRequest(banAccount.address))
        .to.emit(vesting, 'BanRevocation')
        .withArgs(admins[0].address, banAccount.address);

      await expect(vesting.connect(admins[0]).requestAdminBan(banAccount.address))
        .to.emit(vesting, 'BanRequest')
        .withArgs(admins[0].address, banAccount.address);

      await expect(vesting.banAdmin(banAccount.address))
        .to.emit(vesting, 'Ban')
        .withArgs(acc1.address, banAccount.address);

      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(false);
    });
  });


  /**
   * onlyAdmin checking
   */
  describe('checking if only admin can call functions', function () {
    // ----------------------------------------------------------------------------
    it("requestAdminBan", async function() {
      await expect(vesting.connect(accNotAdmin).requestAdminBan(acc1.address))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("revokeAdminBanRequest", async function() {
      await expect(vesting.connect(accNotAdmin).revokeAdminBanRequest(acc1.address))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("banAdmin", async function() {
      await expect(vesting.connect(accNotAdmin).banAdmin(acc1.address))
        .to.be.revertedWith("HENVesting: You are not an admin.");
    });

    // // ----------------------------------------------------------------------------
    // it("getTotalAdmins", async function() {
    //   await expect(vesting.connect(accNotAdmin).getTotalAdmins())
    //     .to.be.revertedWith("HENVesting: You are not an admin.");
    // });
    //
    // // ----------------------------------------------------------------------------
    // it("isAdmin", async function() {
    //   await expect(vesting.connect(accNotAdmin).isAdmin(acc1.address))
    //     .to.be.revertedWith("HENVesting: You are not an admin.");
    // });
  });

});
