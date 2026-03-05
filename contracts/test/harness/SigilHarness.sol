// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Sigil} from "../../src/Sigil.sol";

/// @notice Test harness to access internal state for branch coverage of expiresAt logic
contract SigilHarness is Sigil {
    constructor(
        address _forwarder,
        address _registry,
        address _owner
    ) Sigil(_forwarder, _registry, _owner) {}

    function setComplianceStatusDirect(
        address wallet,
        bytes32 policyId,
        bool compliant,
        uint8 score,
        uint256 expiresAt,
        uint256 lastUpdate
    ) external {
        complianceStatus[wallet][policyId] = ComplianceStatus({
            compliant: compliant,
            score: score,
            expiresAt: expiresAt,
            lastUpdate: lastUpdate
        });
    }
}
