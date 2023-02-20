const { expect } = require("chai");
const { ethers } = require("hardhat");

let
    admin1,
    admin2,
    admin3,
    minter,
    token;

describe('NFChicken: Pausable', function () {
    beforeEach(async function () {
        [admin1, admin2, admin3, minter] = await ethers.getSigners();
        const NFChicken = await ethers.getContractFactory("MockNFChicken", admin1);
        token = await NFChicken.deploy([admin1.address, admin2.address, admin3.address], 2);
        await token.deployed();

        await token.connect(admin1).requestAddingMinter(minter.address, 0);
        await token.connect(admin2).approveAddingMinterRequest(minter.address);
        await token.connect(admin1).addMinter(minter.address);
        await token.connect(minter).safeMint(admin1.address, "Token");
    });

    it("check functions in pause mode", async function () {
        await expect(token.pause())
            .to.emit(token, 'Pause')
            .withArgs(admin1.address);

        await expect(token.transferFrom(admin1.address, admin2.address, 0))
            .to.be.revertedWith("HENChicken: Paused.");
        await expect(token.connect(minter).safeMint(admin2.address, "Token"))
            .to.be.revertedWith("HENChicken: Paused.");
        await expect(token.connect(minter).safeMassMint(admin2.address, 10, ["Token"]))
            .to.be.revertedWith("HENChicken: Paused.");
    });

    it("pause by not admin", async function () {
        await expect(token.connect(minter).pause())
            .to.be.revertedWith("HENChicken: You are not an admin.");
    });

    it("pause twice", async function () {
        await expect(token.pause())
            .to.emit(token, 'Pause')
            .withArgs(admin1.address);
        await expect(token.pause())
            .to.be.revertedWith("HENChicken: Already paused.");
    });

    context('unpause', function () {
        beforeEach(async function () {
            await expect(token.pause())
                .to.emit(token, 'Pause')
                .withArgs(admin1.address);
        });

        it("by not admin", async function () {
            await expect(token.connect(minter).unpause())
                .to.be.revertedWith("HENChicken: You are not an admin.");
        });

        it("not enough requests", async function () {
            await expect(token.connect(admin1).requestUnpause())
                .to.emit(token, 'UnpauseRequest')
                .withArgs(admin1.address);
            await expect(token.unpause())
                .to.be.revertedWith("HENChicken: Not enough requests.");
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
                .to.be.revertedWith("HENChicken: Not enough requests.");
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
