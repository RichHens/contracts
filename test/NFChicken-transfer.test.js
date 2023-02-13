const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
let
    acc1,
    acc2,
    token;

describe('NFChicken: Transfer and balance tests', function () {

    beforeEach(async function () {
        [acc1, acc2] = await ethers.getSigners();
        const NFChicken = await ethers.getContractFactory("MockNFChicken", acc1);
        token = await NFChicken.deploy([acc1.address, acc2.address], 1);
        await token.deployed();

        await token.requestAddingMinter(acc1.address, 0);
        await token.addMinter(acc1.address);
        await token.safeMint(acc2.address, "Token 1");
        await token.safeMint(acc2.address, "Token 2");

    });

    describe('balanceOf', function () {
        it("the address has tokens", async function () {
            expect(await token.balanceOf(acc2.address)).to.be.eq(2);
        });

        it("the address has zero tokens", async function () {
            expect(await token.balanceOf(acc1.address)).to.be.eq(0);
        });

        it("the balance of zero address", async function () {
            await expect(token.balanceOf(ZERO_ADDRESS))
                .to.be.revertedWith("HENChicken: Address zero is not a valid owner.");
        });
    });

    describe('ownerOf', function () {
        it("the right owner", async function () {
            expect(await token.ownerOf(0)).to.be.eq(acc2.address);
        });

        it("token does not exist", async function () {
            await expect(token.ownerOf(2))
                .to.be.revertedWith("HENChicken: Token does not exist.");
        });
    });

});