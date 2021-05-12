import BN from "bn.js";
import { expect } from "chai";
import {
  aaveloop,
  deployer,
  ensureBalanceUSDC,
  expectOutOfPosition,
  expectRevert,
  initOwnerAndUSDC,
  owner,
  POSITION
} from "./test-base";
import { bn, bn18, bn6, ether, fmt18, fmt6, zero } from "../src/utils";
import { advanceTime, jumpTime, web3 } from "../src/network";
import { stkAAVE, USDC } from "../src/token";
import { string } from "hardhat/internal/core/params/argumentTypes";
import { extendConfig } from "hardhat/config";

describe("AaveLoop E2E Tests", () => {
  beforeEach(async () => {
    await initOwnerAndUSDC();
  });

  // it("Enter & exit", async () => {
  //   await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
  //
  //   await aaveloop.methods.enterPosition(14).send({ from: owner });
  //   expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   await aaveloop.methods.exitPosition(14).send({ from: owner });
  //   expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.greaterThan(POSITION);
  //
  //   await expectOutOfPosition();
  // });
  //
  // it("Show me the money", async () => {
  //   await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
  //
  //   console.log("entering with 14 loops", fmt6(POSITION));
  //   await aaveloop.methods.enterPosition(14).send({ from: owner });
  //   expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.zero;
  //
  //   const day = 60 * 60 * 24;
  //   await advanceTime(day);
  //
  //   const rewardBalance = await aaveloop.methods.getBalanceReward().call();
  //   expect(rewardBalance).bignumber.greaterThan(zero);
  //   console.log("rewards", fmt18(rewardBalance));
  //
  //   console.log("claim rewards");
  //   await aaveloop.methods.claimRewardsToOwner().send({ from: deployer });
  //
  //   const claimedBalance = bn(await stkAAVE().methods.balanceOf(owner).call());
  //   expect(claimedBalance).bignumber.greaterThan(zero).closeTo(rewardBalance, bn18("0.1"));
  //   console.log("reward stkAAVE", fmt18(claimedBalance));
  //
  //   console.log("exiting with 15 loops");
  //   await aaveloop.methods.exitPosition(15).send({ from: owner }); // +1 loop due to lower liquidity
  //   const endBalanceUSDC = bn(await aaveloop.methods.getBalanceUSDC().call());
  //   expect(endBalanceUSDC).bignumber.greaterThan(POSITION);
  //
  //   await expectOutOfPosition();
  //
  //   printAPY(endBalanceUSDC, claimedBalance);
  // });
  //
  // it("partial exits due to gas limits", async () => {
  //   await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
  //
  //   await aaveloop.methods.enterPosition(20).send({ from: owner });
  //   const startLeverage = await aaveloop.methods.getBalanceDebtToken().call();
  //   const startHealthFactor = (await aaveloop.methods.getPositionData().call()).healthFactor;
  //
  //   await aaveloop.methods.exitPosition(10).send({ from: owner });
  //   const midLeverage = await aaveloop.methods.getBalanceDebtToken().call();
  //   const midHealthFactor = (await aaveloop.methods.getPositionData().call()).healthFactor;
  //
  //   expect(midLeverage).bignumber.gt(zero).lt(startLeverage);
  //   expect(midHealthFactor).bignumber.gt(zero).gt(startHealthFactor);
  //   await aaveloop.methods.exitPosition(100).send({ from: owner });
  //
  //   expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.greaterThan(POSITION);
  //   await expectOutOfPosition();
  // });

  it("health factor decay rate", async () => {
    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
    await aaveloop.methods.enterPosition(14).send({ from: owner });

    const startHF = bn((await aaveloop.methods.getPositionData().call()).healthFactor);

    const year = 60 * 60 * 24 * 365;
    await jumpTime(year);

    const positionData = await aaveloop.methods.getPositionData().call();
    const endHF = bn(positionData.healthFactor);

    console.log("health factor after 1 year:", fmt18(startHF), fmt18(endHF), "diff:", fmt18(endHF.sub(startHF)));
    expect(endHF).bignumber.lt(startHF).gt(ether); // must be > 1 to not be liquidated

    const expectedTotalCollateral = bn18("25012631");
    expect(positionData.totalCollateralETH).bignumber.greaterThan(zero).closeTo(bn18(String(expectedTotalCollateral)), bn18(String(expectedTotalCollateral * 0.001)));

    const expectedTotalDebt = bn("19916624");
    expect(positionData.totalDebtETH).bignumber.greaterThan(zero).closeTo(bn18(String(expectedTotalDebt)), bn18(String(expectedTotalDebt * 0.001)));

  });
  //
  // it("The real happy path", async () => {
  //   await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
  //   await aaveloop.methods.enterPosition(14).send({ from: owner });
  //
  //   const daysBeforeDebtBufferIsHigherThanCollateral = 270;
  //
  //   await jumpTime(60 * 60 * 24 * daysBeforeDebtBufferIsHigherThanCollateral);
  //
  //   const exitLoopCount = 26;
  //
  //   const receipt = await aaveloop.methods.exitPosition(exitLoopCount).send({ from: owner });
  //
  //   console.log("USDC balance", await aaveloop.methods.getBalanceUSDC().call());
  //
  //   await expectOutOfPosition();
  //
  //   console.log(`Using ${exitLoopCount} loops and ${receipt.gasUsed} gas`);
  // });
  //
  // it("15% of real happy path, gas shouldn't be higher than 6M", async () => {
  //   await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
  //   await aaveloop.methods.enterPosition(14).send({ from: owner });
  //
  //   const daysBeforeDebtBufferIsHigherThanCollateral = 270;
  //
  //   await jumpTime(60 * 60 * 24 * (daysBeforeDebtBufferIsHigherThanCollateral * 0.85));
  //
  //   const receipt = await aaveloop.methods.exitPosition(100).send({ from: owner });
  //
  //   await expectOutOfPosition();
  //
  //   expect(bn(receipt.gasUsed)).bignumber.lt(bn6("6,000,000"));
  //
  // });
  //
  // it("The real happy path - partials exits", async () => {
  //   await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
  //   await aaveloop.methods.enterPosition(14).send({ from: owner });
  //
  //   await jumpTime(60 * 60 * 24 * 270);
  //
  //   const startHF = bn((await aaveloop.methods.getPositionData().call()).healthFactor);
  //
  //   await aaveloop.methods.exitPosition(14).send({ from: owner });
  //
  //   const endHF = bn((await aaveloop.methods.getPositionData().call()).healthFactor);
  //
  //   expect(endHF).bignumber.gt(startHF);
  //   expect(await aaveloop.methods.getBalanceDebtToken().call()).bignumber.gt(zero);
  //   expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.eq(zero);
  //
  //   await aaveloop.methods.exitPosition(12).send({ from: owner });
  //
  //   await expectOutOfPosition();
  // });

  it("assets block number", async () => {

    expect(await web3().eth.getBlockNumber()).bignumber.eq(bn("12373298"));

  })

  //
  // it("Can't exit, needs additional money", async () => {
  //   await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
  //   await aaveloop.methods.enterPosition(14).send({ from: owner });
  //
  //   await jumpTime(60 * 60 * 24 * 365 * 2);
  //
  //   const r = await aaveloop.methods.getPositionData().call();
  //
  //   console.log("position date", r);
  //
  //   expect(bn((await aaveloop.methods.getPositionData().call()).healthFactor)).bignumber.gt(bn("1"));
  //
  //   await expectRevert(() => aaveloop.methods.exitPosition(100).send({ from: owner }));
  //
  //   expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.eq(zero);
  //
  //   const additionalMoney = bn6("500,000");
  //
  //   await ensureBalanceUSDC(owner, additionalMoney);
  //   await USDC().methods.transfer(aaveloop.options.address, additionalMoney).send({ from: owner });
  //
  //   expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.eq(additionalMoney);
  //
  //   await aaveloop.methods._deposit(additionalMoney).send({ from: owner });
  //
  //   await aaveloop.methods.exitPosition(26).send({ from: owner });
  //
  //   console.log("USDC balance", await aaveloop.methods.getBalanceUSDC().call());
  //
  //   //expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.gt(POSITION.add(additionalMoney));
  //
  //   await expectOutOfPosition();
  // });

});

function printAPY(endBalanceUSDC: BN, claimedBalance: BN) {
  console.log("=================");
  const profitFromInterest = endBalanceUSDC.sub(POSITION);
  console.log("profit from interest", fmt6(profitFromInterest));
  const stkAAVEPrice = 470;
  console.log("assuming stkAAVE price in USD", stkAAVEPrice, "$");
  const profitFromRewards = claimedBalance.muln(stkAAVEPrice).div(bn6("1,000,000")); // 18->6 decimals
  console.log("profit from rewards", fmt6(profitFromRewards));
  const profit = profitFromInterest.add(profitFromRewards);

  const dailyRate = profit.mul(bn6("1")).div(POSITION);
  console.log("dailyRate:", fmt6(dailyRate.muln(100)), "%");

  const APR = dailyRate.muln(365);
  console.log("result APR: ", fmt6(APR.muln(100)), "%");

  const APY = Math.pow(1 + parseFloat(fmt6(dailyRate)), 365) - 1;
  console.log("result APY: ", APY * 100, "%");
  console.log("=================");
}
