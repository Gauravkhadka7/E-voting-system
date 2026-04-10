// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {

    // Admin address
    address public admin;

    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    struct Voter {
        bool registered;
        bool voted;
    }

    mapping(uint => Candidate) public candidates;
    mapping(address => Voter) public voters;

    uint public candidatesCount;

    // Events
    event CandidateAdded(uint indexed candidateId, string name);
    event VoterRegistered(address indexed voter);
    event Voted(address indexed voter, uint indexed candidateId);

    // Modifier to allow only admin
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    // Constructor
    constructor(string[] memory candidateNames) {

        admin = msg.sender;

        for (uint i = 0; i < candidateNames.length; i++) {

            candidatesCount++;

            candidates[candidatesCount] = Candidate(
                candidatesCount,
                candidateNames[i],
                0
            );

            emit CandidateAdded(candidatesCount, candidateNames[i]);
        }
    }

    // Admin can add new candidates
    function addCandidate(string memory name) public onlyAdmin {

        candidatesCount++;

        candidates[candidatesCount] = Candidate(
            candidatesCount,
            name,
            0
        );

        emit CandidateAdded(candidatesCount, name);
    }

    // User registration
    function register() public {

        require(!voters[msg.sender].registered, "Already registered");

        voters[msg.sender] = Voter(true, false);

        emit VoterRegistered(msg.sender);
    }

    // User vote
    function vote(uint _candidateId) public {

        require(voters[msg.sender].registered, "You must register first");
        require(!voters[msg.sender].voted, "Already voted");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate");

        voters[msg.sender].voted = true;

        candidates[_candidateId].voteCount++;

        emit Voted(msg.sender, _candidateId);
    }

    // Get candidate info
    function getCandidate(uint _candidateId)
        public
        view
        returns (uint id, string memory name, uint voteCount)
    {

        Candidate memory c = candidates[_candidateId];

        return (c.id, c.name, c.voteCount);
    }

    // Check if user is registered
    function isRegistered(address _user) public view returns (bool) {

        return voters[_user].registered;
    }

    // Check if user voted
    function hasVoted(address _user) public view returns (bool) {

        return voters[_user].voted;
    }
}