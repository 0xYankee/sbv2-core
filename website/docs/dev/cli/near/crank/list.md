---

title: List
---
pop the crank

```asciidoc
USAGE
  $ sbv2 near crank list [CRANKADDRESS] [-h] [-v] [-s] [--networkId testnet|mainnet|betanet|localnet] [--programId
    <value>] [-u <value>] [--nearCredentialsDir <value>]

ARGUMENTS
  CRANKADDRESS  address of the crank in Uint8 or Base58 encoding

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

DESCRIPTION
  pop the crank

ALIASES
  $ sbv2 near pop crank
```
