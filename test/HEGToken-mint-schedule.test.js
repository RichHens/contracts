const { expect } = require("chai");
const { ethers } = require("hardhat");

const
  ZERO_ADDRESS = '0x0000000000000000000000000000000000000000',
  RUN_TIME = 0,
  TEST_PERIODS = [[0,1000],[1800,2000]]; // must be at least two TEST_PERIODS
let
  acc1,
  acc2,
  token;


/**
 * ------------------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------------------
 */
describe('HEG Token: Minting schedule tests', function () {

  beforeEach(async function () {
    [acc1, acc2] = await ethers.getSigners();
    const HEGToken = await ethers.getContractFactory("MockHEGToken", acc1);
    token = await HEGToken.deploy(RUN_TIME, TEST_PERIODS, [acc1.address], 1);
    await token.deployed();
    await token.setCurrentTime(RUN_TIME);
  });


  // ----------------------------------------------------------------------------
  it("mint to zero address", async function() {
    let
      rIdx = Number(await token.getTotalMintingRequests());

    await token.setCurrentTime(RUN_TIME + TEST_PERIODS[TEST_PERIODS.length - 1][0]);

    await expect(token.requestMinting(ZERO_ADDRESS, 1))
      .to.emit(token, 'MintingRequestCreation')
      .withArgs(acc1.address, rIdx, ZERO_ADDRESS, 1);

    await expect(token.mint(rIdx))
      .to.be.revertedWith("HEGToken: Zero address.");
  });


  /**
   * Minting in the first period tests
   */
  describe('Minting tests for the first period', function () {
    // ----------------------------------------------------------------------------
    it("half of the tokens, then the rest", async function() {
      let
        amount = Math.floor(TEST_PERIODS[0][1] / 2),
        balance = Number(await token.balanceOf(acc2.address));

      await token.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0]);

      // first half tokens
      await mintingSuccess(acc1, acc2.address, amount);
      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);

      // the remaining tokens
      amount = TEST_PERIODS[0][1] - amount;
      await mintingSuccess(acc1, acc2.address, amount);
      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);
    });

    // ----------------------------------------------------------------------------
    it("half of the tokens, then the rest + one extra token", async function() {
      let
        amount = Math.floor(TEST_PERIODS[0][1] / 2),
        balance = Number(await token.balanceOf(acc2.address));

      await token.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0]);

      // first half tokens
      await mintingSuccess(acc1, acc2.address, amount);
      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);

      // the remaining tokens + 1
      amount = TEST_PERIODS[0][1] - amount + 1;
      await mintingFailed(acc1, acc2.address, amount, "HEGToken: Too many tokens to mint.");
    });

    // ----------------------------------------------------------------------------
    it("zero tokens", async function() {
      let balance = Number(await token.balanceOf(acc2.address));
      await token.setCurrentTime(RUN_TIME + TEST_PERIODS[0][0]);
      await mintingSuccess(acc1, acc2.address, 0);
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);
    });
  });


  /**
   * Minting in the last period tests
   */
  describe('Minting tests for the last period', function () {
    // ----------------------------------------------------------------------------
    it("all tokens", async function() {
      let
        amount = 0,
        duration = 0,
        balance = Number(await token.balanceOf(acc2.address));

      for (let i=0; i<TEST_PERIODS.length; i++) {
        amount += TEST_PERIODS[i][1];
        duration += TEST_PERIODS[i][0];
      }

      await token.setCurrentTime(RUN_TIME + duration);
      await mintingSuccess(acc1, acc2.address, amount);
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance + amount);
    });

    // ----------------------------------------------------------------------------
    it("all tokens + one extra token", async function() {
      let
        duration = 0,
        amount = 1;

      for (let i=0; i<TEST_PERIODS.length; i++) {
        amount += TEST_PERIODS[i][1];
        duration += TEST_PERIODS[i][0];
      }

      await token.setCurrentTime(RUN_TIME + duration);
      await mintingFailed(acc1, acc2.address, amount, "HEGToken: Too many tokens to mint.");
    });
  });

});



/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function mintingSuccess(minter, address, amount) {
  let rIdx = Number(await token.getTotalMintingRequests());

  await expect(
    token.connect(minter).requestMinting(address, amount)
  )
    .to.emit(token, 'MintingRequestCreation')
    .withArgs(minter.address, rIdx, address, amount);

  await expect(
    token.connect(minter).mint(rIdx)
  )
    .to.emit(token, 'Minting')
    .withArgs(minter.address, rIdx, address, amount);

  return rIdx;
}

async function mintingFailed(minter, address, amount, message) {
  let rIdx = Number(await token.getTotalMintingRequests());

  await expect(
    token.connect(minter).requestMinting(address, amount)
  )
    .to.emit(token, 'MintingRequestCreation')
    .withArgs(minter.address, rIdx, address, amount);

  await expect(
    token.connect(minter).mint(rIdx)
  )
    .to.be.revertedWith(message);

  return rIdx;
}