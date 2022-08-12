// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import { MockERC20 } from "solmate/test/utils/mocks/MockERC20.sol";
import { MockERC721 } from "solmate/test/utils/mocks/MockERC721.sol";
import "../contracts/AaveLoop.sol";

import "forge-std/Test.sol";

contract Loop is Test {

    // @notice          erc20 is an ERC20
    MockERC20 erc20;
    MockERC20 erc20two;
    // @notice          erc721 is an ERC721
    MockERC721 erc721;
    
    // @notice          cavemart is a Fixed Order Market that 
    //                  allows users to trade ERC20<->ERC721 
    //                  with minimal calls.
    AaveLoop looper;

    // USER ALICE:
    // @notice          Alice is a huge fan of erc721s and 
    //                  buys them all the time using erc20s.
    uint256 ALICE_PK = 0xCAFE;
    address ALICE = vm.addr(ALICE_PK);

    // USER BOB:
    // @notice          Bob is an artist, and sells his art 
    //                  in the form of erc721s.
    uint256 BOB_PK = 0xBEEF;
    address BOB = vm.addr(BOB_PK);

    // USER EVE:
    // @notice          Eve owns the most valuable erc721, tokenId #420 
    //                  
    uint256 EVE_PK = 0xADAD;
    address EVE = vm.addr(EVE_PK);

    // PRE-TEST SETUP

   
    function setUp() public {
        // address owner,
        // address asset,
        // address lendingPool,
        // address incentives
        // Deploy contracts
        erc20 = new MockERC20("DAI", "DAI", 18);
        erc20two = new MockERC20("CNV", "CNV", 18);
        looper = new AaveLoop(address(this), address(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9), address(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9), address(0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5));
        vm.label(address(erc20), " ERC20 ");
        vm.label(address(erc721), " erc721 ");
        vm.label(ALICE, " ALICE ");
        vm.label(BOB, " BOB ");
    }

    function testAAVEGetAssetPrice() public {
        emit log_string("Why");
        uint256 assetPrice = looper.getAssetPrice();
        emit log_string("AAVE asset price");
        emit log_uint(assetPrice);
        assertEq(true, true);
    }
}
