const { expect } = require("chai");
const { ethers } = require("hardhat");

let
    acc1,
    acc2,
    token;

describe('NFChicken: Metadata', function () {
    beforeEach(async function () {
        [acc1, acc2] = await ethers.getSigners();
        const NFChicken = await ethers.getContractFactory("MockNFChicken", acc1);
        token = await NFChicken.deploy([acc1.address], 1, "https://richhens.com/");
        await token.deployed();

        await token.requestAddingMinter(acc1.address, 0);
        await token.addMinter(acc1.address);
        await token.safeMassMint(acc2.address, 100);
    });

    context('tokenURI', function () {
        it("get existed token", async function () {
            expect(await token.tokenURI(0)).to.be.eq("https://richhens.com/0");
            expect(await token.tokenURI(99)).to.be.eq("https://richhens.com/99");
        });

        it("get not existed token", async function () {
            await expect(token.tokenURI(100))
                .to.be.revertedWith("HENChicken: Token does not exist.");
        });
    });
});