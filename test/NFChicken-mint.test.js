const { expect } = require("chai");
const { ethers } = require("hardhat");

const
    ZERO_ADDRESS = '0x0000000000000000000000000000000000000000',
    MASS_MINT_LIMIT_PER_CALL = 500;
let
    acc1,
    acc2,
    acc3,
    token;

describe('NFChicken: Mint', function () {

    beforeEach(async function () {
        [acc1, acc2, acc3] = await ethers.getSigners();
        const NFChicken = await ethers.getContractFactory("MockNFChicken", acc1);
        token = await NFChicken.deploy([acc1.address, acc2.address], 1, "https://richhens.com/");
        await token.deployed();
    });


    context('safeMint', function () {
        beforeEach(async function () {
            await token.requestAddingMinter(acc1.address, 1);
            await token.addMinter(acc1.address);
        });

        it("minting", async function () {
            await expect(token.connect(acc1).safeMint(acc2.address))
                .to.emit(token, 'Transfer')
                .withArgs(ZERO_ADDRESS, acc2.address, 0);
            expect(await token.ownerOf(0))
                .to.be.eq(acc2.address);
            expect(await token.tokenURI(0))
                .to.be.eq("https://richhens.com/0");
            expect(await token.totalSupply())
                .to.be.eq(1);
            expect(await token.getNextTokenId())
                .to.be.eq(1);
        });

        it("minting to zero address", async function () {
            await expect(token.connect(acc1).safeMint(ZERO_ADDRESS))
                .to.be.revertedWith("NFChicken: Mint to the zero address.");
        });

        // it("minting without URL", async function () {
        //     await expect(token.connect(acc1).safeMint(acc2.address, ""))
        //         .to.be.revertedWith("NFChicken: Empty URL.");
        // });

        context('limits', function () {
            it("check", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMint(acc2.address))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 0);

                await expect(token.connect(acc1).safeMint(acc2.address))
                    .to.be.revertedWith("NFChicken: Minting limit.");

                expect(await token.totalSupply())
                    .to.be.eq(1);
                expect(await token.getNextTokenId())
                    .to.be.eq(1);
            });

            it("check last second", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMint(acc2.address))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 0);

                token.setCurrentTime(86399);
                await expect(token.connect(acc1).safeMint(acc2.address))
                    .to.be.revertedWith("NFChicken: Minting limit.");
            });

            it("check next day", async function () {
                token.setCurrentTime(0);

                await expect(token.connect(acc1).safeMint(acc2.address))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 0);

                token.setCurrentTime(86400);
                await expect(token.connect(acc1).safeMint(acc2.address))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 1);

                await expect(token.connect(acc1).safeMint(acc2.address))
                    .to.be.revertedWith("NFChicken: Minting limit.");
            });
        });
    });


    context('safeMassMint', function () {
        beforeEach(async function () {
            await token.requestAddingMinter(acc1.address, 10);
            await token.addMinter(acc1.address);
        });

        it("mint", async function () {
            await expect(token.connect(acc1).safeMassMint(acc2.address, 10))
                .to.emit(token, 'Transfer')
                .withArgs(ZERO_ADDRESS, acc2.address, 0)
                .to.emit(token, 'Transfer')
                .withArgs(ZERO_ADDRESS, acc2.address, 9);
            expect(await token.ownerOf(0))
                .to.be.eq(acc2.address);
            expect(await token.tokenURI(0))
                .to.be.eq("https://richhens.com/0");
            expect(await token.tokenURI(1))
                .to.be.eq("https://richhens.com/1");
            expect(await token.tokenURI(9))
                .to.be.eq("https://richhens.com/9");
            expect(await token.totalSupply())
                .to.be.eq(10);
            expect(await token.getNextTokenId())
                .to.be.eq(10);
        });

        it("minting to zero address", async function () {
            await expect(token.connect(acc1).safeMassMint(ZERO_ADDRESS, 1))
                .to.be.revertedWith("NFChicken: Mint to the zero address.");
        });

        it("minting zero tokens", async function () {
            await expect(token.connect(acc1).safeMassMint(acc2.address, 0))
                .to.be.revertedWith("NFChicken: Nothing to mint.");
        });

        it("one call limit", async function () {
            await token.requestAddingMinter(acc3.address, 0);
            await token.addMinter(acc3.address);

            await expect(token.connect(acc3).safeMassMint(acc2.address, MASS_MINT_LIMIT_PER_CALL + 1))
                .to.be.revertedWith("NFChicken: Minting limit per call.");
        });

        // it("minting without URL list", async function () {
        //     await expect(token.connect(acc1).safeMassMint(acc2.address, 1, []))
        //         .to.be.revertedWith("NFChicken: Empty tokenURL list.");
        // });

        // it("minting with empty URL", async function () {
        //     await expect(token.connect(acc1).safeMassMint(acc2.address, 3, ["Token 1", "", "Token 3"]))
        //         .to.be.revertedWith("NFChicken: Empty URL.");
        // });

        context('limits', function () {
            it("check", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 11))
                    .to.be.revertedWith("NFChicken: Minting limit.");

                await expect(token.connect(acc1).safeMassMint(acc2.address, 5))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 0)
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 4);

                await expect(token.connect(acc1).safeMassMint(acc2.address, 6))
                    .to.be.revertedWith("NFChicken: Minting limit.");
                expect(await token.totalSupply())
                    .to.be.eq(5);
                expect(await token.getNextTokenId())
                    .to.be.eq(5);
            });

            it("check last second", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 5))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 4);

                token.setCurrentTime(86399);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 5))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 9);

                await expect(token.connect(acc1).safeMassMint(acc2.address, 1))
                    .to.be.revertedWith("NFChicken: Minting limit.");

                expect(await token.totalSupply())
                    .to.be.eq(10);
                expect(await token.getNextTokenId())
                    .to.be.eq(10);
            });

            it("check next day", async function () {
                token.setCurrentTime(0);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 10))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 9);

                token.setCurrentTime(86400);
                await expect(token.connect(acc1).safeMassMint(acc2.address, 10))
                    .to.emit(token, 'Transfer')
                    .withArgs(ZERO_ADDRESS, acc2.address, 19);

                expect(await token.totalSupply())
                    .to.be.eq(20);
                expect(await token.getNextTokenId())
                    .to.be.eq(20);
            });
        });

    });

});