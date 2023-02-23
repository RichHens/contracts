const { expect } = require("chai");
const { ethers } = require("hardhat");

let
    acc1,
    acc2,
    acc3,
    token;

describe('NFChicken: Enumerable', function () {

    beforeEach(async function () {
        [acc1, acc2, acc3] = await ethers.getSigners();
        const NFChicken = await ethers.getContractFactory("MockNFChicken", acc1);
        token = await NFChicken.deploy([acc1.address, acc2.address], 1, "https://richhens.com/");
        await token.deployed();

        await token.requestAddingMinter(acc1.address, 0);
        await token.addMinter(acc1.address);

        await token.safeMint(acc2.address);
        await token.safeMint(acc2.address);
    });

    it("totalSupply", async function () {
        expect(await token.totalSupply()).to.be.eq(2);
    });

    context('tokenOfOwnerByIndex', function () {
        it("get the right index", async function () {
            expect(await token.tokenOfOwnerByIndex(acc2.address, 0)).to.be.eq(0);
            expect(await token.tokenOfOwnerByIndex(acc2.address, 1)).to.be.eq(1);
        });

        it("get the wrong index", async function () {
            await expect(token.tokenOfOwnerByIndex(acc2.address, 2))
                .to.be.revertedWith("NFChicken: Out of bonds.");
        });

        it("the wrong address", async function () {
            await expect(token.tokenOfOwnerByIndex(acc3.address, 0))
                .to.be.revertedWith("NFChicken: Out of bonds.");
        });

        it("transfer to another user", async function () {
            await token.connect(acc2).transferFrom(acc2.address, acc3.address, 1);
            await token.connect(acc2).transferFrom(acc2.address, acc3.address, 0);

            expect(await token.tokenOfOwnerByIndex(acc3.address, 0)).to.be.eq(1);
            expect(await token.tokenOfOwnerByIndex(acc3.address, 1)).to.be.eq(0);

            await expect(token.tokenOfOwnerByIndex(acc2.address, 0))
                .to.be.revertedWith("NFChicken: Out of bonds.");
        });
    });

    context('tokenByIndex', function () {
        it("get the right index", async function () {
            expect(await token.tokenByIndex(0)).to.be.eq(0);
            expect(await token.tokenByIndex(1)).to.be.eq(1);
        });

        it("get the wrong index", async function () {
            await expect(token.tokenByIndex(3))
                .to.be.revertedWith("NFChicken: Out of bonds.");
        });
    });

    context('tokensByOwner', function () {
        beforeEach(async function () {
            await token.safeMint(acc3.address);
            await token.safeMint(acc2.address);
        });

        it("check tokens of exist users", async function () {
            let acc2Tokens = await token.tokensByOwner(acc2.address);
            expect(acc2Tokens[0]).to.be.eq(0);
            expect(acc2Tokens[1]).to.be.eq(1);
            expect(acc2Tokens[2]).to.be.eq(3);
            expect(acc2Tokens.length).to.be.eq(3);

            let acc3Tokens = await token.tokensByOwner(acc3.address);
            expect(acc3Tokens[0]).to.be.eq(2);
            expect(acc3Tokens.length).to.be.eq(1);
        });

        it("check tokens of non-exist users", async function () {
            let acc1Tokens = await token.tokensByOwner(acc1.address);
            expect(acc1Tokens.length).to.be.eq(0);
        });
    });

});

