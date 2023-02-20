const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
let
    acc1,
    acc2,
    acc3,
    token;

describe('NFChicken: Mint', function () {

    beforeEach(async function () {
        [acc1, acc2, acc3] = await ethers.getSigners();
        const NFChicken = await ethers.getContractFactory("MockNFChicken", acc1);
        token = await NFChicken.deploy([acc1.address, acc2.address], 1);
        await token.deployed();
    });


    context('safeMint', function () {
        beforeEach(async function () {
            await token.requestAddingMinter(acc1.address, 1);
            await token.addMinter(acc1.address);
        });

        it("minting", async function () {
            await expect(token.connect(acc1).safeMint(acc2.address, "Token"))
                .to.emit(token, 'Mint')
                .withArgs(acc1.address, acc2.address, 0, "Token");
            expect(await token.ownerOf(0))
                .to.be.eq(acc2.address);
            expect(await token.tokenURI(0))
                .to.be.eq("Token");
            expect(await token.totalSupply())
                .to.be.eq(1);
            expect(await token.getNextTokenId())
                .to.be.eq(1);
        });

        it("minting to zero address", async function () {
            await expect(token.connect(acc1).safeMint(ZERO_ADDRESS, "Token"))
                .to.be.revertedWith("HENChicken: Mint to the zero address.");
        });

        it("minting without URL", async function () {
            await expect(token.connect(acc1).safeMint(acc2.address, ""))
                .to.be.revertedWith("HENChicken: Empty URL.");
        });

        context('limits', function () {
            it("check", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMint(acc2.address, "Token"))
                    .to.emit(token, 'Mint')
                    .withArgs(acc1.address, acc2.address, 0, "Token");

                await expect(token.connect(acc1).safeMint(acc2.address, "Token"))
                    .to.be.revertedWith("HENChicken: Minting limit.");

                expect(await token.totalSupply())
                    .to.be.eq(1);
                expect(await token.getNextTokenId())
                    .to.be.eq(1);
            });

            it("check last second", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMint(acc2.address, "Token"))
                    .to.emit(token, 'Mint')
                    .withArgs(acc1.address, acc2.address, 0, "Token");

                token.setCurrentTime(86399);
                await expect(token.connect(acc1).safeMint(acc2.address, "Token"))
                    .to.be.revertedWith("HENChicken: Minting limit.");
            });

            it("check next day", async function () {
                token.setCurrentTime(0);

                await expect(token.connect(acc1).safeMint(acc2.address, "Token"))
                    .to.emit(token, 'Mint')
                    .withArgs(acc1.address, acc2.address, 0, "Token");

                token.setCurrentTime(86400);
                await expect(token.connect(acc1).safeMint(acc2.address, "Token"))
                    .to.emit(token, 'Mint')
                    .withArgs(acc1.address, acc2.address, 1, "Token");

                await expect(token.connect(acc1).safeMint(acc2.address, "Token"))
                    .to.be.revertedWith("HENChicken: Minting limit.");
            });
        });
    });


    context('safeMassMint', function () {
        beforeEach(async function () {
            await token.requestAddingMinter(acc1.address, 10);
            await token.addMinter(acc1.address);
        });

        it("mint", async function () {
            await expect(token.connect(acc1).safeMassMint(acc2.address, 10, ["Token 1", "Token 2", "Token 3"]))
                .to.emit(token, 'MassMint')
                .withArgs(acc1.address, acc2.address, 0, 10, ["Token 1", "Token 2", "Token 3"]);
            expect(await token.ownerOf(0))
                .to.be.eq(acc2.address);
            expect(await token.tokenURI(0))
                .to.be.eq("Token 1");
            expect(await token.tokenURI(1))
                .to.be.eq("Token 2");
            expect(await token.tokenURI(2))
                .to.be.eq("Token 3");
            expect(await token.tokenURI(3))
                .to.be.eq("Token 1");
            expect(await token.tokenURI(9))
                .to.be.eq("Token 1");
            expect(await token.totalSupply())
                .to.be.eq(10);
            expect(await token.getNextTokenId())
                .to.be.eq(10);
        });

        it("minting to zero address", async function () {
            await expect(token.connect(acc1).safeMassMint(ZERO_ADDRESS, 1, ["Token"]))
                .to.be.revertedWith("HENChicken: Mint to the zero address.");
        });

        it("minting without URL list", async function () {
            await expect(token.connect(acc1).safeMassMint(acc2.address, 1, []))
                .to.be.revertedWith("HENChicken: Empty tokenURL list.");
        });

        it("minting with empty URL", async function () {
            await expect(token.connect(acc1).safeMassMint(acc2.address, 3, ["Token 1", "", "Token 3"]))
                .to.be.revertedWith("HENChicken: Empty URL.");
        });

        context('limits', function () {
            it("check", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 11, ["Token"]))
                    .to.be.revertedWith("HENChicken: Minting limit.");

                await expect(token.connect(acc1).safeMassMint(acc2.address, 5, ["Token"]))
                    .to.emit(token, 'MassMint')
                    .withArgs(acc1.address, acc2.address, 0, 5, ["Token"]);

                await expect(token.connect(acc1).safeMassMint(acc2.address, 6, ["Token"]))
                    .to.be.revertedWith("HENChicken: Minting limit.");
                expect(await token.totalSupply())
                    .to.be.eq(5);
                expect(await token.getNextTokenId())
                    .to.be.eq(5);
            });

            it("check last second", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 5, ["Token 1"]))
                    .to.emit(token, 'MassMint')
                    .withArgs(acc1.address, acc2.address, 0, 5, ["Token 1"]);

                token.setCurrentTime(86399);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 5, ["Token 2"]))
                    .to.emit(token, 'MassMint')
                    .withArgs(acc1.address, acc2.address, 5, 5, ["Token 2"]);

                await expect(token.connect(acc1).safeMassMint(acc2.address, 1, ["Token"]))
                    .to.be.revertedWith("HENChicken: Minting limit.");

                expect(await token.totalSupply())
                    .to.be.eq(10);
                expect(await token.getNextTokenId())
                    .to.be.eq(10);
            });

            it("check next day", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 10, ["Token 1"]))
                    .to.emit(token, 'MassMint')
                    .withArgs(acc1.address, acc2.address, 0, 10, ["Token 1"]);

                token.setCurrentTime(86400);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 10, ["Token 2"]))
                    .to.emit(token, 'MassMint')
                    .withArgs(acc1.address, acc2.address, 10, 10, ["Token 2"]);

                expect(await token.totalSupply())
                    .to.be.eq(20);
                expect(await token.getNextTokenId())
                    .to.be.eq(20);
            });
        });

    });

});