---

title: Update
---
request a new vrf result from a set of oracles

```asciidoc
USAGE
  $ sbv2 solana vrf update [VRFKEY] [-h] [-v] [-s] [--mainnetBeta | --cluster devnet|mainnet-beta|mainnet|localnet] [-u
    <value>] [--programId <value>] [--commitment confirmed|finalized|processed] [-k <value>] [--ledgerPath <value>
    --ledger] [--authority <value>]

ARGUMENTS
  VRFKEY  public key of the vrf account to request randomness for

FLAGS
  -h, --help             Show CLI help.
  -k, --keypair=<value>  keypair that will pay for onchain transactions. defaults to new account authority if no
                         alternate authority provided
  -s, --silent           suppress cli prompts
  -u, --rpcUrl=<value>   alternate RPC url
  -v, --verbose          log everything
  --authority=<value>    alternative keypair that is the VRF authority
  --cluster=<option>     the solana cluster to connect to
                         <options: devnet|mainnet-beta|mainnet|localnet>
  --commitment=<option>  [default: confirmed] transaction commitment level to use
                         <options: confirmed|finalized|processed>
  --ledger               enable ledger support
  --ledgerPath=<value>   HID path to the ledger
  --mainnetBeta          WARNING: use mainnet-beta solana cluster
  --programId=<value>    alternative Switchboard program ID to interact with

DESCRIPTION
  request a new vrf result from a set of oracles

ALIASES
  $ sbv2 solana vrf update
  $ sbv2 solana vrf open-round

EXAMPLES
  $ sbv2 solana vrf request
```
