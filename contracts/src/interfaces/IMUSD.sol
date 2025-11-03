// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

interface IMUSD is IERC20Metadata, IERC20Permit {
    function burn(address _account, uint256 _amount) external;
    function mint(address _account, uint256 _amount) external;
    function burnList(address contractAddress) external view returns (bool);
    function mintList(address contractAddress) external view returns (bool);
}

