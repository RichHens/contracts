const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
let
    acc1,
    acc2,
    acc3,
    token;

describe('NFChicken: Transfer and balance tests', function () {

    beforeEach(async function () {
        [acc1, acc2, acc3] = await ethers.getSigners();
        const NFChicken = await ethers.getContractFactory("MockNFChicken", acc1);
        token = await NFChicken.deploy([acc1.address, acc2.address], 1, "https://richhens.com/");
        await token.deployed();

        await token.requestAddingMinter(acc1.address, 0);
        await token.addMinter(acc1.address);
    });

    context('balanceOf', function () {
        beforeEach(async function () {
            await token.safeMint(acc2.address);
            await token.safeMint(acc2.address);
        });

        it("the address has tokens", async function () {
            expect(await token.balanceOf(acc2.address)).to.be.eq(2);
        });

        it("the address has zero tokens", async function () {
            expect(await token.balanceOf(acc1.address)).to.be.eq(0);
        });

        it("the balance of zero address", async function () {
            await expect(token.balanceOf(ZERO_ADDRESS))
                .to.be.revertedWith("NFChicken: Address zero is not a valid owner.");
        });
    });

    context('ownerOf', function () {
        beforeEach(async function () {
            await token.safeMint(acc2.address);
        });

        it("the right owner", async function () {
            expect(await token.ownerOf(0)).to.be.eq(acc2.address);
        });

        it("token does not exist", async function () {
            await expect(token.ownerOf(1))
                .to.be.revertedWith("NFChicken: Token does not exist.");
        });
    });

    context('transferFrom', function () {
        beforeEach(async function () {
            await token.safeMint(acc1.address);
        });

        it("called by the owner", async function () {
            await expect(token.connect(acc1).transferFrom(acc1.address, acc2.address, 0))
                .to.emit(token, 'Transfer')
                .withArgs(acc1.address, acc2.address, 0);
            expect(await token.ownerOf(0))
                .to.be.eq(acc2.address);
        });

        it("called by the approved recipient", async function () {
            await expect(token.connect(acc1).approve(acc2.address, 0))
                .to.emit(token, 'Approval')
                .withArgs(acc1.address, acc2.address, 0);
            await expect(token.connect(acc2).transferFrom(acc1.address, acc2.address, 0))
                .to.emit(token, 'Transfer')
                .withArgs(acc1.address, acc2.address, 0);
            expect(await token.ownerOf(0))
                .to.be.eq(acc2.address);
            expect(await token.getApproved(0))
                .to.be.equal(ZERO_ADDRESS);
        });

        it("called by the operator", async function () {
            await expect(token.connect(acc1).setApprovalForAll(acc3.address, true))
                .to.emit(token, 'ApprovalForAll')
                .withArgs(acc1.address, acc3.address, true);
            await expect(token.connect(acc3).transferFrom(acc1.address, acc2.address, 0))
                .to.emit(token, 'Transfer')
                .withArgs(acc1.address, acc2.address, 0);
            expect(await token.ownerOf(0))
                .to.be.eq(acc2.address);
        });

        it("called by the unapproved recipient", async function () {
            await expect(token.connect(acc2).transferFrom(acc1.address, acc2.address, 0))
                .to.be.revertedWith("NFChicken: Caller is not token owner or approved.");
            expect(await token.ownerOf(0))
                .to.be.eq(acc1.address);
        });

        it("sent to the owner", async function () {
            await expect(token.connect(acc1).transferFrom(acc1.address, acc1.address, 0))
                .to.emit(token, 'Transfer')
                .withArgs(acc1.address, acc1.address, 0);
            expect(await token.ownerOf(0))
                .to.be.eq(acc1.address);
            expect(await token.balanceOf(acc1.address))
                .to.be.eq(1);
        });

        it("sent token by not authorized user", async function () {
            await expect(token.connect(acc1).transferFrom(acc2.address, acc2.address, 0))
                .to.be.revertedWith("NFChicken: Transfer from incorrect owner.");
        });

        it("sent not minted token", async function () {
            await expect(token.connect(acc1).transferFrom(acc1.address, acc2.address, 2))
                .to.be.revertedWith("NFChicken: Token does not exist.");
        });

        it("sent to the the zero address", async function () {
            await expect(token.connect(acc1).transferFrom(acc1.address, ZERO_ADDRESS, 0))
                .to.emit(token, 'Transfer')
                .withArgs(acc1.address, ZERO_ADDRESS, 0);
            await (expect(token.ownerOf(0)))
                .to.be.revertedWith("NFChicken: Token does not exist.");
            expect(await token.balanceOf(acc1.address))
                .to.be.eq(0);
        });
    });

});

