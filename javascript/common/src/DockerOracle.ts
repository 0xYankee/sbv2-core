import { ChildProcess, execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { sleep } from "./utils";

// try not to allow duplicate env flags to docker command
const INVALID_ENV_KEYS = [
  "CHAIN",
  "ORACLE_KEY",
  "RPC_URL",
  "APTOS_RPC_URL",
  "NEAR_RPC_URL",
  "SOLANA_RPC_URL",
  "APTOS_PID",
  "TASK_RUNNER_SOLANA_RPC",
  "NEAR_NAMED_ACCOUNT",
  "CLUSTER",
  "VERBOSE",
  "DEBUG",
];

export interface IOracleBaseConfig {
  chain: "aptos" | "near" | "solana";
  network: "localnet" | "devnet" | "testnet" | "mainnet" | "mainnet-beta";
  rpcUrl: string;
  oracleKey: string;
  secretPath: string;
  // task runner config
  taskRunnerSolanaRpc?: string;
  // docker config
  arch?: "linux/arm64" | "linux/amd64";
  // extra env vars
  envVariables?: Record<string, string>;
  // extra flags to pass to docker run
  dockerRunFlags?: Array<string>;
}

export type ISolanaOracleConfig = {};

export type IAptosOracleConfig = {
  aptosPid?: string;
};

export type INearOracleConfig = {
  nearNamedAccount?: string;
};

export type IOracleConfig = IOracleBaseConfig &
  IAptosOracleConfig &
  INearOracleConfig &
  ISolanaOracleConfig;

function normalizeFsPath(fsPath: string) {
  return fsPath.startsWith("/") ||
    fsPath.startsWith("C:") ||
    fsPath.startsWith("D:")
    ? fsPath
    : fsPath.startsWith("~")
    ? path.join(os.homedir(), fsPath.slice(1))
    : path.join(process.cwd(), fsPath);
}

export class DockerOracle implements Required<IOracleConfig> {
  readonly chain: "aptos" | "near" | "solana";
  readonly network:
    | "localnet"
    | "devnet"
    | "testnet"
    | "mainnet"
    | "mainnet-beta";
  readonly envVariables: Record<string, string>;
  readonly dockerRunFlags: Array<string>;
  readonly arch: "linux/arm64" | "linux/amd64";
  readonly rpcUrl: string;
  readonly oracleKey: string;
  readonly secretPath: string;
  // task runner config
  readonly taskRunnerSolanaRpc: string;
  // aptos oracle config
  readonly aptosPid: string;
  // near oracle config
  readonly nearNamedAccount: string;

  readonly image: string;
  readonly args: string[];
  logs: string[] = [];
  readonly logFile: string;
  dockerOracleProcess?: ChildProcess;
  isActive = true;
  readonly timestamp: number = Date.now();

  onDataCallback: (data: any) => void;
  onErrorCallback: (error: Error) => void;
  onCloseCallback: (code: number, signal: NodeJS.Signals) => void;

  constructor(
    readonly config: IOracleConfig,
    readonly nodeImage: string,
    readonly switchboardDirectory = path.join(process.cwd(), ".switchboard"),
    readonly silent = false
  ) {
    DockerOracle.isDockerRunning();
    // set config
    this.chain = config.chain;
    this.network = config.network;
    this.arch = config.arch ?? "linux/amd64";
    this.envVariables = config.envVariables ?? {};
    this.dockerRunFlags = config.dockerRunFlags ?? [];
    this.rpcUrl = config.rpcUrl;
    if (this.rpcUrl.includes("localhost")) {
      this.rpcUrl = this.rpcUrl.replace("localhost", "host.docker.internal");
    }
    if (this.rpcUrl.includes("0.0.0.0")) {
      this.rpcUrl = this.rpcUrl.replace("0.0.0.0", "host.docker.internal");
    }
    this.oracleKey = config.oracleKey;
    this.secretPath = normalizeFsPath(config.secretPath);

    // task runner config
    this.taskRunnerSolanaRpc =
      config.taskRunnerSolanaRpc ?? "https://api.mainnet-beta.solana.com";

    // aptos config
    this.aptosPid = config.aptosPid ?? "";
    if (this.chain === "aptos" && !this.aptosPid) {
      throw new Error(`Need to provide 'aptosPid' if chain is set to 'aptos'`);
    }

    // near config
    this.nearNamedAccount = config.nearNamedAccount ?? "";
    if (this.chain === "near" && !this.nearNamedAccount) {
      throw new Error(
        `Need to provide 'nearNamedAccount' if chain is set to 'near'`
      );
    }

    // log config
    if (!fs.existsSync(this.switchboardDirectory)) {
      fs.mkdirSync(this.switchboardDirectory, { recursive: true });
    }
    this.logFile = path.join(
      this.switchboardDirectory,
      `docker.${this.nodeImage}.${Math.floor(this.timestamp / 1000)}.log`
    );

    // build image name from a hash of provided args
    const shaHash = crypto.createHash("sha256");
    shaHash.update(
      Buffer.from(
        [
          this.chain,
          this.network,
          this.rpcUrl,
          this.oracleKey,
          this.secretPath,
          this.taskRunnerSolanaRpc,
          this.aptosPid,
          this.arch,
          this.nodeImage,
        ].join(" ") + JSON.stringify(this.envVariables)
      )
    );
    const hash = shaHash.digest().toString("hex").slice(0, 16);

    this.image = `sbv2-${this.chain}-${this.network}-${this.nodeImage.replace(
      "dev-v2-",
      ""
    )}-${hash}`;

    // get image args
    this.args = this.getArgs();

    // callback config
    this.onDataCallback = (data) => {
      this.logs.push(data.toString());
      if (!this.silent) {
        console.log(`\u001B[34m${data.toString()}\u001B[0m`);
      }
    };
    this.onErrorCallback = (error) => {
      this.logs.push(error.toString());
      if (!this.silent) {
        console.error(`\u001B[31m${error.toString()}\u001B[0m`);
      }
    };
    this.onCloseCallback = (code, signal) => {
      this.logs.push(`Exit code ${code} received`);
      this.saveLogs();
      if (!this.isActive) {
        return;
      }

      // if reboot from no RPC or if image already exists
      if (code === 0 || code === 125) {
        this.startOracle();
      } else if (!this.silent) {
        console.error(
          `\u001B[31mDocker image exited with code ${code}\u001B[0m`
        );
        console.log(`\u001B[34m${"Restarting oracle ..."}\u001B[0m`);
        this.startOracle();
      } else if (code !== 0 && code !== 1) {
        console.error(
          `\u001B[31mDocker image exited with code ${code}\u001B[0m`
        );
      }
    };
  }

  public static isDockerRunning() {
    // Check docker is running
    try {
      execSync(`docker ps`, { stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) {
      throw new Error(`Is Docker running?`);
    }
  }

  /**
   * Start a Docker process with the oracle running. If an existing oracle is detected, it will re-attach to the container.
   */
  start() {
    // Kill all existing switchboard oracles
    try {
      if (os.type() === "Windows_NT") {
        execSync(
          `FOR /F "tokens=*" %i IN ('docker ps -q -f "ancestor=switchboardlabs/node"') DO (docker container stop %i)`,
          { stdio: ["pipe", "pipe", "pipe"], shell: "powershell.exe" }
        );
      } else {
        execSync(
          `docker container stop $(docker ps | grep "switchboardlabs/node" | awk '{ print $1 }')`,
          { stdio: ["pipe", "pipe", "pipe"] }
        );
      }
    } catch (error) {
      const errorString = `Failed to stop existing docker containers, ${error}`;
      if (
        !errorString.includes(
          `"docker container stop" requires at least 1 argument`
        )
      ) {
        console.error(errorString);
      }
    }

    // we always try to create the oracle first
    // if already exist, attach to it
    this.createOracle();
  }

  /** Stop the docker oracle process */
  stop() {
    this.isActive = false;
    this.saveLogs();
    try {
      execSync(`docker container stop ${this.image}`, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      return true;
    } catch (error) {
      console.error(`Failed to stop docker oracle, ${error}`);
      return false;
    }
  }

  /** Force kill the child_process */
  kill(exitCode = 1) {
    this.isActive = false;
    this.saveLogs();
    if (this.dockerOracleProcess) {
      const killed = this.dockerOracleProcess.kill(exitCode);
      if (!killed) {
        throw new Error(`Failed to kill the docker oracle process`);
      }
    }
  }

  /**
   * Start a Docker process with the oracle running and await for the oracle to signal readiness. If an existing oracle is detected, it will re-attach to the container.
   *
   * @param timeout - the number of seconds to await for the oracle to start successfully heartbeating
   *
   * @throws if timeout is exceeded and oracle heartbeat was never detected
   */
  public async startAndAwait(timeout: number = 60) {
    this.start();
    await this.awaitReady(timeout);
  }

  private getArgs(): string[] {
    const baseFlags: Array<string> = [
      `--network=host`,
      `--name ${this.image}`,
      `--platform=${this.arch}`,
      `--health-interval 10s`,
      `--health-start-period 10s`,
      `-e ORACLE_KEY=${this.oracleKey}`,
      `-e TASK_RUNNER_SOLANA_RPC=${this.taskRunnerSolanaRpc}`,
      `-e VERBOSE=1`,
      `-e DEBUG=1`,
    ];

    const extraFlags: Array<string> = []; // we could use a Set to prevent duplicates
    for (const [key, value] of Object.entries(this.envVariables)) {
      if (!INVALID_ENV_KEYS.includes(key)) {
        extraFlags.push(`-e ${key.toUpperCase()}=${value}`);
      }
    }

    if (os.type() === "Linux") {
      extraFlags.push(`--add-host=host.docker.internal:host-gateway`);
    }

    const allFlags = Array.from(
      new Set([...baseFlags, ...extraFlags, ...this.dockerRunFlags])
    );

    if (this.chain === "aptos") {
      return [
        "run",
        ...allFlags,
        `-e CHAIN=aptos`,
        `-e APTOS_RPC_URL=${this.rpcUrl}`,
        `-e APTOS_PID=${this.aptosPid}`,
        `-e APTOS_FS_PAYER_SECRET_PATH=/home/node/sbv2-oracle/payer_secrets.json`,
        `--mount type=bind,source=${this.secretPath},target=/home/node/sbv2-oracle/payer_secrets.json`,
        `switchboardlabs/node:${this.nodeImage}`,
      ].filter(Boolean);
    }

    if (this.chain === "near") {
      return [
        "run",
        ...allFlags,
        `-e CHAIN=near`,
        `-e NEAR_RPC_URL=${this.rpcUrl}`,
        `-e NEAR_NETWORK_ID=${this.network}`,
        `-e NEAR_NAMED_ACCOUNT=${this.nearNamedAccount}`,
        `-e NEAR_FS_PAYER_SECRET_PATH=/home/node/sbv2-oracle/payer_secrets.json`,
        `--mount type=bind,source=${this.secretPath},target=/home/node/sbv2-oracle/payer_secrets.json`,
        `switchboardlabs/node:${this.nodeImage}`,
      ].filter(Boolean);
    }

    if (this.chain === "solana") {
      return [
        "run",
        ...allFlags,
        `-e CHAIN=solana`,
        `-e RPC_URL=${this.rpcUrl}`,
        `-e CLUSTER=${this.network}`,
        `-e SOLANA_FS_PAYER_SECRET_PATH=/home/node/sbv2-oracle/payer_secrets.json`,
        `--mount type=bind,source=${this.secretPath},target=/home/node/sbv2-oracle/payer_secrets.json`,
        `switchboardlabs/node:${this.nodeImage}`,
      ].filter(Boolean);
    }

    throw new Error(`DockerOracle chain must be 'aptos', 'near', or 'solana'`);
  }

  private createOracle() {
    // this.ready = false;
    this.dockerOracleProcess = spawn("docker", this.args, {
      shell: true,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    this.dockerOracleProcess!.stdout!.on("message", this.onDataCallback);
    this.dockerOracleProcess!.stderr!.on("error", (error) => {
      if (
        !error
          .toString()
          .includes(
            `The container name "/sbv2-${this.nodeImage}" is already in use by container`
          )
      ) {
        console.error(`\u001B[31m${error.toString()}\u001B[0m`);
        this.logs.push(error.toString());
      }
    });
    this.dockerOracleProcess.on("close", this.onCloseCallback);
    this.dockerOracleProcess.on("exit", this.onCloseCallback);
  }

  private startOracle() {
    // this.ready = false;
    this.dockerOracleProcess = spawn(
      "docker",
      ["start", "--attach", this.image],
      {
        shell: true,
        env: process.env,
        stdio: this.silent ? undefined : ["inherit", "pipe", "pipe"],
      }
    );

    this.dockerOracleProcess!.stdout!.on("message", this.onDataCallback);
    this.dockerOracleProcess!.stderr!.on("error", this.onErrorCallback);
    this.dockerOracleProcess!.on("close", this.onCloseCallback);
    this.dockerOracleProcess!.on("exit", this.onCloseCallback);
  }

  /** Save an array of oracle logs */
  saveLogs(): void {
    const filteredLogs = this.logs.filter((l) => Boolean);
    if (filteredLogs.length > 0) {
      if (fs.existsSync(this.logFile)) {
        fs.appendFileSync(this.logFile, filteredLogs.join("\r\n"));
        this.logs = [];
      } else {
        fs.writeFileSync(this.logFile, filteredLogs.join("\r\n"));
        this.logs = [];
      }
    }
  }

  public static checkDockerHealthStatus(containerName: string): boolean {
    try {
      const inspectResponseBuffer = execSync(
        `docker inspect --format='{{json .State.Health.Status}}' ${containerName}`,
        { stdio: ["pipe", "pipe", "pipe"] }
      );
      const response = Buffer.from(inspectResponseBuffer)
        .toString("utf-8")
        .replace(/\"/g, "") // remove double quotes
        .trim(); // trim new line
      return response === "healthy" ? true : false;
    } catch (error) {}

    return false;
  }

  checkDockerHealthStatus(): boolean {
    return DockerOracle.checkDockerHealthStatus(this.image);
  }

  /**
   * @param timeout - the number of seconds to await for the oracle to start successfully heartbeating
   *
   * @throws if timeout is exceeded and oracle heartbeat was never detected
   */
  async awaitReady(timeout: number = 60): Promise<void> {
    let numRetries = timeout * 2;
    while (numRetries) {
      try {
        const status = this.checkDockerHealthStatus();
        if (status === true) {
          return;
        }
      } catch {}

      --numRetries;
      await sleep(500);
    }

    throw new Error(`Failed to start Switchboard oracle in ${timeout} seconds`);
  }
}
