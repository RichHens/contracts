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
  vesting;


/**
 * ------------------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------------------
 */
describe('HEN Vesting: Admin access tests', function () {

  beforeEach(async function () {
    [admin1, admin2, admin3, admin4, admin5, notAdmin] = await ethers.getSigners();
    admins = [admin1, admin2, admin3, admin4, admin5];
    // the first admin must be the owner of the contract
    // must be two more admins than in MIN_REQUEST_REQUIRED (see the test ban checking -> more than enough)
    const HENToken = await ethers.getContractFactory("HENToken", admin1);
    token = await HENToken.deploy(0, [], [admin1.address, admin2.address], 1);
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
  });


  /**
   * Request tests
   */
  describe('Request tests', function () {
    // ----------------------------------------------------------------------------
    it("enough requests (requests == MIN_REQUEST_REQUIRED)", async function() {
      let banAccount = admins[MIN_REQUEST_REQUIRED];
      for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
        await requestAdminBanSuccess(admins[i], banAccount);
      }
      await banAdminSuccess(admin1, banAccount);
      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(false);
    });

    // ----------------------------------------------------------------------------
    it("not enough requests (requests == MIN_REQUEST_REQUIRED - 1)", async function() {
      let banAccount = admins[MIN_REQUEST_REQUIRED];
      for (let i=0; i<MIN_REQUEST_REQUIRED - 1; i++) {
        await requestAdminBanSuccess(admins[i], banAccount);
      }
      await banAdminFailed(admin1, banAccount, "HENVesting: Not enough requests.");
      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(true);
    });

    // ----------------------------------------------------------------------------
    it("more than enough requests (requests == MIN_REQUEST_REQUIRED + 1)", async function() {
      let banAccount = admins[MIN_REQUEST_REQUIRED + 1];
      for (let i=0; i<MIN_REQUEST_REQUIRED + 1; i++) {
        await requestAdminBanSuccess(admins[i], banAccount);
      }
      await banAdminSuccess(admin1, banAccount);
      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(false);
    });

    // ----------------------------------------------------------------------------
    it("two admin request for the same admin", async function() {
      let banAccount = admins[1];
      await requestAdminBanSuccess(admin1, banAccount);
      await requestAdminBanFailed(admin1, banAccount, "HENVesting: The request already exists.");
    });

    // ----------------------------------------------------------------------------
    it("two bans for the same admin", async function() {
      let banAccount = admins[MIN_REQUEST_REQUIRED];
      for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
        await requestAdminBanSuccess(admins[i], banAccount);
      }
      await banAdminSuccess(admin1, banAccount);
      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(false);
      await banAdminFailed(admin1, banAccount, "HENVesting: The account is not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("ban not an admin", async function() {
      await requestAdminBanFailed(admin1, notAdmin, "HENVesting: The account is not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("ban yourself", async function() {
      await requestAdminBanFailed(admin1, admin1, "HENVesting: It is forbidden to ban yourself.");
    });
  });


  /**
   * Revocation tests
   */
  describe('Revocation tests', function () {
    // ----------------------------------------------------------------------------
    it("enough requests -> revoke one -> ban failed", async function() {
      let banAccount = admins[MIN_REQUEST_REQUIRED];
      for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
        await requestAdminBanSuccess(admins[i], banAccount);
      }
      await revokeAdminBanRequestSuccess(admin1, banAccount)
      await banAdminFailed(admin1, banAccount, "HENVesting: Not enough requests.");
      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(true);
    });

    // ----------------------------------------------------------------------------
    it("enough requests -> revoke one -> return it -> ban failed", async function() {
      let banAccount = admins[MIN_REQUEST_REQUIRED];
      for (let i=0; i<MIN_REQUEST_REQUIRED; i++) {
        await requestAdminBanSuccess(admins[i], banAccount);
      }
      await revokeAdminBanRequestSuccess(admin1, banAccount)
      await requestAdminBanSuccess(admin1, banAccount);
      await banAdminSuccess(admin1, banAccount);
      expect(await vesting.isAdmin(banAccount.address))
        .to.be.eq(false);
    });
  });


  /**
   * onlyAdmin tests
   */
  describe('onlyAdmin tests', function () {
    // ----------------------------------------------------------------------------
    it("requestAdminBan", async function() {
      await requestAdminBanFailed(notAdmin, admin1, "HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("revokeAdminBanRequest", async function() {
      await revokeAdminBanRequestFailed(notAdmin, admin1, "HENVesting: You are not an admin.");
    });

    // ----------------------------------------------------------------------------
    it("banAdmin", async function() {
      await banAdminFailed(notAdmin, admin1, "HENVesting: You are not an admin.");
    });
  });

});



/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function requestAdminBanSuccess(admin, account) {
  await expect(
    vesting.connect(admin).requestAdminBan(account.address)
  )
    .to.emit(vesting, 'BanRequest')
    .withArgs(admin.address, account.address);
}

async function requestAdminBanFailed(admin, account, message) {
  await expect(
    vesting.connect(admin).requestAdminBan(account.address)
  )
    .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function revokeAdminBanRequestSuccess(admin, account) {
  await expect(
    vesting.connect(admin).revokeAdminBanRequest(account.address)
  )
    .to.emit(vesting, 'BanRevocation')
    .withArgs(admin.address, account.address);
}

async function revokeAdminBanRequestFailed(admin, account, message) {
  await expect(
    vesting.connect(admin).revokeAdminBanRequest(account.address)
  )
    .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function banAdminSuccess(admin, account) {
  await expect(
    vesting.connect(admin).banAdmin(account.address)
  )
    .to.emit(vesting, 'Ban')
    .withArgs(admin.address, account.address);
}

async function banAdminFailed(admin, account, message) {
  await expect(
    vesting.connect(admin).banAdmin(account.address)
  )
    .to.be.revertedWith(message);
}