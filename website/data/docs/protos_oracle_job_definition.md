---
source: "https://docs.switchboard.xyz/feeds"
embedding-id: "protos-oracle-job-definition"
---
The OracleJob protobuf stores a collection of SwitchboardTasks that get executed sequentially to produce a numeric result. A SwitchboardTask can be thought of as a single unit of work in order to incrementally yield a result. 
Typically the first task in a job will fetch a result with subsequent tasks responsible for transforming or performing conditional logic. 
Some examples of a SwitchboardTask are `httpTask`, `websocketTask`, `jsonParseTask`, `cacheTask`, `addTask`, `multiplyTask`, or `valueTask`.