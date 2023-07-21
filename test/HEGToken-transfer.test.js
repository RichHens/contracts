const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
let
    acc1, acc2, acc3, token;


/**
 * ------------------------------------------------------------------------------
 * TESTS
 * ------------------------------------------------------------------------------
 */
describe('HEG Token: Token transfer tests', function () {

    beforeEach(async function () {
        [acc1, acc2, acc3] = await ethers.getSigners();
        const HEGToken = await ethers.getContractFactory("MockHEGToken", acc1);
        token = await HEGToken.deploy(0, [], [acc1.address, acc2.address], 1);
        await token.deployed();
        await token.mintInternal(acc1.address, 100);
    });


    /**
     * Direct transfer tests
     */
    describe('Transfer tests', function () {
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
                .to.be.revertedWith("HEGToken: Transfer amount exceeds balance.");
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
                .to.be.revertedWith("HEGToken: Zero address.");
        });

        // ----------------------------------------------------------------------------
        it('the recipient is the zero address (acc2)', async function () {
            await expect(token.transferInternal(acc1.address, ZERO_ADDRESS, 0))
                .to.be.revertedWith("HEGToken: Zero address.");
        });
    });


    /**
     * Approved transfer tests
     */
    describe('transferFrom tests', function () {
        // ----------------------------------------------------------------------------
        it('the spender is the zero address (acc1)', async function () {
            await expect(token.approve(ZERO_ADDRESS, 0))
                .to.be.revertedWith("HEGToken: Zero address.");
        });

        // ----------------------------------------------------------------------------
        it('the token owner does not have enough balance (acc1 <- acc2)', async function () {
            const
                amount = Math.floor(Number(await token.balanceOf(acc1.address)) / 2);

            await expect(token.approve(acc2.address, amount))
                .to.emit(token, 'Approval')
                .withArgs(acc1.address, acc2.address, amount);

            await expect(token.connect(acc2).transferFrom(acc1.address, acc3.address, amount + 1))
                .to.be.revertedWith("HEGToken: Insufficient allowance.")
        });

        describe('the spender has enough allowance', function () {
            // ----------------------------------------------------------------------------
            it('the token owner has enough balance (acc1 <- acc2)', async function () {
                const
                    acc1Balance = Number(await token.balanceOf(acc1.address)),
                    acc2Balance = Number(await token.balanceOf(acc2.address)),
                    acc3Balance = Number(await token.balanceOf(acc3.address)),
                    amount = Math.floor(acc1Balance / 2);

                expect(acc1Balance)
                    .to.be.at.least(2);

                await expect(token.approve(acc2.address, acc1Balance))
                    .to.emit(token, 'Approval')
                    .withArgs(acc1.address, acc2.address, acc1Balance);

                // trying to transfer tokens to the third wallet
                await expect(token.connect(acc2).transferFrom(acc1.address, acc3.address, amount))
                    .to.emit(token, 'Transfer')
                    .withArgs(acc1.address, acc3.address, amount);

                expect(Number(await token.balanceOf(acc1.address)))
                    .to.eq(acc1Balance - amount);

                expect(Number(await token.balanceOf(acc2.address)))
                    .to.eq(acc2Balance);

                expect(Number(await token.balanceOf(acc3.address)))
                    .to.eq(acc3Balance + amount);

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

                await expect(token.connect(acc2).transferFrom(acc1.address, acc3.address, acc1Balance + 1))
                    .to.be.revertedWith("HEGToken: Transfer amount exceeds balance.")
            });
        });
    });

});
