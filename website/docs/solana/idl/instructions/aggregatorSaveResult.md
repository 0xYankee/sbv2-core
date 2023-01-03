Oracle saving result for a feed update request to an aggregator round.

## Accounts

| Name             | isMut | isSigner | Description |
| ---------------- | ----- | -------- | ----------- |
| aggregator       | true  | false    |             |
| oracle           | true  | false    |             |
| oracleAuthority  | false | true     |             |
| oracleQueue      | false | false    |             |
| queueAuthority   | false | false    |             |
| feedPermission   | true  | false    |             |
| oraclePermission | false | false    |             |
| lease            | true  | false    |             |
| escrow           | true  | false    |             |
| tokenProgram     | false | false    |             |
| programState     | false | false    |             |
| historyBuffer    | true  | false    |             |
| mint             | false | false    |             |

## Args

| Name   | Type                                                                       | Description |
| ------ | -------------------------------------------------------------------------- | ----------- |
| params | [AggregatorSaveResultParams](/solana/idl/types/aggregatorsaveresultparams) |             |
