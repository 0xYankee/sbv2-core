import { Flags } from "@oclif/core";
import { Input } from "@oclif/parser";
import { EscrowAccount } from "@switchboard-xyz/near.js";
import { AptosAccount } from "aptos";
import { AuthorityMismatch } from "../types";
import { AptosBaseCommand as BaseCommand } from "./BaseCommand";

export abstract class AptosWithSignerBaseCommand extends BaseCommand {
  static flags = {
    ...BaseCommand.flags,
    keypair: Flags.string({
      description: "Path to AptosAccount keypair or config.yaml file",
      required: true,
    }),
    profileName: Flags.string({
      description:
        "If --keypair is pointing to a yaml file, provide an optional profile to load. If none provided, default will be used",
      default: "default",
    }),
  };

  public hasSigner = true;

  public signer: AptosAccount;

  async init() {
    await super.init();
    const { flags } = await this.parse((<Input<any>>this.constructor) as any);
    BaseCommand.flags = flags as any;

    this.signer = await this.getSigner(
      (flags as any).keypair,
      (flags as any).profileName
    );

    await this.faucet.fundAccount(this.signer.address(), 10000);

    this.logConfig({ signer: this.signer.address().toString() }, false);
  }

  async getAuthority(
    authorityFlag?: string,
    expectedAuthority?: string
  ): Promise<AptosAccount> {
    const authority = authorityFlag
      ? await this.getSigner(authorityFlag)
      : this.signer;

    if (
      expectedAuthority &&
      expectedAuthority.toLowerCase() !==
        authority.address().hex().toLowerCase()
    ) {
      throw new AuthorityMismatch();
    }

    return authority;
  }
}
