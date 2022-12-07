#!/bin/bash

# This script will build a Aptos queue environment with a set of feeds pushed onto the crank
# Example: ./scripts/aptos.sh -k ./.aptos/config.yaml -c devnet -n "Aptos Queue" -m 1337 -r 1337 -s 110 -u 11

Color_Off='\033[0m'  
Red='\033[0;31m'          # Red
Green='\033[0;32m'        # Green
Blue='\033[0;34m'         # Blue
Purple='\033[0;35m'       # Purple

set -e

stty sane # dont show backspace char during prompts

script_dir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
project_dir="$(dirname "$script_dir")"

### DEFAULTS
profile_name="default"
network_id="devnet"

queue_name="Solana Queue"
min_stake="0"
reward="0"
queue_size="100"
update_interval="10"

while getopts 'k:p:c:n:m:r:s:u:' OPTION; do
  case "$OPTION" in
    k)
      keypair="$OPTARG"
      ;;
    p)
      profile_name="$OPTARG"
      echo -e "${Blue}Profile:${Color_Off} $profile_name"
      ;;
    c)
      network_id="$OPTARG"
      if [[ "$network_id" != "devnet" && "$network_id" != "testnet" ]]; then
        echo "invalid Network ID ($CLUSTER) - [devnet or testnet]"
        exit 1
      fi
      ;;
    n)
      queue_name="$OPTARG"
      ;;
    m)
      min_stake="$OPTARG"
      ;;
    r)
      reward="$OPTARG"
      ;;
    s)
      queue_size="$OPTARG"
      ;;
    u)
      update_interval="$OPTARG"
      ;;
    ?)
      printf "\nDescription:\nCommand line script to create an Aptos Switchboard environment\n\nUsage:\n$(basename \$0) [-k keypairPath] [-p profileName] [-c devent|testnet] [-n name] [-m minStake] [-r reward] [-s queueSize] [-u updateInterval]\n\nOptions:\n"
      echo "-k keypairPath, filesystem path to Aptos config.yaml"
      echo "-p profileName, Aptos profile defaults to 'default'"
      printf "\n\nExample:\n\t./scripts/aptos.sh -k ./.aptos/config.yaml -c devnet -n \"Aptos Queue\" -m 1337 -r 1337 -s 110 -u 11\n"
      exit 1
      ;;
  esac
done
shift "$(($OPTIND -1))"



declare -a feeds=(
  "$project_dir/directory/jobs/btc"
  "$project_dir/directory/jobs/eth"
  "$project_dir/directory/jobs/near"
  "$project_dir/directory/jobs/sol"
  "$project_dir/directory/jobs/usdc"
  "$project_dir/directory/jobs/usdt"
)

if [[ -z "${keypair}" ]]; then
  read -rp "Enter the path of the aptos secretKey to sign transactions: " keypair
fi

echo -e "${Blue}Keypair:${Color_Off} $keypair"
echo -e "${Blue}Profile:${Color_Off} $profile_name"
echo -e "${Blue}Network:${Color_Off} $network_id"
echo -e "${Blue}Queue Name:${Color_Off} $queue_name"
echo -e "${Blue}Min Stake:${Color_Off} $min_stake"
echo -e "${Blue}Reward:${Color_Off} $reward"
echo -e "${Blue}Size:${Color_Off} $queue_size"
echo -e "${Blue}Update Interval:${Color_Off} $update_interval"
echo

envFilename="aptos.${queue_name// /_}.env"
if test -f "$envFilename"; then
    echo "$envFilename exists."
    exit 1
fi

sbv2 solana aggregator create F8ce7MsckeZAbAGmxjJNetxYXQa9mKr9nnrC3qKubyYy \
    --keypair ~/.config/solana/id.json \
    --crankKey GN9jjCy2THzZxhYqZETmPM3my8vg4R5JyNkgULddUMa5 \
    --name "My_Test_Feed" \
    --updateInterval 10 \
    --minOracles 1 \
    --batchSize 1 \
    --leaseAmount 1.337 \
    --job ./directory/jobs/btc/binanceCom.jsonc \
    --job ./directory/jobs/btc/kraken.jsonc \
    --job ./directory/jobs/btc/bitfinex.jsonc \
    --json \
    --verbose > My_Test_Feed.json


sbv2 solana queue create \
    --keypair "$keypair" \
    --size "$queue_size" \
    --name "$queue_name" \
    --reward "$reward" \
    --minStake "$min_stake" \
    --oracleTimeout 300 \
    --slashingEnabled \
    --permissionedFeeds \
    --unpermissionedVrf \
    --enableBufferRelayers \
    --feedProbationPeriod 100 \
    --consecutiveFeedFailureLimit 500 \
    --consecutiveOracleFailureLimit 500 \
    --json \
    --verbose > My_Test_Queue.json
# Read json file and get publicKey field
