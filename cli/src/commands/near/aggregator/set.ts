import { Args, Flags } from "@oclif/core";
import {
  parseAddressString,
  SwitchboardDecimal,
} from "@switchboard-xyz/near.js";
import { Big } from "@switchboard-xyz/common";
import { NearWithSignerBaseCommand as BaseCommand } from "../../../near";

export default class SetAggregator extends BaseCommand {
  static enableJsonFlag = true;

  static description = "set a near aggregator's config";

  static aliases = ["near:set:aggregator"];

  static flags = {
    ...BaseCommand.flags,
    authority: Flags.string({
      char: "a",
      description:
        "alternate named account that will be the authority for the oracle",
    }),
    crankAddress: Flags.string({
      description: "optional, address of the crank to add the aggregator to",
    }),
    queueAddress: Flags.string({
      description:
        "optional, address of the new queue to add the aggregator to",
    }),
    name: Flags.string({
      description: "name of the crank for easier identification",
    }),
    metadata: Flags.string({
      description: "metadata of the crank for easier identification",
    }),
    forceReportPeriod: Flags.integer({
      description:
        "Number of seconds for which, even if the variance threshold is not passed, accept new responses from oracles.",
    }),
    batchSize: Flags.integer({
      description: "number of oracles requested for each open round call",
    }),
    minJobs: Flags.integer({
      description: "number of jobs that must respond before an oracle responds",
    }),
    minOracles: Flags.integer({
      description:
        "number of oracles that must respond before a value is accepted on-chain",
    }),
    updateInterval: Flags.integer({
      description: "set an aggregator's minimum update delay",
    }),
    varianceThreshold: Flags.string({
      description:
        "percentage change between a previous accepted result and the next round before an oracle reports a value on-chain. Used to conserve lease cost during low volatility",
    }),
    // job: Flags.string({
    //   char: "j",
    //   description: "filesystem path to job definition file",
    //   multiple: true,
    // }),
    // rewardEscrow: Flags.string({
    //   description: "where to send rewards. defaults to user's escrow account",
    //   required: false,
    // }),
    // historyLimit: Flags.integer({
    //   description: "number of samples to store in aggregator's history",
    // }),
    // enable: Flags.boolean({
    //   description:
    //     "if required and queue authority is provided, enable permissions",
    // }),
  };

  static args = {
    aggregatorAddress: Args.string({
      description: "address of the aggregator in Uint8 or Base58 encoding",
      required: true,
    }),
  };
  async run() {
    const { flags, args } = await this.parse(SetAggregator);

    const [aggregator, aggregatorData] = await this.loadAggregator(
      args.aggregatorAddress
    );

    // TODO: Check batch size and min oracles are valid

    const txnReceipt = await aggregator.setConfigs({
      authority: flags.authority ?? undefined,
      name: flags.name ? Buffer.from(flags.name) : undefined,
      metadata: flags.metadata ? Buffer.from(flags.metadata) : undefined,
      batchSize: flags.batchSize ?? undefined,
      minOracleResults: flags.minOracles ?? undefined,
      minJobResults: flags.minJobs ?? undefined,
      minUpdateDelaySeconds: flags.updateInterval ?? undefined,
      varianceThreshold: flags.varianceThreshold
        ? SwitchboardDecimal.fromBig(new Big(flags.varianceThreshold))
        : undefined,
      forceReportPeriod: flags.forceReportPeriod ?? undefined,
      crank: flags.crankAddress
        ? parseAddressString(flags.crankAddress)
        : undefined,
      queue: flags.queueAddress
        ? parseAddressString(flags.queueAddress)
        : undefined,
    });

    console.log(
      "Setting aggregator config",
      this.toUrl(txnReceipt.transaction.hash)
    );

    const data = {
      address: aggregator.address,
      addressBase58: this.encodeAddress(aggregator.address),
      ...(await aggregator.loadData()),
      // jobs: jobData,
    };

    if (flags.json) {
      return this.normalizeAccountData(aggregator.address, data);
    }

    this.logger.info(
      JSON.stringify(
        this.normalizeAccountData(aggregator.address, data),
        this.jsonReplacers,
        2
      )
    );
  }

  async catch(error) {
    super.catch(error, "Failed to set near aggregator config");
  }
}
