| Field                         | Type                                                      | Description                                                              |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| addr                          | HexString                                                 |                                                                          |
| name                          | u8[]                                                      |                                                                          |
| metadata                      | u8[]                                                      |                                                                          |
| authority                     | HexString                                                 | The account delegated as the authority for making changes.               |
| oracleTimeout                 | u64                                                       |                                                                          |
| reward                        | u64                                                       | Rewards to provide oracles and round openers on this queue.              |
| minStake                      | u64                                                       | The minimum amount of stake oracles must present to remain on the queue. |
| slashingEnabled               | bool                                                      |                                                                          |
| varianceToleranceMultiplier   | [SwitchboardDecimal](/aptos/idl/types/SwitchboardDecimal) |                                                                          |
| feedProbationPeriod           | u64                                                       |                                                                          |
| consecutiveFeedFailureLimit   | u64                                                       |                                                                          |
| consecutiveOracleFailureLimit | u64                                                       |                                                                          |
| unpermissionedFeedsEnabled    | bool                                                      |                                                                          |
| lockLeaseFunding              | bool                                                      |                                                                          |
| maxSize                       | u64                                                       |                                                                          |
| saveConfirmationReward        | u64                                                       |                                                                          |
| saveReward                    | u64                                                       |                                                                          |
| openRoundReward               | u64                                                       |                                                                          |
| slashingPenalty               | u64                                                       |                                                                          |
