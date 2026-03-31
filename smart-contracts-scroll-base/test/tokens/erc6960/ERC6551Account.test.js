const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getBytes, hexlify, concat, keccak256, toUtf8Bytes } = require("ethers");

describe("ERC6551Account", function () {
  let account;
  let owner;
  let otherAccount;
  let mockERC721;
  let registry;
  let tokenId;
  let implementation;
  let chainId;
  let accountAddress;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    chainId = BigInt(await network.provider.send("eth_chainId"));

    // Deploy a mock ERC721 token
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    mockERC721 = await MockERC721.deploy("MockNFT", "MNFT");
    await mockERC721.waitForDeployment();

    // Deploy a mock ERC1155 token
    const MockERC1155 = await ethers.getContractFactory("MockERC1155");
    mockERC1155 = await MockERC1155.deploy();
    await mockERC1155.waitForDeployment();

    // Deploy the ERC6551Account implementation
    const ERC6551AccountFactory =
      await ethers.getContractFactory("ERC6551Account");
    implementation = await ERC6551AccountFactory.deploy();
    await implementation.waitForDeployment();

    // Deploy the registry
    const Registry = await ethers.getContractFactory("MockERC6551Registry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    // Mint a token to owner
    tokenId = 1n;
    await mockERC721.mint(owner.address, tokenId);

    // Create salt as bytes32
    const salt = ethers.zeroPadValue("0x", 32); // Create a bytes32 salt of zeros

    // Compute the account address before creating it
    accountAddress = await registry.account(
      await implementation.getAddress(),
      salt,
      chainId,
      await mockERC721.getAddress(),
      tokenId
    );

    // Create a new account
    const tx = await registry.createAccount(
      await implementation.getAddress(),
      salt,
      chainId,
      await mockERC721.getAddress(),
      tokenId
    );

    const receipt = await tx.wait();

    // Verify that the ERC6551AccountCreated event was emitted
    const event = receipt.logs.find((log) => {
      try {
        const parsed = registry.interface.parseLog(log);
        return parsed.name === "ERC6551AccountCreated";
      } catch (e) {
        return false;
      }
    });

    expect(event).to.not.be.undefined;
    // Get the account contract instance
    account = await ethers.getContractAt("ERC6551Account", accountAddress);

    // Verify the account exists on chain
    const code = await ethers.provider.getCode(accountAddress);
    expect(code).to.not.equal("0x");
  });

  describe("Initialization", function () {
    it("Should correctly initialize with the right token details", async function () {
      const [retrievedChainId, tokenContract, retrievedTokenId] =
        await account.token();

      expect(retrievedChainId).to.equal(chainId);
      expect(tokenContract.toLowerCase()).to.equal(
        (await mockERC721.getAddress()).toLowerCase()
      );
      expect(retrievedTokenId).to.equal(tokenId);
    });

    it("Should have the correct owner", async function () {
      const accountOwner = await account.owner();
      expect(accountOwner.toLowerCase()).to.equal(owner.address.toLowerCase());
    });
  });

  describe("Basic Functionality", function () {
    it("Should handle receive function", async function () {
      const value = ethers.parseEther("1.0");
      await owner.sendTransaction({
        to: accountAddress,
        value: value,
      });
      expect(await ethers.provider.getBalance(accountAddress)).to.equal(value);
    });

    it("Should track state changes", async function () {
      const initialState = await account.state();

      await account.connect(owner).execute(otherAccount.address, 0, "0x", 0);

      expect(await account.state()).to.equal(initialState + 1n);
    });
  });

  describe("Token Functions", function () {
    it("Should handle zero chain ID case", async function () {
      const salt = ethers.zeroPadValue("0x", 32);
      const wrongChainTx = await registry.createAccount(
        await implementation.getAddress(),
        salt,
        0n, // different chain ID
        await mockERC721.getAddress(),
        tokenId
      );
      const receipt = await wrongChainTx.wait();
      const wrongChainAddress = receipt.logs[0].args[0];

      const wrongChainAccountContract = await ethers.getContractAt(
        "ERC6551Account",
        wrongChainAddress
      );

      expect(await wrongChainAccountContract.owner()).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should handle invalid token contract", async function () {
      // Deploy a simple contract that's not an ERC721
      const SimpleContract = await ethers.getContractFactory("SimpleContract");
      const simpleContract = await SimpleContract.deploy();
      await simpleContract.waitForDeployment();

      const salt = ethers.zeroPadValue("0x", 32);
      const invalidTokenTx = await registry.createAccount(
        await implementation.getAddress(),
        salt,
        chainId,
        await simpleContract.getAddress(),
        tokenId
      );
      const receipt = await invalidTokenTx.wait();
      const invalidTokenAddress = receipt.logs[0].args[0];

      const invalidTokenAccountContract = await ethers.getContractAt(
        "ERC6551Account",
        invalidTokenAddress
      );

      // This should return zero address because the contract can't call ownerOf
      const ownerResult = await invalidTokenAccountContract.owner();
      expect(ownerResult).to.equal(ethers.ZeroAddress);
    });
  });

  describe("ERC721 Receiver", function () {
    it("Should accept valid ERC721 transfers", async function () {
      const newTokenId = 2n;
      await mockERC721.mint(owner.address, newTokenId);

      await mockERC721
        .connect(owner)
        [
          "safeTransferFrom(address,address,uint256)"
        ](owner.address, accountAddress, newTokenId);

      expect(await mockERC721.ownerOf(newTokenId)).to.equal(accountAddress);
    });

    it("Should prevent ownership cycle with multiple levels", async function () {
      // Create second token and account
      const secondTokenId = 2n;
      await mockERC721.mint(owner.address, secondTokenId);

      const salt2 = ethers.zeroPadValue("0x01", 32);
      const secondAccountTx = await registry.createAccount(
        await implementation.getAddress(),
        salt2,
        chainId,
        await mockERC721.getAddress(),
        secondTokenId
      );
      const receipt = await secondAccountTx.wait();
      const secondAccountAddress = receipt.logs[0].args[0];

      // Get the second account contract
      const secondAccount = await ethers.getContractAt(
        "ERC6551Account",
        secondAccountAddress
      );

      // First approve the transfer
      await mockERC721.connect(owner).approve(secondAccountAddress, tokenId);

      // Try to transfer first token to second account
      await expect(
        mockERC721
          .connect(owner)
          [
            "safeTransferFrom(address,address,uint256)"
          ](owner.address, secondAccountAddress, tokenId)
      ).to.be.revertedWith("Cannot own yourself");
    });
  });

  describe("ERC1155 Receiver", function () {
    it("Should accept single ERC1155 transfers", async function () {
      const id = 1n;
      const amount = 100n;
      await mockERC1155.mint(owner.address, id, amount);

      await mockERC1155
        .connect(owner)
        .safeTransferFrom(owner.address, accountAddress, id, amount, "0x");

      expect(await mockERC1155.balanceOf(accountAddress, id)).to.equal(amount);
    });

    it("Should accept batch ERC1155 transfers", async function () {
      const ids = [1n, 2n, 3n];
      const amounts = [100n, 200n, 300n];

      for (let i = 0; i < ids.length; i++) {
        await mockERC1155.mint(owner.address, ids[i], amounts[i]);
      }

      await mockERC1155
        .connect(owner)
        .safeBatchTransferFrom(
          owner.address,
          accountAddress,
          ids,
          amounts,
          "0x"
        );

      for (let i = 0; i < ids.length; i++) {
        expect(await mockERC1155.balanceOf(accountAddress, ids[i])).to.equal(
          amounts[i]
        );
      }
    });
  });

  describe("Execute", function () {
    it("Should allow owner to execute transactions", async function () {
      const value = ethers.parseEther("1.0");

      // Fund the account
      await owner.sendTransaction({
        to: accountAddress,
        value: value,
      });

      const balanceBefore = await ethers.provider.getBalance(
        otherAccount.address
      );

      // Execute transaction
      await account
        .connect(owner)
        .execute(otherAccount.address, value, "0x", 0);

      const balanceAfter = await ethers.provider.getBalance(
        otherAccount.address
      );
      expect(balanceAfter - balanceBefore).to.equal(value);
    });

    it("Should reject execution from non-owner", async function () {
      await expect(
        account.connect(otherAccount).execute(otherAccount.address, 0n, "0x", 0)
      ).to.be.revertedWith("Invalid signer");
    });

    it("Should handle failed executions", async function () {
      const FailingMock = await ethers.getContractFactory("FailingMock");
      const failingMock = await FailingMock.deploy();

      await expect(
        account
          .connect(owner)
          .execute(
            await failingMock.getAddress(),
            0,
            failingMock.interface.encodeFunctionData("fail"),
            0
          )
      ).to.be.reverted;
    });

    it("Should reject unsupported operations", async function () {
      await expect(
        account.connect(owner).execute(
          otherAccount.address,
          0,
          "0x",
          1 // unsupported operation
        )
      ).to.be.revertedWith("Only call operations are supported");
    });
  });

  describe("Signature Validation", function () {
    it("Should validate owner's signature", async function () {
      // Create message hash according to EIP-191
      const message = "Hello World";
      const messageHash = ethers.hashMessage(message);

      // Sign the hash with the owner's private key
      const signature = await owner.signMessage(message);

      // Verify the signature using isValidSignature
      const result = await account.isValidSignature(messageHash, signature);
      expect(result).to.equal("0x1626ba7e"); // ERC1271 magic value
    });

    it("Should reject invalid signatures", async function () {
      const message = "Hello World";
      const messageHash = ethers.hashMessage(message);
      const signature = await otherAccount.signMessage(message);

      const result = await account.isValidSignature(messageHash, signature);
      expect(result).to.equal("0x00000000");
    });
  });

  describe("Token Receiver", function () {
    it("Should support ERC721 receiver interface", async function () {
      const ERC721_RECEIVER_INTERFACE_ID = "0x150b7a02";
      expect(await account.supportsInterface(ERC721_RECEIVER_INTERFACE_ID)).to
        .be.true;
    });

    it("Should support ERC1155 receiver interface", async function () {
      const ERC1155_RECEIVER_INTERFACE_ID = "0x4e2312e0";
      expect(await account.supportsInterface(ERC1155_RECEIVER_INTERFACE_ID)).to
        .be.true;
    });

    it("Should prevent ownership cycle", async function () {
      // Try to transfer the token that owns the account to the account itself
      await expect(
        mockERC721
          .connect(owner)
          [
            "safeTransferFrom(address,address,uint256)"
          ](owner.address, accountAddress, tokenId)
      ).to.be.revertedWith("Cannot own yourself");
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC6551Account interface", async function () {
      const ERC6551_ACCOUNT_INTERFACE_ID = "0x6faff5f1";
      expect(await account.supportsInterface(ERC6551_ACCOUNT_INTERFACE_ID)).to
        .be.true;
    });

    it("Should support ERC6551Executable interface", async function () {
      const ERC6551_EXECUTABLE_INTERFACE_ID = "0x51945447";
      expect(await account.supportsInterface(ERC6551_EXECUTABLE_INTERFACE_ID))
        .to.be.true;
    });
  });

  describe("Token Ownership Chain", function () {
    it("Should handle deep ownership chains", async function () {
      // Create a chain of 4 token-bound accounts
      const accounts = [];
      const tokens = [];

      for (let i = 0; i < 4; i++) {
        // Mint new token
        const newTokenId = BigInt(i + 2);
        await mockERC721.mint(owner.address, newTokenId);
        tokens.push(newTokenId);

        // Create new account
        const salt = ethers.zeroPadValue(`0x${i + 1}`, 32);
        const tx = await registry.createAccount(
          await implementation.getAddress(),
          salt,
          chainId,
          await mockERC721.getAddress(),
          newTokenId
        );
        const receipt = await tx.wait();
        const newAccountAddress = receipt.logs[0].args[0];
        accounts.push(
          await ethers.getContractAt("ERC6551Account", newAccountAddress)
        );

        // Transfer ownership of token to previous account
        if (i > 0) {
          await mockERC721
            .connect(owner)
            [
              "safeTransferFrom(address,address,uint256)"
            ](owner.address, accounts[i - 1].address, newTokenId);
        }
      }

      // Try to transfer the first token to the last account (should fail)
      await expect(
        mockERC721
          .connect(owner)
          [
            "safeTransferFrom(address,address,uint256)"
          ](owner.address, accounts[accounts.length - 1].address, tokenId)
      ).to.be.revertedWith("Cannot own yourself");
    });

    it("Should handle broken ownership chains", async function () {
      // Create account with non-existent token
      const nonExistentTokenId = 999n;
      const salt = ethers.zeroPadValue("0x42", 32);
      const tx = await registry.createAccount(
        await implementation.getAddress(),
        salt,
        chainId,
        await mockERC721.getAddress(),
        nonExistentTokenId
      );
      const receipt = await tx.wait();
      const brokenAccount = await ethers.getContractAt(
        "ERC6551Account",
        receipt.logs[0].args[0]
      );

      // This should not revert but return zero address
      expect(await brokenAccount.owner()).to.equal(ethers.ZeroAddress);
    });

    it("Should handle max depth ownership chain", async function () {
      // Create a chain of 5 accounts (max depth)
      const accounts = [];
      const tokens = [];

      for (let i = 0; i < 5; i++) {
        const newTokenId = BigInt(i + 2);
        await mockERC721.mint(owner.address, newTokenId);
        tokens.push(newTokenId);

        const salt = ethers.zeroPadValue(`0x${i + 1}`, 32);
        const tx = await registry.createAccount(
          await implementation.getAddress(),
          salt,
          chainId,
          await mockERC721.getAddress(),
          newTokenId
        );
        const receipt = await tx.wait();
        accounts.push(
          await ethers.getContractAt("ERC6551Account", receipt.logs[0].args[0])
        );

        if (i > 0) {
          await mockERC721
            .connect(owner)
            [
              "safeTransferFrom(address,address,uint256)"
            ](owner.address, accounts[i - 1].address, newTokenId);
        }
      }

      // Attempting to add another level should revert
      const finalTokenId = 7n;
      await mockERC721.mint(owner.address, finalTokenId);

      await expect(
        mockERC721
          .connect(owner)
          [
            "safeTransferFrom(address,address,uint256)"
          ](owner.address, accounts[accounts.length - 1].address, finalTokenId)
      ).to.be.revertedWith("Ownership chain too deep");
    });
  });

  describe("Execute Function Edge Cases", function () {
    it("Should handle failed executions with custom error data", async function () {
      const CustomErrorMock =
        await ethers.getContractFactory("CustomErrorMock");
      const customErrorMock = await CustomErrorMock.deploy();

      await owner.sendTransaction({
        to: accountAddress,
        value: ethers.parseEther("1.0"),
      });

      await expect(
        account
          .connect(owner)
          .execute(
            await customErrorMock.getAddress(),
            0,
            customErrorMock.interface.encodeFunctionData("failWithData"),
            0
          )
      ).to.be.reverted;
    });

    it("Should handle executions with msg.value when account has insufficient balance", async function () {
      await expect(
        account
          .connect(owner)
          .execute(otherAccount.address, ethers.parseEther("1.0"), "0x", 0)
      ).to.be.reverted;
    });
  });

  describe("ERC1155 Receiver Edge Cases", function () {
    it("Should handle batch receive with empty arrays", async function () {
      await mockERC1155
        .connect(owner)
        .safeBatchTransferFrom(owner.address, accountAddress, [], [], "0x");
    });

    it("Should handle single receive with zero amount", async function () {
      await mockERC1155.mint(owner.address, 1n, 100n);
      await mockERC1155
        .connect(owner)
        .safeTransferFrom(owner.address, accountAddress, 1n, 0n, "0x");
    });
  });

  describe("Interface Support Edge Cases", function () {
    it("Should handle unknown interface queries", async function () {
      const UNKNOWN_INTERFACE_ID = "0x12345678";
      expect(await account.supportsInterface(UNKNOWN_INTERFACE_ID)).to.be.false;
    });
  });

  describe("Signature Validation Edge Cases", function () {
    it("Should handle malformed signatures", async function () {
      const message = "Hello World";
      const messageHash = ethers.hashMessage(message);
      const malformedSignature = "0x1234"; // Invalid signature length

      const result = await account.isValidSignature(
        messageHash,
        malformedSignature
      );
      expect(result).to.equal("0x00000000");
    });

    it("Should handle empty signatures", async function () {
      const message = "Hello World";
      const messageHash = ethers.hashMessage(message);

      const result = await account.isValidSignature(messageHash, "0x");
      expect(result).to.equal("0x00000000");
    });
  });

  describe("Additional Coverage Tests", function () {
    describe("isValidSigner", function () {
      it("Should validate signer directly", async function () {
        const result = await account.isValidSigner(owner.address, "0x");
        expect(result).to.equal("0x6faff5f1");
      });

      it("Should reject invalid signer", async function () {
        const result = await account.isValidSigner(otherAccount.address, "0x");
        expect(result).to.equal("0x00000000");
      });
    });

    describe("Complex Ownership Chain", function () {
      it("Should handle complex ownership chain with multiple levels and revert correctly", async function () {
        // Create a chain of TBA accounts owning NFTs
        const accounts = [];
        const nfts = [];

        // Create 6 NFTs and accounts (to test max depth)
        for (let i = 0; i < 6; i++) {
          const tokenId = BigInt(i + 2);
          await mockERC721.mint(owner.address, tokenId);
          nfts.push(tokenId);

          const salt = ethers.zeroPadValue(`0x${i + 1}`, 32);
          const tx = await registry.createAccount(
            await implementation.getAddress(),
            salt,
            chainId,
            await mockERC721.getAddress(),
            tokenId
          );
          const receipt = await tx.wait();
          const newAccountAddress = receipt.logs[0].args[0];
          accounts.push(
            await ethers.getContractAt("ERC6551Account", newAccountAddress)
          );
        }

        // Create ownership chain: each account owns the NFT of the next account
        for (let i = 0; i < accounts.length - 1; i++) {
          await mockERC721
            .connect(owner)
            [
              "safeTransferFrom(address,address,uint256)"
            ](owner.address, accounts[i].address, nfts[i + 1]);
        }

        // Try to create cycle by transferring an NFT to an account that would create a cycle
        await expect(
          mockERC721
            .connect(owner)
            [
              "safeTransferFrom(address,address,uint256)"
            ](owner.address, accounts[0].address, nfts[5])
        ).to.be.revertedWith("Ownership chain too deep");
      });

      it("Should handle broken ownership chain", async function () {
        // First create two accounts
        const tokenId2 = 2n;
        await mockERC721.mint(owner.address, tokenId2);

        const salt2 = ethers.zeroPadValue("0x02", 32);
        const tx2 = await registry.createAccount(
          await implementation.getAddress(),
          salt2,
          chainId,
          await mockERC721.getAddress(),
          tokenId2
        );
        const receipt2 = await tx2.wait();
        const account2Address = receipt2.logs[0].args[0];
        const account2 = await ethers.getContractAt(
          "ERC6551Account",
          account2Address
        );

        // Create a non-ERC6551 account to test the catch block
        const SimpleContract =
          await ethers.getContractFactory("SimpleContract");
        const simpleContract = await SimpleContract.deploy();
        await simpleContract.waitForDeployment();

        // Transfer NFT to simple contract to create "broken" chain
        await mockERC721
          .connect(owner)
          [
            "safeTransferFrom(address,address,uint256)"
          ](owner.address, await simpleContract.getAddress(), tokenId2);

        // This operation should work because the chain is broken
        await mockERC721
          .connect(owner)
          [
            "safeTransferFrom(address,address,uint256)"
          ](owner.address, account2Address, tokenId);
      });
    });

    describe("ERC1155 Batch Receiver Edge Cases", function () {
      it("Should handle empty arrays in batch receive", async function () {
        const batchResult = await account.onERC1155BatchReceived(
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          [],
          [],
          "0x"
        );
        expect(batchResult).to.equal("0xbc197c81");
      });
    });
  });

  describe("Complete Coverage Tests", function () {
    describe("Deep Ownership Chain Tests", function () {
      it("Should handle ownership chain with exactly 5 levels and check each level", async function () {
        // Create a chain of 5 accounts
        const accounts = [];
        const nfts = [];

        // Create 5 NFTs and accounts
        for (let i = 0; i < 5; i++) {
          const tokenId = BigInt(i + 2);
          await mockERC721.mint(owner.address, tokenId);
          nfts.push(tokenId);

          const salt = ethers.zeroPadValue(`0x${i + 1}`, 32);
          const tx = await registry.createAccount(
            await implementation.getAddress(),
            salt,
            chainId,
            await mockERC721.getAddress(),
            tokenId
          );
          const receipt = await tx.wait();
          const newAccountAddress = receipt.logs[0].args[0];
          accounts.push(
            await ethers.getContractAt("ERC6551Account", newAccountAddress)
          );

          // Create chain immediately for incremental testing
          if (i > 0) {
            await mockERC721
              .connect(owner)
              [
                "safeTransferFrom(address,address,uint256)"
              ](owner.address, accounts[i - 1].address, tokenId);
          }
        }

        // Try to transfer to the last account to test max depth
        await expect(
          mockERC721
            .connect(owner)
            [
              "safeTransferFrom(address,address,uint256)"
            ](owner.address, accounts[accounts.length - 1].address, nfts[0])
        ).to.be.revertedWith("Ownership chain too deep");
      });

      it("Should handle contract calls that revert with custom errors in ownership chain", async function () {
        // Deploy a contract that reverts with custom error
        const CustomRevertContract = await ethers.getContractFactory(
          "CustomRevertContract"
        );
        const customRevertContract = await CustomRevertContract.deploy();
        await customRevertContract.waitForDeployment();

        // Create initial token and account
        const tokenId2 = 2n;
        await mockERC721.mint(customRevertContract.getAddress(), tokenId2);

        const salt2 = ethers.zeroPadValue("0x02", 32);
        const tx2 = await registry.createAccount(
          await implementation.getAddress(),
          salt2,
          chainId,
          await mockERC721.getAddress(),
          tokenId2
        );
        const receipt2 = await tx2.wait();
        const account2Address = receipt2.logs[0].args[0];
        const account2 = await ethers.getContractAt(
          "ERC6551Account",
          account2Address
        );

        // This transfer should work because the chain check will fail gracefully
        await mockERC721
          .connect(owner)
          [
            "safeTransferFrom(address,address,uint256)"
          ](owner.address, account2Address, tokenId);
      });

      it("Should handle non-contract addresses in ownership chain", async function () {
        // Transfer NFT to EOA to test non-contract address case
        const tokenId2 = 2n;
        await mockERC721.mint(owner.address, tokenId2);

        const salt2 = ethers.zeroPadValue("0x02", 32);
        const tx2 = await registry.createAccount(
          await implementation.getAddress(),
          salt2,
          chainId,
          await mockERC721.getAddress(),
          tokenId2
        );
        const receipt2 = await tx2.wait();
        const account2Address = receipt2.logs[0].args[0];

        // Transfer to EOA first
        await mockERC721
          .connect(owner)
          [
            "safeTransferFrom(address,address,uint256)"
          ](owner.address, otherAccount.address, tokenId2);

        // This should work because otherAccount is EOA
        await mockERC721
          .connect(otherAccount)
          [
            "safeTransferFrom(address,address,uint256)"
          ](otherAccount.address, account2Address, tokenId2);
      });
    });

    describe("Edge Cases", function () {
      it("Should handle zero address in signature verification", async function () {
        // First, create an account with a token owned by zero address (if possible)
        const tokenId2 = 2n;
        await mockERC721.mint(ethers.ZeroAddress, tokenId2);

        const salt2 = ethers.zeroPadValue("0x02", 32);
        const tx2 = await registry.createAccount(
          await implementation.getAddress(),
          salt2,
          chainId,
          await mockERC721.getAddress(),
          tokenId2
        );
        const receipt2 = await tx2.wait();
        const account2Address = receipt2.logs[0].args[0];
        const account2 = await ethers.getContractAt(
          "ERC6551Account",
          account2Address
        );

        // Try to verify signature
        const message = "Hello";
        const messageHash = ethers.hashMessage(message);
        const result = await account2.isValidSignature(messageHash, "0x");
        expect(result).to.equal("0x00000000");
      });
    });
  });
});
