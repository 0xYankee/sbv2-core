import { Flags } from "@oclif/core";
import { NearWithSignerBaseCommand as BaseCommand } from "../../../near";
import { AggregatorAccount, QueueAccount } from "@switchboard-xyz/near.js";

export default class AggregatorUpdate extends BaseCommand {
  static description = "request a new value on-chain for an aggregator";

  static aliases = ["near:update:aggregator"];

  static flags = {
    ...BaseCommand.flags,
  };

  static args = [
    {
      name: "aggregatorAddress",
      description: "address of the aggregator in Uint8 or Base58 encoding",
    },
  ];

  async run() {
    const { flags, args } = await this.parse(AggregatorUpdate);

    const aggregatorAccount = new AggregatorAccount({
      program: this.program,
      address: this.parseAddress(args.aggregatorAddress),
    });
    const aggregatorData = await aggregatorAccount.loadData();

    const queueAccount = new QueueAccount({
      program: this.program,
      address: aggregatorData.queue,
    });
    const queueData = await queueAccount.loadData();

    const escrowAccount = await this.loadEscrow();

    const txnReceipt = await aggregatorAccount.openRound({
      rewardRecipient: escrowAccount.address,
    });

    if (flags.json) {
      return {
        signature: txnReceipt.transaction.hash,
        url: this.toUrl(txnReceipt.transaction.hash),
        ...txnReceipt,
      };
    }

    // this.logger.info(JSON.stringify(updateTxn, this.jsonReplacers, 2));
    this.logger.info(`${this.toUrl(txnReceipt.transaction.hash)}`);
  }

  async catch(error) {
    super.catch(error, "Failed to update near aggregator");
  }
}
