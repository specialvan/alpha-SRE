# alpha-SRE 接口契约文档

> 文档状态：正式接口契约文档  
> 文档范围：基于 `alpha_sre/`、`tests/`、`frontend/` 当前代码与样例数据整理  
> 最后核对日期：2026-05-08  
> 证据基线：`pytest -q` 通过，结果为 `96 passed`

## 1. 文档目的与边界

本文档用于固定 `alpha-SRE` 当前仓库里已经实现的接口契约、核心对象关系和关键流程，作为：

- DeepWiki 的高质量仓库说明输入
- 团队后续补充 HTTP / RPC / 外部集成时的基线文档
- 评审“代码现状”和“规划目标”时的分层参考

本文档只描述以下三类真实接口面：

- Python 内部契约
- JSON artifact 契约
- 前端静态读取契约

本文档不把以下内容误写成“已实现接口”：

- 未来集成设想
- 规范文档中的目标能力但尚未落地的实现
- 前端 mock 样例里仅用于 UI 展示的派生字段

## 2. 当前系统定位

`alpha-SRE` 是叙事生成系统的可靠性控制面，不是故事生成器本身。当前实现重点不是网络服务化，而是先把叙事 SRE 的核心契约稳定下来：

- 什么状态在生成前被锁定
- 事件链如何回放
- POV/角色在当时知道什么
- 为什么会发生一致性失败
- 失败如何被 gate 阻断、导出为 incident、沉淀为回归证据

换句话说，当前仓库最核心的“接口”不是 Controller，而是：

1. `NarrativeSnapshot` 为中心的状态契约
2. `ReplayEngine` 为中心的回放契约
3. `IntegrationBridge` 为中心的读/写回/导出契约
4. `JsonArtifactStore` 为中心的归档契约

## 3. 当前实现边界

### 3.1 已实现

- 版本化叙事快照与引用完整性校验
- 命令/事件/快照分离
- replay session 与 observation frame
- 失败分类与结构化 causal finding
- narrative-native metrics
- fail-closed consistency gate
- incident / release / review / replay bundle artifact
- artifact catalog 生成
- React SPA 对 artifact/mock 数据的统一读取

### 3.2 未发现实现

- Python 后端 HTTP API
- Webhook
- 异步回调处理器
- 消息队列消费者/生产者
- 定时任务/调度器
- 数据库访问层
- 独立告警服务
- 审批流引擎
- 后端身份鉴权系统

### 3.3 推断但未落地

- `IntegrationBridge` 未来最可能外化为 read / write-back / replay / incident export 的网络接口
- `IncidentExportRequest` / `IncidentExportResponse` 最可能成为外部 incident 系统对接面
- artifact catalog 未来可能需要批处理命令，但当前只提供 Python 方法

## 4. 仓库地图

### 4.1 核心代码

- `alpha_sre/state.py`
  - 定义 `NarrativeSnapshot` 和 11 类子状态对象
  - 提供 `clone()` 与 `validate()`
- `alpha_sre/events.py`
  - 定义 `Command` 与 `Event`
- `alpha_sre/replay.py`
  - 定义 `ObservationFrame`、`ReplaySession`、`ReplayResult`
  - 实现 `ReplayEngine.replay()`、`ReplayEngine.replay_session()`
- `alpha_sre/causal_validation.py`
  - 定义 `CausalFinding`、`CausalValidationResult`
  - 实现 `validate_causality()`
- `alpha_sre/metrics.py`
  - 定义 `MetricSummary`
  - 实现 `compute_metrics()`
- `alpha_sre/gate.py`
  - 定义 `ConsistencyGate`、`GateResult`
- `alpha_sre/integration.py`
  - 定义 read / write-back / drift / incident export / release record 契约
  - 实现 `IntegrationBridge`
- `alpha_sre/incident.py`
  - 定义 `IncidentReport`、`IncidentActionItem`
- `alpha_sre/artifacts.py`
  - 定义 `ReplayBundle`
  - 实现 `JsonArtifactStore`
- `alpha_sre/review.py`
  - 定义 `NarrativeQualityReviewRecord`
- `alpha_sre/serialization.py`
  - 负责 round-trip 反序列化
- `alpha_sre/versioning.py`
  - 负责 schema 兼容判断

### 4.2 前端代码

- `frontend/src/main.tsx`
  - 前端入口
- `frontend/src/app/App.tsx`
  - 路由入口
- `frontend/src/data/provider.ts`
  - `SreDataProvider` 统一数据抽象
- `frontend/src/data/providers/provider-registry.ts`
  - 根据 `mock` / `artifact` 模式选择数据源
- `frontend/src/data/providers/index-backed-provider.ts`
  - 将 `FrontendArtifactIndex` 物化为前端可查询对象
- `frontend/src/mocks/handlers.ts`
  - 开发态 `/api/mock/*` 接口
- `frontend/public/artifacts/`
  - artifact mode 的静态数据根目录

### 4.3 测试代码

最重要的契约测试文件：

- `tests/test_integration.py`
- `tests/test_replay_semantics.py`
- `tests/test_narrative_state_kernel.py`
- `tests/test_metrics_narrative_denominators.py`
- `tests/test_gate.py`
- `tests/test_artifacts.py`

这些测试文件应被视为接口契约的可执行证据。

## 5. 入口、配置、测试、依赖

### 5.1 入口文件

- 后端公共导出入口：`alpha_sre/__init__.py`
- 后端主调用面：
  - `IntegrationBridge`
  - `ReplayEngine`
  - `compute_metrics`
  - `JsonArtifactStore`
- 前端运行入口：
  - `frontend/src/main.tsx`
  - `frontend/src/app/App.tsx`

### 5.2 配置文件

- 后端：
  - `pyproject.toml`
- 前端：
  - `frontend/package.json`
  - `frontend/vite.config.ts`
  - `frontend/vitest.config.ts`
  - `frontend/tsconfig.json`

### 5.3 运行时依赖

- 后端：
  - Python 3.10+
  - 标准库为主
  - 未声明业务运行时第三方包
- 前端：
  - `react`
  - `react-router-dom`
  - `@tanstack/react-query`
  - `zustand`
  - `msw`
  - `vite`
  - `vitest`

### 5.4 测试命令

- 后端：`pytest -q`
- 前端：
  - `npm run test`
  - `npm run build`

## 6. 核心对象模型

### 6.1 NarrativeSnapshot

路径：`alpha_sre/state.py`

`NarrativeSnapshot` 是仓库内最核心的状态根对象，字段如下：

- 元数据：
  - `snapshot_id`
  - `state_identity`
  - `schema_version`
  - `policy_version`
  - `visibility_version`
  - `created_at`
- 状态面：
  - `characters`
  - `relationships`
  - `memories`
  - `constraints`
  - `world_rules`
  - `chapter_intents`
  - `facts`
  - `beliefs`
  - `plot_threads`
  - `capabilities`
  - `visibility_edges`

核心语义：

- `clone()` 是逻辑冻结边界，避免调用方修改原始对象后污染 replay / incident / drift evidence
- `validate()` 是引用完整性入口，不只是字段非空检查

### 6.2 Command

路径：`alpha_sre/events.py`

字段：

- `command_id`
- `command_type`
- `operator_id`
- `requested_scope`
- `policy_version`
- `created_at`

语义：

- 一次操作意图
- replay / write-back / release attempt 的上游引用起点

### 6.3 Event

路径：`alpha_sre/events.py`

字段：

- `event_id`
- `parent_command_id`
- `event_type`
- `causal_order_index`
- `emitted_at`
- `producer_version`
- `payload`
- `visibility_scope`

语义：

- 一次命令在执行时实际发生的因果单元
- 当前不是 MQ message，而是领域回放事件

### 6.4 ObservationFrame

路径：`alpha_sre/replay.py`

字段：

- `replay_id`
- `at_causal_order_index`
- `pov_actor_id`
- `input_snapshot_id`
- `visible_fact_ids`
- `hidden_fact_ids`
- `believed_fact_ids`
- `accessible_memory_ids`
- `allowed_event_types`
- `blocked_event_types`
- `active_world_rule_ids`
- `retrieval_context_hash`
- `prompt_context_hash`
- `write_back_decision_trace_id`

语义：

- 角色/POV 在某个回放步看到什么、不能看到什么、允许做什么、当前哪些规则处于激活状态
- 这是当前仓库最接近“权限边界”的后端契约

### 6.5 ReplaySession

路径：`alpha_sre/replay.py`

字段：

- `target_command`
- `ordered_event_chain`
- `pre_state_snapshot`
- `policy_version`
- `prompt_version`
- `dependency_contract_versions`
- `replay_operator_id`
- `visibility_snapshot_version`
- `narrative_state_schema_version`
- `observation_frame`
- `evidence_references`
- `post_state_snapshot`

语义：

- 带锁版本、带可选 post-state 校验的 authoritative replay 输入对象

### 6.6 ReplayResult

路径：`alpha_sre/replay.py`

输出字段按语义可分为五组：

- 结果状态：
  - `ok`
  - `failure_classification`
- replay 后状态：
  - `state`
  - `applied_event_ids`
- diff：
  - `diffs`
  - `state_diff`
  - `constraint_diff`
  - `visibility_diff`
  - `causal_chain_diff`
  - `post_state_diff`
  - `write_back_omission_diff`
  - `memory_omission_diff`
- 校验与证据：
  - `causal_validation`
  - `issues`
  - `evidence_references`
  - `missing_mechanism_candidates`
- denominator counters：
  - `checked_write_back_count`
  - `omitted_write_back_count`
  - `checked_memory_reference_count`
  - `omitted_memory_reference_count`
  - `checked_visibility_decision_count`
  - `checked_actor_action_count`
  - `checked_plot_obligation_count`
  - `checked_rule_activation_count`
  - `checked_post_state_surface_count`
  - `mismatched_post_state_surface_count`

### 6.7 IncidentReport

路径：`alpha_sre/incident.py`

这是当前仓库的复盘对象。它不是简单告警，而是带：

- 锁定命令/快照引用
- failure classification
- replay summary
- drift / contract mismatch 证据
- 回滚信息
- required regression test
- action items

### 6.8 ReleaseAttemptRecord

路径：`alpha_sre/integration.py`

记录一次写回/发布尝试，核心字段：

- `attempt_id`
- `triggering_command_id`
- `started_at`
- `source_snapshot_id`
- `source_system`
- `actor`
- `write_back_ok`
- `gate_allowed`
- `drift_detected`
- `manual_rollback_performed`
- `rollback_reason`
- `incident_id`
- `derived_from_attempt_id`

### 6.9 NarrativeQualityReviewRecord

路径：`alpha_sre/review.py`

这是 narrative quality review 的聚合对象，记录：

- OOC 计数
- world rule violation 计数
- foreshadowing / payoff 计数
- source artifact reference

### 6.10 ReplayBundle

路径：`alpha_sre/artifacts.py`

聚合单次回放的完整归档材料：

- `command`
- `snapshot`
- `events`
- `replay`
- `gate`
- `metrics`
- `drift_report`
- `session`
- `bundle_version`

## 7. 状态机、枚举、默认值

### 7.1 已实现状态机/枚举

- `PlotThreadState.status`
  - `open`
  - `active`
  - `blocked`
  - `resolved`
  - `dropped`
- `WorldRuleState.activation_status`
  - `active`
  - `inactive`
  - `deprecated`
- `WorldRuleState.authority_mode`
  - `canonical`
  - `narrator`
  - `system`
  - `local_exception`
- `BeliefState.belief_status`
  - `certain`
  - `suspected`
  - `false`
  - `retracted`
- `FactState.canonical_truth_status`
  - `true`
  - `false`
  - `unknown`
  - `contested`
  - `retracted`
- `VisibilityEdgeState.visibility_status`
  - `visible`
  - `hidden`
  - `narrator_only`
  - `system_only`
- `VisibilityScope`
  - `public`
  - `character-local`
  - `group-local`
  - `narrator-visible`
  - `system-visible`
  - `hidden`

### 7.2 默认值

- `ConstraintState.enforcement_mode = "hard"`
- `WorldRuleState.activation_status = "active"`
- `WorldRuleState.authority_mode = "canonical"`
- `VisibilityEdgeState` 无业务默认状态，必须显式提供 `visibility_status`
- `IncidentActionItem.status = "open"`

### 7.3 仅部分实现或未强约束

以下字段存在，但当前没有强枚举校验：

- `IncidentReport.severity`
- `IncidentReport.status`
- `IncidentActionItem.status`

因此在文档里应将其写为“当前自由字符串，业务上建议规范化”，而不是“已实现状态机”。

## 8. 接口面总览

### 8.1 总体结论

当前仓库的接口面按优先级排序如下：

1. Python 内部契约
2. JSON artifact 归档契约
3. 前端静态读取契约
4. 开发态 mock HTTP 契约

当前没有真实后端 HTTP / RPC / MQ / Webhook / Cron。

### 8.2 关键接口清单

#### 8.2.1 入口

- `IntegrationBridge.read_snapshot()`
- `IntegrationBridge.write_back()`
- `ReplayEngine.replay()`
- `ReplayEngine.replay_session()`
- `validate_causality()`
- `compute_metrics()`
- `ConsistencyGate.evaluate()`
- `JsonArtifactStore.save_*() / load_*() / build_catalog()`

#### 8.2.2 出入口

- 输入：
  - `ReadRequest`
  - `WriteBackRequest`
  - `ReplaySession`
  - `IncidentExportRequest`
- 输出：
  - `ReadResponse`
  - `WriteBackResult`
  - `ReplayResult`
  - `CausalValidationResult`
  - `GateResult`
  - `IncidentExportResponse`
  - `ReplayDriftReport`
  - `ReleaseAttemptRecord`

#### 8.2.3 异步回调 / Webhook

- 未发现实现

#### 8.2.4 内部 RPC / HTTP

- 未发现 Python 后端内部 RPC / HTTP
- 仅前端开发态存在 mock 接口：
  - `GET /api/mock/index`
  - `GET /api/mock/artifact?path=...`

#### 8.2.5 定时任务

- 未发现实现

#### 8.2.6 消息队列 / 事件

- 未发现 MQ
- `Event` 为领域事件，不是 broker 消息契约

## 9. Python 内部接口契约表

### 9.1 快照读取接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `IntegrationBridge.read_snapshot` |
| 文件 | `alpha_sre/integration.py` |
| 功能 | 在 state/schema/visibility 约束下返回快照防御性副本 |
| 输入 | `ReadRequest`, `NarrativeSnapshot` |
| 输出 | `ReadResponse` |
| 前置条件 | 快照可被 `snapshot.validate()` 校验 |
| 错误分支 | `state_identity_mismatch`, `schema_version_mismatch`, `visibility_version_mismatch`, 任意 dangling/invalid snapshot issue |
| 依赖 | `schema_versions_compatible`, `NarrativeSnapshot.validate`, `NarrativeSnapshot.clone` |

`ReadRequest` 字段：

- `expected_state_identity`
- `expected_schema_version`
- `expected_visibility_version`

`ReadResponse` 字段：

- `ok`
- `snapshot`
- `issues`
- `contract_version`

行为说明：

- 若任一版本不匹配，返回 `ok = false`
- 若成功，返回的是 `snapshot.clone()`，不是原对象

### 9.2 写回验证接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `IntegrationBridge.write_back` |
| 文件 | `alpha_sre/integration.py` |
| 功能 | 统一执行契约校验、回放、指标计算、gate 判定、漂移检查 |
| 输入 | `WriteBackRequest` |
| 输出 | `WriteBackResult` |
| 前置条件 | contract/policy/visibility/schema 锁一致 |
| 错误分支 | `write_contract_mismatch`, `policy_version_mismatch`, `visibility_version_mismatch`, `schema_version_mismatch`, `replay_contract_mismatch`, 以及 replay/gate/drift 产生的任何 issue |
| 依赖 | `ReplayEngine.replay`, `compute_metrics`, `ConsistencyGate.evaluate`, `build_drift_report` |

`WriteBackRequest` 字段：

- `command`
- `snapshot`
- `events`
- `source_system`
- `actor`
- `expected_policy_version`
- `expected_visibility_version`
- `expected_schema_version`
- `expected_replay_contract_version`
- `contract_version`

`WriteBackResult` 字段：

- `ok`
- `replay`
- `gate`
- `metrics`
- `drift_report`
- `issues`
- `contract_version`

行为说明：

- 即使前置契约失败，也会执行一次 replay 以保留证据
- `final_ok` 必须同时满足：
  - 无 issues
  - `replay.ok == true`
  - `gate.allowed == true`

### 9.3 漂移报告接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `IntegrationBridge.build_drift_report` |
| 文件 | `alpha_sre/integration.py` |
| 功能 | 比较源快照与 replay 结果的关键签名差异 |
| 输入 | `source_snapshot`, `replay_result` |
| 输出 | `ReplayDriftReport` |
| 前置条件 | 有 replay 结果 |
| 错误分支 | 无异常分支，差异通过 `reasons` 表达 |
| 依赖 | `_snapshot_signature` |

`ReplayDriftReport` 字段：

- `drifted`
- `reasons`
- `source_signature`
- `replay_signature`

当前实现细节非常重要：

- 它构造了包含 ID 集合的 signature
- 但实际只比较以下四类差异：
  - `state_identity_drift`
  - `schema_version_drift`
  - `policy_version_drift`
  - `visibility_version_drift`

因此本文档明确记为：

- 当前 drift report 主要比较“谱系/版本层漂移”
- 不是“完整状态内容 diff”

### 9.4 Incident 导出接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `IntegrationBridge.export_incident` |
| 文件 | `alpha_sre/integration.py` |
| 功能 | 校验 incident 导出输入并返回导出结果 |
| 输入 | `IncidentExportRequest` |
| 输出 | `IncidentExportResponse` |
| 前置条件 | `IncidentReport.validate()` 通过 |
| 错误分支 | `incident_export_contract_mismatch`, `missing_incident_artifact_reference`, `missing_incident_source_system`, 任意 incident report 校验错误 |
| 依赖 | `IncidentReport.validate` |

`IncidentExportRequest` 字段：

- `report`
- `artifact_reference`
- `source_system`
- `expected_contract_version`

`IncidentExportResponse` 字段：

- `ok`
- `incident_id`
- `artifact_reference`
- `failure_classification`
- `regression_test_reference`
- `replay_references`
- `issues`
- `contract_version`

### 9.5 ReleaseAttempt 生成接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `IntegrationBridge.build_release_attempt_record` |
| 文件 | `alpha_sre/integration.py` |
| 功能 | 从写回请求和结果生成发布尝试审计记录 |
| 输入 | `WriteBackRequest`, `WriteBackResult`, `attempt_id`, 可选 rollback / incident / derived_from_attempt_id |
| 输出 | `ReleaseAttemptRecord` |
| 前置条件 | 已得到写回结果 |
| 错误分支 | 无独立校验错误分支 |
| 依赖 | `WriteBackRequest`, `WriteBackResult` |

### 9.6 直接回放接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `ReplayEngine.replay` |
| 文件 | `alpha_sre/replay.py` |
| 功能 | 按事件因果顺序执行回放并生成失败分类、diff 和 evidence |
| 输入 | `command`, `snapshot`, `events`, 可选 `observation_frame`, `evidence_references`, `preflight_issues` |
| 输出 | `ReplayResult` |
| 前置条件 | `command.validate()`、`snapshot.validate()` 通过；事件列表非空 |
| 错误分支 | `missing_events`, `command_mismatch`, `invalid_causal_order`, `visibility_leak`, `impossible_action`, `capability_violation`, `inactive_rule_use`, `missing_precondition`, `belief_conflict`, `plot_obligation_missed`, `unsupported_event_type`, `missing_state_write_back` 等 |
| 依赖 | `NarrativeSnapshot.clone`, `validate_causality`, `_classify_failure`, `_build_evidence_references` |

当前已实现事件类型：

- `update_goal`
- `update_relationship`
- `add_memory`
- `world_rule_update`
- `chapter_outcome`
- `reveal`

当前未实现事件类型：

- 任何不在上述名单中的 `event_type`
- 行为结果：`unsupported_event_type`

### 9.7 ReplaySession 接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `ReplayEngine.replay_session` |
| 文件 | `alpha_sre/replay.py` |
| 功能 | 执行带锁 session 的回放；如提供 locked post-state，则做 post-state 比对 |
| 输入 | `ReplaySession` |
| 输出 | `ReplayResult` |
| 前置条件 | `ReplaySession.validate()` 通过 |
| 错误分支 | `missing_policy_version`, `policy_version_mismatch`, `missing_prompt_version`, `missing_replay_operator_id`, `missing_visibility_version`, `visibility_version_mismatch`, `missing_schema_version`, `schema_version_mismatch`, `post_state_mismatch` 等 |
| 依赖 | `ReplayEngine.replay`, `_compare_post_state` |

### 9.8 因果校验接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `validate_causality` |
| 文件 | `alpha_sre/causal_validation.py` |
| 功能 | 生成结构化 causal finding 和 narrative-native checked counters |
| 输入 | `snapshot`, `events` |
| 输出 | `CausalValidationResult` |
| 前置条件 | snapshot 可校验 |
| 错误分支 | `duplicate_event_id`, `duplicate_causal_index`, `capability_violation`, `inactive_rule_use`, `belief_construction_gap`, `belief_conflict`, `missing_precondition`, `visibility_leak`, `unauthorized_overwrite`, `plot_obligation_missed` |
| 依赖 | `snapshot.validate()`, `Event.validate()` |

### 9.9 指标计算接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `compute_metrics` |
| 文件 | `alpha_sre/metrics.py` |
| 功能 | 从 replay / validation / incident / gate / snapshot / release / review 计算 narrative-native 指标 |
| 输入 | `replays`, `validations`, 可选 `write_back_successes`, `incident_reports`, `gate_results`, `snapshots`, `current_time`, `release_attempts`, `review_records` |
| 输出 | `MetricSummary` |
| 前置条件 | 无硬前置；空输入时采用安全默认值 |
| 错误分支 | 无异常式错误分支，非法时间戳会退化为 `0.0` freshness |
| 依赖 | `ReplayResult`, `CausalValidationResult`, `IncidentReport`, `ReleaseAttemptRecord`, `NarrativeQualityReviewRecord` |

### 9.10 Gate 接口

| 项目 | 内容 |
| --- | --- |
| 名称 | `ConsistencyGate.evaluate` |
| 文件 | `alpha_sre/gate.py` |
| 功能 | 对 replay 结果与指标做 fail-closed 判定 |
| 输入 | `ReplayResult`, 可选 `MetricSummary` |
| 输出 | `GateResult` |
| 前置条件 | replay 结果存在 |
| 错误分支 | 无异常式错误分支；阻断原因进入 `blocking_issues` |
| 依赖 | `ReplayResult`, `MetricSummary` |

当前 gate 语义：

- 若 `replay.ok == false`：
  - 有 issues 时，将 issue code 直接作为阻断原因
  - 无 issues 时，阻断原因是 `replay_failed`
- 对 metric threshold 默认 fail-closed
- `plot_obligation_miss_blocks = false` 时，该项可降级为 warning

## 10. JSON Artifact 契约

### 10.1 ReplayBundle

路径：`alpha_sre/artifacts.py`

版本字段：

- `bundle_version = "1.0"`

主要字段：

- `command`
- `snapshot`
- `events`
- `replay`
- `gate`
- `metrics`
- `drift_report`
- `session`

行为要求：

- `ReplayBundle.from_dict()` 会检查 `bundle_version`
- `bundle_version` 缺失或不兼容时抛出 `ValueError`

### 10.2 IncidentReport Artifact

路径：`alpha_sre/incident.py`、`alpha_sre/serialization.py`

版本字段：

- `artifact_version = "1.0"`

`validate()` 当前强制要求：

- `incident_id`
- `title`
- `severity`
- `status`
- `date_opened`
- `incident_owner`
- `locked_command_id`
- `pre_state_snapshot_id`
- `evidence_references`

### 10.3 ReleaseAttemptRecord Artifact

版本字段：

- `contract_version = "1.0"`

核心用途：

- 发布/写回尝试的审计记录
- manual rollback 和 incident lineage 的来源

### 10.4 NarrativeQualityReviewRecord Artifact

版本字段：

- `contract_version = "1.0"`

校验要求：

- `review_id`
- `source_artifact_reference`
- 所有计数字段必须非负

### 10.5 Catalog 契约

路径：`alpha_sre/artifacts.py::JsonArtifactStore.build_catalog`

版本字段：

- `catalog_version = "1.0"`

返回结构：

- `catalog_version`
- `field_sources`
- `artifacts[]`

`artifacts[]` 最小字段：

- `artifact_ref`
- `artifact_kind`
- `relative_path`
- `native_primary_id`

当前后端 catalog 只会产出：

- `replay_bundle`
- `incident_report`
- `release_attempt_record`
- `quality_review_record`

不会产出：

- `snapshot_bundle`

## 11. 前端读取契约

### 11.1 SreDataProvider

路径：`frontend/src/data/provider.ts`

这是前端真正的“统一接口层”，不是页面组件本身。方法包括：

- `getOverview()`
- `listSnapshots()`
- `getSnapshot()`
- `listArtifacts()`
- `getArtifact()`
- `listReplayBundles()`
- `getReplayBundle()`
- `getValidationForReplay()`
- `getMetrics()`
- `getGateResult()`
- `listReviews()`
- `getReview()`
- `listIncidents()`
- `getIncident()`
- `listReleaseAttempts()`
- `getReleaseAttempt()`

### 11.2 Artifact Mode

路径：

- `frontend/src/data/providers/provider-registry.ts`
- `frontend/src/data/providers/artifact-provider.ts`
- `frontend/public/artifacts/index.json`

读取方式：

- `GET /artifacts/index.json`
- 再按 catalog 里的 `relative_path` 读取原始 artifact JSON

### 11.3 Mock Mode

路径：

- `frontend/src/data/providers/provider-registry.ts`
- `frontend/src/mocks/handlers.ts`
- `frontend/src/mocks/catalog.ts`

开发态接口：

- `GET /api/mock/index`
- `GET /api/mock/artifact?path=...`

说明：

- 这是前端开发/测试接口
- 不是 Python 后端提供的正式业务 API

### 11.4 FrontendArtifactIndex

路径：`frontend/src/data/types.ts`

当前前端期望的 index 结构包含：

- `generatedAt`
- `catalog_version`
- `field_sources`
- `overview`
- `metrics`
- `artifacts`
- 可选：
  - `snapshots`
  - `replays`
  - `validations`
  - `gates`
  - `reviews`
  - `incidents`
  - `releases`

这里要特别注意：

- 后端 `JsonArtifactStore.build_catalog()` 目前只生成精简 catalog
- 前端 `index-backed-provider` 支持从精简 catalog + raw artifact 反物化详情页
- 因此“前端 index 扩展字段很多”不等于“后端 catalog 必须一次性返回所有详情”

## 12. 数据契约详解

### 12.1 Snapshot 引用完整性

`NarrativeSnapshot.validate()` 当前已经覆盖以下主要引用面：

- `CharacterState.relationship_links`
- `CharacterState.active_constraints`
- `CharacterState.memory_references`
- `CharacterState.belief_ids`
- `CharacterState.capability_ids`
- `CharacterState.present_with_character_ids`
- `RelationshipState.subject_character_id`
- `RelationshipState.object_character_id`
- `MemoryState.owning_character_id`
- `ConstraintState.affected_actors`
- `FactState.related_character_ids`
- `FactState.related_rule_ids`
- `BeliefState.holder_character_id`
- `BeliefState.fact_id`
- `BeliefState.contradicts_fact_id`
- `BeliefState.derived_from_memory_ids`
- `PlotThreadState.affected_characters`
- `CapabilityState.character_id`
- `CapabilityState.source_rule_id`
- `CapabilityState.source_constraint_id`
- `VisibilityEdgeState.fact_id`
- `VisibilityEdgeState.viewer_id`

这也是 V2.2 的关键硬化面之一。

### 12.2 ObservationFrame 校验

`ObservationFrame.validate()` 当前会检查：

- `replay_id` 非空
- `at_causal_order_index >= 0`
- `pov_actor_id` 存在且可解析
- `input_snapshot_id` 与 replay snapshot 一致
- `visible_fact_ids` 与 `hidden_fact_ids` 不冲突
- `allowed_event_types` 与 `blocked_event_types` 不冲突
- frame 中引用的 fact / world rule 必须存在
- frame 与持久化 visibility graph 不矛盾
- frame 与持久化 capability 边界不矛盾

### 12.3 Replay failure classification

`_classify_failure()` 当前的主分类顺序为：

1. `post_state_mismatch`
2. `visibility_leak`
3. `belief_conflict`
4. `capability_violation`
5. `inactive_rule_use`
6. `plot_obligation_missed`
7. `policy_drift`
8. `state_drift`
9. `contract_mismatch`
10. `input_mismatch`
11. `mechanism_missing`
12. `unknown`

这意味着：

- 同一次 replay 有多个 issue 时，最终展示的是“优先级更高的主失败类”
- 文档和 UI 都不应假设 `failure_classification` 覆盖了所有 issue

### 12.4 MetricSummary 的 narrative-native denominator

当前最重要的分母规则如下：

- `causality_break_rate`
  - 分子：`missing_precondition` 的唯一 subject 数
  - 分母：`checked_outcome_count`
- `visibility_leak_rate`
  - 分子：`visibility_leak` 的唯一 subject 数
  - 分母：`checked_visibility_decision_count`
- `belief_conflict_rate`
  - 分子：`belief_conflict` 的唯一 subject 数
  - 分母：`checked_actor_action_count`
- `capability_violation_rate`
  - 分子：`capability_violation` 的唯一 subject 数
  - 分母：`checked_actor_action_count`
- `plot_obligation_miss_rate`
  - 分子：`plot_obligation_missed` 的唯一 subject 数
  - 分母：`checked_plot_obligation_count`
- `inactive_rule_use_rate`
  - 分子：`inactive_rule_use` 的唯一 subject 数
  - 分母：`checked_rule_activation_count`
- `post_state_mismatch_rate`
  - 分子：`mismatched_post_state_surface_count`
  - 分母：`checked_post_state_surface_count`
- `write_back_omission_rate`
  - 分子：`omitted_write_back_count`
  - 分母：`checked_write_back_count`
- `memory_omission_rate`
  - 分子：`omitted_memory_reference_count`
  - 分母：`checked_memory_reference_count`

这是 DeepWiki 最需要解释清楚的地方之一，因为它体现了“叙事原生分母”而不是普通 issue 总数。

### 12.5 Gate 默认阈值

`ConsistencyGate` 当前默认：

- `min_trace_completeness = 1.0`
- `max_causality_break_rate = 0.0`
- `max_visibility_leak_rate = 0.0`
- `min_causal_attribution_coverage = 1.0`
- `max_rule_drift_rate = 0.0`
- `min_write_back_success_rate = 1.0`
- `max_write_back_omission_rate = 0.0`
- `max_memory_omission_rate = 0.0`
- `max_same_class_failure_rate = 0.0`
- `min_replay_confirmed_regression_rate = 1.0`
- `min_version_lock_success_rate = 1.0`
- `max_alarm_trigger_rate = 0.0`
- `max_post_state_mismatch_rate = 0.0`
- `max_capability_violation_rate = 0.0`
- `max_inactive_rule_use_rate = 0.0`
- `max_plot_obligation_miss_rate = 0.0`
- `plot_obligation_miss_blocks = True`

结论：

- 当前默认策略是 fail-closed
- plot obligation miss 是唯一显式支持软化为 warning 的 narrative failure class

## 13. 关键流程图文字版

### 13.1 事件进入主链路

1. 调用方构造 `WriteBackRequest`
2. `IntegrationBridge.write_back()` 校验：
   - write contract version
   - policy version
   - visibility version
   - schema version
   - replay contract version
3. 若前置失败：
   - 仍执行 `ReplayEngine.replay()` 保留证据
   - 计算 metrics
   - 执行 gate
   - 生成 drift report
   - 返回 `WriteBackResult.ok = false`
4. 若前置通过：
   - `ReplayEngine.replay()` 执行事件链
   - `validate_causality()` 追加结构化因果 finding
   - `compute_metrics()` 计算指标
   - `ConsistencyGate.evaluate()` 做 gate 判定
   - `build_drift_report()` 做漂移判断
   - 汇总为 `WriteBackResult`

### 13.2 告警触发链路

当前没有独立告警对象，告警语义由以下对象组合表达：

1. `ReplayResult.ok == false`
2. `ReplayResult.issues`
3. `GateResult.blocking_issues`
4. `GateResult.warnings`
5. `WriteBackResult.ok == false`

因此当前“告警触发”可视为：

- replay 失败触发
- gate 阻断触发
- 或两者共同触发

### 13.3 复盘创建链路

1. 形成 `ReplayBundle`
2. 用 `IncidentReport.from_replay_bundle()` 派生 incident
3. 从 bundle 提取：
   - `triggering_command_id`
   - `locked_command_id`
   - `locked_event_chain_reference`
   - `pre_state_snapshot_id`
   - `post_state_snapshot_id`
   - `suspected_failure_classification`
   - `detected_state_drift`
   - `detected_contract_mismatch`
   - `required_regression_test`
   - `evidence_references`
4. 调用 `export_incident()` 校验 incident 导出契约
5. 可选落盘为 `incidents/*.json`

### 13.4 根因分析链路

1. `ReplayEngine.replay()` 产生基础 issue
2. `validate_causality()` 产生结构化 `CausalFinding`
3. `_classify_failure()` 生成主失败类
4. `IncidentReport` 承载：
   - `primary_cause`
   - `contributing_causes`
   - `missing_mechanism`
   - `existing_control_gap`
   - `required_regression_test`

这条链路对应你特别强调的“根因分析”对象面。

### 13.5 行动项闭环链路

1. incident 创建后记录 `IncidentActionItem[]`
2. 每个 action item 当前字段仅有：
   - `action`
   - `owner`
   - `layer`
   - `due_date`
   - `status`
3. 当前闭环只体现在 artifact 数据层
4. 未实现：
   - 自动派单
   - 自动提醒
   - 自动关闭
   - 审批流联动

### 13.6 时间线链路

当前系统时间线主要由以下字段拼接：

- `Command.created_at`
- `Event.emitted_at`
- `NarrativeSnapshot.created_at`
- `IncidentReport.date_opened`
- `ReleaseAttemptRecord.started_at`
- 前端列表中的 `updatedAt` 展示字段

## 14. 依赖说明

### 14.1 数据存储依赖

- 当前后端没有数据库
- artifact 是 repo-native JSON 文件
- `JsonArtifactStore` 直接对文件系统读写

### 14.2 外部服务依赖

- 当前无真实第三方服务调用
- `source_system` 字段存在，但只用于契约记录，不代表已有网络集成

### 14.3 配置依赖

- schema 兼容依赖 `schema_versions_compatible()`
- contract version 依赖以下常量：
  - `READ_CONTRACT_VERSION`
  - `WRITE_CONTRACT_VERSION`
  - `REPLAY_CONTRACT_VERSION`
  - `INCIDENT_EXPORT_CONTRACT_VERSION`
  - `RELEASE_ATTEMPT_CONTRACT_VERSION`
  - `ARTIFACT_BUNDLE_VERSION`
  - `ARTIFACT_CATALOG_VERSION`
  - `INCIDENT_REPORT_VERSION`
  - `NARRATIVE_QUALITY_REVIEW_CONTRACT_VERSION`

## 15. 权限、模板、审批、审计

### 15.1 权限

当前仓库应区分两层“权限”：

后端语义权限边界：

- `ObservationFrame.allowed_event_types`
- `ObservationFrame.blocked_event_types`
- `CapabilityState.allowed`
- `VisibilityEdgeState.visibility_status`
- `WorldRuleState.authority_mode`

前端 UI 角色边界：

- `viewer`
- `operator`
- `oncall`
- `admin`

结论：

- `PermissionGate` 只是前端本地视图门禁
- 不能把它写成后端访问控制系统

### 15.2 模板

当前仓库已存在模板/规范文件：

- `incident_postmortem_template.md`
- `new_requirement_intake_template.md`
- `task_launch_template.md`
- `new_requirement_execution_flow.md`

### 15.3 审批

当前未实现正式审批流。

可视为“准审批点”的只有：

- `ConsistencyGate.evaluate()` 的 gate block
- `manual_rollback_performed` 对人工介入的审计记录

### 15.4 审计

当前审计面主要依赖 evidence references 和 artifact lineage。

常见 evidence 前缀：

- `command:*`
- `snapshot:*`
- `event:*`
- `replay:*`
- `pov:*`
- `trace:*`
- `retrieval:*`
- `prompt:*`
- `fact:*`
- `belief:*`
- `memory:*`

主要审计对象：

- `ReplayBundle`
- `IncidentReport`
- `ReleaseAttemptRecord`
- `NarrativeQualityReviewRecord`

## 16. 时间线、对象关系、数据一致性、归档规则

### 16.1 对象关系

最核心的对象关系如下：

- `Command` 触发 `Event[]`
- `NarrativeSnapshot` 提供 locked pre-state
- `ReplaySession` 聚合 command + events + snapshot + observation frame + post-state
- `ReplayEngine` 输出 `ReplayResult`
- `compute_metrics()` 输出 `MetricSummary`
- `ConsistencyGate.evaluate()` 输出 `GateResult`
- `ReplayBundle` 聚合 replay 相关全部证据
- `IncidentReport` 从 `ReplayBundle` 派生
- `ReleaseAttemptRecord` 从 `WriteBackRequest + WriteBackResult` 派生
- `NarrativeQualityReviewRecord` 通过 `source_artifact_reference` 关联 replay artifact

### 16.2 数据一致性规则

当前一致性主要分四层：

1. 快照结构一致性
   - `NarrativeSnapshot.validate()`
2. replay 输入一致性
   - `ReplaySession.validate()`
   - `WriteBackRequest` 的版本锁
3. 语义一致性
   - `validate_causality()`
   - `ObservationFrame`
   - `CapabilityState`
   - `VisibilityEdgeState`
   - `WorldRuleState`
4. 输出一致性
   - `post_state_snapshot` 对比
   - gate 阈值
   - artifact version

### 16.3 归档规则

artifact 版本要求：

- replay bundle：`bundle_version == 1.0`
- incident：`artifact_version == 1.0`
- release：`contract_version == 1.0`
- review：`contract_version == 1.0`
- catalog：`catalog_version == 1.0`

行为要求：

- 版本缺失：报错
- 版本不支持：报错
- artifact path 越界：报错

## 17. 当前已确认的不一致与待确认项

这一节非常重要，DeepWiki 应单独强调。

### 17.1 前端样例 artifact 与后端序列化契约不一致

已观察到的差异包括：

- 后端 `Command` 需要 `requested_scope`
  - 前端样例 bundle 常写成 `target_id`
- 后端 `Event` 需要：
  - `parent_command_id`
  - `emitted_at`
  - `producer_version`
  - 前端样例 bundle 常写成：
    - `command_id`
    - `created_at`
    - `policy_version`
- 后端 `VisibilityScope` 序列化值为 `character-local`
  - 前端部分样例使用 `character_local`

结论：

- 当前 `frontend/public/artifacts/*.json` 与 `alpha_sre/serialization.py` 的正式 round-trip 契约不能直接视为同一套字段模型
- 文档里必须把前端样例写成“展示/样例数据面”，不要直接当后端正式 artifact schema

### 17.2 Frontend 类型比后端产物更宽

前端 `ArtifactKind` 包含：

- `snapshot_bundle`

但当前后端 `JsonArtifactStore.build_catalog()` 不会产出该类型。

这意味着：

- 前端类型定义是“可扩展读模型”
- 不是“当前后端已实现产物全集”

### 17.3 Drift report 语义比名字更窄

当前 `build_drift_report()` 不比较完整状态 diff，只比较：

- state identity
- schema version
- policy version
- visibility version

因此：

- 名称叫 drift report
- 但实现上更接近“谱系/版本漂移报告”

### 17.4 Alert / Approval / Schedule 仍未产品化

当前仓库已经有：

- gate block
- incident object
- action item

但还没有：

- 告警路由
- 审批节点
- 定时调度
- 自动闭环

## 18. 建议的 DeepWiki 解释优先级

若 DeepWiki 需要自动组织内容，建议优先解释：

1. `NarrativeSnapshot` 与其 11 个子状态
2. `ReplaySession` / `ObservationFrame` / `ReplayResult`
3. `IntegrationBridge.write_back()` 主链路
4. `validate_causality()` 的 failure taxonomy
5. `MetricSummary` 的 narrative-native denominator
6. `ConsistencyGate` 的 fail-closed 语义
7. `IncidentReport` / `ReleaseAttemptRecord` / `ReplayBundle` / `NarrativeQualityReviewRecord`
8. 前端 `SreDataProvider` 与 artifact/mock 双模式

可以略写或只作背景说明的部分：

- `archive/`
- `experimental/`
- 历史 review 文件
- 纯导航类文档

## 19. 结论

截至当前代码状态，`alpha-SRE` 的“接口契约”已经不是空白设计，而是相对完整的 repo-native 契约体系。它的重点不是 HTTP 层，而是：

- 事件进入时怎样锁定输入
- 状态机怎样约束叙事行为
- gate 怎样触发阻断
- incident / release / review 怎样形成可审计对象
- 时间线、对象关系、一致性和归档规则怎样被稳定表达

后续如果要继续提升文档质量，最值得先做的不是继续泛化说明，而是把以下两件事补齐：

1. 统一前端样例 artifact 与后端正式序列化字段
2. 决定 `IntegrationBridge` 的外化接口形态是否进入 HTTP / RPC 阶段
