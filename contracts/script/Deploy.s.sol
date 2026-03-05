// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/Sigil.sol";
import "../src/SigilDemo.sol";

contract Deploy is Script {
    function run() external {
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");
        address validationRegistry = vm.envAddress("VALIDATION_REGISTRY");
        bytes32 demoPolicyId = vm.envBytes32("DEMO_POLICY_ID");
        bytes32 salt = vm.envOr("DEPLOY_SALT", keccak256("sigil-v1"));

        vm.startBroadcast();

        Sigil sigil = new Sigil{salt: salt}(forwarder, validationRegistry);
        SigilDemo demo = new SigilDemo{salt: salt}(address(sigil), demoPolicyId);

        vm.stopBroadcast();

        console.log("Sigil:", address(sigil));
        console.log("SigilDemo:", address(demo));
    }
}
