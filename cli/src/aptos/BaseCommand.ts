import { Flags } from "@oclif/core";
import { Input } from "@oclif/parser";
import { CliBaseCommand as BaseCommand } from "../BaseCommand";
import {
  AptosAccount,
  AptosClient,
  FaucetClient,
  HexString,
  MaybeHexString,
} from "aptos";
import { AwsProvider, FsProvider, GcpProvider } from "../providers";
import YAML from "yaml";
import fs from "fs";
import { AptosNetwork } from ".";
import {
  AggregatorAccount,
  AptosDecimal,
  CrankAccount,
  JobAccount,
  OracleAccount,
  OracleQueueAccount,
  StateAccount,
} from "@switchboard-xyz/aptos.js";
import { OracleJob, SwitchboardDecimal } from "@switchboard-xyz/common";
import { isBN } from "bn.js";
import Big from "big.js";

export abstract class AptosBaseCommand extends BaseCommand {
  static flags = {
    ...BaseCommand.flags,
    networkId: Flags.string({
      description: "Aptos network to connect to",
      options: ["devnet"],
      default: "devnet",
    }),
    programId: Flags.string({
      description: "Switchboard programId on the selected Aptos network",
      default:
        "0x14611263909398572be034debb2e61b6751cafbeaddd994b9a1250cb76b99d38",
    }),
    stateAddress: Flags.string({
      description: "Switchboard state address",
      default:
        "0x14611263909398572be034debb2e61b6751cafbeaddd994b9a1250cb76b99d38",
    }),
    rpcUrl: Flags.string({
      char: "u",
      description: "alternate RPC url",
    }),
  };

  public hasSigner = false;

  public networkId: AptosNetwork = "devnet";

  public rpcUrl: string;

  public programId: HexString;

  public aptos: AptosClient;

  public faucet: FaucetClient;

  public stateAddress: HexString;

  async init() {
    await super.init();
    const { flags } = await this.parse((<Input<any>>this.constructor) as any);
    BaseCommand.flags = flags as any;

    this.networkId = this.getNetworkId((flags as any).networkId);
    this.rpcUrl = this.getRpcUrl(this.networkId, (flags as any).rpcUrl);
    this.programId = HexString.ensure((flags as any).programId);

    this.aptos = new AptosClient(this.rpcUrl);
    this.faucet = new FaucetClient(
      this.rpcUrl,
      "https://faucet.devnet.aptoslabs.com"
    );

    this.stateAddress = HexString.ensure((flags as any).stateAddress);

    this.logConfig({
      network: this.networkId,
      rpc: this.rpcUrl,
      pid: this.programId.hex(),
      state: this.stateAddress.hex(),
    });
  }

  getNetworkId(networkIdFlag: string): AptosNetwork {
    if (networkIdFlag !== "devnet") {
      throw new Error(`--network must be 'devnet'`);
    }

    return networkIdFlag;
  }

  getRpcUrl(networkId: AptosNetwork, rpcUrlFlag?: string): string {
    if (rpcUrlFlag) {
      return rpcUrlFlag;
    }

    try {
      const rpcUrl = this.ctx.getRpcUrl("aptos", networkId);
      if (!rpcUrl) {
        throw new Error(
          `Failed to get Aptos RPC URL for network ${networkId}. Try providing the --rpcUrl flag`
        );
      }
      return rpcUrl;
    } catch (error) {
      this.ctx.aptosDevnetRpc = "https://fullnode.devnet.aptoslabs.com/v1";
      return this.ctx.aptosDevnetRpc;
    }
  }

  normalizeAccountData(address: MaybeHexString, data: any) {
    return JSON.parse(
      JSON.stringify(
        { address: address.toString(), ...data },
        this.jsonReplacers
      )
    );
  }

  parseAddress(address: string) {
    return HexString.ensure(address);
  }

  getAccount(address: string): AptosAccount {
    return new AptosAccount(this.hexStringToBytes(address));
  }

  async getSigner(
    keypairPath: string,
    profileName = "default"
  ): Promise<AptosAccount> {
    const parseKeypairString = (fileString: string): AptosAccount => {
      // check if bytes
      const parsedFileString = fileString
        .trim()
        .replace(/\n/g, "")
        .replace(/\s/g, "");
      const bytesRegex = /^\[(\s)?[0-9]+((\s)?,(\s)?[0-9]+){31,}\]/g;
      if (bytesRegex.test(parsedFileString)) {
        return new AptosAccount(new Uint8Array(JSON.parse(parsedFileString)));
      }

      // check if hex
      const hexRegex = /^(0x|0X)?[a-fA-F0-9]{64}/g;
      if (hexRegex.test(parsedFileString)) {
        return new AptosAccount(this.hexStringToBytes(parsedFileString));
      }

      // check if base64 encoded
      const base64Regex =
        /^(?:[A-Za-z\d+\/]{4})*(?:[A-Za-z\d+\/]{3}=|[A-Za-z\d+\/]{2}==)?/g;
      if (base64Regex.test(parsedFileString)) {
        return new AptosAccount(
          new Uint8Array(Buffer.from(parsedFileString, "base64"))
        );
      }

      throw new Error(`Failed to derive secret key from input file`);
    };

    let errors: any[] = [];

    // first check if file is a yaml config
    if (keypairPath.endsWith(".yaml")) {
      try {
        const parsedYaml = YAML.parse(fs.readFileSync(keypairPath, "utf8"));
        if (
          "profiles" in parsedYaml &&
          profileName in parsedYaml.profiles &&
          "private_key" in parsedYaml.profiles.default
        ) {
          return new AptosAccount(
            this.hexStringToBytes(parsedYaml.profiles[profileName].private_key)
          );
        }
      } catch (error) {
        throw new Error(
          `AptosAccount provided in yaml format but failed to parse privateKey: ${error}`
        );
      }
    }

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
      `Failed to load Aptos keypair ${keypairPath}\n${errors
        .map((e) => (e as any).toString())
        .join("\n")}`
    );
  }

  toUrl(signature: string) {
    return `https://explorer.devnet.aptos.dev/txn/${signature}`;
  }

  hexStringToBuffer(hexString: string): Buffer {
    return Buffer.from(
      hexString.toLowerCase().startsWith("0x") ? hexString.slice(2) : hexString,
      "hex"
    );
  }

  hexStringToBytes(hexString: string): Uint8Array {
    return new Uint8Array(this.hexStringToBuffer(hexString));
  }

  jsonReplacers(key: any, value: any) {
    if (typeof value === "string" && (key === "name" || key === "metadata")) {
      return Buffer.from(
        value.toLowerCase().startsWith("0x") ? value.slice(2) : value,
        "hex"
      ).toString("utf8");
    }

    if (
      !value ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    } else {
      if (value instanceof Big) {
        return value.toString();
      }
      if (isBN(value)) {
        return value.toString(10);
      }
      if (
        ("value" in value && "dec" in value && "neg" in value) ||
        value instanceof AptosDecimal
      ) {
        const base = new SwitchboardDecimal(value.value, value.scale).toBig();
        const val = value.neg ? base.mul(-1) : base;
        return val.toString();
      }
    }

    return super.jsonReplacers(key, value);
  }

  deserializeJobData(jobData: string): OracleJob {
    const hexString = jobData.startsWith("0x")
      ? (jobData as string).slice(2)
      : jobData;

    // console.log(`${jobData} => ${trimmedData}`);
    // const bytes = trimmedData.match(/.{2}/g).map(Number);
    // console.log(`Deserialized [${bytes}]`);

    var numBytes = hexString.length / 2;
    var byteArray = new Uint8Array(numBytes);
    for (var i = 0; i < numBytes; i++) {
      byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }

    return OracleJob.decodeDelimited(Buffer.from(byteArray));
  }

  async loadQueue(queueHexString: string): Promise<[OracleQueueAccount, any]> {
    const account = new OracleQueueAccount(
      this.aptos,
      this.parseAddress(queueHexString),
      this.programId
    );
    const data = await account.loadData();

    return [account, data];
  }

  async loadAggregator(
    aggregatorHexString: string
  ): Promise<[AggregatorAccount, any]> {
    const account = new AggregatorAccount(
      this.aptos,
      this.parseAddress(aggregatorHexString),
      this.programId
    );
    const data = await account.loadData();

    return [account, data];
  }

  async loadCrank(crankHexString: string): Promise<[CrankAccount, any]> {
    const account = new CrankAccount(
      this.aptos,
      this.parseAddress(crankHexString),
      this.programId
    );
    const data = await account.loadData();

    return [account, data];
  }

  async loadOracle(oracleHexString: string): Promise<[OracleAccount, any]> {
    const account = new OracleAccount(
      this.aptos,
      this.parseAddress(oracleHexString),
      this.programId
    );
    const data = await account.loadData();

    return [account, data];
  }

  async loadJob(jobHexString: string): Promise<[JobAccount, any, OracleJob]> {
    const account = new JobAccount(
      this.aptos,
      this.parseAddress(jobHexString),
      this.programId
    );
    const data = await account.loadData();

    const oracleJob = this.deserializeJobData(data.data);

    return [account, data, oracleJob];
  }

  async loadState(): Promise<[StateAccount, any]> {
    const account = new StateAccount(
      this.aptos,
      this.stateAddress,
      new AptosAccount(),
      this.programId
    );
    const data = await account.loadData();

    return [account, data];
  }
}
