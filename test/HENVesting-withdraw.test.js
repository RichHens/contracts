const { expect } = require("chai");
const { ethers } = require("hardhat");

const
  ZERO_ADDRESS = '0x0000000000000000000000000000000000000000',
  TEST_TOKEN_AMOUNT = 1000000;
let
  acc1,
  acc2,
  token,
  vesting;


/**
 * ------------------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------------------
 */
describe('HEN Vesting: Withdrawal tests', function () {

  beforeEach(async function () {
    [acc1, acc2] = await ethers.getSigners();
    const HENToken = await ethers.getContractFactory("HENToken", acc1);
    token = await HENToken.deploy(0, [[0, TEST_TOKEN_AMOUNT]], [acc1.address], 1);
    await token.deployed();
    const HENVesting = await ethers.getContractFactory("MockHENVesting", acc1);
    vesting = await HENVesting.deploy(token.address, [acc1.address], 1);
    await vesting.deployed();
    await token.requestMinting(vesting.address, TEST_TOKEN_AMOUNT);
    await token.mint(0);
  });

  // ----------------------------------------------------------------------------
  it("withdraw half of the tokens, then the rest", async function() {
    let
      amount = Math.floor(TEST_TOKEN_AMOUNT / 2),
      contractBalance = Number(await vesting.getTotalTokens()),
      accBalance = Number(await token.balanceOf(acc2.address));

    // first half
    await withdrawalSuccess(acc1, acc2.address, amount, 0);
    contractBalance -= amount;
    accBalance += amount;
    expect(await vesting.getTotalTokens())
      .to.be.eq(contractBalance);
    expect(await token.balanceOf(acc2.address))
      .to.be.eq(accBalance);

    // the remaining tokens
    amount = TEST_TOKEN_AMOUNT - amount;
    await withdrawalSuccess(acc1, acc2.address, amount, 1);
    contractBalance = 0;
    accBalance = TEST_TOKEN_AMOUNT;
    expect(await vesting.getTotalTokens())
      .to.be.eq(contractBalance);
    expect(await token.balanceOf(acc2.address))
      .to.be.eq(accBalance);
  });

  // ----------------------------------------------------------------------------
  it("withdraw half of the tokens, then the rest + one extra token", async function() {
    let
      amount = Math.floor(TEST_TOKEN_AMOUNT / 2),
      contractBalance = Number(await vesting.getTotalTokens()),
      accBalance = Number(await token.balanceOf(acc2.address));

    // first half
    await withdrawalSuccess(acc1, acc2.address, amount, 0);
    contractBalance -= amount;
    accBalance += amount;
    expect(await vesting.getTotalTokens())
      .to.be.eq(contractBalance);
    expect(await token.balanceOf(acc2.address))
      .to.be.eq(accBalance);

    // the remaining tokens
    amount = TEST_TOKEN_AMOUNT - amount + 1;
    await withdrawalFailed(acc1, acc2.address, amount, "HENVesting: Not enough funds.", 1);
  });

  // ----------------------------------------------------------------------------
  it("withdraw zero tokens", async function() {
    await expect(vesting.requestWithdrawal(acc2.address, 0))
      .to.be.revertedWith("HENVesting: Zero amount.");
  });

  // ----------------------------------------------------------------------------
  it("withdraw to zero address", async function() {
    await expect(vesting.requestWithdrawal(ZERO_ADDRESS, 1))
      .to.be.revertedWith("HENVesting: Zero address.");
  });

});



/**
 * ------------------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------------------
 */
async function withdrawalSuccess(admin, address, amount, rIdx=0) {
  await expect(
    vesting.connect(admin).requestWithdrawal(address, amount)
  )
    .to.emit(vesting, 'WithdrawalRequestCreation')
    .withArgs(admin.address, rIdx, address, amount);

  await expect(
    vesting.withdraw(rIdx)
  )
    .to.emit(vesting, 'Withdrawal')
    .withArgs(admin.address, rIdx);
}

async function withdrawalFailed(admin, address, amount, message, rIdx=0) {
  await expect(
    vesting.connect(admin).requestWithdrawal(address, amount)
  )
    .to.emit(vesting, 'WithdrawalRequestCreation')
    .withArgs(admin.address, rIdx, address, amount);

  await expect(
    vesting.withdraw(rIdx)
  )
    .to.be.revertedWith(message);
}