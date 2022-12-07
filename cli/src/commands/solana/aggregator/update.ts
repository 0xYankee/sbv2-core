import { PublicKey } from "@solana/web3.js";
import { AggregatorAccount } from "@switchboard-xyz/solana.js";
import chalk from "chalk";
import { SolanaWithSignerBaseCommand as BaseCommand } from "../../../solana";
import { AggregatorIllegalRoundOpenCall } from "../../../types";
import { CHECK_ICON } from "../../../utils";

export default class AggregatorUpdate extends BaseCommand {
  static description = "request a new aggregator result from a set of oracles";

  static flags = {
    ...BaseCommand.flags,
  };

  static args = [
    {
      name: "aggregatorKey",
      description: "public key of the aggregator account to deserialize",
      require: true,
    },
  ];

  static examples = [
    "$ sbv2 solana aggregator update J7j9xX8JP2B2ErvUzuqGAKBGeggsxPyFXj5MqZcYDxfa --keypair ../payer-keypair.json",
  ];

  async run() {
    const { args } = await this.parse(AggregatorUpdate);

    const txn = await new AggregatorAccount(
      this.program,
      new PublicKey(args.aggregatorKey)
    ).openRound({});

    if (this.silent) {
      this.log(txn);
      return;
    }

    this.logger.log(
      `${chalk.green(`${CHECK_ICON}Aggregator update request sent to oracles`)}`
    );

    this.logger.log(this.toUrl(txn));
  }

  async catch(error) {
    if (
      error instanceof AggregatorIllegalRoundOpenCall ||
      error.toString().includes("0x177d")
    ) {
      this.logger.info(error.toString());
      this.exit(0);
    }

    super.catch(error, "failed to open a new aggregator update round");
  }
}
