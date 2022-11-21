const { expect } = require("chai");
const { ethers } = require("hardhat");

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('HEN Token: Minting schedule tests', function () {
  const
    runTime = 0,
    periods = [[0,1000],[1800,2000]]; // must be at least two periods
  let acc1, acc2, token;

  beforeEach(async function () {
    [acc1, acc2] = await ethers.getSigners();
    const HENToken = await ethers.getContractFactory("MockHENToken", acc1);
    token = await HENToken.deploy(runTime, periods, [acc1.address], 1);
    await token.deployed();
    await token.setCurrentTime(0);
  });


  // ----------------------------------------------------------------------------
  it("mint to zero address", async function() {
    let
      rIdx = Number(await token.getTotalMintingRequests());

    await token.setCurrentTime(runTime + periods[periods.length - 1][0]);

    await expect(token.requestMinting(ZERO_ADDRESS, 1))
      .to.emit(token, 'MintingRequestCreation')
      .withArgs(acc1.address, rIdx, ZERO_ADDRESS, 1);

    await expect(token.mint(rIdx))
      .to.be.revertedWith("HENToken: Zero address.");
  });


  /**
   * Minting in the first period tests
   */
  describe('minting in the first period', function () {
    // ----------------------------------------------------------------------------
    it("half of the tokens, then the rest", async function() {
      let
        rIdx,
        amount = Math.floor(periods[0][1] / 2),
        balance = Number(await token.balanceOf(acc2.address));

      await token.setCurrentTime(runTime + periods[0][0]);

      // first half tokens
      rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(acc2.address, amount))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);

      // the remaining tokens
      rIdx = Number(await token.getTotalMintingRequests());
      amount = periods[0][1] - amount;

      await expect(token.requestMinting(acc2.address, amount))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);
    });

    // ----------------------------------------------------------------------------
    it("half of the tokens, then the rest + one extra token", async function() {
      let
        rIdx,
        amount = Math.floor(periods[0][1] / 2),
        balance = Number(await token.balanceOf(acc2.address));

      await token.setCurrentTime(runTime + periods[0][0]);

      // first half tokens
      rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(acc2.address, amount))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      balance += amount;
      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);

      // the remaining tokens + 1
      rIdx = Number(await token.getTotalMintingRequests());
      amount = periods[0][1] - amount + 1;

      await expect(token.requestMinting(acc2.address, amount))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      await expect(token.mint(rIdx))
        .to.be.revertedWith("HENToken: Too many tokens to mint.");
    });

    // ----------------------------------------------------------------------------
    it("zero tokens", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests()),
        balance = Number(await token.balanceOf(acc2.address));

      await token.setCurrentTime(runTime + periods[0][0]);

      await expect(token.requestMinting(acc2.address, 0))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, acc2.address, 0);

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, acc2.address, 0);

      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance);
    });
  });


  /**
   * Minting in the last period tests
   */
  describe('minting in the last period', function () {
    // ----------------------------------------------------------------------------
    it("all tokens", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests()),
        amount = 0,
        balance = Number(await token.balanceOf(acc2.address));

      await token.setCurrentTime(runTime + periods[periods.length - 1][0]);

      for (let i=0; i<periods.length; i++) {
        amount += periods[i][1];
      }

      await expect(token.requestMinting(acc2.address, amount))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      expect(await token.balanceOf(acc2.address))
        .to.be.eq(balance + amount);
    });

    // ----------------------------------------------------------------------------
    it("all tokens + one extra token", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests()),
        amount = 1;

      await token.setCurrentTime(runTime + periods[periods.length - 1][0]);

      for (let i=0; i<periods.length; i++) {
        amount += periods[i][1];
      }

      await expect(token.requestMinting(acc2.address, amount))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, acc2.address, amount);

      await expect(token.mint(rIdx))
        .to.be.revertedWith("HENToken: Too many tokens to mint.");
    });
  });

});

