const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Access", function () {
    let acc1, acc2, acc3, access;
    const runTime = 0;

    beforeEach(async function () {
        [acc1, acc2, acc3] = await ethers.getSigners();
        const AccessContract = await ethers.getContractFactory("MockAccess", acc1);
        access = await AccessContract.deploy();
        await access.deployed();
    })


    it("Only the creator is the owner at the very beginning", async function() {
        expect(await access.isOwner(acc1.address)).to.eq(true);
        expect(await access.getTotalOwners()).to.eq(1);
    })


    it("Check getter functions", async function() {
        // check if delay time is not null
        const delay = parseInt(await access.getAddOwnerDelay());
        expect(delay).to.gt(0);

        // check the first owner which was created by the constructor
        const owner1 = await access.getOwnerByAddress(acc1.address);
        expect(await owner1.account).to.eq(acc1.address);
        expect(await owner1.addedBy).to.eq(acc1.address);
        expect(await owner1.addedAt).to.eq(runTime);
        expect(await owner1.activatedAt).to.eq(runTime);
        // check the same but by index
        const ownerByIndex1 = await access.getOwnerByIndex(0);
        expect(await ownerByIndex1.account).to.eq(acc1.address);
        expect(await ownerByIndex1.addedBy).to.eq(acc1.address);
        expect(await ownerByIndex1.addedAt).to.eq(runTime);
        expect(await ownerByIndex1.activatedAt).to.eq(runTime);

        // add a new owner
        await expect(access.addOwner(acc2.address))
            .to.emit(access, 'Added')
            .withArgs(acc2.address, acc1.address, runTime, runTime + delay);
        // two owners so far
        expect(await access.getTotalOwners()).to.eq(2);
        // and check
        const ownerByAddress2 = await access.getOwnerByAddress(acc2.address);
        expect(await ownerByAddress2.account).to.eq(acc2.address);
        expect(await ownerByAddress2.addedBy).to.eq(acc1.address);
        expect(await ownerByAddress2.addedAt).to.eq(runTime);
        expect(await ownerByAddress2.activatedAt).to.eq(runTime + delay);
        // check the same but by index
        const ownerByIndex2 = await access.getOwnerByIndex(1);
        expect(await ownerByIndex2.account).to.eq(acc2.address);
        expect(await ownerByIndex2.addedBy).to.eq(acc1.address);
        expect(await ownerByIndex2.addedAt).to.eq(runTime);
        expect(await ownerByIndex2.activatedAt).to.eq(runTime + delay);

        // check if user not an owner
        // and check
        await expect(access.getOwnerByAddress(acc3.address))
            .to.be.revertedWith("Access: The owner doesn't exists");
        await expect(access.getOwnerByIndex(2))
            .to.be.reverted;

        // check all users
        const owners = await access.getAllOwners();
        expect(await owners[0].account).to.eq(acc1.address);
        expect(await owners[0].addedBy).to.eq(acc1.address);
        expect(await owners[0].addedAt).to.eq(runTime);
        expect(await owners[0].activatedAt).to.eq(runTime);
        expect(await owners[1].account).to.eq(acc2.address);
        expect(await owners[1].addedBy).to.eq(acc1.address);
        expect(await owners[1].addedAt).to.eq(runTime);
        expect(await owners[1].activatedAt).to.eq(runTime + delay);
    })


    it("Adding a new owner", async function() {
        // check if delay time is not null
        const delay = parseInt(await access.getAddOwnerDelay());
        expect(delay).to.gt(0);

        // firstly, try to add by not an owner
        await expect(access.connect(acc2).addOwner(acc2.address)).to.be.revertedWith("Access: You are not an owner");

        // try to add a new owner
        await expect(access.addOwner(acc2.address))
            .to.emit(access, 'Added')
            .withArgs(acc2.address, acc1.address, runTime, runTime + delay);

        // check total owners
        expect(await access.getTotalOwners()).to.eq(2);
        // but the new owner is not available at once
        expect(await access.isOwner(acc2.address)).to.eq(false);
        // wait delay
        access.setCurrentTime(runTime + delay);
        expect(await access.isOwner(acc2.address)).to.eq(true);
    })


    it("Removing an owner", async function() {
        // check if delay time is not null
        const delay = parseInt(await access.getAddOwnerDelay());
        expect(delay).to.gt(0);

        // add a new owner
        await expect(access.addOwner(acc2.address))
            .to.emit(access, 'Added')
            .withArgs(acc2.address, acc1.address, runTime, runTime + delay);

        // firstly, try to remove by not an owner
        await expect(access.connect(acc2).removeOwner(acc2.address))
            .to.be.revertedWith("Access: You are not an owner");

        // must work removing an inactive user
        await expect(access.removeOwner(acc2.address))
            .to.emit(access, 'Removed')
            .withArgs(acc2.address, acc1.address, runTime);
        expect(await access.isOwner(acc1.address)).to.eq(true);
        expect(await access.isOwner(acc2.address)).to.eq(false);
        expect(await access.getTotalOwners()).to.eq(1);

        // must does not work removing an active user
        await expect(access.addOwner(acc2.address))
            .to.emit(access, 'Added')
            .withArgs(acc2.address, acc1.address, runTime, runTime + delay);
        access.setCurrentTime(runTime + delay);
        expect(await access.isOwner(acc2.address)).to.eq(true);
        await expect(access.removeOwner(acc2.address))
            .to.be.revertedWith("Access: The owner is already active");
        expect(await access.isOwner(acc2.address)).to.eq(true);
        expect(await access.getTotalOwners()).to.eq(2);

        // try to delete yourself
        await expect(access.removeOwner(acc1.address))
            .to.be.revertedWith("Access: Impossible to delete yourself");

        // try to delete a user not in a list
        await access.removeOwner(acc3.address);
        expect(await access.getTotalOwners()).to.eq(2);
    })

})