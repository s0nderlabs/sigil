// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title IValidationRegistry — minimal interface for 8004 Validation Registry
/// @notice Only the functions Sigil needs to call
interface IValidationRegistry {
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;
}
