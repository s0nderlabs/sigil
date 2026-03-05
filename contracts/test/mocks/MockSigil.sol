// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract MockSigil {
    mapping(address => mapping(bytes32 => bool)) public compliance;

    function setCompliance(address wallet, bytes32 policyId, bool _compliant) external {
        compliance[wallet][policyId] = _compliant;
    }

    function isCompliant(address wallet, bytes32 policyId) external view returns (bool) {
        return compliance[wallet][policyId];
    }
}
