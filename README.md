# Sbv2 Core

Umbrella repo for the multi-chain implementations of Switchboard V2.

Documentation: https://switchboard-xyz.github.io/sbv2-core/

## Setup

```bash
git clone --recurse-submodules https://github.com/switchboard-xyz/sbv2-core.git
cd sbv2-core
```

To add SDKs,

```bash
git submodule add https://github.com/switchboard-xyz/switchboard-v2 sdks/solana
```

To update SDKs,

```bash
# All
git submodule update --remote
# Single SDK
git submodule update --remote sdks/solana
```

To link the CLI,

```bash
cd cli && yarn link; cd ../;
```
