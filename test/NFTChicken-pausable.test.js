const { expect } = require("chai");
const { ethers } = require("hardhat");

let
    admin1,
    admin2,
    admin3,
    minter,
    token;

describe('NFTChicken: Pausable', function () {
    beforeEach(async function () {
        [admin1, admin2, admin3, minter] = await ethers.getSigners();
        const NFTChicken = await ethers.getContractFactory("MockNFTChicken", admin1);
        token = await NFTChicken.deploy([admin1.address, admin2.address, admin3.address], 2, "https://richhens.com/");
        await token.deployed();

        await token.connect(admin1).requestAddingMinter(minter.address, 0);
        await token.connect(admin2).approveAddingMinterRequest(minter.address);
        await token.connect(admin1).addMinter(minter.address);
        await token.connect(minter).safeMint(admin1.address);
    });

    it("check functions in pause mode", async function () {
        await expect(token.pause())
            .to.emit(token, 'Pause')
            .withArgs(admin1.address);

        await expect(token.transferFrom(admin1.address, admin2.address, 0))
            .to.be.revertedWith("NFTChicken: Paused.");
        await expect(token.connect(minter).safeMint(admin2.address))
            .to.be.revertedWith("NFTChicken: Paused.");
        await expect(token.connect(minter).safeMassMint(admin2.address, 10))
            .to.be.revertedWith("NFTChicken: Paused.");
    });

    it("pause by not admin", async function () {
        await expect(token.connect(minter).pause())
            .to.be.revertedWith("NFTChicken: You are not an admin.");
    });

    it("pause twice", async function () {
        await expect(token.pause())
            .to.emit(token, 'Pause')
            .withArgs(admin1.address);
        await expect(token.pause())
            .to.be.revertedWith("NFTChicken: Already paused.");
    });

    context('unpause', function () {
        beforeEach(async function () {
            await expect(token.pause())
                .to.emit(token, 'Pause')
                .withArgs(admin1.address);
        });

        it("by not admin", async function () {
            await expect(token.connect(minter).unpause())
                .to.be.revertedWith("NFTChicken: You are not an admin.");
        });

        it("not enough requests", async function () {
            await expect(token.connect(admin1).requestUnpause())
                .to.emit(token, 'UnpauseRequest')
                .withArgs(admin1.address);
            await expect(token.unpause())
                .to.be.revertedWith("NFTChicken: Not enough requests.");
        });

        it("revoke request", async function () {
            await expect(token.connect(admin1).requestUnpause())
                .to.emit(token, 'UnpauseRequest')
                .withArgs(admin1.address);
            await expect(token.connect(admin2).requestUnpause())
                .to.emit(token, 'UnpauseRequest')
                .withArgs(admin2.address);
            await expect(token.connect(admin1).revokeUnpauseRequest())
                .to.emit(token, 'UnpauseRevocation')
                .withArgs(admin1.address);
            await expect(token.unpause())
                .to.be.revertedWith("NFTChicken: Not enough requests.");
        });

        it("enough requests", async function () {
            await expect(token.connect(admin1).requestUnpause())
                .to.emit(token, 'UnpauseRequest')
                .withArgs(admin1.address);
            await expect(token.connect(admin2).requestUnpause())
                .to.emit(token, 'UnpauseRequest')
                .withArgs(admin2.address);
            await expect(token.unpause())
                .to.emit(token, 'Unpause')
                .withArgs(admin1.address);
            await expect(token.transferFrom(admin1.address, admin2.address, 0))
                .to.emit(token, 'Transfer');
        });
    });
});
