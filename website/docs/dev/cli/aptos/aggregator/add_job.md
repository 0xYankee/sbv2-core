---

title: Add Job
---
add a job to an aggregator

```asciidoc
USAGE
  $ sbv2 aptos aggregator add job [AGGREGATORHEXSTRING] --keypair <value> [-h] [-v] [-s] [--networkId devnet|testnet]
    [--programId <value>] [--stateAddress <value>] [-u <value>] [--profileName <value>] [-a <value>] [--name <value> |
    --jobKey <value>] [--metadata <value> | ] [--jobDefinition <value> | ] [--jobWeight <value>]

ARGUMENTS
  AGGREGATORHEXSTRING  HexString address of the aggregator

FLAGS
  -a, --authority=<value>  alternate keypair that is the authority for the aggregator
  -h, --help               Show CLI help.
  -s, --silent             suppress cli prompts
  -u, --rpcUrl=<value>     alternate RPC url
  -v, --verbose            log everything
  --jobDefinition=<value>  filesystem path of job json definition file
  --jobKey=<value>         public key of an existing job account to add to an aggregator
  --jobWeight=<value>      [default: 1] job weight
  --keypair=<value>        (required) Path to AptosAccount keypair or config.yaml file
  --metadata=<value>       metadata of the job account
  --name=<value>           name of the job account
  --networkId=<option>     [default: devnet] Aptos network to connect to
                           <options: devnet|testnet>
  --profileName=<value>    [default: default] If --keypair is pointing to a yaml file, provide an optional profile to
                           load. If none provided, default will be used
  --programId=<value>      [default: 0xb27f7bbf7caf2368b08032d005e8beab151a885054cdca55c4cc644f0a308d2b] Switchboard
                           programId on the selected Aptos network
  --stateAddress=<value>   [default: 0xb27f7bbf7caf2368b08032d005e8beab151a885054cdca55c4cc644f0a308d2b] Switchboard
                           state address

DESCRIPTION
  add a job to an aggregator

ALIASES
  $ sbv2 aptos aggregator job add
```
