---

title: Create
---
create a buffer relayer account

```asciidoc
USAGE
  $ sbv2 solana buffer create [QUEUEKEY] [-h] [-v] [-s] [--mainnetBeta] [-u <value>] [--programId <value>] [--commitment
    confirmed|finalized|processed] [-k <value>] [-a <value>] [-n <value>] [--minUpdateDelaySeconds <value>]
    [--jobDefinition <value> | --jobKey <value>]

ARGUMENTS
  QUEUEKEY  oracle queue to create BufferRelayer account on

FLAGS
  -a, --authority=<value>          alternate keypair that will be the aggregator authority
  -h, --help                       Show CLI help.
  -k, --keypair=<value>            keypair that will pay for onchain transactions. defaults to new account authority if
                                   no alternate authority provided
  -n, --name=<value>               name of the buffer account
  -s, --silent                     suppress cli prompts
  -u, --rpcUrl=<value>             alternate RPC url
  -v, --verbose                    log everything
  --commitment=<option>            [default: confirmed] transaction commitment level to use
                                   <options: confirmed|finalized|processed>
  --jobDefinition=<value>          filesystem path to job definition
  --jobKey=<value>                 public key of existing job account
  --mainnetBeta                    WARNING: use mainnet-beta solana cluster
  --minUpdateDelaySeconds=<value>  [default: 30] minimum number of seconds between update calls
  --programId=<value>              alternative Switchboard program ID to interact with

DESCRIPTION
  create a buffer relayer account
```
