# alpha-SRE DeepWiki Repo Notes

## Repo Notes

1. `alpha_sre/` 是仓库的后端核心，不是 HTTP 服务实现，而是“可嵌入的叙事 SRE 内核”。阅读顺序优先 `state.py` → `events.py` → `replay.py` → `causal_validation.py` → `metrics.py` → `gate.py` → `integration.py` → `incident.py` → `artifacts.py`。

2. 当前最重要的服务边界不是控制器或路由，而是三个对象：`IntegrationBridge` 负责读/写回/导出契约，`ReplayEngine` 负责事件回放与失败分类，`JsonArtifactStore` 负责 JSON 制品归档。DeepWiki 需要先固定这三层接口，再解释模块关系。

3. `NarrativeSnapshot` 是全仓库的状态根对象，包含 `characters`、`relationships`、`memories`、`constraints`、`world_rules`、`chapter_intents`、`facts`、`beliefs`、`plot_threads`、`capabilities`、`visibility_edges`。`state.py` 的 `validate()` 已实现引用完整性校验，V2.2 的主线就是把这种“逻辑冻结快照”讲清楚。

4. “事件进入、告警触发、复盘创建、根因分析、行动项闭环”这一主链路是：`WriteBackRequest` → `IntegrationBridge.write_back()` → `ReplayEngine.replay()` / `replay_session()` → `compute_metrics()` → `ConsistencyGate.evaluate()` → `IncidentReport.from_replay_bundle()` / `export_incident()` → `ReleaseAttemptRecord` / `IncidentActionItem`。说明文档要以这条链路为主，不要先写大而全模块目录。

5. 当前仓库没有真实后端 HTTP API、Webhook、消息队列消费者、定时任务调度器，也没有数据库访问层。DeepWiki 需要明确写成“未实现/未发现”，避免把 `integration.py` 的契约对象误读成已经上线的 RPC 接口。

6. `frontend/` 是 V3.3 React SPA，真实数据入口是 `SreDataProvider`。运行时只有两种数据源：静态 artifact 模式读取 `frontend/public/artifacts/index.json`，开发态 mock 模式读取 `/api/mock/index` 与 `/api/mock/artifact`（MSW 拦截）；它不是 Python 后端暴露出来的 REST API。

7. 前端样例 artifact 与后端 Python 序列化契约目前并不完全一致，需重点解释并标成待确认。例如后端 `Event` 反序列化要求 `parent_command_id`、`emitted_at`、`producer_version`，但前端样例 bundle 使用的是 `command_id`、`created_at`、`policy_version`。不要把前端 fixture 直接写成后端正式 round-trip 契约。

8. 状态机相关内容优先写代码里已经落地的部分：`PlotThreadState.status`、`WorldRuleState.activation_status`、`WorldRuleState.authority_mode`、`VisibilityEdgeState.visibility_status`、`BeliefState.belief_status`。`IncidentReport.status/severity` 和 `IncidentActionItem.status` 目前只是自由字符串，不是强校验枚举。

9. 权限与审计要分层描述：后端真正的“权限/边界”来自 `ObservationFrame.allowed_event_types` / `blocked_event_types`、`CapabilityState.allowed`、`VisibilityEdgeState`、`WorldRuleState.authority_mode`；前端 `PermissionGate` 只是本地 UI 角色门禁（`viewer/operator/oncall/admin`），不能当成后端鉴权模型。

10. 文档优先级应遵循 `START_HERE.md`、`CODEX_DEVELOPMENT_GOVERNANCE.md`、`package_manifest.md`、`implementation_task_board.md`、`codex-review/V2/V2.2-pr-requirements.md`。DeepWiki 对 `archive/`、`experimental/`、历史 review 文件可略写，只保留“背景/存档”定位，避免混入当前契约。

## Short Repo Notes

1. `alpha_sre/` 是仓库主实现；优先解释 `state.py`、`replay.py`、`integration.py`、`artifacts.py` 的关系，其他模块围绕这四层展开。不要先从 frontend 或历史 review 文档入手。

2. 当前主接口面不是 HTTP，而是 Python 契约对象：`NarrativeSnapshot`、`ReplaySession`、`WriteBackRequest`、`IncidentReport`、`ReplayBundle`。DeepWiki 应先固定字段、状态流转、失败分类，再组织章节。

3. 核心链路是 `write_back` 驱动的：事件进入后先回放，再做因果校验、指标计算、Gate 判定、漂移判断，最后决定是否生成 incident / release artifact。文档里必须把成功分支和阻断分支拆开写。

4. 仓库内未发现真实后端 HTTP API、Webhook、消息队列、定时任务、数据库层。`integration.py` 是“集成桥契约”，不是已部署的网络接口服务。

5. `frontend/` 只消费 `SreDataProvider` 抽象；artifact 模式读 `frontend/public/artifacts/index.json`，mock 模式走 `/api/mock/*`。这部分应按“前端读模型”说明，避免混同后端写模型。

6. 要重点解释 `ObservationFrame`、`CapabilityState`、`VisibilityEdgeState`、`WorldRuleState` 这几个对象，因为它们共同定义了权限、知识边界、世界规则激活和 POV 限制。它们是事件进入与根因分析的判定核心。

7. 要重点解释 `IncidentReport`、`ReleaseAttemptRecord`、`NarrativeQualityReviewRecord`、`ReplayBundle` 的对象关系，因为它们组成告警、复盘、行动项、归档、审计时间线。这里比 UI 页面结构更重要。

8. 前端样例 bundle 字段与后端序列化契约存在差异，例如 `command_id` vs `parent_command_id`、`created_at` vs `emitted_at`。DeepWiki 需要把这点单独列为“待确认”，否则最容易把接口字段讲错。
