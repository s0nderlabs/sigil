// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ReceiverTemplate} from "./ReceiverTemplate.sol";
import {IValidationRegistry} from "./interfaces/IValidationRegistry.sol";

/// @title Sigil — CRE-powered compliance middleware for ERC-8004 agents
/// @notice Receives assessment reports via CRE, writes stamps to 8004 Validation Registry
/// @dev Implements the Chainalysis Oracle pattern: isCompliant(address, policyId)
contract Sigil is ReceiverTemplate {
    // ── State ──────────────────────────────────────────────────────────

    IValidationRegistry public immutable validationRegistry;

    struct Policy {
        string name;
        string description;
        bool isPublic;
        bool isActive;
        address registeredBy;
    }

    struct ComplianceStatus {
        bool compliant;
        uint8 score;
        uint256 expiresAt;  // 0 = never expires
        uint256 lastUpdate;
    }

    mapping(bytes32 => Policy) public policies;
    bytes32[] public policyIds;
    mapping(address => mapping(bytes32 => ComplianceStatus)) internal complianceStatus;

    // ── Events ─────────────────────────────────────────────────────────

    event PolicyRegistered(bytes32 indexed policyId, string name, address registeredBy);
    event PolicyDeactivated(bytes32 indexed policyId);
    event ComplianceUpdated(address indexed wallet, bytes32 indexed policyId, bool compliant, uint8 score);
    event ReportProcessed(uint256 indexed agentId, bytes32 indexed requestHash, bytes32 indexed policyId);
    event ValidationRegistrySkipped(bytes32 indexed requestHash, string reason);

    // ── Errors ─────────────────────────────────────────────────────────

    error PolicyAlreadyExists(bytes32 policyId);
    error PolicyNotFound(bytes32 policyId);
    error PolicyInactive(bytes32 policyId);
    error InvalidScore(uint8 score);
    error InvalidReportType(uint8 reportType);
    error ZeroAddress();

    // ── Constructor ────────────────────────────────────────────────────

    constructor(
        address _forwarderAddress,
        address _validationRegistry,
        address _initialOwner
    ) ReceiverTemplate(_forwarderAddress, _initialOwner) {
        if (_validationRegistry == address(0)) revert ZeroAddress();
        validationRegistry = IValidationRegistry(_validationRegistry);
    }

    // ── CRE Report Processing ──────────────────────────────────────────

    /// @notice Dispatches CRE reports by type: 0 = assessment, 1 = policy registration
    function _processReport(bytes calldata report) internal override {
        uint8 reportType = abi.decode(report, (uint8));

        if (reportType == 0) {
            _processAssessment(report);
        } else if (reportType == 1) {
            _processPolicyRegistration(report);
        } else {
            revert InvalidReportType(reportType);
        }
    }

    /// @notice Decodes assessment report and updates compliance state + 8004 Validation Registry
    function _processAssessment(bytes calldata report) internal {
        (
            ,
            uint256 agentId,
            bytes32 requestHash,
            address wallet,
            bytes32 policyId,
            uint8 score,
            bool compliant,
            string memory responseURI,
            bytes32 responseHash,
            string memory tag
        ) = abi.decode(report, (uint8, uint256, bytes32, address, bytes32, uint8, bool, string, bytes32, string));

        if (score > 100) revert InvalidScore(score);

        Policy storage policy = policies[policyId];
        if (bytes(policy.name).length == 0) revert PolicyNotFound(policyId);
        if (!policy.isActive) revert PolicyInactive(policyId);

        complianceStatus[wallet][policyId] = ComplianceStatus({
            compliant: compliant,
            score: score,
            expiresAt: 0,
            lastUpdate: block.timestamp
        });

        try validationRegistry.validationResponse(requestHash, score, responseURI, responseHash, tag) {
            // Successfully wrote to Validation Registry
        } catch {
            emit ValidationRegistrySkipped(requestHash, "no prior validationRequest");
        }

        emit ComplianceUpdated(wallet, policyId, compliant, score);
        emit ReportProcessed(agentId, requestHash, policyId);
    }

    /// @notice Decodes policy registration report and registers a new policy
    function _processPolicyRegistration(bytes calldata report) internal {
        (
            ,
            bytes32 id,
            string memory name,
            string memory description,
            bool isPublic
        ) = abi.decode(report, (uint8, bytes32, string, string, bool));

        if (bytes(policies[id].name).length != 0) revert PolicyAlreadyExists(id);

        policies[id] = Policy({
            name: name,
            description: description,
            isPublic: isPublic,
            isActive: true,
            registeredBy: address(this)
        });
        policyIds.push(id);
        emit PolicyRegistered(id, name, address(this));
    }

    // ── Core Read ──────────────────────────────────────────────────────

    /// @notice Check if a wallet is compliant with a policy (Chainalysis Oracle pattern)
    /// @param wallet The wallet address to check
    /// @param policyId The policy to check against
    /// @return True if the wallet has a valid, non-expired compliant stamp
    function isCompliant(address wallet, bytes32 policyId) external view returns (bool) {
        ComplianceStatus storage status = complianceStatus[wallet][policyId];
        if (status.expiresAt != 0 && block.timestamp >= status.expiresAt) {
            return false;
        }
        return status.compliant;
    }

    // ── Policy Management ──────────────────────────────────────────────

    function registerPolicy(
        bytes32 id,
        string calldata name,
        string calldata description,
        bool isPublic
    ) external onlyOwner {
        if (bytes(policies[id].name).length != 0) revert PolicyAlreadyExists(id);
        policies[id] = Policy({
            name: name,
            description: description,
            isPublic: isPublic,
            isActive: true,
            registeredBy: msg.sender
        });
        policyIds.push(id);
        emit PolicyRegistered(id, name, msg.sender);
    }

    function deactivatePolicy(bytes32 policyId) external onlyOwner {
        if (bytes(policies[policyId].name).length == 0) revert PolicyNotFound(policyId);
        policies[policyId].isActive = false;
        emit PolicyDeactivated(policyId);
    }

    // ── View Functions ─────────────────────────────────────────────────

    function getPolicies() external view returns (bytes32[] memory) {
        return policyIds;
    }

    function getPolicy(bytes32 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    function getComplianceStatus(address wallet, bytes32 policyId) external view returns (ComplianceStatus memory) {
        return complianceStatus[wallet][policyId];
    }

    function computeRequestHash(uint256 agentId, bytes32 policyId) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(agentId, policyId));
    }
}
