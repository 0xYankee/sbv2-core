import { Flags } from "@oclif/core";
import { Input } from "@oclif/parser";
import * as anchor from "@project-serum/anchor";
import { Cluster, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BigUtils } from "@switchboard-xyz/sbv2-utils";
import {
  AggregatorAccount,
  AnchorWallet,
  CrankAccount,
  JobAccount,
  loadSwitchboardProgram,
  OracleAccount,
  OracleQueueAccount,
  programWallet,
  SBV2_DEVNET_PID,
  SBV2_MAINNET_PID,
  SwitchboardProgram,
} from "@switchboard-xyz/switchboard-v2";
import Big from "big.js";
import chalk from "chalk";
import { AuthorityMismatch } from "../types";
import { loadKeypair } from "../utils";
import { CliBaseCommand as BaseCommand } from "../BaseCommand";
import { AwsProvider, FsProvider, GcpProvider } from "../providers";
import { IBaseChain } from "../types/chain";
import { OracleJob } from "@switchboard-xyz/common";

export type SolanaNetwork = Cluster | "localnet";

export abstract class SolanaBaseCommand
  extends BaseCommand
  implements IBaseChain
{
  static flags = {
    ...BaseCommand.flags,
    mainnetBeta: Flags.boolean({
      description: "WARNING: use mainnet-beta solana cluster",
    }),
    rpcUrl: Flags.string({
      char: "u",
      description: "alternate RPC url",
    }),
    programId: Flags.string({
      description: "alternative Switchboard program ID to interact with",
    }),
    commitment: Flags.string({
      description: "transaction commitment level to use",
      default: "confirmed",
      options: ["confirmed", "finalized", "processed"],
    }),
  };

  public hasSigner = false;

  public network: SolanaNetwork;

  public rpcUrl: string;

  public programId: PublicKey;

  public connection: Connection;

  public program: SwitchboardProgram;

  public commitment: "confirmed" | "finalized" | "processed";

  async init() {
    await super.init();
    const { flags } = await this.parse((<Input<any>>this.constructor) as any);
    BaseCommand.flags = flags as any;

    this.network = this.getNetwork(
      (flags as any).mainnetBeta ? "mainnet-beta" : "devnet"
    );
    this.programId = this.getProgramId(this.network, (flags as any).programId);

    this.rpcUrl = this.getRpcUrl(this.network, (flags as any).rpcUrl);
    this.commitment = (flags as any).commitment ?? "confirmed";
    this.connection = new Connection(this.rpcUrl, {
      commitment: (flags as any).commitment ?? "confirmed",
    });

    // TODO: Load connection params from config
    this.logConfig({
      cluster: this.network,
      rpc: this.rpcUrl,
    });
  }

  toUrl(signature: string) {
    return `https://explorer.solana.com/tx/${signature}?cluster=${this.network}`;
  }

  getNetwork(clusterFlag: string): SolanaNetwork {
    if (
      clusterFlag !== "testnet" &&
      clusterFlag !== "mainnet-beta" &&
      clusterFlag !== "devnet" &&
      clusterFlag !== "localnet"
    ) {
      throw new Error(
        `--networkId must be 'testnet', 'mainnet-beta', 'devnet', or 'localnet'`
      );
    }

    return clusterFlag;
  }

  getRpcUrl(cluster: SolanaNetwork, rpcUrlFlag?: string): string {
    if (rpcUrlFlag) {
      return rpcUrlFlag;
    }

    const rpcUrl = this.ctx.getRpcUrl("solana", cluster);
    if (!rpcUrl) {
      throw new Error(
        `Failed to get Solana RPC URL for cluster ${cluster}. Try providing the --rpcUrl flag`
      );
    }
    return rpcUrl;
  }

  getProgramId(cluster: SolanaNetwork, programIdFlag: string): PublicKey {
    if (programIdFlag) {
      return new PublicKey(programIdFlag);
    }
    if (cluster === "mainnet-beta") {
      return SBV2_MAINNET_PID;
    }

    return SBV2_DEVNET_PID;
  }

  async loadProgram(
    signer: Keypair = Keypair.fromSeed(new Uint8Array(32).fill(1))
  ): Promise<SwitchboardProgram> {
    if (!this.connection) {
      throw new Error(
        `Need to load the connection before loading the Anchor program`
      );
    }
    if (!this.programId) {
      throw new Error(
        `Need to load the programId before loading the Anchor program`
      );
    }

    const wallet = new AnchorWallet(signer);
    const provider = new anchor.AnchorProvider(this.connection, wallet, {
      commitment: this.commitment ?? "confirmed",
      // preflightCommitment: "finalized",
    });

    const anchorIdl = await anchor.Program.fetchIdl(this.programId, provider);
    if (!anchorIdl) {
      throw new Error(`failed to read idl for ${this.programId}`);
    }

    return new anchor.Program(
      anchorIdl,
      this.programId,
      provider
    ) as unknown as SwitchboardProgram;

    // const program = await loadSwitchboardProgram(
    //   this.network as any,
    //   this.connection,
    //   signer,
    //   {
    //     commitment: this.commitment,
    //   }
    // );

    // this.program = program;
    // return program;
  }

  /** Load an authority from a CLI flag and optionally check if it matches the expected account authority */
  async loadAuthority(
    authorityPath: string | unknown,
    expectedAuthority?: PublicKey
  ): Promise<Keypair> {
    const authority: Keypair =
      typeof authorityPath === "string"
        ? await loadKeypair(authorityPath)
        : programWallet(this.program);

    if (expectedAuthority && !expectedAuthority.equals(authority.publicKey)) {
      throw new AuthorityMismatch();
    }

    return authority;
  }

  mainnetCheck(): void {
    if (this.network === "mainnet-beta") {
      throw new Error(
        "cli@^2 is still in beta, mainnet is disabled for this command."
      );
    }
  }

  // Converts a string to a tokenAmount
  // If a decimal is found, it will be normalized using 9 decimal places
  getTokenAmount(value: string, decimals = 9): anchor.BN {
    if (Number.isNaN(Number(value))) {
      throw new TypeError("tokenAmount must be an integer or decimal");
    }

    if (value.split(".").length > 1) {
      const float = new Big(value);
      const scale = BigUtils.safePow(new Big(10), decimals);
      const tokenAmount = BigUtils.safeMul(float, scale);
      return new anchor.BN(tokenAmount.toFixed(0));
    }

    return new anchor.BN(value);
  }

  async getSigner(keypairPath: string): Promise<Keypair> {
    const parseKeypairString = (fileString: string): Keypair => {
      // check if bytes
      const parsedFileString = fileString
        .trim()
        .replace(/\n/g, "")
        .replace(/\s/g, "");
      const bytesRegex = /^\[(\s)?[0-9]+((\s)?,(\s)?[0-9]+){31,}\]/;
      if (bytesRegex.test(parsedFileString)) {
        return Keypair.fromSecretKey(
          new Uint8Array(JSON.parse(parsedFileString))
        );
      }

      try {
        return Keypair.fromSecretKey(
          new Uint8Array(JSON.parse(parsedFileString))
        );
      } catch {}

      throw new Error(`Failed to derive secret key from input file`);
    };

    let errors: any[] = [];

    // try loading keypair from filesystem
    try {
      const normalizedKeypairPath = this.normalizePath(keypairPath);
      const keypair = FsProvider.getSecret(
        normalizedKeypairPath,
        parseKeypairString
      );
      return keypair;
    } catch (error) {
      errors.push(error);
    }

    // try loading keypair from gcp secret manager
    try {
      const keypair = await GcpProvider.getSecret(
        keypairPath,
        parseKeypairString
      );
      return keypair;
    } catch (error) {
      errors.push(error);
    }

    // try loading keypair from aws secrets
    try {
      const keypair = await AwsProvider.getSecret(
        keypairPath,
        parseKeypairString
      );
      return keypair;
    } catch (error) {
      errors.push(error);
    }

    throw new Error(
      `Failed to load Solana keypair ${keypairPath}\n${errors
        .map((e) => (e as any).toString())
        .join("\n")}`
    );
  }

  deserializeJobData(jobData: Uint8Array): OracleJob {
    return OracleJob.decodeDelimited(jobData);
  }

  async loadQueue(address: string): Promise<[OracleQueueAccount, any]> {
    const account = new OracleQueueAccount({
      program: this.program,
      publicKey: new PublicKey(address),
    });
    const data = await account.loadData();

    return [account, data];
  }

  async loadAggregator(address: string): Promise<[AggregatorAccount, any]> {
    const account = new AggregatorAccount({
      program: this.program,
      publicKey: new PublicKey(address),
    });
    const data = await account.loadData();

    return [account, data];
  }

  async loadCrank(address: string): Promise<[CrankAccount, any]> {
    const account = new CrankAccount({
      program: this.program,
      publicKey: new PublicKey(address),
    });
    const data = await account.loadData();

    return [account, data];
  }

  async loadOracle(address: string): Promise<[OracleAccount, any]> {
    const account = new OracleAccount({
      program: this.program,
      publicKey: new PublicKey(address),
    });
    const data = await account.loadData();

    return [account, data];
  }

  async loadJob(address: string): Promise<[JobAccount, any, OracleJob]> {
    const account = new JobAccount({
      program: this.program,
      publicKey: new PublicKey(address),
    });
    const data = await account.loadData();

    const oracleJob = this.deserializeJobData(data.data);

    return [account, data, oracleJob];
  }
}
