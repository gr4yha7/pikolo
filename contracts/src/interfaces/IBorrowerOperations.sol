// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IBorrowerOperations {
    function openTrove(
        uint256 _debtAmount,
        address _upperHint,
        address _lowerHint
    ) external payable;

    function addColl(address _upperHint, address _lowerHint) external payable;

    function repayMUSD(
        uint256 _amount,
        address _upperHint,
        address _lowerHint
    ) external;

    function closeTrove() external;
}

