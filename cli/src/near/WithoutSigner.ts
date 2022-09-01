import { Flags } from "@oclif/core";
import { Input } from "@oclif/parser";
import { NearBaseCommand as BaseCommand } from "./BaseCommand";

export abstract class NearWithoutSignerBaseCommand extends BaseCommand {
  static flags = {
    ...BaseCommand.flags,
    // namedAccount: Flags.string({
    //   description: "Named account to load from your nearCredentialsDir",
    //   required: true,
    // }),
  };

  public hasSigner = false;

  async init() {
    await super.init();
    const { flags } = await this.parse((<Input<any>>this.constructor) as any);
    BaseCommand.flags = flags as any;
  }
}
