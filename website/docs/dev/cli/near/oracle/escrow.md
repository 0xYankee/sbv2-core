---

title: Escrow
---
view an aggregators escrow state

```asciidoc
USAGE
  $ sbv2 near oracle escrow [ORACLEADDRESS] [-h] [-v] [-s] [--networkId testnet|mainnet|betanet|localnet] [--programId
    <value>] [-u <value>] [--nearCredentialsDir <value>] [--json]

ARGUMENTS
  ORACLEADDRESS  address of the aggregator in Uint8 or Base58 encoding

FLAGS
  -h, --help                    Show CLI help.
  -s, --silent                  suppress cli prompts
  -u, --rpcUrl=<value>          alternate RPC url
  -v, --verbose                 log everything
  --nearCredentialsDir=<value>  [default: /Users/gally/.near-credentials] Alternative directory for near credentials.
                                Defaults to ~/.near-credentials
  --networkId=<option>          [default: testnet] Near network ID to connect to
                                <options: testnet|mainnet|betanet|localnet>
  --programId=<value>           [default: switchboard-v2.testnet] Switchboard programId on the selected Near networkId

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  view an aggregators escrow state
```
