// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/SigilDemo.sol";

contract DeployDemo is Script {
    function run() external {
        address sigilAddress = vm.envAddress("SIGIL_ADDRESS");
        bytes32 policyId = vm.envBytes32("POLICY_ID");

        vm.startBroadcast();

        SigilDemo demo = new SigilDemo(sigilAddress, policyId);

        vm.stopBroadcast();

        console.log("SigilDemo:", address(demo));
    }
}
