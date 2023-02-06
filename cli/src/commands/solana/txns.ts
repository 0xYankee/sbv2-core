import { Args, Flags } from "@oclif/core";
import { ConfirmedSignatureInfo, PublicKey } from "@solana/web3.js";
import { SolanaWithoutSignerBaseCommand as BaseCommand } from "../../solana/index";
import fs from "fs";
import _ from "lodash";
import { types } from "@switchboard-xyz/solana.js";
import base58 from "bs58";
import {
  BN,
  BNtoDateTimeString,
  isBase58,
  toDateTimeString,
} from "@switchboard-xyz/common";

const discriminatorMap = new Map([
  [Buffer.from([66, 57, 216, 251, 165, 107, 128, 98]).toString(), "CrankPop"],
  [
    Buffer.from([153, 122, 177, 151, 240, 86, 240, 213]).toString(),
    "CrankPopV2",
  ],
  [
    Buffer.from([21, 67, 5, 0, 74, 168, 51, 192]).toString(),
    "AggregatorSaveResult",
  ],
  [
    Buffer.from([33, 3, 188, 52, 185, 222, 0, 4]).toString(),
    "AggregatorSaveResultV2",
  ],
  [
    Buffer.from([239, 69, 229, 179, 156, 246, 118, 191]).toString(),
    "AggregatorOpenRound",
  ],
  [
    Buffer.from([10, 175, 217, 130, 111, 35, 117, 54]).toString(),
    "OracleHeartbeat",
  ],
]);

export default class SolanaTransactions extends BaseCommand {
  static enableJsonFlag = true;

  static hidden = true;

  static description = "fetch transactions for an on-chain account";

  static flags = {
    ...BaseCommand.flags,
    limit: Flags.integer({
      description: "",
      default: 1000,
    }),
    force: Flags.boolean({
      description: "",
    }),
  };

  static args = {
    pubkey: Args.string({
      description: "publicKey of the Switchboard account to search for",
      required: true,
    }),
    filename: Args.string({
      required: true,
      description: "filename to save the json file",
    }),
  };

  async run(): Promise<any> {
    const { args, flags } = await this.parse(SolanaTransactions);

    const outputFile = this.normalizePath(args.filename);
    if (fs.existsSync(outputFile) && !flags.force) {
      throw new Error(`File already exists: ${outputFile}`);
    }

    const pubkey = new PublicKey(args.pubkey);

    const signatures: Array<ConfirmedSignatureInfo> = [];
    let lastSig: string | undefined = undefined;
    while (signatures.length < flags.limit) {
      const signatureBatch =
        await this.program.connection.getSignaturesForAddress(pubkey, {
          before: lastSig,
          limit: 1000,
        });
      lastSig = signatureBatch.slice(-1)[0].signature;
      signatures.push(...signatureBatch);
    }

    const parsedTransactions = _.flatten(
      await Promise.all(
        _.chunk(signatures, 100).map(async (signatures) => {
          return await this.program.connection.getParsedTransactions(
            signatures.map((s) => s.signature)
          );
        })
      )
    ).map((parsedTxn, txnIdx) => {
      const logs = parsedTxn.meta.logMessages.join("\n");
      let ixnName = "";
      let success: string | boolean = "Unknown";
      const parsedTxnIxns = parsedTxn.transaction.message.instructions.map(
        (ixn) => {
          if (ixn.programId.equals(this.program.programId) && "data" in ixn) {
            const ixnData = isBase58(ixn.data)
              ? Buffer.from(base58.decode(ixn.data))
              : Buffer.from(ixn.data, "base64");

            const sbv2IxnName =
              discriminatorMap.get(ixnData.slice(0, 8).toString()) ??
              "Switchboard Unknown";
            if (sbv2IxnName !== "") {
              ixnName = sbv2IxnName;
            }

            switch (sbv2IxnName) {
              case "AggregatorOpenRound":
              case "OracleHeartbeat":
              case "AggregatorSaveResultV2":
              case "AggregatorSaveResult":
              case "CrankPopV2":
              case "CrankPop": {
                if (
                  logs.includes("AnchorError") ||
                  logs.includes("Crank pop miss")
                ) {
                  success = false;
                  break;
                } else {
                  success = true;
                }
              }
            }

            return {
              ...ixn,
              ixnName: sbv2IxnName,
            };
          }

          return ixn;
        }
      );

      return {
        timestamp: BNtoDateTimeString(new BN(parsedTxn.blockTime)),
        ixnName: ixnName,
        success,
        signatures: parsedTxn.transaction.signatures,
        ...parsedTxn,
        transaction: undefined,
        // transaction: {
        //   ...parsedTxn.transaction,
        //   message: {
        //     ...parsedTxn.transaction.message,
        //     instructions: parsedTxnIxns,
        //   },
        // },
      };
    });

    let numSuccess = 0;
    let numFailed = 0;

    parsedTransactions.forEach((txn) => {
      if (typeof txn.success === "boolean") {
        if (txn.success) {
          numSuccess = numSuccess + 1;
        } else {
          numFailed = numFailed + 1;
        }
      }
    });

    console.log(`numSuccess: ${numSuccess}`);
    console.log(`numFailed: ${numFailed}`);

    fs.writeFileSync(
      outputFile,
      JSON.stringify(
        parsedTransactions,
        (key, value) => {
          const ignoreKeys = [
            "postTokenBalances",
            "postBalances",
            "preBalances",
            "preTokenBalances",
            // "",
            // "",
          ];
          if (ignoreKeys.includes(key)) {
            return undefined;
          }
          return value;
        },
        2
      )
    );
  }

  async catch(error) {
    super.catch(error, "Failed to print Switchboard account");
  }
}
