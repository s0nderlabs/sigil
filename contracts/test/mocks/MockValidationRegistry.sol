// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract MockValidationRegistry {
    struct Call {
        bytes32 requestHash;
        uint8 response;
        string responseURI;
        bytes32 responseHash;
        string tag;
    }

    Call[] public calls;
    bool public shouldRevert;

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external {
        if (shouldRevert) revert("MockRevert");
        calls.push(Call(requestHash, response, responseURI, responseHash, tag));
    }

    function getCallCount() external view returns (uint256) {
        return calls.length;
    }

    function getCall(uint256 index) external view returns (Call memory) {
        return calls[index];
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }
}
