// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockMUSD
 * @notice Mock MUSD token for testing
 */
contract MockMUSD is ERC20 {
    mapping(address => bool) public mintList;
    mapping(address => bool) public burnList;

    constructor() ERC20("Mock MUSD", "MUSD") {
        _mint(msg.sender, 1000000 * 10**18); // Mint 1M tokens to deployer
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external {
        _burn(_from, _amount);
    }

    function addToMintList(address _address) external {
        mintList[_address] = true;
    }

    function addToBurnList(address _address) external {
        burnList[_address] = true;
    }
}

