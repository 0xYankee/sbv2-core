import { Args, Flags } from "@oclif/core";
import { NearWithSignerBaseCommand as BaseCommand } from "../../../near";
import { SwitchboardDecimal } from "@switchboard-xyz/near.js";

export default class AggregatorFund extends BaseCommand {
  static description = "";

  static aliases = ["near:fund:aggregator"];

  static flags = {
    ...BaseCommand.flags,
    amount: Flags.string({
      char: "a",
      required: true,
      description: "amount to deposit into the aggregator's lease",
    }),
  };

  static args = {
    aggregatorAddress: Args.string({
      description: "address of the aggregator in Uint8 or Base58 encoding",
      required: true,
    }),
  };
  async run() {
    const { flags, args } = await this.parse(AggregatorFund);

    const [aggregatorAccount, aggregatorData] = await this.loadAggregator(
      args.aggregatorAddress
    );

    const escrowAccount = await this.loadEscrow();
    const escrowState = await escrowAccount.loadData();
    const escrowBalance = new SwitchboardDecimal(
      escrowState.amount,
      this.program.mint.metadata.decimals
    ).toBig();

    if (escrowBalance.toNumber() < Number(flags.amount) + 0.05) {
      // wrap any needed funds and deposit into the program
      const fundReceipt = await escrowAccount.fundUpTo({
        amount: Number(flags.amount),
      });
      console.log("Wrapping Near", this.toUrl(fundReceipt.transaction.hash));
    }

    const aggReceipt = await aggregatorAccount.fund({
      funder: escrowAccount.address,
      amount: Number(flags.amount),
    });
    console.log("Fund aggregator", this.toUrl(aggReceipt.transaction.hash));
  }

  async catch(error: any) {
    super.catch(error, "Failed to fund near aggregator");
  }
}
