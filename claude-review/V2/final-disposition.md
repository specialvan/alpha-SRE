# V2 Review Final Disposition

## 结论

最新的 [V2-review.md](</D:/workspace/alpha-SRE/claude-review/V2/V2-review.md>) 已经不再是单纯“把实现整体打回”的状态，而是和我们的 counter-review 明显收敛了。

关键变化是它新增了 `Response to Codex Counter-Review` 一节，明确接受了下面三点修正：

1. 当前仓库不是空骨架，而是一个可执行的 V1 baseline。
2. `causal_validation.py`、`gate.py`、`integration.py` 不是缺席，而是语义层级仍停留在 V1。
3. V2 的正确推进方式是分阶段语义升级，而不是平铺式补丁。

因此，这轮 review 的最终处置不应再围绕“V1 到底有没有落地”纠缠，而应直接转入“V2 的 blocker 如何按层拆解并实现”。

## 最终评审口径

这轮评审的最终统一口径可以定为：

> 仓库已经具备可执行的 V1 replay / validation / gate / integration control loop，但 V2 还没有完成从 event-centric baseline 到 narrative-state-centric SRE kernel 的升级，因此当前状态仍应维持 request changes，直到核心语义 blocker 被补齐。

这句话同时保留了两件事：

- 不否认现有工程落地
- 不放松 V2 的真实合并门槛

## 已确认的 merge blockers

下面这些现在已经可以视为双方收敛后的 blocker 集合。

### B1. 缺少 narrative-native state kernel

必须补上一等 narrative state primitives，而不是继续依赖当前角色/记忆/规则的间接表达：

- `FactState`
- `BeliefState`
- `PlotThreadState` 或 obligation state
- `CapabilityState`
- `VisibilityEdgeState`

影响文件：

- `alpha_sre/state.py`
- `alpha_sre/serialization.py`
- `narrative_state_schema.md`

### B2. Replay 没有 locked post-state verification

`ReplaySession.post_state_snapshot` 目前还没有被 replay 结果真正对账。V2 不能只证明 event chain 能重放，还必须证明重放结果与锁定终态一致。

影响文件：

- `alpha_sre/replay.py`

### B3. ObservationFrame 还没有变成可执行语义约束

当前 observation frame 里的 `visible_fact_ids`、`believed_fact_ids`、`active_world_rule_ids` 仍然主要是合同字段，不是 replay authoritative semantics。

影响文件：

- `alpha_sre/replay.py`
- `alpha_sre/causal_validation.py`

### B4. Causal taxonomy 还不是 narrative-native

当前因果验证已经存在，但还不能稳定区分：

- hidden fact leak
- false belief conflict
- capability violation
- inactive rule misuse
- unresolved plot obligation
- replay/post-state mismatch attribution

影响文件：

- `alpha_sre/causal_validation.py`
- `alpha_sre/replay.py`

### B5. Metrics / gate 仍然沿用 V1 语义

当前核心问题不是“有没有指标”和“有没有 gate”，而是它们还没有建立在 narrative check units 和 narrative failure classes 上。

必须补：

- denominator migration
- checked unit counters 扩展
- gate hard/soft semantics 升级

影响文件：

- `alpha_sre/metrics.py`
- `alpha_sre/gate.py`

## 目前不应抢成 blocker 的项

这些问题存在，但不应该排在 B1-B5 前面。

### N1. Integration drift surface 扩大

`integration.py` 的 drift signature 当前确实太窄，但它依赖上游 narrative kernel 和 semantic replay 先成立。

优先级：

- P3 hardening

### N2. Incident lineage 更细化

incident export 的语义精度确实受上游 replay/validation 限制，但这是上游升级后的传导问题，不是最先下手点。

优先级：

- P3 hardening

### N3. 完整 schema evolution policy

序列化兼容策略需要做，但如果 narrative kernel 本体还没稳定，先把迁移策略写死会反复返工。

优先级：

- P0 后半段到 P1 之间

## 下一阶段实现切片

下一版不应该继续做“分散修补”，而应该按一个完整切片推进。

建议直接把下一阶段 PR 定位为：

## PR Slice A: Narrative Kernel Foundation

范围：

- `alpha_sre/state.py`
- `alpha_sre/serialization.py`
- `tests/`
- `narrative_state_schema.md`

目标：

1. 新增一等 narrative primitives。
2. 把这些 primitives 纳入 `NarrativeSnapshot`。
3. 补齐 round-trip。
4. 补齐 snapshot-level validation。
5. 加入 golden snapshots，为后续 P1 semantic replay 提供固定状态基线。

这个切片不应只做字段添加，而应满足下面验收标准。

## Slice A 验收标准

### 状态表达

必须能直接表达至少这些场景：

- hidden fact 存在，但对 POV 不可见
- 角色 belief 与 world fact 冲突
- 某动作当前 capability 不成立
- 某 plot obligation 已创建但未 fulfill
- 某 visibility edge 只在部分角色之间成立

### 序列化

必须满足：

- 新 state round-trip 不丢字段
- 旧 snapshot 至少有清晰的兼容策略或显式失败策略

### 校验

`NarrativeSnapshot.validate()` 至少要新增：

- fact / belief 引用完整性
- visibility edge 端点完整性
- capability 引用角色完整性
- plot thread / obligation 状态合法性
- belief 指向 fact 的结构一致性

### 测试

必须新增 golden / failure-class-first tests，而不是只补 happy path。

最低建议样例：

- `test_snapshot_supports_fact_belief_visibility_kernel`
- `test_snapshot_rejects_belief_pointing_to_unknown_fact`
- `test_snapshot_rejects_visibility_edge_with_unknown_actor`
- `test_snapshot_rejects_capability_for_unknown_actor`
- `test_snapshot_rejects_invalid_plot_obligation_state`

## Slice B 预告

在 Slice A 落地后，下一切片再进入 semantic replay：

- locked post-state verification
- observation frame executable semantics
- hidden fact leak vs false belief conflict
- capability violation / inactive rule / obligation miss

这样推进，才能避免“状态还没稳定，replay/gate 已经先写了一堆特判”。

## 给后续 reviewer 的一句话

如果 Claude 或其他 reviewer 再介入，建议统一用下面这句作为评审前提：

> Please review V2 as a phased semantic upgrade of an already working V1 control loop, not as a greenfield implementation. The review focus should be whether the new slice establishes narrative-native authority at the intended layer, not whether the repository already contains replay/gate/integration scaffolding.

## 当前建议

这轮 review 现在已经足够清楚，不需要继续写更多“评论回复”了。更高价值的动作是直接开始 `Slice A`，把 narrative kernel 基础层做扎实。
