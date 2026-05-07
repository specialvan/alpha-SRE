# [PR] alpha-SRE 前端 V3.1 需求文档（Artifact-First / Mock-First）

**文档版本：** v1.1  
**负责人：** Frontend Team  
**关联项目：** `specialvan/alpha-SRE`  
**目标：** 基于现有后端 artifact 与控制面对象，交付一套可浏览、可回放、可复盘的前端控制台原型  
**优先级：** P0  
**交付方式：** 独立 React SPA  
**实施策略：** Artifact-First / Mock-First，后续可无缝切换 Live Provider  

---

## 1. 背景与目标

alpha-SRE 的后端当前已经具备一套可执行的叙事 SRE 基线能力，包括：

- `NarrativeSnapshot` 作为状态快照核
- `ReplayEngine` 作为事件回放与结果验证入口
- `ObservationFrame` 作为 POV / visibility / capability 约束输入
- `CausalValidationResult` 作为因果失败归因输出
- `MetricSummary` 作为多维质量与控制面指标聚合
- `ConsistencyGate` 作为发布 / 复盘 / 回放的阻断门禁
- `IntegrationBridge` 作为读写、漂移、事故导出与 release attempt 的控制面桥梁
- `NarrativeQualityReviewRecord` 作为小说质量审阅的结构化记录
- `JsonArtifactStore` 作为 artifact 落盘与回放基础设施

当前缺少的是一个统一前端，把这些能力从“后端可执行”变成“人可操作、可观察、可复盘”。

### 1.1 本 PR 的目标

| 目标 | 说明 |
|---|---|
| 可浏览 | 可以浏览 artifact、snapshot、replay、validation、metrics、gate、incident、review、release attempt |
| 可回放 | 支持基于 replay artifact / reference 复现回放结果 |
| 可复盘 | 支持查看因果 finding、质量审阅记录、门禁阻断原因 |
| 可切换 | 支持 mock / artifact 两种数据模式，后续可接 live provider |
| 可演进 | 前端数据契约必须兼容后端 schema 演进 |

### 1.2 本 PR 的设计原则

1. **以现有后端 artifact 与控制面对象为准，不凭空设计业务域。**
2. **先可用，再好看；先闭环，再扩展。**
3. **所有关键状态必须能回溯到后端 artifact 或 artifact reference。**
4. **前端展示必须明确区分：顶层 artifact、bundle、bundle-derived section、对象详情。**
5. **复杂交互必须提供 loading / empty / error / partial 四种状态。**
6. **页面只依赖统一 provider 抽象，不直接依赖具体数据来源。**

---

## 2. 数据分层与资源模型

### 2.1 数据模式

前端必须支持三种数据模式，但本 PR 只要求完成前两种：

| 模式 | 说明 | 当前状态 |
|---|---|---|
| `mock` | 静态或 MSW 模拟数据 | P0 必须支持 |
| `artifact` | 从本地 / 后端 artifact 读取 JSON bundle | P0 必须支持 |
| `live` | 来自实时后端查询面或事件流 | P1 以后支持 |

### 2.2 资源层级定义

本 PR 要求明确区分两类资源：

#### 顶层 artifact
可独立寻址、可列表、可详情展示的资源：

- replay bundle
- incident report
- release attempt record
- quality review record
- snapshot bundle（若后端后续单独导出）

#### bundle-derived section
从顶层 artifact 或 bundle 中派生出来的视图段：

- snapshot
- replay
- validation
- metrics
- gate

#### 资源规则

1. 顶层 artifact 具有稳定 reference（如 artifact path、bundle ref、record ref）。
2. bundle-derived section 不作为独立顶层资源强行寻址。
3. bundle-derived section 的 URL 或 reference 由 `bundleRef + sectionKey` 派生。
4. 前端不得把可选字段误当成稳定主键。

---

## 3. 统一数据访问抽象

### 3.1 `SreDataProvider`

前端必须通过统一的数据访问抽象读取数据。页面不直接依赖 mock、artifact 或未来 live API 的具体实现。

#### 必备接口

```typescript
interface SreDataProvider {
  // 总览
  getOverview(): Promise<OverviewSummary>;

  // Snapshot / bundle
  listSnapshots(query: SnapshotQuery): Promise<ListResponse<SnapshotSummary>>;
  getSnapshot(ref: string): Promise<SnapshotDetail>;

  // Artifact
  listArtifacts(query: ArtifactQuery): Promise<ListResponse<ArtifactSummary>>;
  getArtifact(ref: string): Promise<ArtifactDetail>;

  // Replay
  listReplayBundles(query: ReplayQuery): Promise<ListResponse<ReplaySummary>>;
  getReplayBundle(ref: string): Promise<ReplayBundleDetail>;

  // Validation
  getValidationForReplay(ref: string): Promise<ValidationDetail>;

  // Metrics / gate
  getMetrics(query: MetricQuery): Promise<MetricDetail>;
  getGateResult(ref: string): Promise<GateDetail>;

  // Quality review
  listReviews(query: ReviewQuery): Promise<ListResponse<ReviewSummary>>;
  getReview(ref: string): Promise<ReviewDetail>;

  // Incidents / releases
  listIncidents(query: IncidentQuery): Promise<ListResponse<IncidentSummary>>;
  getIncident(ref: string): Promise<IncidentDetail>;
  listReleaseAttempts(query: ReleaseAttemptQuery): Promise<ListResponse<ReleaseAttemptSummary>>;
  getReleaseAttempt(ref: string): Promise<ReleaseAttemptDetail>;
}
```

### 3.2 Provider 约束

- 页面仅调用 `SreDataProvider`
- `mockProvider`、`artifactProvider`、`liveProvider` 只是实现，不进入页面层
- provider 必须支持 schema-tolerant 读取
- provider 必须允许 bundle-derived section 的派生提取

---

## 4. P0 交付范围与优先级

本 PR 只要求完成“可用闭环”，不要求一次性做成完整商业控制台。

### 4.1 P0.1 全局壳层

- 顶部导航 / 侧边栏 / 面包屑
- 主题切换（浅色 / 深色）
- 全局搜索框（按 artifact ref / snapshot ref / replay ref / incident ref / review ref 搜索）
- 错误边界与空状态
- 数据模式切换器（mock / artifact）
- 权限态 UI 占位

### 4.2 P0.2 Artifact Browser

#### 目标
让用户按 artifact reference 浏览已存在的顶层 artifact，并展开 bundle-derived section。

#### 展示对象

- replay bundle
- incident report
- release attempt record
- quality review record
- snapshot bundle（若存在）

#### 展示原则

- 顶层 artifact 作为列表主项
- bundle-derived section 作为详情页中的可折叠段落
- 不把 snapshot / validation / metrics / gate 伪装成独立顶层资源

#### 验收
- 可以查看 artifact 列表
- 可以进入 artifact 详情
- 可以在详情页展开或定位 bundle-derived section
- 可以从 artifact reference 进入对应内容

### 4.3 P0.3 Snapshot Viewer

#### 路径
- `/snapshots`
- `/snapshots/:snapshotRef`

#### 展示内容
- `NarrativeSnapshot` 的基础字段
- characters / relationships / memories / constraints / world_rules / chapter_intents
- 若后端或 artifact 中含新 kernel 字段，则自动兼容展示：
  - facts
  - beliefs
  - plot_threads
  - capabilities
  - visibility_edges

#### 交互要求
- 右侧 JSON 面板支持复制
- 每个对象支持折叠 / 展开
- 点击某个对象可跳到相关 replay / validation / incident 引用

#### 空状态
- 若 snapshot 没有某类对象，显示“无数据”而不是空白

### 4.4 P0.4 Replay Lab

#### 路径
- `/replay`
- `/replay/:replayRef`

#### 说明
`replayRef` 必须来自 artifact reference 或 bundle reference，不依赖可选的 `replay_id` 字段。

#### 展示内容
- target command
- pre-state snapshot
- ordered event chain
- policy / prompt / visibility / schema version
- observation frame
- evidence references
- post-state snapshot（若存在）
- replay diff 视图
- causal validation 结果

#### 重点展示
- `post_state_mismatch`
- `visibility_leak`
- `belief_conflict`
- `capability_violation`
- `inactive_rule_use`
- `plot_obligation_missed`

#### 交互要求
- 左侧事件链，右侧结果详情
- 点击某个 issue，可跳转到对应 event / snapshot / finding
- 若存在 locked post-state mismatch，必须显式高亮 surface path

#### 验收
- 用户可以从 artifact / snapshot / incident 跳转到 replay 详情
- 回放结果中，post-state mismatch 必须被前端显式展示

### 4.5 P0.5 Validation Center

#### 路径
- `/validation`

#### 目标
集中展示因果校验与叙事失败归因。

#### 页面内容
- validation 结果卡片
- finding 列表
- issue / finding 过滤器
- 推荐 regression test 列表
- failure classification 标签
- 关联 replay / incident / release attempt 链接

#### 过滤维度
- failure class
- subject id
- affected field
- time range
- replay operator id

#### 重点支持的 failure class
- `post_state_mismatch`
- `visibility_leak`
- `belief_conflict`
- `capability_violation`
- `inactive_rule_use`
- `plot_obligation_missed`
- `policy_drift`
- `state_drift`
- `contract_mismatch`
- `mechanism_missing`

#### 验收
- 至少能从 replay result 页面跳到 validation 中对应 finding
- 推荐 regression test 必须是可复制的文本，不是纯 ID

### 4.6 P0.6 Metrics & Gate

#### 路径
- `/metrics`

#### 指标要求
展示 `MetricSummary` 的全部核心字段，并额外展示 V2.2 narrative-native 分组。

#### 现有指标
- `trace_completeness`
- `causality_break_rate`
- `visibility_leak_rate`
- `replay_availability`
- `causal_attribution_coverage`
- `rule_drift_rate`
- `write_back_success_rate`
- `same_class_failure_rate`
- `incident_recurrence_rate`
- `replay_confirmed_regression_rate`
- `version_lock_success_rate`
- `alarm_trigger_rate`
- `snapshot_freshness`
- `write_back_omission_rate`
- `memory_omission_rate`
- `manual_rollback_rate`
- `edit_amplitude`
- `plot_inconsistency_rate`
- `second_generation_rate`
- `character_ooc_rate`
- `world_rule_violation_rate`
- `foreshadowing_payoff_rate`

#### V2.2 narrative-native 指标分组
- `checked_outcome_count`
- `checked_visibility_decision_count`
- `checked_actor_action_count`
- `checked_plot_obligation_count`
- `checked_rule_activation_count`
- `checked_post_state_surface_count`
- `post_state_mismatch_rate`
- `belief_conflict_rate`
- `capability_violation_rate`
- `plot_obligation_miss_rate`
- `inactive_rule_use_rate`

#### Gate 展示
- `allowed`
- `blocking_issues`
- `warnings`
- 当前阈值配置（若有）

#### 交互要求
- gate 卡片需要明确显示“允许 / 阻断 / 警告”三态
- blocking issue 可点击跳到 replay / validation 证据
- 指标卡支持时间范围切换

#### 验收
- 任何 gate 阻断都必须有可读解释
- 前端必须区分指标异常与 replay 失败

### 4.7 P0.7 Quality Review

#### 路径
- `/quality/reviews`

#### 目标
查看小说内容质量审阅结果，支持按样本、失败类型与证据追踪。

#### 页面内容
- `NarrativeQualityReviewRecord` 列表
- review 详情
- 统计汇总
  - `checked_segment_count`
  - `ooc_incident_count`
  - `checked_scene_count`
  - `world_rule_violation_count`
  - `introduced_setup_item_count`
  - `resolved_setup_item_count`

#### 交互要求
- 点击 review 进入详情
- 支持证据引用展开
- `source_artifact_reference` 和 `evidence_references` 可解析时提供 best-effort 回链

#### 验收
- 质量审阅记录可以从 metrics 或 incident 结果关联进入
- 审阅详情中必须能看见 evidence references
- 若引用不可解析，不得阻断整个页面展示

### 4.8 P0.8 Incidents & Releases

#### 路径
- `/incidents`
- `/releases`

#### 目标
让 OnCall 能快速看懂事故、发布尝试与漂移原因。

#### Incident 页面
- incident 列表
- incident 详情
- action items
- rollback 状态
- evidence references
- replay / validation / release attempt 关联

#### Release Attempt 页面
- attempt 列表
- attempt 详情
- source snapshot
- write_back_ok
- gate_allowed
- drift_detected
- manual rollback 状态
- derived_from_attempt_id

#### 验收
- 从 incident 能跳到对应 replay / release attempt
- 从 release attempt 能跳到对应 gate / drift / snapshot
- release attempt 必须通过 provider 统一访问，不可单独绕过抽象层

---

## 5. P1 可后续增强

- 实时流式刷新（WebSocket / SSE）
- 更复杂的时间轴交互
- 多 snapshot 比较
- 图形化 visibility graph / causal graph
- 高级审阅工作流
- 完整 RBAC 管理页
- live provider 接入

---

## 6. 页面与模块需求

### 6.1 首页 / 总览页

**路径：** `/`

#### 目标
一眼看清系统当前健康度、最新 replay 结果、近期 gate 阻断、最新 incident、最新 review。

#### 组件
- KPI 概览卡
  - 最近一次 replay 是否成功
  - 最近一次 gate 是否通过
  - 最近 24h incident 数
  - 最近 24h review 样本数
  - 最近 24h post-state mismatch 数
- 最近活动流
  - artifact / replay / incident / release attempt / review 的时间线
- 快速入口
  - Artifact Browser
  - Snapshot Viewer
  - Replay Lab
  - Validation Center
  - Metrics & Gate

#### 验收
- 首页必须能跳转到任一核心域页面
- 首页必须在没有实时流时仍然能展示静态摘要

---

## 7. 数据契约与接口要求

### 7.1 前端优先适配的数据来源

本 PR 不要求前端自造后端 HTTP 接口定义，但前端实现必须优先面向以下结构：

- snapshot / replay / validation / metrics / gate / incident / review / release attempt
- 顶层 artifact 与 bundle-derived section 的统一展示
- 以上对象均要求支持序列化后的 JSON 展示
- 若后端尚未提供 REST API，可先用 MSW mock 固定契约开发

### 7.2 统一列表分页契约

所有列表页必须支持以下通用能力：
- page / page_size / total
- 时间范围过滤
- 状态过滤
- 搜索
- 排序

### 7.3 统一错误展示规范

前端对后端错误统一展示：
- 401：未登录或凭证过期
- 403：无权限
- 404：资源不存在
- 409：版本 / 状态冲突
- 422：校验失败
- 500：后端异常

要求：
- 详情页要能展示错误 message
- 列表页要保留上次有效结果或空状态提示
- 不允许整页白屏

---

## 8. 组件与工程规范

### 8.1 必备基础组件

- `AppShell`
- `SidebarNav`
- `Breadcrumbs`
- `KpiCard`
- `StateBadge`
- `IssueList`
- `DiffViewer`
- `JsonTreeViewer`
- `Timeline`
- `MetricSparkline`
- `FilterBar`
- `EmptyState`
- `ErrorBoundary`
- `LoadingSkeleton`
- `ModeSwitcher`
- `ArtifactCard`
- `SectionAccordion`

### 8.2 状态管理

- UI 状态使用 Zustand
- 数据请求使用 TanStack Query
- 需要缓存的对象支持 query key 标准化
- provider 切换状态必须可持久化

### 8.3 图表与可视化

- 时序指标优先轻量图表
- 大数组列表必须虚拟滚动
- diff 和 JSON 展示必须支持局部折叠
- bundle-derived section 应以清晰的层级卡片展示，不得与顶层 artifact 混排

### 8.4 权限控制

至少预留以下角色：
- `viewer`
- `operator`
- `oncall`
- `admin`

要求：
- 页面级权限
- 按钮级权限
- 不允许只靠隐藏按钮完成权限控制

---

## 9. 非功能需求

| 类别 | 要求 |
|---|---|
| 性能 | 首屏 LCP < 1.5s（内网） |
| 列表 | 1 万条以内列表页可流畅搜索与筛选 |
| Diff | 单个 replay result 页面可在 2s 内完成首屏渲染 |
| 可用性 | 任何单模块崩溃不影响整体壳层 |
| 可访问性 | 状态色必须配合图标或文案 |
| 兼容性 | Chrome 112+ / Edge 112+ |
| 主题 | 支持浅色 / 深色模式切换 |
| 复制 | 所有 JSON / issue / finding / id 必须可复制 |

---

## 10. 设计风格

前端风格建议采用“内部 SRE 控制台 + 叙事数据面板”的融合风格：

- 默认深色主题优先
- 信息层级清晰、克制
- 重要阻断信息采用红色高亮
- 数据类视图尽量保持网格化、可扫描
- 文本解释优先于纯图形表达

---

## 11. 验收标准

### 11.1 功能验收
- 可以浏览 artifact、snapshot、replay、validation、metrics、gate、incident、review、release attempt
- 可以从任一 replay / incident 页面跳回关联 snapshot 或 validation
- review 页面在引用可解析时提供 best-effort 回链
- 可以直观看到 post-state mismatch、visibility leak、belief conflict 等关键失败类
- 可以解释 gate 为什么阻断

### 11.2 工程验收
- React + TypeScript + Vite 项目初始化完成
- 组件结构清晰，至少覆盖基础壳层与 6 个核心页面骨架
- MSW mock 已接入，能在无后端时完成页面联调
- artifact provider / mock provider 至少实现其一，并能通过统一接口切换
- 基础单元测试覆盖率达到 60% 以上
- ErrorBoundary 覆盖主页面区域

### 11.3 交付边界
本 PR 允许先交付：
- 壳层
- 列表页
- 详情页
- 关键结果卡片
- Mock / artifact 数据联调
- bundle-derived section 展示

本 PR 不强制交付：
- 全量实时流
- 复杂图谱交互
- 完整 admin 配置后台
- 高级审阅工作流自动化
- live provider 接入

---

## 12. 风险与依赖

| 风险 | 影响 | 应对 |
|---|---|---|
| 后端 artifact 结构继续演进 | 前端契约频繁调整 | 采用 schema-tolerant 渲染 |
| replay / validation 输出字段继续演进 | 页面频繁变更 | 对 bundle-derived section 做兼容解析 |
| 大对象 JSON 展示过重 | 页面性能下降 | 分段加载 + 折叠渲染 |
| provider abstraction 不完整 | 页面数据访问分叉 | 先补齐 provider，再实现页面 |
| 顶层 artifact / 派生段混淆 | 路由与详情结构返工 | 在路由与 UI 上强制区分层级 |
| 权限未落地 | 非授权操作风险 | 先做 UI 权限壳层，后续补服务端校验 |

---

## 13. 结论

这一版 V3.1 前端 PR 的目标不是做“漂亮的 dashboard”，而是把 alpha-SRE 后端已经存在的能力，变成一个能被 OnCall、运营、工程和复盘角色共同使用的叙事 SRE 控制台原型。

如果前端只能显示数据，那它只是看板；如果前端能让人快速理解 artifact、snapshot、replay、validation、metrics、gate、incident、review、release attempt 之间的关系，那它才真正符合 alpha-SRE 的系统定位。

---

*文档维护：Frontend Team | 最后更新：2026-05-07*