import { Flags } from "@oclif/core";
import { PublicKey } from "@solana/web3.js";
import { AggregatorAccount, JobAccount } from "@switchboard-xyz/switchboard-v2";
import chalk from "chalk";
import { SolanaWithSignerBaseCommand as BaseCommand } from "../../../../solana";
import { CHECK_ICON } from "../../../../utils";

export default class AggregatorRemoveJob extends BaseCommand {
  static description = "remove a switchboard job account from an aggregator";

  static flags = {
    ...BaseCommand.flags,
    authority: Flags.string({
      char: "a",
      description: "alternate keypair that is the authority for the aggregator",
    }),
  };

  static args = [
    {
      name: "aggregatorKey",
      description: "public key of the aggregator account",
    },
    {
      name: "jobKey",
      description:
        "public key of an existing job account to remove from an aggregator",
    },
  ];

  static examples = ["$ sbv2 aggregator:remove:job"];

  async run() {
    const { args, flags } = await this.parse(AggregatorRemoveJob);

    const [aggregatorAccount, aggregator] = await this.loadAggregator(
      args.aggregatorKey
    );

    const authority = await this.loadAuthority(
      flags.authority,
      aggregator.authority
    );

    const jobAccount = new JobAccount({
      program: this.program,
      publicKey: new PublicKey(args.jobKey),
    });

    const txn = await aggregatorAccount.removeJob(jobAccount, authority);

    if (this.silent) {
      console.log(txn);
    } else {
      this.logger.log(
        `${chalk.green(
          `${CHECK_ICON}Job succesfully removed from aggregator account\r\n`
        )}`
      );
      this.logger.log(this.toUrl(txn));
    }
  }

  async catch(error) {
    super.catch(error, "failed to remove job to aggregator account");
  }
}
