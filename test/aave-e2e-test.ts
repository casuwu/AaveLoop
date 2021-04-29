import { expect } from "chai";
import { aaveloop, balanceReward, balanceUSDC, owner, testHelpers } from "./test-base";
import { Tokens } from "../src/token";
import { bn6, many } from "../src/utils";

describe("AaveLoop E2E Tests", () => {
  it("happy path", async () => {
    await Tokens.USDC().methods.transfer(aaveloop.options.address, bn6("10,000,000")).send({ from: owner });

    await aaveloop.methods.enterPosition(20).send({ from: owner });
    expect(await balanceUSDC()).bignumber.zero;

    await aaveloop.methods.exitPosition().send({ from: owner });
    expect(await balanceUSDC()).bignumber.eq(bn6("10,000,000"));
  });
});