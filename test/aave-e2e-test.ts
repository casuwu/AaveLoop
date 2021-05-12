import BN from "bn.js";
import { expect } from "chai";
import {
  aaveloop,
  deployer,
  ensureBalanceUSDC,
  expectOutOfPosition,
  expectRevert,
  initForkOwnerAndUSDC,
  owner,
  POSITION,
} from "./test-base";
import { bn, bn18, bn6, ether, fmt18, fmt6, zero } from "../src/utils";
import { advanceTime, jumpTime, web3 } from "../src/network";
import { stkAAVE, USDC } from "../src/token";
import { contract } from "../src/extensions";
import { AAVEOracleAbi } from "../typechain-abi/AAVEOracleAbi";

const theSpreadsheetBlockNumber = 12373298;

describe("AaveLoop E2E Tests", () => {
  beforeEach(async () => {
    await initForkOwnerAndUSDC();
  });

  it("Enter & exit", async () => {
    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });

    await aaveloop.methods.enterPosition(14).send({ from: owner });
    expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.zero;

    await aaveloop.methods.exitPosition(100).send({ from: owner });
    expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.greaterThan(POSITION);

    await expectOutOfPosition();
  });

  it("Show me the money", async () => {
    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });

    console.log("entering with 14 loops", fmt6(POSITION));
    await aaveloop.methods.enterPosition(14).send({ from: owner });
    expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.zero;

    const day = 60 * 60 * 24;
    await advanceTime(day);

    const rewardBalance = await aaveloop.methods.getBalanceReward().call();
    expect(rewardBalance).bignumber.greaterThan(zero);
    console.log("rewards", fmt18(rewardBalance));

    console.log("claim rewards");
    await aaveloop.methods.claimRewardsToOwner().send({ from: deployer });

    const claimedBalance = bn(await stkAAVE().methods.balanceOf(owner).call());
    expect(claimedBalance).bignumber.greaterThan(zero).closeTo(rewardBalance, bn18("0.1"));
    console.log("reward stkAAVE", fmt18(claimedBalance));

    console.log("exiting with 15 loops");
    await aaveloop.methods.exitPosition(15).send({ from: owner }); // +1 loop due to lower liquidity
    const endBalanceUSDC = bn(await aaveloop.methods.getBalanceUSDC().call());

    await expectOutOfPosition();

    printAPY(endBalanceUSDC, claimedBalance);
  });

  it("partial exits due to gas limits", async () => {
    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });

    await aaveloop.methods.enterPosition(20).send({ from: owner });
    const startLeverage = await aaveloop.methods.getBalanceDebtToken().call();
    const startHealthFactor = (await aaveloop.methods.getPositionData().call()).healthFactor;
    expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.zero;

    await aaveloop.methods.exitPosition(10).send({ from: owner });
    const midLeverage = await aaveloop.methods.getBalanceDebtToken().call();
    const midHealthFactor = (await aaveloop.methods.getPositionData().call()).healthFactor;
    expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.zero;

    expect(midLeverage).bignumber.gt(zero).lt(startLeverage);
    expect(midHealthFactor).bignumber.gt(ether).gt(startHealthFactor);
    await aaveloop.methods.exitPosition(100).send({ from: owner });

    await expectOutOfPosition();
  });

  it("1 year in, health factor decay rate", async () => {
    await initForkOwnerAndUSDC(theSpreadsheetBlockNumber);

    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
    await aaveloop.methods.enterPosition(14).send({ from: owner });

    const startHF = bn((await aaveloop.methods.getPositionData().call()).healthFactor);

    const year = 60 * 60 * 24 * 365;
    await jumpTime(year);

    const positionData = await aaveloop.methods.getPositionData().call();
    const endHF = bn(positionData.healthFactor);

    console.log("health factor after 1 year:", fmt18(startHF), fmt18(endHF), "diff:", fmt18(endHF.sub(startHF)));
    expect(endHF).bignumber.lt(startHF).gt(ether); // must be > 1 to not be liquidated

    const aaveOracle = contract<AAVEOracleAbi>(
      require("../abi/AAVEOracleAbi.json"),
      "0xA50ba011c48153De246E5192C8f9258A2ba79Ca9"
    );
    const priceUSDinETH = bn(await aaveOracle.methods.getAssetPrice(USDC().options.address).call());

    const expectedTotalSupplyETH = bn18("25,012,631").mul(priceUSDinETH).div(ether);
    expect(positionData.totalCollateralETH)
      .bignumber.greaterThan(zero)
      .closeTo(expectedTotalSupplyETH, expectedTotalSupplyETH.divn(1000));

    const expectedTotalDebtETH = bn18("19,916,624").mul(priceUSDinETH).div(ether);
    expect(positionData.totalDebtETH)
      .bignumber.greaterThan(zero)
      .closeTo(expectedTotalDebtETH, expectedTotalDebtETH.divn(1000));

    expect(positionData.healthFactor).bignumber.greaterThan(ether).closeTo(bn18("1.0674869"), bn18("0.001"));
  });

  it("days to liquidation", async () => {
    await initForkOwnerAndUSDC(theSpreadsheetBlockNumber);

    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
    await aaveloop.methods.enterPosition(14).send({ from: owner });

    const startHF = bn((await aaveloop.methods.getPositionData().call()).healthFactor);

    const wayAhead = 60 * 60 * 24 * 2500;
    await jumpTime(wayAhead);

    const positionData = await aaveloop.methods.getPositionData().call();
    const endHF = bn(positionData.healthFactor);

    console.log("health factor near liquidation:", fmt18(startHF), fmt18(endHF), "diff:", fmt18(endHF.sub(startHF)));
    expect(endHF).bignumber.lt(startHF).gt(ether); // must be > 1 to not be liquidated
  });

  it("sane exit gas as function of health factor", async () => {
    await initForkOwnerAndUSDC(theSpreadsheetBlockNumber);

    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
    await aaveloop.methods.enterPosition(14).send({ from: owner });

    const MAX_SANE_GAS = bn6("5,000,000");

    await jumpTime(60 * 60 * 24 * 500);

    console.log("health factor", fmt18((await aaveloop.methods.getPositionData().call()).healthFactor));

    const receipt = await aaveloop.methods.exitPosition(100).send({ from: owner });
    console.log("gasUsed", receipt.gasUsed);

    await expectOutOfPosition();

    expect(bn(receipt.gasUsed)).bignumber.lt(MAX_SANE_GAS);
  });

  it("last day to exit", async () => {
    await initForkOwnerAndUSDC(theSpreadsheetBlockNumber);

    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
    await aaveloop.methods.enterPosition(14).send({ from: owner });

    await jumpTime(60 * 60 * 24 * 585);

    const THE_MIN_HEALTH_FACTOR = bn18("1.0625"); // 0.85/0.8
    expect((await aaveloop.methods.getPositionData().call()).healthFactor).bignumber.closeTo(
      THE_MIN_HEALTH_FACTOR,
      bn18("0.001")
    );

    await aaveloop.methods.exitPosition(50).send({ from: owner });

    await expectOutOfPosition();
  });

  it("can't exit, needs additional money", async () => {
    await initForkOwnerAndUSDC(theSpreadsheetBlockNumber);

    await USDC().methods.transfer(aaveloop.options.address, POSITION).send({ from: owner });
    await aaveloop.methods.enterPosition(14).send({ from: owner });

    await jumpTime(60 * 60 * 24 * 365 * 2);

    expect(bn((await aaveloop.methods.getPositionData().call()).healthFactor)).bignumber.gt(bn18("1"));

    await expectRevert(() => aaveloop.methods.exitPosition(100).send({ from: owner }));

    expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.eq(zero);

    const additionalMoney = bn6("500,000");
    await ensureBalanceUSDC(owner, additionalMoney);
    await USDC().methods.transfer(aaveloop.options.address, additionalMoney).send({ from: owner });
    expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.eq(additionalMoney);

    await aaveloop.methods._deposit(additionalMoney).send({ from: owner });

    await aaveloop.methods.exitPosition(100).send({ from: owner });

    expect(await aaveloop.methods.getBalanceUSDC().call()).bignumber.gt(POSITION.add(additionalMoney));

    await expectOutOfPosition();
  });
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
