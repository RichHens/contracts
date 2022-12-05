const { expect } = require("chai");
const { ethers } = require("hardhat");

const
  MIN_REQUESTS_REQUIRED = 3;
let
  minter1,
  minter2,
  minter3,
  minter4,
  minter5,
  notMinter,
  minters = [],
  token;


/**
 * ------------------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------------------
 */
describe('HEN Token: Minter access tests', function () {

  beforeEach(async function () {
    [minter1, minter2, minter3, minter4, minter5, notMinter] = await ethers.getSigners();
    // the first minter must be the owner of the contract
    // must be two more minters than in MIN_REQUESTS_REQUIRED (see the test ban checking -> more than enough)
    minters = [minter1, minter2, minter3, minter4, minter5];
    const HENToken = await ethers.getContractFactory("MockHENToken", minter1);
    token = await HENToken.deploy(
      0,
      [[0, 1000]],
      [
        minter1.address,
        minter2.address,
        minter3.address,
        minter4.address,
        minter5.address
      ],
      MIN_REQUESTS_REQUIRED
    );
    await token.deployed();
    await token.setCurrentTime(0);
  });


  /**
   * Request tests
   */
  describe('Request tests', function () {
    // ----------------------------------------------------------------------------
    it("enough requests (requests == MIN_REQUESTS_REQUIRED)", async function() {
      let banAccount = minters[MIN_REQUESTS_REQUIRED];
      for (let i=0; i<MIN_REQUESTS_REQUIRED; i++) {
        await requestMinterBanSuccess(minters[i], banAccount);
      }
      await banMinterSuccess(minter1, banAccount);
      expect(await token.isMinter(banAccount.address))
        .to.be.eq(false);
    });

    // ----------------------------------------------------------------------------
    it("not enough requests (requests == MIN_REQUESTS_REQUIRED - 1)", async function() {
      let banAccount = minters[MIN_REQUESTS_REQUIRED];
      for (let i=0; i<MIN_REQUESTS_REQUIRED - 1; i++) {
        await requestMinterBanSuccess(minters[i], banAccount);
      }
      await banMinterFailed(minter1, banAccount, "HENToken: Not enough requests.");
      expect(await token.isMinter(banAccount.address))
        .to.be.eq(true);
    });

    // ----------------------------------------------------------------------------
    it("more than enough requests (requests == MIN_REQUESTS_REQUIRED + 1)", async function() {
      let banAccount = minters[MIN_REQUESTS_REQUIRED + 1];
      for (let i=0; i<MIN_REQUESTS_REQUIRED + 1; i++) {
        await requestMinterBanSuccess(minters[i], banAccount);
      }
      await banMinterSuccess(minter1, banAccount);
      expect(await token.isMinter(banAccount.address))
        .to.be.eq(false);
    });

    // ----------------------------------------------------------------------------
    it("two minter request for the same minter", async function() {
      let banAccount = minters[1];
      await requestMinterBanSuccess(minter1, banAccount);
      await requestMinterBanFailed(minter1, banAccount, "HENToken: The request already exists.");
    });

    // ----------------------------------------------------------------------------
    it("two bans for the same minter", async function() {
      let banAccount = minters[MIN_REQUESTS_REQUIRED];
      for (let i=0; i<MIN_REQUESTS_REQUIRED; i++) {
        await requestMinterBanSuccess(minters[i], banAccount);
      }
      await banMinterSuccess(minter1, banAccount);
      expect(await token.isMinter(banAccount.address))
        .to.be.eq(false);
      await banMinterFailed(minter1, banAccount, "HENToken: The account is not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("ban not a minter", async function() {
      await requestMinterBanFailed(minter1, notMinter, "HENToken: The account is not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("ban yourself", async function() {
      await requestMinterBanFailed(minter1, minter1, "HENToken: It is forbidden to ban yourself.");
    });
  });


  /**
   * Revocation tests
   */
  describe('Revocation tests', function () {
    // ----------------------------------------------------------------------------
    it("enough requests -> revoke one -> ban failed", async function() {
      let banAccount = minters[MIN_REQUESTS_REQUIRED];
      for (let i=0; i<MIN_REQUESTS_REQUIRED; i++) {
        await requestMinterBanSuccess(minters[i], banAccount);
      }
      await revokeMinterBanRequestSuccess(minter1, banAccount)
      await banMinterFailed(minter1, banAccount, "HENToken: Not enough requests.");
      expect(await token.isMinter(banAccount.address))
        .to.be.eq(true);
    });

    // ----------------------------------------------------------------------------
    it("enough requests -> revoke one -> return it -> ban failed", async function() {
      let banAccount = minters[MIN_REQUESTS_REQUIRED];
      for (let i=0; i<MIN_REQUESTS_REQUIRED; i++) {
        await requestMinterBanSuccess(minters[i], banAccount);
      }
      await revokeMinterBanRequestSuccess(minter1, banAccount)
      await requestMinterBanSuccess(minter1, banAccount);
      await banMinterSuccess(minter1, banAccount);
      expect(await token.isMinter(banAccount.address))
        .to.be.eq(false);
    });
  });


  /**
   * onlyMinter tests
   */
  describe('onlyMinter tests', function () {
    // ----------------------------------------------------------------------------
    it("requestMinterBan", async function() {
      await requestMinterBanFailed(notMinter, minter1, "HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("revokeMinterBanRequest", async function() {
      await revokeMinterBanRequestFailed(notMinter, minter1, "HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("banMinter", async function() {
      await banMinterFailed(notMinter, minter1, "HENToken: You are not a minter.");
    });
  });

});



/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function requestMinterBanSuccess(minter, account) {
  await expect(
    token.connect(minter).requestMinterBan(account.address)
  )
    .to.emit(token, 'BanRequest')
    .withArgs(minter.address, account.address);
}

async function requestMinterBanFailed(minter, account, message) {
  await expect(
    token.connect(minter).requestMinterBan(account.address)
  )
    .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function revokeMinterBanRequestSuccess(minter, account) {
  await expect(
    token.connect(minter).revokeMinterBanRequest(account.address)
  )
    .to.emit(token, 'BanRevocation')
    .withArgs(minter.address, account.address);
}

async function revokeMinterBanRequestFailed(minter, account, message) {
  await expect(
    token.connect(minter).revokeMinterBanRequest(account.address)
  )
    .to.be.revertedWith(message);
}

// ----------------------------------------------------------------------------
async function banMinterSuccess(minter, account) {
  await expect(
    token.connect(minter).banMinter(account.address)
  )
    .to.emit(token, 'Ban')
    .withArgs(minter.address, account.address);
}

async function banMinterFailed(minter, account, message) {
  await expect(
    token.connect(minter).banMinter(account.address)
  )
    .to.be.revertedWith(message);
}