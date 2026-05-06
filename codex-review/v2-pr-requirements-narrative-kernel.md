# alpha-SRE V2 PR 需求

## 标题建议

`feat: land narrative kernel, semantic replay, and narrative-native consistency metrics`

## 背景

当前仓库已经完成了 V1 阶段的基础规格、原型模块和测试骨架，证明 `alpha-SRE` 不是纯文档包，而是一个已经具备 `state / replay / gate / incident / integration` 原型能力的叙事 SRE 控制面。

但本轮 review 暴露出的 4 个问题说明，系统虽然已经“能跑通原型链路”，还没有接近“完整叙事 SRE 可落地实现”：

1. replay 没有校验 locked post-state，因此不能证明复盘结果真正等于原始执行结果。
2. observation frame 还主要是描述性元数据，没有成为可执行的认知与可见性约束。
3. runtime state 无法表达核心叙事不变量，导致很多 narrative defect 根本不可表示、不可 replay、不可 gate。
4. metrics 仍带有传统 ops-style 聚合分母，导致 gate 判断更像 issue density 管理，而不是 narrative consistency 管理。

本 V2 PR 的目标不是做“最小可运行补丁”，而是把系统推进到下一层可执行基线：让 narrative state 成为一等公民，让 replay 具备语义复盘能力，让 metrics 和 gate 按叙事检查单元工作。

## 本 PR 要解决的问题

### Finding 1 对应问题

`ReplaySession.post_state_snapshot` 目前只参与 lineage 检查，不参与 replay 结果对账。

结果：

- 系统只能证明“事件链可以再跑一次”
- 不能证明“再跑一次得到了与原始执行一致的 post-state”
- deterministic replay 的最强保证缺失

### Finding 2 对应问题

`ObservationFrame` 中的 `visible_fact_ids`、`believed_fact_ids`、`active_world_rule_ids`、`allowed_event_types` 等字段当前大多不驱动执行语义。

结果：

- POV 知识边界不是可执行约束
- belief state 不是可执行约束
- active rule set 不是可执行约束
- replay 更像事件重放，而不是时间点语义复盘

### Finding 3 对应问题

`NarrativeSnapshot` 当前只能承载：

- characters
- relationships
- memories
- constraints
- world rules
- chapter intents

缺失的核心叙事状态包括：

- belief graph
- plot thread / plot obligation
- capability / action boundary
- location / presence
- explicit fact registry
- visibility graph

结果：

- 很多 narrative contradiction 没法进入状态面
- 很多 inconsistency 无法通过 replay 和 gate 被发现
- 规格声称要管理的叙事一致性，有一部分在当前执行层根本不可表达

### Finding 4 对应问题

`causality_break_rate` 和 `visibility_leak_rate` 等核心指标当前按 issue 总数归一。

结果：

- 一个真实严重的 narrative break 可以被大量低价值 issue 稀释
- gate 阈值响应的是 validation 噪声，而不是 narrative defect 密度
- metrics 更像 generic ops telemetry，而不是 narrative-native reliability signals

## PR 目标

本 PR 必须同时达成以下 4 个目标：

1. 让 runtime narrative state 能表达关键叙事不变量。
2. 让 replay 从“结构重放”升级为“语义复盘”。
3. 让 metrics 与 gate 基于 narrative check unit，而不是 issue volume。
4. 让测试与验收资产覆盖真实 narrative failure class，而不是只覆盖 happy-path 原型。

## 非目标

本 PR 不要求完成以下事项：

1. 不做 `alpha-autopilot` 的全量生产集成。
2. 不做 prose 到 state 的自动抽取器或全文解析器。
3. 不做所有 narrative defect 类型的一次性覆盖。
4. 不做完整编辑器工作流、审阅 UI 或生产监控面板。

这些不属于本 PR 的直接交付，但设计必须为后续集成保留稳定 contract。

## 设计原则

1. 不接受只新增文档字段但执行层不消费的“死字段”。
2. 不接受只新增 dataclass 但 replay / gate / metrics 没有判定语义的“假落地”。
3. 不接受只让测试通过而无法解释 narrative failure class 的“最小跑通”。
4. 任何新增指标都必须绑定明确分母和明确检查单元。
5. 任何新增状态都必须满足：可序列化、可验证、可 replay、可进入测试。

## 范围总览

本 PR 覆盖以下 5 个子系统：

1. narrative state kernel
2. semantic replay
3. causal validation
4. narrative-native metrics and gate semantics
5. regression and golden-case verification

## 一、Narrative State Kernel 改造要求

### 目标

扩展 `NarrativeSnapshot`，让它具备表达核心叙事不变量的能力，而不是只保存少量基础状态。

### 必须新增的一等公民状态

#### 1. Fact registry

需要显式建模 `FactState` 或等价结构。

最低要求字段：

- `fact_id`
- `fact_text`
- `fact_type`
- `introduced_by_event_id`
- `valid_from_event_id`
- `valid_until_event_id`
- `canonical_truth_status`
- `related_character_ids`
- `related_rule_ids`

作用：

- 让 visible / hidden / believed 指向稳定 fact id
- 让 replay 能以 fact 为单位检查知识边界
- 让 metrics 能以 fact-decision 为单位计算 leak rate

#### 2. Belief graph

需要显式建模角色主观信念，而不是把“知道了什么”混在 memory 或 prose 里。

最低要求字段：

- `belief_id`
- `holder_character_id`
- `fact_id`
- `belief_status`
- `confidence`
- `derived_from_event_id`
- `derived_from_memory_ids`
- `contradicts_fact_id`

至少支持的 `belief_status`：

- `certain`
- `suspected`
- `false`
- `retracted`

作用：

- 区分“隐藏事实泄漏”和“角色带着错误信念行动”
- 支持 belief conflict replay
- 支持 future knowledge 与 false belief 的差异诊断

#### 3. Plot thread / obligation state

需要显式建模剧情线程和未清偿叙事义务。

最低要求字段：

- `thread_id`
- `thread_type`
- `status`
- `introduced_by_event_id`
- `required_payoff_by`
- `blocking_event_ids`
- `resolution_event_id`
- `affected_characters`

至少支持的 `status`：

- `open`
- `active`
- `blocked`
- `resolved`
- `dropped`

作用：

- 支持“伏笔已创建但未兑现”
- 支持“事件发生后剧情 obligation 未传播”
- 支持 plot inconsistency 的结构化判定

#### 4. Capability / action boundary state

需要显式建模角色在某一时点可以做什么、不能做什么。

最低要求字段：

- `capability_id`
- `character_id`
- `action_type`
- `allowed`
- `source_rule_id`
- `source_constraint_id`
- `valid_from_event_id`
- `valid_until_event_id`

作用：

- 支持 impossible action 的可执行判定
- 让 observation frame 的 action window 与 persisted state 对齐
- 把“这个角色当时能不能做这件事”从文风问题提升为状态问题

#### 5. Visibility graph

需要显式建模 fact 到 actor 的可见性边界，而不是只在 observation frame 做一次性记录。

最低要求字段：

- `visibility_edge_id`
- `fact_id`
- `viewer_id`
- `visibility_status`
- `visibility_source`
- `valid_from_event_id`
- `valid_until_event_id`

至少支持的 `visibility_status`：

- `visible`
- `hidden`
- `narrator_only`
- `system_only`

作用：

- replay 可以核对 observation frame 与 persisted visibility graph 是否一致
- visibility leak 可以被定位到稳定状态源
- 后续 integration 可以读取统一 visibility source of truth

### 对现有状态模型的直接要求

以下现有结构需要增强：

#### `CharacterState`

至少新增：

- `belief_ids`
- `capability_ids`
- `current_location`
- `present_with_character_ids`

#### `WorldRuleState`

至少新增：

- `activation_status`
- `active_from_event_id`
- `authority_mode`

#### `NarrativeSnapshot`

至少新增：

- `facts`
- `beliefs`
- `plot_threads`
- `capabilities`
- `visibility_edges`

### 落地要求

必须同步更新：

- `alpha_sre/state.py`
- `alpha_sre/serialization.py`
- `alpha_sre/artifacts.py`
- 对应 round-trip tests
- `narrative_state_schema.md`
- `knowledge_visibility_spec.md`

## 二、Semantic Replay 改造要求

### 目标

让 replay 不只是应用事件，而是对“当时系统看到了什么、相信什么、允许做什么、结果是否与原始执行一致”做强约束验证。

### 1. 必须补齐 locked post-state verification

当 `ReplaySession.post_state_snapshot` 存在时，`ReplayEngine.replay_session()` 必须执行 replay result 与 locked post-state 的对账。

最低要求：

- 至少校验 `state_identity`
- 至少校验 narrative surface 上的结构化字段一致性
- 差异必须进入结构化 replay output
- 差异必须形成独立 failure classification 或独立 violation code

建议新增：

- `post_state_mismatch`
- `post_state_diff`
- `checked_post_state_surface_count`
- `mismatched_post_state_surface_count`

### 2. Observation frame 必须变成执行语义

以下字段必须在 replay 中真正驱动校验，而不仅是保存：

#### `visible_fact_ids`

要求：

- 依赖 fact 的行为或 outcome 必须能证明 fact 在 visible set 中，或由 narrator / system POV 合法持有
- 如果行为依赖 hidden fact，则判定为 visibility violation

#### `believed_fact_ids`

要求：

- 角色行为若声明基于 belief，则 replay 必须检查 belief 是否存在于 state 中
- 如果 belief 不存在但行为成立，判定为 belief construction gap
- 如果 belief 与 canonical fact 冲突，不应自动视为 leak；要区分 false belief 与 hidden fact leak

#### `active_world_rule_ids`

要求：

- 行为与 outcome 校验时，必须基于 active rule set 解释可行性
- 如果某个 action 只有在 inactive rule 下才成立，判定为 rule activation violation

#### `allowed_event_types` / `blocked_event_types`

要求：

- 当前已有 blocked 校验，V2 要求其与 capability state 对齐
- observation frame 的 action window 不能与 persisted capability state 矛盾

### 3. Replay 必须消费新 narrative state

至少要求 replay 在以下场景读取新状态：

1. 基于 `beliefs` 区分 hidden fact 与 false belief
2. 基于 `capabilities` 判定 impossible action
3. 基于 `plot_threads` 判定 thread unresolved / payoff missing
4. 基于 `visibility_edges` 判定 knowledge boundary
5. 基于 `facts` 提供稳定 evidence reference

### 4. Replay 新增 failure / diff 类型

至少新增以下结构化失败类别：

- `post_state_mismatch`
- `belief_conflict`
- `inactive_rule_use`
- `capability_violation`
- `plot_obligation_missed`
- `visibility_graph_mismatch`

### 落地要求

必须同步更新：

- `alpha_sre/replay.py`
- `alpha_sre/serialization.py`
- `replay_spec.md`
- `knowledge_visibility_spec.md`

## 三、Causal Validation 改造要求

### 目标

让 causal validation 不只看“有没有 prerequisite”，而是具备 narrative-native failure explanation。

### 必须新增的检查面

1. belief-based contradiction
2. capability-based impossible action
3. plot-thread propagation and payoff lifecycle
4. active-rule misuse
5. post-state replay mismatch attribution

### 新增 finding 要求

`CausalFinding` 或等价结构至少需要能表达：

- 失败是否来自 hidden fact 还是 false belief
- 失败是否来自 capability 缺失
- 失败是否来自 inactive rule
- 失败是否来自 unresolved plot obligation
- 失败是否来自 replayed state 与 locked post-state 不一致

### 落地要求

必须同步更新：

- `alpha_sre/causal_validation.py`
- `causal_validation_spec.md`
- 相应测试资产

## 四、Narrative-Native Metrics 与 Gate 改造要求

### 目标

核心指标必须按 narrative check unit 统计，而不是按 issue 总数统计。

### 必须替换的错误分母

以下计算方式必须被替换或升级：

#### `causality_break_rate`

禁止继续使用：

- `causality_breaks / total_validation_issues`

必须改为基于 narrative unit，例如：

- `causality_breaks / checked_outcomes`

#### `visibility_leak_rate`

禁止继续使用：

- `visibility_leaks / total_validation_issues`

必须改为基于 narrative unit，例如：

- `visibility_leaks / checked_visibility_decisions`

### 必须新增的 narrative check counters

`MetricSummary` 或等价结构至少新增：

- `checked_outcome_count`
- `checked_visibility_decision_count`
- `checked_actor_action_count`
- `checked_plot_obligation_count`
- `checked_rule_activation_count`
- `checked_post_state_surface_count`

建议同步新增：

- `post_state_mismatch_rate`
- `belief_conflict_rate`
- `capability_violation_rate`
- `plot_obligation_miss_rate`
- `inactive_rule_use_rate`

### Gate 语义要求

`ConsistencyGate` 必须能够基于 narrative-native 指标阻断，而不是依赖 issue code 列表兜底。

至少新增或强化以下 gate 语义：

1. post-state mismatch 一票否决
2. visibility leak 一票否决
3. capability violation 一票否决
4. active rule misuse 一票否决
5. plot obligation miss 允许配置 hard / soft gate

### 落地要求

必须同步更新：

- `alpha_sre/metrics.py`
- `alpha_sre/gate.py`
- `consistency_metric_catalog.md`
- 对应 tests

## 五、测试与验收资产要求

### 原则

V2 不能只补 unit test；必须补 replay-oriented regression assets。

### 必须新增的 golden cases

#### 1. locked post-state mismatch

场景：

- 同一 command、同一 pre-state、同一 event chain
- replay 生成的 post-state 与 locked post-state 不一致

验收：

- replay 失败
- 失败类型明确为 post-state mismatch
- diff 指向具体 state surface

#### 2. hidden fact leak

场景：

- outcome 依赖 hidden fact
- fact 不在 visible set 中

验收：

- replay 失败
- 失败类型明确为 visibility leak
- evidence references 指向 fact id、event id、replay id

#### 3. false belief without visibility leak

场景：

- 角色基于错误 belief 行动
- belief 在 state 中合法存在，但与 canonical fact 不一致

验收：

- 不应误判为 hidden fact leak
- 应判为 belief conflict 或等价 failure class

#### 4. capability violation

场景：

- actor 执行 blocked action
- capability state 明确不允许

验收：

- replay 失败
- failure class 明确为 capability violation 或 impossible action

#### 5. inactive world rule use

场景：

- 行为成立依赖某条规则
- 该规则不在 active rule set 中

验收：

- replay 失败
- 失败类型明确为 inactive rule use

#### 6. plot obligation created but not discharged

场景：

- plot thread 被创建
- required payoff deadline 已过
- 无 resolution event

验收：

- causal validation 或 gate 必须能发现
- 指向具体 thread id

### 需要覆盖的测试文件

至少更新：

- `tests/test_alpha_sre.py`
- `tests/test_gate.py`
- `tests/test_integration.py`
- `tests/test_artifacts.py`

如需要，新增：

- `tests/test_replay_semantics.py`
- `tests/test_narrative_state_kernel.py`
- `tests/test_metrics_narrative_denominators.py`

## 六、文档与代码必须同步更新的文件

### 代码

- `alpha_sre/state.py`
- `alpha_sre/serialization.py`
- `alpha_sre/replay.py`
- `alpha_sre/causal_validation.py`
- `alpha_sre/metrics.py`
- `alpha_sre/gate.py`
- `alpha_sre/artifacts.py`
- `alpha_sre/integration.py`

### 文档

- `narrative_state_schema.md`
- `replay_spec.md`
- `knowledge_visibility_spec.md`
- `causal_validation_spec.md`
- `consistency_metric_catalog.md`
- `implementation_task_board.md`

## 七、验收标准

本 PR 只有在以下条件全部满足时才算完成：

1. `NarrativeSnapshot` 可以表达 belief、fact、plot thread、capability、visibility graph。
2. 新增状态全部可序列化、可 round-trip、可验证。
3. replay 在存在 locked post-state 时会做严格对账。
4. observation frame 的 visible / believed / active rule 语义被实际消费。
5. replay 能区分 hidden fact leak 与 false belief conflict。
6. replay 能基于 capability state 判定 impossible action。
7. replay 或 causal validation 能基于 plot thread 判定 payoff / obligation 问题。
8. `causality_break_rate` 与 `visibility_leak_rate` 的分母已从 issue 总数迁移到 narrative check unit。
9. gate 可以基于 narrative-native failure 阻断，而不是只基于 legacy issue list 阻断。
10. golden cases 全部存在，并在测试中稳定复现对应 failure class。

## 八、建议的实现顺序

建议在一个 PR 中按以下顺序推进，但每一段必须保持可 review：

1. 先扩 narrative state kernel 与 serialization。
2. 再让 replay 消费新状态，并补 post-state verification。
3. 再升级 causal validation 的 failure explanation。
4. 再重构 metrics 分母和 gate 语义。
5. 最后补全 golden cases、文档和 task board。

## 九、明确不接受的实现方式

以下做法视为未满足本 PR 目标：

1. 只在文档中新增字段，不在 `alpha_sre/` 中落地。
2. 只新增 dataclass，不让 replay / validation / gate 消费。
3. 只把 `post_state_snapshot` 做非空校验，不做内容对账。
4. 只新增 metric 名称，不调整分母和 checked unit。
5. 只新增 happy-path 测试，不新增 failure-class golden case。

## 十、PR 完成后的预期状态

本 PR 完成后，`alpha-SRE` 仍然不是生产完成品，但它应该从“有原型链路的 narrative SRE”提升到“具备核心叙事状态、语义 replay、叙事原生指标与 gate 的执行基线”。

这意味着仓库不再只是回答：

- 有没有状态
- 能不能 replay
- 有没有 gate

而是开始能回答：

- 角色当时为什么知道这件事
- 角色为什么会这样行动
- 这条规则当时是否生效
- 这条剧情 obligation 为什么没有兑现
- replay 结果为什么与原始 post-state 不一致
- 这次 gate 阻断反映的是哪一种 narrative failure class

这才接近该仓库要承载的完整 narrative SRE 落地实现方向。
