const { expect } = require("chai");
const { ethers } = require("hardhat");

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('HEN Token: Token transfer tests', function () {
  let acc1, acc2, token;

  beforeEach(async function () {
    [acc1, acc2] = await ethers.getSigners();
    const HENToken = await ethers.getContractFactory("MockHENToken", acc1);
    token = await HENToken.deploy([acc1.address, acc2.address], 1);
    await token.deployed();
    await token.mintInternal(acc1.address, 100);
  });


  /**
   * Direct transfer tests
   */
  describe('transfer', function () {
    // ----------------------------------------------------------------------------
    it('the sender transfers half of all tokens acc1 -> acc2', async function () {
      const
        acc1Balance = Number(await token.balanceOf(acc1.address)),
        acc2Balance = Number(await token.balanceOf(acc2.address)),
        amount = Math.floor(acc1Balance / 2);

      expect(acc1Balance)
        .to.be.at.least(2);

      await expect(token.transferInternal(acc1.address, acc2.address, amount))
        .to.emit(token, 'Transfer')
        .withArgs(acc1.address, acc2.address, amount);

      expect(Number(await token.balanceOf(acc1.address)))
        .to.eq(acc1Balance - amount);

      expect(Number(await token.balanceOf(acc2.address)))
        .to.eq(acc2Balance + amount);
    });

    // ----------------------------------------------------------------------------
    it('the sender transfers all tokens acc1 -> acc2', async function () {
      const
        acc1Balance = Number(await token.balanceOf(acc1.address)),
        acc2Balance = Number(await token.balanceOf(acc2.address));

      expect(acc1Balance)
        .to.be.at.least(2);

      await expect(token.transferInternal(acc1.address, acc2.address, acc1Balance))
        .to.emit(token, 'Transfer')
        .withArgs(acc1.address, acc2.address, acc1Balance);

      expect(Number(await token.balanceOf(acc1.address)))
        .to.eq(0);

      expect(Number(await token.balanceOf(acc2.address)))
        .to.eq(acc2Balance + acc1Balance);
    });

    // ----------------------------------------------------------------------------
    it('the sender does not have enough tokens to transfer (acc1 -> acc2)', async function () {
      const
        acc1Balance = Number(await token.balanceOf(acc1.address));

      await expect(token.transferInternal(acc1.address, acc2.address, acc1Balance + 1))
        .to.be.revertedWith("HENToken: transfer amount exceeds balance.");
    });

    // ----------------------------------------------------------------------------
    it('the sender transfers zero tokens (acc1 -> acc2)', async function () {
      const
        acc1Balance = Number(await token.balanceOf(acc1.address)),
        acc2Balance = Number(await token.balanceOf(acc2.address));

      expect(acc1Balance)
        .to.be.at.least(2);

      expect(acc2Balance)
        .to.be.eq(0);

      await expect(token.transferInternal(acc1.address, acc2.address, 0))
        .to.emit(token, 'Transfer')
        .withArgs(acc1.address, acc2.address, 0);

      expect(acc1Balance)
        .to.be.at.eq(acc1Balance);

      expect(acc2Balance)
        .to.be.eq(0);
    });

    // ----------------------------------------------------------------------------
    it('the sender is the zero address (acc1)', async function () {
      await expect(token.transferInternal(ZERO_ADDRESS, acc2.address, 0))
        .to.be.revertedWith("HENToken: Zero address.");
    });

    // ----------------------------------------------------------------------------
    it('the recipient is the zero address (acc2)', async function () {
      await expect(token.transferInternal(acc1.address, ZERO_ADDRESS, 0))
        .to.be.revertedWith("HENToken: Zero address.");
    });
  });


  /**
   * Approved transfer tests
   */
  describe('transferFrom', function () {
    // ----------------------------------------------------------------------------
    it('the spender is the zero address (acc1)', async function () {
      await expect(token.approve(ZERO_ADDRESS, 0))
        .to.be.revertedWith("HENToken: Zero address.");
    });

    // ----------------------------------------------------------------------------
    it('the token owner does not have enough balance (acc1 <- acc2)', async function () {
      const
        amount = Math.floor(Number(await token.balanceOf(acc1.address)) / 2);

      await expect(token.approve(acc2.address, amount))
        .to.emit(token, 'Approval')
        .withArgs(acc1.address, acc2.address, amount);

      await expect(token.connect(acc2).transferFrom(acc1.address, acc2.address, amount + 1))
        .to.be.revertedWith("HENToken: insufficient allowance.")
    });

    describe('the spender has enough allowance', function () {
      // ----------------------------------------------------------------------------
      it('the token owner has enough balance (acc1 <- acc2)', async function () {
        const
          acc1Balance = Number(await token.balanceOf(acc1.address)),
          acc2Balance = Number(await token.balanceOf(acc2.address)),
          amount = Math.floor(acc1Balance / 2);

        expect(acc1Balance)
          .to.be.at.least(2);

        await expect(token.approve(acc2.address, acc1Balance))
          .to.emit(token, 'Approval')
          .withArgs(acc1.address, acc2.address, acc1Balance);

        await expect(token.connect(acc2).transferFrom(acc1.address, acc2.address, amount))
          .to.emit(token, 'Transfer')
          .withArgs(acc1.address, acc2.address, amount);

        expect(Number(await token.balanceOf(acc1.address)))
          .to.eq(acc1Balance - amount);

        expect(Number(await token.balanceOf(acc2.address)))
          .to.eq(acc2Balance + amount);

        expect(Number(await token.allowance(acc1.address, acc2.address)))
          .to.eq(acc1Balance - amount);
      });

      // ----------------------------------------------------------------------------
      it('the token owner does not have enough balance (acc1 <- acc2)', async function () {
        const
          acc1Balance = Number(await token.balanceOf(acc1.address));

        await expect(token.approve(acc2.address, acc1Balance + 1))
          .to.emit(token, 'Approval')
          .withArgs(acc1.address, acc2.address, acc1Balance + 1);

        await expect(token.connect(acc2).transferFrom(acc1.address, acc2.address, acc1Balance + 1))
          .to.be.revertedWith("HENToken: transfer amount exceeds balance.")
      });
    });
  });

});
