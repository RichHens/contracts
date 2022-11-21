const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('HEN Token: Minting access tests', function () {
  const minApprovalsRequired = 3;

  let acc1, acc2, acc3, acc4, acc5, accNotMinter, minters, token;

  beforeEach(async function () {
    [acc1, acc2, acc3, acc4, acc5, accNotMinter] = await ethers.getSigners();
    // the first minter must be the owner of the contract
    minters = [acc1, acc2, acc3, acc4, acc5];
    const HENToken = await ethers.getContractFactory("MockHENToken", acc1);
    token = await HENToken.deploy(
      0,
      [[0, 1000]],
      [
        acc1.address,
        acc2.address,
        acc3.address,
        acc4.address,
        acc5.address
      ],
      minApprovalsRequired
    );
    await token.deployed();
    await token.setCurrentTime(0);
  });


  /**
   * Minting with varying number of approvals
   */
  describe('minting checking', function () {
    // ----------------------------------------------------------------------------
    it("enough approvals (approvals == minApprovalsRequired)", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      expect(await token.balanceOf(accNotMinter.address))
        .to.be.eq(1);
    });

    // ----------------------------------------------------------------------------
    it("not enough approvals (approvals == minApprovalsRequired - 1)", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired - 1; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.mint(rIdx))
        .to.be.revertedWith("HENToken: not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("more than enough approvals (approvals == minApprovalsRequired + 1)", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired + 1; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      expect(await token.balanceOf(accNotMinter.address))
        .to.be.eq(1);
    });

    // ----------------------------------------------------------------------------
    it("try to mint twice one minting request", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      await expect(token.mint(rIdx))
        .to.be.revertedWith("HENToken: request is already executed.");
    });
  });

  /**
   * Approval checking
   */
  describe('approval checking', function () {
    // ----------------------------------------------------------------------------
    it("try to approve twice one minting request", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      await expect(token.approveMintingRequest(rIdx))
        .to.be.revertedWith("HENToken: request is already approved.");

      await expect(token.connect(minters[1]).approveMintingRequest(rIdx))
        .to.emit(token, 'MintingRequestApproval')
        .withArgs(minters[1].address, rIdx);

      await expect(token.connect(minters[1]).approveMintingRequest(rIdx))
        .to.be.revertedWith("HENToken: request is already approved.");
    });

    // ----------------------------------------------------------------------------
    it("try to approve a non-existing minting request", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      await expect(token.approveMintingRequest(rIdx + 1))
        .to.be.revertedWith("HENToken: request does not exist.");
    });

    // ----------------------------------------------------------------------------
    it("try to approve already executed minting", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      await expect(token.connect(minters[minters.length - 1]).approveMintingRequest(rIdx))
        .to.be.revertedWith("HENToken: request is already executed.");
    });
  });


  /**
   * Revocation checking
   */
  describe('revocation checking', function () {
    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> mint failed", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.revokeMintingRequest(rIdx))
        .to.emit(token, 'MintingRequestRevocation')
        .withArgs(acc1.address, rIdx);

      await expect(token.mint(rIdx))
        .to.be.revertedWith("HENToken: not enough approves.");
    });

    // ----------------------------------------------------------------------------
    it("enough approves -> revoke one -> return it -> mint success", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.revokeMintingRequest(rIdx))
        .to.emit(token, 'MintingRequestRevocation')
        .withArgs(acc1.address, rIdx);

      await expect(token.approveMintingRequest(rIdx))
        .to.emit(token, 'MintingRequestApproval')
        .withArgs(acc1.address, rIdx);

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      expect(await token.balanceOf(accNotMinter.address))
        .to.be.eq(1);
    });

    // ----------------------------------------------------------------------------
    it("revocation does not exist", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      await expect(token.connect(minters[1]).revokeMintingRequest(rIdx))
        .to.be.revertedWith("HENToken: request is not approved.");
    });

    // ----------------------------------------------------------------------------
    it("try to revoke a non-existing minting request", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.revokeMintingRequest(rIdx + 1))
        .to.be.revertedWith("HENToken: request does not exist.");
    });

    // ----------------------------------------------------------------------------
    it("try to revoke already executed minting", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.mint(rIdx))
        .to.emit(token, 'Minting')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      await expect(token.connect(minters[1]).revokeMintingRequest(rIdx))
        .to.be.revertedWith("HENToken: request is already executed.");
    });
  });


  /**
   * onlyMinter checking
   */
  describe('checking if only minter can call functions', function () {
    // ----------------------------------------------------------------------------
    it("mintingRequest", async function() {
      await expect(token.connect(accNotMinter).requestMinting(accNotMinter.address, 1))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("approveMintingRequest", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      await expect(token.connect(accNotMinter).approveMintingRequest(rIdx))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("revokeMintingRequest", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      await expect(token.connect(accNotMinter).revokeMintingRequest(rIdx))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("mint", async function() {
      let
        rIdx = Number(await token.getTotalMintingRequests());

      await expect(token.requestMinting(accNotMinter.address, 1))
        .to.emit(token, 'MintingRequestCreation')
        .withArgs(acc1.address, rIdx, accNotMinter.address, 1);

      for (let i=1; i<minApprovalsRequired; i++) {
        await expect(token.connect(minters[i]).approveMintingRequest(rIdx))
          .to.emit(token, 'MintingRequestApproval')
          .withArgs(minters[i].address, rIdx);
      }

      await expect(token.connect(accNotMinter).mint(rIdx))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("getTotalMintingRequests", async function() {
      await expect(token.connect(accNotMinter).getTotalMintingRequests())
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("getMintingRequest", async function() {
      await expect(token.connect(accNotMinter).getMintingRequest(0))
        .to.be.revertedWith("HENToken: You are not a minter.");
    });

    // ----------------------------------------------------------------------------
    it("getAllMintingRequests", async function() {
      await expect(token.connect(accNotMinter).getAllMintingRequests())
        .to.be.revertedWith("HENToken: You are not a minter.");
    });
  });

});
