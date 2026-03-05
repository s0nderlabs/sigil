// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/SigilDemo.sol";
import "./mocks/MockSigil.sol";

contract SigilDemoTest is Test {
    SigilDemo demo;
    MockSigil mockSigil;

    bytes32 policyId = keccak256("test-policy");
    address alice = address(0xA1);

    function setUp() public {
        mockSigil = new MockSigil();
        demo = new SigilDemo(address(mockSigil), policyId);
    }

    function test_constructor_setsSigil() public view {
        assertEq(demo.sigil(), address(mockSigil));
    }

    function test_constructor_setsPolicyId() public view {
        assertEq(demo.requiredPolicyId(), policyId);
    }

    function test_increment_success() public {
        mockSigil.setCompliance(alice, policyId, true);
        vm.prank(alice);
        demo.increment();
        assertEq(demo.getCount(alice), 1);
    }

    function test_increment_emitsEvent() public {
        mockSigil.setCompliance(alice, policyId, true);
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit SigilDemo.Incremented(alice, 1);
        demo.increment();
    }

    function test_increment_incrementsCounter() public {
        mockSigil.setCompliance(alice, policyId, true);
        vm.startPrank(alice);
        demo.increment();
        demo.increment();
        demo.increment();
        vm.stopPrank();
        assertEq(demo.getCount(alice), 3);
    }

    function test_increment_revert_notCompliant() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SigilDemo.NotCompliant.selector, alice, policyId));
        demo.increment();
    }

    function test_getCount_returnsZero() public view {
        assertEq(demo.getCount(alice), 0);
    }

    function test_getCount_afterMultiple() public {
        mockSigil.setCompliance(alice, policyId, true);
        vm.startPrank(alice);
        for (uint256 i = 0; i < 5; i++) {
            demo.increment();
        }
        vm.stopPrank();
        assertEq(demo.getCount(alice), 5);
    }

    function test_getRequiredPolicy() public view {
        assertEq(demo.getRequiredPolicy(), policyId);
    }
}
