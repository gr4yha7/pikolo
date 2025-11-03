// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PredictionMarketFactory} from "../src/PredictionMarketFactory.sol";
import {MezoIntegration} from "../src/MezoIntegration.sol";
import {IMUSD} from "../src/interfaces/IMUSD.sol";
import {IBorrowerOperations} from "../src/interfaces/IBorrowerOperations.sol";

/**
 * @title DeployScript
 * @notice Deployment script for Pikolo prediction market contracts
 */
contract DeployScript is Script {
    // Mezo Testnet (Matsnet) addresses
    address constant MUSD_ADDRESS = 0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503;
    address constant BORROWER_OPERATIONS = 0xCdF7028ceAB81fA0C6971208e83fa7872994beE5;

    function run() external {
        // Read private key - can be hex (with or without 0x) or decimal
        string memory privateKeyStr = vm.envString("MATSNET_PRIVATE_KEY");
        uint256 deployerPrivateKey;
        
        // Check if it starts with 0x
        bytes memory pkBytes = bytes(privateKeyStr);
        if (pkBytes.length > 2 && pkBytes[0] == '0' && pkBytes[1] == 'x') {
            // Already has 0x prefix, use as hex
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            // Try parsing as hex first (without 0x)
            string memory hexStr = string(abi.encodePacked("0x", privateKeyStr));
            deployerPrivateKey = vm.parseUint(hexStr);
        }
        
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying PredictionMarketFactory...");
        PredictionMarketFactory factory = new PredictionMarketFactory(MUSD_ADDRESS);
        console.log("Factory deployed at:", address(factory));

        // Deploy MezoIntegration (used for auto-repay functionality in redeem.tsx)
        console.log("Deploying MezoIntegration...");
        MezoIntegration integration = new MezoIntegration(
            MUSD_ADDRESS,
            BORROWER_OPERATIONS,
            address(factory)
        );
        console.log("MezoIntegration deployed at:", address(integration));

        vm.stopBroadcast();
    }
}

