const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HENToken", function () {
    const runTime = 0;

    it("Check getter functions (2 periods)", async function() {
        let acc1;

        [acc1] = await ethers.getSigners();
        const HENToken = await ethers.getContractFactory("MockHENToken", acc1);
        const token = await HENToken.deploy(runTime, [[0,1000],[1800,2000]]);
        await token.deployed();

        expect(await token.getMintingStartAt()).to.eq(runTime);
        
        const p0 = await token.getMintingPeriod(0);
        expect(p0.amount).to.be.equal(1000);
        expect(p0.duration).to.be.equal(0);
        const p1 = await token.getMintingPeriod(1);
        expect(p1.amount).to.be.equal(2000);
        expect(p1.duration).to.be.equal(1800);
        await expect(token.getMintingPeriod(3)).to.be.reverted;

        let periods = await token.getMintingPeriods();
        expect(periods[0].amount).to.be.equal(1000);
        expect(periods[0].duration).to.be.equal(0);
        expect(periods[1].amount).to.be.equal(2000);
        expect(periods[1].duration).to.be.equal(1800);

        expect(await token.getTotalMintingPeriods()).to.eq(2);
    })


    it("Check getter functions (0 periods)", async function() {
        let acc1;

        [acc1] = await ethers.getSigners();
        const HENToken = await ethers.getContractFactory("MockHENToken", acc1);
        const token = await HENToken.deploy(runTime, []);
        await token.deployed();

        expect(await token.getMintingStartAt()).to.eq(runTime);
        await expect(token.getMintingPeriod(0)).to.be.reverted;
        expect(await token.getTotalMintingPeriods()).to.eq(0);
    })


    it("Check minting", async function() {
        let acc1, acc2;

        [acc1, acc2] = await ethers.getSigners();
        const HENToken = await ethers.getContractFactory("MockHENToken", acc1);
        const token = await HENToken.deploy(runTime, [[1800,1000],[1800,2000],[3600,3000]]);
        await token.deployed();

        token.setCurrentTime(runTime);
        expect(await token.limitSupply()).to.eq(6000);
        expect(await token.totalSupply()).to.eq(0);
        expect(await token.totalAvailable()).to.eq(0);
        expect(token.balanceOf(acc1.address, 0));
        expect(token.balanceOf(acc2.address, 0));

        token.setCurrentTime(runTime + 1800);
        expect(await token.limitSupply()).to.eq(6000);
        expect(await token.totalSupply()).to.eq(0);
        expect(await token.totalAvailable()).to.eq(1000);
        expect(token.balanceOf(acc1.address, 0));
        expect(token.balanceOf(acc2.address, 0));

        // try to mint zero at first
        await token.mint(acc2.address, 0);
        expect(await token.limitSupply()).to.eq(6000);
        expect(await token.totalSupply()).to.eq(0);
        expect(await token.totalAvailable()).to.eq(1000);
        expect(token.balanceOf(acc1.address, 0));
        expect(token.balanceOf(acc2.address, 0));

        // try to mint all available tokens
        await token.mint(acc2.address, 1000);
        expect(await token.limitSupply()).to.eq(6000);
        expect(await token.totalSupply()).to.eq(1000);
        expect(await token.totalAvailable()).to.eq(1000);
        expect(token.balanceOf(acc1.address, 0));
        expect(token.balanceOf(acc2.address, 1000));

        token.setCurrentTime(runTime + 1800 + 1800);
        // try to mint half
        await token.mint(acc1.address, 1000);
        expect(await token.limitSupply()).to.eq(6000);
        expect(await token.totalSupply()).to.eq(2000);
        expect(await token.totalAvailable()).to.eq(3000);
        expect(token.balanceOf(acc1.address, 1000));
        expect(token.balanceOf(acc2.address, 1000));
        // try to mint more then available
        await expect(token.mint(acc1.address, 1001)).to.be.revertedWith("HENToken: Too many tokens to mint");

        token.setCurrentTime(runTime + 1800 + 1800 + 3600);
        // now we have 1000 from previous mint + 3000 from current
        // try to mint by acc2
        await expect(token.connect(acc2).mint(acc2.address, 4000)).to.be.revertedWith("Access: You are not an owner");
        // try to split rest money
        await token.mint(acc1.address, 2000);
        await token.mint(acc2.address, 2000);
        expect(await token.limitSupply()).to.eq(6000);
        expect(await token.totalSupply()).to.eq(6000);
        expect(await token.totalAvailable()).to.eq(6000);
        expect(token.balanceOf(acc1.address, 3000));
        expect(token.balanceOf(acc2.address, 3000));

        // try to mint some in one day
        token.setCurrentTime(runTime + 1800 + 1800 + 3600 + 86400);
        await expect(token.mint(acc1.address, 1)).to.be.revertedWith("HENToken: Too many tokens to mint");
    })


    it("Check burning", async function() {
        let acc1, acc2;

        [acc1, acc2] = await ethers.getSigners();
        const HENToken = await ethers.getContractFactory("MockHENToken", acc1);
        const token = await HENToken.deploy(runTime, [[0,1000]]);
        await token.deployed();

        token.setCurrentTime(runTime);
        await token.mint(acc2.address, 1000);
        expect(await token.limitSupply()).to.eq(1000);
        expect(await token.totalSupply()).to.eq(1000);
        expect(await token.totalAvailable()).to.eq(1000);
        expect(token.balanceOf(acc1.address, 0));
        expect(token.balanceOf(acc2.address, 1000));

        // try to burn by no owner
        await expect(token.connect(acc2).burn(acc2.address, 500)).to.be.revertedWith("Access: You are not an owner");

        // try to burn more than available
        await expect(token.burn(acc2.address, 1001)).to.be.revertedWith("ERC20: burn amount exceeds balance");
        await expect(token.burn(acc1.address, 1)).to.be.revertedWith("ERC20: burn amount exceeds balance");

        // try to burn nothing
        await token.burn(acc2.address, 0);
        expect(await token.limitSupply()).to.eq(1000);
        expect(await token.totalSupply()).to.eq(1000);
        expect(await token.totalAvailable()).to.eq(1000);
        expect(token.balanceOf(acc1.address, 0));
        expect(token.balanceOf(acc2.address, 1000));

        // try to burn
        await token.burn(acc2.address, 500);
        expect(await token.limitSupply()).to.eq(1000);
        expect(await token.totalSupply()).to.eq(500);
        expect(await token.totalAvailable()).to.eq(1000);
        expect(token.balanceOf(acc1.address, 0));
        expect(token.balanceOf(acc2.address, 500));

        // try to mint tokens again
        token.setCurrentTime(runTime);
        await token.mint(acc2.address, 500);
        expect(await token.limitSupply()).to.eq(1000);
        expect(await token.totalSupply()).to.eq(1000);
        expect(await token.totalAvailable()).to.eq(1000);
        expect(token.balanceOf(acc1.address, 0));
        expect(token.balanceOf(acc2.address, 1000));
    })

})