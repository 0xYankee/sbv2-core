import { Flags } from "@oclif/core";
import { AggregatorAccount } from "@switchboard-xyz/aptos.js";
import { AptosWithSignerBaseCommand as BaseCommand } from "../../../aptos";

export default class AggregatorUpdate extends BaseCommand {
  static description = "request a new value on-chain for an aggregator";

  static aliases = ["aptos:update:aggregator"];

  static flags = {
    ...BaseCommand.flags,
  };

  static args = [
    {
      name: "aggregatorHexString",
      description: "HexString address of the aggregator",
    },
  ];

  async run() {
    const { flags, args } = await this.parse(AggregatorUpdate);

    const [aggregatorAccount, aggregatorData] = await this.loadAggregator(
      args.aggregatorHexString
    );

    const updateSig = await aggregatorAccount.openRound(this.signer);

    this.logger.info(this.toUrl(updateSig));
  }

  async catch(error) {
    super.catch(error, "Failed to update aptos aggregator");
  }
}
