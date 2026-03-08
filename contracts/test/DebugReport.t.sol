// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

contract DebugReportTest is Test {
    function testDecodeSuccessfulReport() public pure {
        // E2E Rename Test - this WORKED
        bytes memory report = abi.encode(
            uint8(1),
            bytes32(0x1be492eb8a9aecd0dd65791ff461d38fd0214e7e1c1cb1c4a51c1c5d241a24b2),
            "E2E Rename Test",
            "Test policy for E2E rename verification",
            true
        );
        
        (
            uint8 reportType,
            bytes32 id,
            string memory name,
            string memory description,
            bool isPublic
        ) = abi.decode(report, (uint8, bytes32, string, string, bool));
        
        assertEq(reportType, 1);
        assertEq(name, "E2E Rename Test");
        console.log("SUCCESS: E2E Rename Test decoded OK");
    }
    
    function testDecodeDemoGateReport() public pure {
        // Demo Gate Test - this FAILED
        bytes memory report = abi.encode(
            uint8(1),
            bytes32(0xe9b720df36dd7e09f87580c2ef6323682765f1fb5e0122038f76306bcbb8f670),
            "Demo Gate Test",
            "A demo gating policy requiring agents to hold a minimum ETH balance and pass OFAC sanctions screening.",
            true
        );
        
        (
            uint8 reportType,
            bytes32 id,
            string memory name,
            string memory description,
            bool isPublic
        ) = abi.decode(report, (uint8, bytes32, string, string, bool));
        
        assertEq(reportType, 1);
        assertEq(name, "Demo Gate Test");
        console.log("SUCCESS: Demo Gate Test decoded OK");
    }

    function testDecodeFromViemEncoding() public {
        // This simulates what viem's encodeAbiParameters produces
        // Try to reproduce the exact bytes the CRE workflow would encode
        // and see if it decodes correctly in Solidity
        
        // First, let me encode using Solidity and check the hex
        bytes memory solidityEncoded = abi.encode(
            uint8(1),
            bytes32(0xe9b720df36dd7e09f87580c2ef6323682765f1fb5e0122038f76306bcbb8f670),
            "Demo Gate Test",
            "A demo gating policy requiring agents to hold a minimum ETH balance and pass OFAC sanctions screening.",
            true
        );
        
        console.log("Solidity encoded length:", solidityEncoded.length);
        console.logBytes(solidityEncoded);
    }
}
