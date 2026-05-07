# alpha-SRE V3 Frontend Counter Review

## 结论

本轮对 `claude-review/v3/alpha-SRE-frontend-PR.md` 的返审结论是：`request changes`。

这份前端 V3 文档有明确的产品化方向，也抓住了 `snapshot`、`replay`、`validation`、`metrics`、`gate`、`incident` 之间的关系是 `alpha-SRE` 前端的核心价值。
但它当前仍有一个关键偏差：文档标题写的是“基于现有后端实现”，而正文中的 P0 范围、路由设计、指标面和 review 详情要求，已经超出了当前仓库真实提供的后端契约。

当前仓库的主状态仍然是：

- Python 进程内模型与控制面对象
- `IntegrationBridge` 驱动的读写、回放、漂移与 incident/export 逻辑
- `JsonArtifactStore` 驱动的 JSON artifact 持久化
- 文档级别定义的未来 integration API，而不是可直接供 SPA 消费的现成服务层

因此，这版文档不能直接作为“按现有后端即可开做 P0 前端”的实施依据。若照此推进，前端很容易先围绕 mock 契约构建一套看似完整的控制台，后续再因为真实后端缺少查询面、稳定主键、列表契约和详情模型而返工。

## Review 输入

本轮返审基于以下材料：

- `claude-review/v3/alpha-SRE-frontend-PR.md`
- `README.md`
- `CODEX_DEVELOPMENT_GOVERNANCE.md`
- `integration_plan_alpha_autopilot.md`
- `alpha_sre/replay.py`
- `alpha_sre/metrics.py`
- `alpha_sre/review.py`
- `alpha_sre/integration.py`
- `alpha_sre/artifacts.py`

## 总体判断

这份文档的问题不是“前端方向错了”，而是“把未来应当存在的产品面，误写成了当前已经存在的后端能力面”。

如果要让这份文档成为可执行的 V3 输入，至少需要先在文档里明确二选一：

1. 把本次 V3 改写成“artifact-first / mock-first 的前端壳层原型”，接受当前只能围绕 JSON artifact、单对象详情和手工输入回放做展示。
2. 把本次 V3 改写成“前端 + 后端查询契约前置项”的联合计划，先补可查询 API、artifact inventory、稳定资源标识和列表契约，再做完整的列表页、搜索、回跳和跨页面导航。

在没有完成这一步之前，当前版本不应作为 P0 交付要求下发。

## 关键 Findings

### F1. P0 范围假定了并不存在的可查询后端面

对应位置：

- `claude-review/v3/alpha-SRE-frontend-PR.md:457-472`

问题说明：

文档把以下能力直接写入 P0 或统一契约：

- 列表页
- 详情页
- 搜索
- 分页
- 排序
- 跨对象跳转

但当前仓库并没有现成的：

- HTTP 服务层
- REST 风格资源查询面
- artifact inventory/list API
- 通用搜索接口
- 通用分页/排序契约

现有能力更接近：

- `IntegrationBridge` 提供进程内读写逻辑
- `JsonArtifactStore` 提供按相对路径 `save_*` / `load_*` 的文件持久化
- `integration_plan_alpha_autopilot.md` 只定义了未来 API 轮廓，并未落成现有服务面

影响：

- 前端如果按当前文档直接实现，只能先用 MSW 自造列表、搜索和详情协议
- 后续一旦接真实后端，列表结构、资源路径、筛选维度、错误形态都可能重做
- “基于现有后端实现”这一定位会误导实施优先级

修订建议：

- 把文档里的“现有后端能力”与“未来后端查询面”明确拆开
- 若坚持 P0 就做列表/搜索/详情，必须先补一个后端前置章节，定义：
  - artifact inventory/list contract
  - resource id 规则
  - page/page_size/total 的来源
  - search/sort/filter 的服务端语义
- 若本轮不补后端查询面，就把 P0 收缩为：
  - 壳层
  - 单对象 JSON/树形展示
  - artifact 路径驱动的详情页
  - 手工装配 replay 的实验面板

### F2. replay 详情路由没有稳定主键来源

对应位置：

- `claude-review/v3/alpha-SRE-frontend-PR.md:272-274`

问题说明：

文档把 replay 详情页设计成：

- `/replay/:replayId`

但当前仓库中：

- `ReplayResult` 本身不包含稳定 `replay_id`
- `replay_id` 只存在于可选的 `ObservationFrame.replay_id`
- 并不是所有 replay 都要求有 `ObservationFrame`

这意味着：

- 不是所有 replay 结果都能生成稳定 URL
- 不能可靠地从列表跳到详情
- 不能可靠地从 incident/release/review 回跳到某个 replay 详情

如果今天一定要给 replay 页面建稳定路由，当前更合理的主键应该来自：

- replay bundle artifact 路径
- release attempt artifact 引用
- incident 中引用的 replay artifact reference
- 或一个新增的 persisted replay record contract

影响：

- 当前路由设计会把“可选字段”误当成“稳定资源标识”
- 实现时会逼着前端缓存临时 id 或虚构 id
- 一旦切到真实 artifact / API 模式，路由将发生结构性变更

修订建议：

- 把 `/replay/:replayId` 改为基于 artifact/reference 的路由策略
- 或在文档中显式增加前置要求：后端必须先提供稳定 replay record id
- 在没有稳定 replay 主键前，不要把 replay 列表页与详情页写成既定 P0 路由契约

### F3. 指标面板遗漏了 V2.2 的叙事原生指标

对应位置：

- `claude-review/v3/alpha-SRE-frontend-PR.md:350-375`

问题说明：

文档写的是“展示 `MetricSummary` 的全部核心字段”，但列出的字段停留在较早期的摘要层，没有覆盖当前 V2.2 已经落地的 narrative-native 指标与 checked denominators，包括但不限于：

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

这不是一个“展示项多少”的小问题，而是会直接影响前端是否真正反映当前仓库的 V2.2 价值重点。

影响：

- 前端会继续把 `alpha-SRE` 展示成泛化 dashboard
- 看不到 V2.2 最关键的 semantic replay hardening 结果
- `post-state mismatch`、belief/capability/rule/plot 这些叙事失败类，无法在指标层形成第一视角

修订建议：

- 将 Metrics & Gate 一节改成“旧指标 + V2.2 narrative-native 指标”的完整清单
- 明确哪些指标用于概览卡，哪些指标用于诊断页
- 明确 checked counts 不是附属数据，而是解释 rate 分母的必要字段

### F4. Quality Review 页面要求超出了现有 review 模型

对应位置：

- `claude-review/v3/alpha-SRE-frontend-PR.md:402-416`

问题说明：

当前 `NarrativeQualityReviewRecord` 的真实结构主要包含：

- `review_id`
- `source_artifact_reference`
- 若干计数器
- `evidence_references`

它并不包含文档中暗示的这些能力基础：

- review 状态
- review 结论
- failure type
- 富文本详情
- 多层级审阅结果结构

因此，文档写的：

- review 详情页
- 按 review 结果状态筛选

在当前后端契约上都没有稳定数据基础。

影响：

- 前端若按现文实现，只能人为拼出“详情”概念
- 所谓 review 详情最终可能只是重复展示同一组计数器
- “以后端模型为准”的原则在这里被前端需求反向突破

修订建议：

- 若沿用现有模型，P0 里的 Quality Review 应收缩为：
  - review 列表
  - 基础计数展示
  - `source_artifact_reference`
  - `evidence_references`
- 若要保留状态筛选与详情页，则必须先扩展 review contract，再把这部分作为新前置项写入文档

## 建议的文档修订方向

### 方向 A：收缩为真实可落地的 V3 P0

如果目标是“尽快做出不自欺的前端第一版”，建议把这份文档改成：

- artifact-first 前端壳层
- 详情优先，列表从简
- 无真实查询 API 时，不承诺统一搜索、分页、排序
- replay 页面以手工输入或 artifact 加载为主
- quality review 页面仅展示现有 record 能表达的数据
- metrics 页面补齐 V2.2 narrative-native 指标

这样做的好处是：

- 与现有仓库真实契约一致
- 可以尽快形成可信的前端观察面
- 不会因为后端尚未服务化而透支前端设计

### 方向 B：升级为前后端联合 PR 需求

如果目标是“直接做完整控制台”，建议明确增加一个前置章节：

- 先交付 queryable backend surface
- 再交付 React SPA

前置项至少应补齐：

- artifact inventory / list API
- replay record 稳定 id
- incident / review / release attempt 查询面
- search/filter/sort/page contract
- 统一错误 envelope
- 权限模型与服务端校验边界

这样做的好处是：

- 前端不会用 mock 契约替代真实契约
- 路由与数据层能一次成型
- “基于现有后端实现”会被改写为“基于新增查询面契约实现”，语义更准确

## 建议给 Claude 的处置结论

建议回传给 Claude 的结论可以直接表述为：

1. 保留 V3 前端建设方向，不否定“叙事 SRE 控制台”的总体目标。
2. 当前文档不能以“基于现有后端实现”的表述进入实施，因为它假定了当前仓库并不存在的查询型后端面。
3. 需要先在“收缩 P0 到 artifact-first 原型”与“补后端查询契约后再做完整控制台”之间明确选一条。
4. 无论选择哪条路径，都必须修正文档中的 replay 路由主键、Metrics V2.2 指标覆盖和 Quality Review 契约越界问题。

## 最终口径

这不是一份“方向错误”的前端文档，而是一份“产品形态走在后端契约前面”的文档。

当前最需要打回 Claude 修订的，不是视觉风格或页面拆分，而是以下三件事：

- 把“现有能力”与“未来能力”彻底分层
- 把资源标识和查询契约讲清楚
- 把 V2.2 已经落地的 narrative-native 指标与 failure semantics 真实暴露出来

在这些点修正前，不建议把该文档作为 V3 前端 P0 的正式执行基线。
