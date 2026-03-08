// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISigil {
    function isCompliant(address wallet, bytes32 policyId) external view returns (bool);
}

/// @title SigilDemo — Simple increment counter gated by Sigil compliance check
/// @notice Demonstrates the stamp system: increment() requires isCompliant()
contract SigilDemo {
    address public immutable sigil;
    address public owner;
    bytes32 public requiredPolicyId;
    mapping(address => uint256) public counter;

    event Incremented(address indexed user, uint256 newCount);
    event PolicyUpdated(bytes32 indexed oldPolicyId, bytes32 indexed newPolicyId);
    error NotCompliant(address user, bytes32 policyId);
    error OnlyOwner();

    constructor(address _sigil, bytes32 _requiredPolicyId) {
        sigil = _sigil;
        owner = msg.sender;
        requiredPolicyId = _requiredPolicyId;
    }

    function setRequiredPolicy(bytes32 _policyId) external {
        if (msg.sender != owner) revert OnlyOwner();
        bytes32 old = requiredPolicyId;
        requiredPolicyId = _policyId;
        emit PolicyUpdated(old, _policyId);
    }

    function increment() external {
        if (!ISigil(sigil).isCompliant(msg.sender, requiredPolicyId)) {
            revert NotCompliant(msg.sender, requiredPolicyId);
        }
        counter[msg.sender]++;
        emit Incremented(msg.sender, counter[msg.sender]);
    }

    function getCount(address user) external view returns (uint256) {
        return counter[user];
    }

    function getRequiredPolicy() external view returns (bytes32) {
        return requiredPolicyId;
    }
}
