// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/Sigil.sol";
import "../src/ReceiverTemplate.sol";
import "./mocks/MockValidationRegistry.sol";
import "./harness/SigilHarness.sol";

contract SigilTest is Test {
    SigilHarness sigil;
    MockValidationRegistry registry;

    address forwarder = address(0xF0);
    address alice = address(0xA1);
    address bob = address(0xB0);

    bytes32 policyId = keccak256("basic-agent-trust");
    bytes32 policyId2 = keccak256("defi-ready");

    // Default report values
    uint256 constant AGENT_ID = 42;
    bytes32 constant REQUEST_HASH = keccak256("req-1");
    string constant RESPONSE_URI = "ipfs://QmTest";
    bytes32 constant RESPONSE_HASH = keccak256("evidence-hash");
    string constant TAG = "basic-agent-trust";

    function setUp() public {
        registry = new MockValidationRegistry();
        sigil = new SigilHarness(forwarder, address(registry), address(this));
        sigil.registerPolicy(policyId, "Basic Agent Trust", "Basic compliance check", true);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    function _buildReport(
        uint256 agentId,
        bytes32 requestHash,
        address wallet,
        bytes32 _policyId,
        uint8 score,
        bool compliant,
        string memory responseURI,
        bytes32 responseHash,
        string memory tag
    ) internal pure returns (bytes memory) {
        return abi.encode(agentId, requestHash, wallet, _policyId, score, compliant, responseURI, responseHash, tag);
    }

    function _defaultReport(address wallet, uint8 score, bool compliant) internal view returns (bytes memory) {
        return _buildReport(AGENT_ID, REQUEST_HASH, wallet, policyId, score, compliant, RESPONSE_URI, RESPONSE_HASH, TAG);
    }

    function _callOnReport(bytes memory report) internal {
        vm.prank(forwarder);
        sigil.onReport("", report);
    }

    // ── Constructor Tests ───────────────────────────────────────────────

    function test_constructor_setsOwner() public view {
        assertEq(sigil.owner(), address(this));
    }

    function test_constructor_setsForwarder() public view {
        assertEq(sigil.getForwarderAddress(), forwarder);
    }

    function test_constructor_setsValidationRegistry() public view {
        assertEq(address(sigil.validationRegistry()), address(registry));
    }

    function test_constructor_revert_zeroForwarder() public {
        vm.expectRevert(ReceiverTemplate.InvalidForwarderAddress.selector);
        new SigilHarness(address(0), address(registry), address(this));
    }

    function test_constructor_revert_zeroRegistry() public {
        vm.expectRevert(Sigil.ZeroAddress.selector);
        new SigilHarness(forwarder, address(0), address(this));
    }

    // ── Policy Management Tests ─────────────────────────────────────────

    function test_registerPolicy_success() public {
        sigil.registerPolicy(policyId2, "DeFi Ready", "DeFi compliance", false);
        Sigil.Policy memory p = sigil.getPolicy(policyId2);
        assertEq(p.name, "DeFi Ready");
        assertEq(p.description, "DeFi compliance");
        assertFalse(p.isPublic);
        assertTrue(p.isActive);
        assertEq(p.registeredBy, address(this));
    }

    function test_registerPolicy_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit Sigil.PolicyRegistered(policyId2, "DeFi Ready", address(this));
        sigil.registerPolicy(policyId2, "DeFi Ready", "DeFi compliance", false);
    }

    function test_registerPolicy_addsToPolicyIds() public {
        sigil.registerPolicy(policyId2, "DeFi Ready", "DeFi compliance", false);
        bytes32[] memory ids = sigil.getPolicies();
        assertEq(ids.length, 2);
        assertEq(ids[0], policyId);
        assertEq(ids[1], policyId2);
    }

    function test_registerPolicy_revert_notOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        sigil.registerPolicy(policyId2, "DeFi Ready", "DeFi compliance", false);
    }

    function test_registerPolicy_revert_alreadyExists() public {
        vm.expectRevert(abi.encodeWithSelector(Sigil.PolicyAlreadyExists.selector, policyId));
        sigil.registerPolicy(policyId, "Duplicate", "Dup", true);
    }

    function test_deactivatePolicy_success() public {
        sigil.deactivatePolicy(policyId);
        Sigil.Policy memory p = sigil.getPolicy(policyId);
        assertFalse(p.isActive);
    }

    function test_deactivatePolicy_emitsEvent() public {
        vm.expectEmit(true, false, false, false);
        emit Sigil.PolicyDeactivated(policyId);
        sigil.deactivatePolicy(policyId);
    }

    function test_deactivatePolicy_revert_notOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        sigil.deactivatePolicy(policyId);
    }

    function test_deactivatePolicy_revert_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(Sigil.PolicyNotFound.selector, policyId2));
        sigil.deactivatePolicy(policyId2);
    }

    function test_getPolicy_returnsCorrectStruct() public view {
        Sigil.Policy memory p = sigil.getPolicy(policyId);
        assertEq(p.name, "Basic Agent Trust");
        assertEq(p.description, "Basic compliance check");
        assertTrue(p.isPublic);
        assertTrue(p.isActive);
        assertEq(p.registeredBy, address(this));
    }

    // ── Report Processing Tests ─────────────────────────────────────────

    function test_processReport_updatesComplianceStatus() public {
        _callOnReport(_defaultReport(alice, 85, true));
        Sigil.ComplianceStatus memory s = sigil.getComplianceStatus(alice, policyId);
        assertTrue(s.compliant);
        assertEq(s.score, 85);
        assertEq(s.expiresAt, 0);
        assertEq(s.lastUpdate, block.timestamp);
    }

    function test_processReport_callsValidationRegistry() public {
        _callOnReport(_defaultReport(alice, 85, true));
        assertEq(registry.getCallCount(), 1);
        MockValidationRegistry.Call memory c = registry.getCall(0);
        assertEq(c.requestHash, REQUEST_HASH);
        assertEq(c.response, 85);
        assertEq(c.responseURI, RESPONSE_URI);
        assertEq(c.responseHash, RESPONSE_HASH);
        assertEq(c.tag, TAG);
    }

    function test_processReport_emitsComplianceUpdated() public {
        vm.expectEmit(true, true, false, true);
        emit Sigil.ComplianceUpdated(alice, policyId, true, 85);
        _callOnReport(_defaultReport(alice, 85, true));
    }

    function test_processReport_emitsReportProcessed() public {
        vm.expectEmit(true, true, true, false);
        emit Sigil.ReportProcessed(AGENT_ID, REQUEST_HASH, policyId);
        _callOnReport(_defaultReport(alice, 85, true));
    }

    function test_processReport_compliantTrue() public {
        _callOnReport(_defaultReport(alice, 90, true));
        assertTrue(sigil.isCompliant(alice, policyId));
    }

    function test_processReport_compliantFalse() public {
        _callOnReport(_defaultReport(alice, 30, false));
        assertFalse(sigil.isCompliant(alice, policyId));
    }

    function test_processReport_updatesExistingStatus() public {
        _callOnReport(_defaultReport(alice, 90, true));
        assertTrue(sigil.isCompliant(alice, policyId));

        bytes memory report2 = _buildReport(AGENT_ID, keccak256("req-2"), alice, policyId, 20, false, RESPONSE_URI, RESPONSE_HASH, TAG);
        _callOnReport(report2);
        assertFalse(sigil.isCompliant(alice, policyId));
    }

    function test_processReport_multipleWalletsSamePolicy() public {
        _callOnReport(_defaultReport(alice, 90, true));
        bytes memory bobReport = _buildReport(AGENT_ID, keccak256("req-bob"), bob, policyId, 30, false, RESPONSE_URI, RESPONSE_HASH, TAG);
        _callOnReport(bobReport);

        assertTrue(sigil.isCompliant(alice, policyId));
        assertFalse(sigil.isCompliant(bob, policyId));
    }

    function test_processReport_sameWalletMultiplePolicies() public {
        sigil.registerPolicy(policyId2, "DeFi Ready", "DeFi compliance", false);

        _callOnReport(_defaultReport(alice, 90, true));
        bytes memory report2 = _buildReport(AGENT_ID, keccak256("req-p2"), alice, policyId2, 20, false, RESPONSE_URI, RESPONSE_HASH, "defi-ready");
        _callOnReport(report2);

        assertTrue(sigil.isCompliant(alice, policyId));
        assertFalse(sigil.isCompliant(alice, policyId2));
    }

    function test_processReport_revert_policyNotFound() public {
        bytes memory report = _buildReport(AGENT_ID, REQUEST_HASH, alice, policyId2, 85, true, RESPONSE_URI, RESPONSE_HASH, TAG);
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(Sigil.PolicyNotFound.selector, policyId2));
        sigil.onReport("", report);
    }

    function test_processReport_revert_policyInactive() public {
        sigil.deactivatePolicy(policyId);
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(Sigil.PolicyInactive.selector, policyId));
        sigil.onReport("", _defaultReport(alice, 85, true));
    }

    function test_processReport_revert_notForwarder() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ReceiverTemplate.InvalidSender.selector, alice, forwarder));
        sigil.onReport("", _defaultReport(alice, 85, true));
    }

    function test_processReport_revert_invalidScore() public {
        bytes memory report = _buildReport(AGENT_ID, REQUEST_HASH, alice, policyId, 101, true, RESPONSE_URI, RESPONSE_HASH, TAG);
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(Sigil.InvalidScore.selector, uint8(101)));
        sigil.onReport("", report);
    }

    // ── isCompliant Tests ───────────────────────────────────────────────

    function test_isCompliant_returnsTrue() public {
        _callOnReport(_defaultReport(alice, 90, true));
        assertTrue(sigil.isCompliant(alice, policyId));
    }

    function test_isCompliant_returnsFalse() public {
        _callOnReport(_defaultReport(alice, 30, false));
        assertFalse(sigil.isCompliant(alice, policyId));
    }

    function test_isCompliant_defaultFalse() public view {
        assertFalse(sigil.isCompliant(alice, policyId));
    }

    function test_isCompliant_afterPolicyDeactivated() public {
        _callOnReport(_defaultReport(alice, 90, true));
        sigil.deactivatePolicy(policyId);
        // Status persists even after policy deactivation
        assertTrue(sigil.isCompliant(alice, policyId));
    }

    function test_isCompliant_expiresAt_zero_neverExpires() public {
        sigil.setComplianceStatusDirect(alice, policyId, true, 90, 0, block.timestamp);
        vm.warp(block.timestamp + 365 days);
        assertTrue(sigil.isCompliant(alice, policyId));
    }

    function test_isCompliant_expiresAt_expired() public {
        uint256 expiry = block.timestamp + 1 hours;
        sigil.setComplianceStatusDirect(alice, policyId, true, 90, expiry, block.timestamp);
        vm.warp(expiry);
        assertFalse(sigil.isCompliant(alice, policyId));
    }

    function test_isCompliant_expiresAt_notExpired() public {
        uint256 expiry = block.timestamp + 1 hours;
        sigil.setComplianceStatusDirect(alice, policyId, true, 90, expiry, block.timestamp);
        vm.warp(expiry - 1);
        assertTrue(sigil.isCompliant(alice, policyId));
    }

    // ── View Function Tests ─────────────────────────────────────────────

    function test_getComplianceStatus_returnsStruct() public {
        _callOnReport(_defaultReport(alice, 85, true));
        Sigil.ComplianceStatus memory s = sigil.getComplianceStatus(alice, policyId);
        assertTrue(s.compliant);
        assertEq(s.score, 85);
        assertEq(s.expiresAt, 0);
        assertGt(s.lastUpdate, 0);
    }

    function test_computeRequestHash_deterministic() public view {
        bytes32 hash1 = sigil.computeRequestHash(42, policyId);
        bytes32 hash2 = sigil.computeRequestHash(42, policyId);
        assertEq(hash1, hash2);
    }

    function test_computeRequestHash_differentInputs() public view {
        bytes32 hash1 = sigil.computeRequestHash(42, policyId);
        bytes32 hash2 = sigil.computeRequestHash(43, policyId);
        assertTrue(hash1 != hash2);
    }

    // ── Registry Failure Test ───────────────────────────────────────────

    function test_processReport_revert_registryCallFails() public {
        registry.setShouldRevert(true);
        vm.prank(forwarder);
        vm.expectRevert("MockRevert");
        sigil.onReport("", _defaultReport(alice, 85, true));
    }

    // ── Fuzz Tests ──────────────────────────────────────────────────────

    function test_fuzz_processReport_validScore(uint8 score) public {
        vm.assume(score <= 100);
        bytes memory report = _buildReport(AGENT_ID, keccak256(abi.encodePacked("fuzz-", score)), alice, policyId, score, score >= 50, RESPONSE_URI, RESPONSE_HASH, TAG);
        _callOnReport(report);
        Sigil.ComplianceStatus memory s = sigil.getComplianceStatus(alice, policyId);
        assertEq(s.score, score);
    }

    function test_fuzz_processReport_invalidScore(uint8 score) public {
        vm.assume(score > 100);
        bytes memory report = _buildReport(AGENT_ID, REQUEST_HASH, alice, policyId, score, true, RESPONSE_URI, RESPONSE_HASH, TAG);
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(Sigil.InvalidScore.selector, score));
        sigil.onReport("", report);
    }

    function test_fuzz_computeRequestHash(uint256 agentId, bytes32 _policyId) public view {
        bytes32 hash1 = sigil.computeRequestHash(agentId, _policyId);
        bytes32 hash2 = sigil.computeRequestHash(agentId, _policyId);
        assertEq(hash1, hash2);
    }
}
