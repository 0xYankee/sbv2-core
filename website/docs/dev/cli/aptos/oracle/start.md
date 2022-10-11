---

title: Start
---
start an aptos oracle in docker

```asciidoc
USAGE
  $ sbv2 aptos oracle start [ORACLEHEXSTRING] --keypair <value> [-h] [-v] [-s] [--networkId devnet|testnet] [--programId
    <value>] [--stateAddress <value>] [-u <value>] [--profileName <value>] [-a <value>]

ARGUMENTS
  ORACLEHEXSTRING  HexString address of the oracle

FLAGS
  -a, --authority=<value>  alternate named account that is the authority for the oracle
  -h, --help               Show CLI help.
  -s, --silent             suppress cli prompts
  -u, --rpcUrl=<value>     alternate RPC url
  -v, --verbose            log everything
  --keypair=<value>        (required) Path to AptosAccount keypair or config.yaml file
  --networkId=<option>     [default: devnet] Aptos network to connect to
                           <options: devnet|testnet>
  --profileName=<value>    [default: default] If --keypair is pointing to a yaml file, provide an optional profile to
                           load. If none provided, default will be used
  --programId=<value>      [default: 0xc9b4bb0b1f7a343687c4f8bc6eea36dd2a3aa8d654e640050ab5b8635a6b9cbd] Switchboard
                           programId on the selected Aptos network
  --stateAddress=<value>   [default: 0xc9b4bb0b1f7a343687c4f8bc6eea36dd2a3aa8d654e640050ab5b8635a6b9cbd] Switchboard
                           state address

DESCRIPTION
  start an aptos oracle in docker

ALIASES
  $ sbv2 aptos oracle start
```
