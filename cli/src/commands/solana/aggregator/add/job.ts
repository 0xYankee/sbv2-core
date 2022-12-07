import { Flags } from "@oclif/core";
import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { OracleJob } from "@switchboard-xyz/common";
import { JobAccount } from "@switchboard-xyz/solana.js";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { SolanaWithSignerBaseCommand as BaseCommand } from "../../../../solana";
import { CHECK_ICON } from "../../../../utils";

export default class AggregatorAddJob extends BaseCommand {
  static description = "add a job to an aggregator";

  static flags = {
    ...BaseCommand.flags,
    jobDefinition: Flags.string({
      description: "filesystem path of job json definition file",
      exactlyOne: ["jobKey", "jobDefinition"],
    }),
    jobKey: Flags.string({
      description:
        "public key of an existing job account to add to an aggregator",
      exactlyOne: ["jobKey", "jobDefinition"],
    }),
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
  ];

  static examples = ["$ sbv2 solana:aggregator:add:job"];

  async run() {
    const { args, flags } = await this.parse(AggregatorAddJob);

    if (!args.aggregatorKey) {
      throw new Error("aggregatorKey argument not provided.");
    }
    const [aggregatorAccount, aggregatorData] = await this.loadAggregator(
      args.aggregatorKey
    );

    const authority = await this.loadAuthority(
      flags.authority,
      aggregatorData.authority
    );

    const jobAccount: JobAccount = flags.jobDefinition
      ? // Create a new job from a json file to add to this aggregator
        await (async () => {
          const data = Buffer.from(
            OracleJob.encodeDelimited(
              this.loadJobDefinition(flags.jobDefinition)
            ).finish()
          );

          return (
            await JobAccount.create(this.program, {
              data,
              authority: authority.publicKey,
            })
          )[1];
        })()
      : // Add job by pubkey from an existing job account.
        (await this.loadJob(flags.jobKey))[0];

    const txn = await aggregatorAccount.addJob({
      job: jobAccount,
      weight: 1,
      authority,
    });
    if (this.silent) {
      console.log(txn);
    }
    this.logger.log(
      `${chalk.green(
        `${CHECK_ICON}Job successfully added to aggregator account`
      )}`
    );
    this.logger.log(this.toUrl(txn));
  }

  async catch(error) {
    super.catch(error, "failed to add job to aggregator account");
  }
}
