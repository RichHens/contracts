const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('HEN Token: Minter tests', function () {
  const minRequestsRequired = 3;

  let acc1, acc2, acc3, acc4, acc5, accNotMinter, minters, token;

  beforeEach(async function () {
    [acc1, acc2, acc3, acc4, acc5, accNotMinter] = await ethers.getSigners();
    // the first minter must be the owner of the contract
    // must be two more minters than in minRequestsRequired (see the test ban checking -> more than enough)
    minters = [acc1, acc2, acc3, acc4, acc5];
    const HENToken = await ethers.getContractFactory("MockHENToken", acc1);
    token = await HENToken.deploy(
      0,
      [[0, 1000]],
      [
        acc1.address,
        acc2.address,
        acc3.address,
        acc4.address,
        acc5.address
      ],
      minRequestsRequired
    );
    await token.deployed();
    await token.setCurrentTime(0);
  });


  /**
   * Ban tests
   */
  describe('ban checking', function () {
    // ----------------------------------------------------------------------------
    it("enough requests (requests == minRequestsRequired)", async function() {
      let banAccount = minters[minRequestsRequired];

      for (let i=0; i<minRequestsRequired; i++) {
        await expect(token.connect(minters[i]).requestMinterBan(banAccount.address))
          .to.emit(token, 'BanRequest')
          .withArgs(minters[i].address, banAccount.address);
      }

      await expect(token.banMinter(banAccount.address))
        .to.emit(token, 'Ban')
        .withArgs(acc1.address, banAccount.address);

      expect(await token.isMinter(banAccount.address))
        .to.be.eq(false);
    });

    // ----------------------------------------------------------------------------
    it("not enough requests (requests == minRequestsRequired - 1)", async function() {
      let banAccount = minters[minRequestsRequired - 1];

      for (let i=0; i<minRequestsRequired - 1; i++) {
        await expect(token.connect(minters[i]).requestMinterBan(banAccount.address))
          .to.emit(token, 'BanRequest')
          .withArgs(minters[i].address, banAccount.address);
      }

      await expect(token.banMinter(banAccount.address))
        .to.be.revertedWith("HENToken: Not enough requests.");

      expect(await token.isMinter(banAccount.address))
        .to.be.eq(true);
    });

    // ----------------------------------------------------------------------------
    it("more than enough requests (requests == minRequestsRequired + 1)", async function() {
      let banAccount = minters[minRequestsRequired + 1];

      for (let i=0; i<minRequestsRequired + 1; i++) {
        await expect(token.connect(minters[i]).requestMinterBan(banAccount.address))
          .to.emit(token, 'BanRequest')
          .withArgs(minters[i].address, banAccount.address);
      }

      await expect(token.banMinter(banAccount.address))
        .to.emit(token, 'Ban')
        .withArgs(acc1.address, banAccount.address);

      expect(await token.isMinter(banAccount.address))
        .to.be.eq(false);
    });

    // ----------------------------------------------------------------------------
    it("two minter requests for the same minter", async function() {
      let banAccount = minters[1];

      await expect(token.requestMinterBan(banAccount.address))
        .to.emit(token, 'BanRequest')
        .withArgs(acc1.address, banAccount.address);

      await expect(token.requestMinterBan(banAccount.address))
        .to.be.revertedWith("HENToken: The request already exists.");
    });

    // ----------------------------------------------------------------------------
    it("two bans for the same minter", async function() {
      let banAccount = minters[minRequestsRequired];

      for (let i=0; i<minRequestsRequired; i++) {
        await expect(token.connect(minters[i]).requestMinterBan(banAccount.address))
          .to.emit(token, 'BanRequest')
          .withArgs(minters[i].address, banAccount.address);
      }

      await expect(token.banMinter(banAccount.address))
        .to.emit(token, 'Ban')
        .withArgs(acc1.address, banAccount.address);

      expect(await token.isMinter(banAccount.address))
        .to.be.eq(false);

      await expect(token.banMinter(banAccount.address))
        .to.be.revertedWith("HENToken: The account is not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("ban not a minter", async function() {
      await expect(token.requestMinterBan(accNotMinter.address))
        .to.be.revertedWith("HENToken: The account is not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("ban yourself", async function() {
      await expect(token.requestMinterBan(acc1.address))
        .to.be.revertedWith("HENToken: It is forbidden to ban yourself.");
    });
  });


  /**
   * Revoke tests
   */
  describe('revoke checking', function () {
    // ----------------------------------------------------------------------------
    it("enough requests -> revoke one -> ban failed", async function() {
      let banAccount = minters[minRequestsRequired];

      for (let i=0; i<minRequestsRequired; i++) {
        await expect(token.connect(minters[i]).requestMinterBan(banAccount.address))
          .to.emit(token, 'BanRequest')
          .withArgs(minters[i].address, banAccount.address);
      }

      await expect(token.connect(minters[0]).revokeMinterBanRequest(banAccount.address))
        .to.emit(token, 'BanRevocation')
        .withArgs(minters[0].address, banAccount.address);

      await expect(token.banMinter(banAccount.address))
        .to.be.revertedWith("HENToken: Not enough requests.");

      expect(await token.isMinter(banAccount.address))
        .to.be.eq(true);
    });

    // ----------------------------------------------------------------------------
    it("enough requests -> revoke one -> return it -> ban failed", async function() {
      let banAccount = minters[minRequestsRequired];

      for (let i=0; i<minRequestsRequired; i++) {
        await expect(token.connect(minters[i]).requestMinterBan(banAccount.address))
          .to.emit(token, 'BanRequest')
          .withArgs(minters[i].address, banAccount.address);
      }

      await expect(token.connect(minters[0]).revokeMinterBanRequest(banAccount.address))
        .to.emit(token, 'BanRevocation')
        .withArgs(minters[0].address, banAccount.address);

      await expect(token.connect(minters[0]).requestMinterBan(banAccount.address))
        .to.emit(token, 'BanRequest')
        .withArgs(minters[0].address, banAccount.address);

      await expect(token.banMinter(banAccount.address))
        .to.emit(token, 'Ban')
        .withArgs(acc1.address, banAccount.address);

      expect(await token.isMinter(banAccount.address))
        .to.be.eq(false);
    });
  });


  /**
   * onlyMinter checking
   */
  describe('checking if only minter can call functions', function () {
    // ----------------------------------------------------------------------------
    it("requestMinterBan", async function() {
      await expect(token.connect(accNotMinter).requestMinterBan(acc1.address))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("revokeMinterBanRequest", async function() {
      await expect(token.connect(accNotMinter).revokeMinterBanRequest(acc1.address))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("banMinter", async function() {
      await expect(token.connect(accNotMinter).banMinter(acc1.address))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("getTotalMinters", async function() {
      await expect(token.connect(accNotMinter).getTotalMinters())
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("isMinter", async function() {
      await expect(token.connect(accNotMinter).isMinter(acc1.address))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });
  });

});
