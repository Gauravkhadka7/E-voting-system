const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Voting Contract", function () {
  let voting;
  let admin, voter1, voter2, voter3, nonVoter;

  // Helper: create a future election
  async function createElection(name = "Test Election", offsetStart = 60, duration = 3600) {
    const now = await time.latest();
    const startTime = now + offsetStart;
    const endTime = startTime + duration;
    const tx = await voting.createElection(name, "Test description", startTime, endTime);
    const receipt = await tx.wait();
    const event = receipt.events.find((e) => e.event === "ElectionCreated");
    return event.args.electionId.toNumber();
  }

  before(async function () {
    [admin, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();
  });

  beforeEach(async function () {
    const VotingFactory = await ethers.getContractFactory("Voting");
    voting = await VotingFactory.deploy();
    await voting.deployed();
  });

  // ─── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("Should set the deployer as admin", async function () {
      expect(await voting.admin()).to.equal(admin.address);
    });

    it("Should start with 0 elections", async function () {
      expect(await voting.electionCount()).to.equal(0);
    });
  });

  // ─── Admin Functions ─────────────────────────────────────────────────────────
  describe("Admin Functions", function () {
    it("Should allow admin to transfer admin role", async function () {
      await voting.transferAdmin(voter1.address);
      expect(await voting.admin()).to.equal(voter1.address);
    });

    it("Should reject non-admin from creating an election", async function () {
      const now = await time.latest();
      await expect(
        voting.connect(voter1).createElection("Bad", "desc", now + 60, now + 3660)
      ).to.be.revertedWith("Voting: caller is not the admin");
    });
  });

  // ─── Election Creation ───────────────────────────────────────────────────────
  describe("Election Creation", function () {
    it("Should create an election with correct parameters", async function () {
      const electionId = await createElection("Presidential Election");
      const election = await voting.getElection(electionId);

      expect(election.name).to.equal("Presidential Election");
      expect(election.isActive).to.be.true;
      expect(election.creator).to.equal(admin.address);
      expect(election.totalVotes).to.equal(0);
    });

    it("Should emit ElectionCreated event", async function () {
      const now = await time.latest();
      await expect(
        voting.createElection("Test", "desc", now + 60, now + 3660)
      ).to.emit(voting, "ElectionCreated");
    });

    it("Should reject elections with start in the past", async function () {
      const now = await time.latest();
      await expect(
        voting.createElection("Bad", "desc", now - 100, now + 3600)
      ).to.be.revertedWith("Voting: start time is in the past");
    });

    it("Should reject elections where endTime <= startTime", async function () {
      const now = await time.latest();
      await expect(
        voting.createElection("Bad", "desc", now + 3600, now + 60)
      ).to.be.revertedWith("Voting: invalid time range");
    });
  });

  // ─── Candidate Management ────────────────────────────────────────────────────
  describe("Candidate Management", function () {
    let electionId;

    beforeEach(async function () {
      electionId = await createElection();
    });

    it("Should add a candidate successfully", async function () {
      await voting.addCandidate(electionId, "Alice", "Party A", "QmHash1");
      const candidates = await voting.getCandidates(electionId);
      expect(candidates.length).to.equal(1);
      expect(candidates[0].name).to.equal("Alice");
    });

    it("Should emit CandidateAdded event", async function () {
      await expect(
        voting.addCandidate(electionId, "Alice", "Party A", "QmHash1")
      ).to.emit(voting, "CandidateAdded");
    });

    it("Should reject adding a candidate to non-existent election", async function () {
      await expect(
        voting.addCandidate(999, "Alice", "Party A", "QmHash1")
      ).to.be.revertedWith("Voting: election does not exist");
    });
  });

  // ─── Voter Registration ──────────────────────────────────────────────────────
  describe("Voter Registration", function () {
    let electionId;

    beforeEach(async function () {
      electionId = await createElection();
    });

    it("Should register a voter", async function () {
      await voting.registerVoters(electionId, [voter1.address]);
      expect(await voting.isVoterRegistered(electionId, voter1.address)).to.be.true;
    });

    it("Should emit VoterRegistered event", async function () {
      await expect(
        voting.registerVoters(electionId, [voter1.address])
      ).to.emit(voting, "VoterRegistered").withArgs(electionId, voter1.address);
    });

    it("Should allow self-registration before election starts", async function () {
      await voting.connect(voter2).selfRegister(electionId);
      expect(await voting.isVoterRegistered(electionId, voter2.address)).to.be.true;
    });
  });

  // ─── Voting ──────────────────────────────────────────────────────────────────
  describe("Voting", function () {
    let electionId;

    beforeEach(async function () {
      electionId = await createElection("Vote Test", 5, 3600);
      await voting.addCandidate(electionId, "Alice", "Party A", "QmHash1");
      await voting.addCandidate(electionId, "Bob", "Party B", "QmHash2");
      await voting.registerVoters(electionId, [voter1.address, voter2.address]);
      // Fast forward past election start
      await time.increase(10);
    });

    it("Should allow a registered voter to cast a vote", async function () {
      const salt = ethers.utils.randomBytes(32);
      const commitment = ethers.utils.keccak256(
        ethers.utils.solidityPack(["uint256", "bytes32"], [1, salt])
      );
      const nullifier = ethers.utils.keccak256(
        ethers.utils.solidityPack(["address", "bytes32"], [voter1.address, salt])
      );

      await voting.connect(voter1).castVote(electionId, 1, commitment, nullifier);
      expect(await voting.hasVoted(electionId, voter1.address)).to.be.true;
    });

    it("Should prevent double voting", async function () {
      const salt = ethers.utils.randomBytes(32);
      const commitment = ethers.utils.keccak256(
        ethers.utils.solidityPack(["uint256", "bytes32"], [1, salt])
      );
      const nullifier = ethers.utils.keccak256(
        ethers.utils.solidityPack(["address", "bytes32"], [voter1.address, salt])
      );

      await voting.connect(voter1).castVote(electionId, 1, commitment, nullifier);
      await expect(
        voting.connect(voter1).castVote(electionId, 1, commitment, nullifier)
      ).to.be.revertedWith("Voting: voter has already voted");
    });

    it("Should prevent unregistered voters from voting", async function () {
      const salt = ethers.utils.randomBytes(32);
      const commitment = ethers.utils.keccak256(
        ethers.utils.solidityPack(["uint256", "bytes32"], [1, salt])
      );
      const nullifier = ethers.utils.keccak256(
        ethers.utils.solidityPack(["address", "bytes32"], [nonVoter.address, salt])
      );

      await expect(
        voting.connect(nonVoter).castVote(electionId, 1, commitment, nullifier)
      ).to.be.revertedWith("Voting: voter is not registered for this election");
    });

    it("Should tally votes correctly", async function () {
      const castVoteFor = async (voter, candidateId) => {
        const salt = ethers.utils.randomBytes(32);
        const commitment = ethers.utils.keccak256(
          ethers.utils.solidityPack(["uint256", "bytes32"], [candidateId, salt])
        );
        const nullifier = ethers.utils.keccak256(
          ethers.utils.solidityPack(["address", "bytes32"], [voter.address, salt])
        );
        await voting.connect(voter).castVote(electionId, candidateId, commitment, nullifier);
      };

      await castVoteFor(voter1, 1);
      await castVoteFor(voter2, 1);

      const candidates = await voting.getCandidates(electionId);
      expect(candidates[0].voteCount).to.equal(2);
      expect(candidates[1].voteCount).to.equal(0);
    });

    it("Should emit VoteCast event on successful vote", async function () {
      const salt = ethers.utils.randomBytes(32);
      const commitment = ethers.utils.keccak256(
        ethers.utils.solidityPack(["uint256", "bytes32"], [1, salt])
      );
      const nullifier = ethers.utils.keccak256(
        ethers.utils.solidityPack(["address", "bytes32"], [voter1.address, salt])
      );

      await expect(
        voting.connect(voter1).castVote(electionId, 1, commitment, nullifier)
      ).to.emit(voting, "VoteCast");
    });
  });

  // ─── Results ─────────────────────────────────────────────────────────────────
  describe("Results", function () {
    let electionId;

    beforeEach(async function () {
      electionId = await createElection("Results Test", 5, 60); // short 60s election
      await voting.addCandidate(electionId, "Alice", "Party A", "QmHash1");
      await voting.addCandidate(electionId, "Bob", "Party B", "QmHash2");
      await voting.registerVoters(electionId, [voter1.address, voter2.address, voter3.address]);
      await time.increase(10);

      // Cast votes
      for (const [voter, cid] of [[voter1, 1], [voter2, 1], [voter3, 2]]) {
        const salt = ethers.utils.randomBytes(32);
        const commitment = ethers.utils.keccak256(
          ethers.utils.solidityPack(["uint256", "bytes32"], [cid, salt])
        );
        const nullifier = ethers.utils.keccak256(
          ethers.utils.solidityPack(["address", "bytes32"], [voter.address, salt])
        );
        await voting.connect(voter).castVote(electionId, cid, commitment, nullifier);
      }

      // Fast forward past election end
      await time.increase(3600);
    });

    it("Should return results after election ends", async function () {
      const results = await voting.getResults(electionId);
      expect(results[0].voteCount).to.equal(2); // Alice
      expect(results[1].voteCount).to.equal(1); // Bob
    });

    it("Should return the correct winner", async function () {
      const winner = await voting.getWinner(electionId);
      expect(winner.name).to.equal("Alice");
      expect(winner.voteCount).to.equal(2);
    });

    it("Should reject results request during active election", async function () {
      const activeId = await createElection("Active", 5, 3600);
      await expect(voting.getResults(activeId)).to.be.revertedWith(
        "Voting: election is still ongoing"
      );
    });
  });
});