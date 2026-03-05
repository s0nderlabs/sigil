// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISigil {
    function isCompliant(address wallet, bytes32 policyId) external view returns (bool);
}

/// @title SigilDemo — Simple increment counter gated by Sigil compliance check
/// @notice Demonstrates the stamp system: increment() requires isCompliant()
contract SigilDemo {
    address public immutable sigil;
    bytes32 public immutable requiredPolicyId;
    mapping(address => uint256) public counter;

    event Incremented(address indexed user, uint256 newCount);
    error NotCompliant(address user, bytes32 policyId);

    constructor(address _sigil, bytes32 _requiredPolicyId) {
        sigil = _sigil;
        requiredPolicyId = _requiredPolicyId;
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
