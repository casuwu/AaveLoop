// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import { MockERC20 } from "solmate/test/utils/mocks/MockERC20.sol";
import { MockERC721 } from "solmate/test/utils/mocks/MockERC721.sol";
import "./interfaces/IERC20.sol";
import {AaveLoop} from "../contracts/AaveLoop.sol";
import {ILendingPool} from "../contracts/IAaveInterfaces.sol";

import "forge-std/Test.sol";

contract Loop is Test {

    // @notice          erc20 is an ERC20
    MockERC20 erc20;
    MockERC20 erc20two;
    // @notice          erc721 is an ERC721

    IERC20 IAAVE;
    ILendingPool LendingPool;
    uint256 totalCollateralETH;
    uint256 totalDebtETH;
    uint256 availableBorrowsETH;
    uint256 currentLiquidationThreshold;
    uint256 ltv;
    uint256 healthFactor;
    
    AaveLoop looper;
    uint256 ALICE_PK = 0xCAFE;
    address ALICE = vm.addr(ALICE_PK);
    uint256 BOB_PK = 0xBEEF;
    address BOB = vm.addr(BOB_PK);
    uint256 EVE_PK = 0xADAD;
    address EVE = vm.addr(EVE_PK);

    function setUp() public {
        // address owner,
        // address asset,
        // address lendingPool,
        // address incentives
        // Deploy contracts
        // erc20 = new MockERC20("DAI", "DAI", 18);
        // erc20two = new MockERC20("CNV", "CNV", 18);
        IAAVE = IERC20(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9);
        LendingPool = ILendingPool(address(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9));
        looper = new AaveLoop(address(this), address(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9), address(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9), address(0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5));
        vm.label(address(erc20), " ERC20 ");
        vm.label(ALICE, " ALICE ");
        vm.label(BOB, " BOB ");
        vm.deal(BOB, 10_000 ether);
    }

    function testGetAssetPrice() public {
        // uint256 assetPrice = looper.getAssetPrice();
        // uint256 totalAaveSupply = IAAVE.totalSupply();
        // emit log_string("Aave total supply");
        // emit log_uint(totalAaveSupply);
        // vm.prank(address(0x29560C3bB28fBD4e460dDD69C0fC301ffd62B72D));
        // IAAVE.approve(BOB, 100 ether);
        // vm.prank(BOB);
        // IAAVE.transferFrom(address(0x29560C3bB28fBD4e460dDD69C0fC301ffd62B72D), BOB, 100 ether);
        // uint256 BobsBalance = IAAVE.balanceOf(BOB);
        // emit log_string("Bobs balance");
        // emit log_uint(BobsBalance / 1e18);
        // emit log_string("AAVE asset price in eth");
        // emit log_uint(assetPrice);
        // assertEq(true, true);
    }

    function testGetSupplyAndBorrowAssets() public {
        address[] memory assetPrice = looper.getSupplyAndBorrowAssets();
        emit log_string("aTokenAddress = supply asset | variableDebtTokenAddress = borrow asset");
        emit log_address(assetPrice[0]);
        emit log_address(assetPrice[1]);
        assertEq(true, true);
    }

    function testGetPositionData() public {
        address RichDudeAddy = address(0xddfAbCdc4D8FfC6d5beaf154f18B778f892A0740);
        uint256 RichBalance = IAAVE.balanceOf(RichDudeAddy);
        vm.startPrank(RichDudeAddy);
        
        // IAAVE.approve(BOB, 100 ether);
        // vm.startPrank(BOB);
        // IAAVE.transfer(address(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9), 1 ether);
        // // Move AAVE into BOBs wallet, 
        // // BOB enters aave position with 100 eth worth of AAVE
        // emit log_string("Liquidity");
        // // emit log_uint(liquidity);
        // // // Position should update;
        // IAAVE.approve(address(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9), 10 ether);
        IAAVE.approve(address(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9), 100 ether);
        // looper._supply(1 ether, RichDudeAddy);
        LendingPool.deposit(address(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9), 1e18, RichDudeAddy, 0);
        (totalCollateralETH,totalDebtETH,availableBorrowsETH,currentLiquidationThreshold,ltv,healthFactor) = looper.getPositionData(RichDudeAddy); 
        emit log_string("Get Position Data for User");
        emit log_uint(totalCollateralETH);
        emit log_uint(totalDebtETH);
        emit log_uint(availableBorrowsETH);
        emit log_uint(currentLiquidationThreshold);
        emit log_uint(ltv);
        emit log_uint(healthFactor);

        assertEq(true,true);
    }

    // function testGetPendingRewards() public {
    //     uint256 positionData = looper.getPendingRewards(BOB); 
    //     emit log_string("Pending Rewards");
    //     emit log_uint(positionData);
    // }
}
