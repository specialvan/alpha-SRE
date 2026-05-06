# alpha-SRE V1 修订清单

## 目标

把当前 `alpha-SRE` 文档包从“方向一致的治理骨架”修订为“可自举、可执行、可评审、可逐步实现”的 SRE 文档基线。

## 修订原则

- 先修自洽性，再补规格深度。
- 先收敛权威口径，再扩写增量文档。
- 所有修订都要能回答三个问题：谁说了算、如何执行、如何验证。

## 第一批：修复文档自洽性

### 1. 补齐索引中缺失的文件

- [x] 新增 `incident_postmortem_template.md`
- [x] 新增 `archive/README.md`
- [x] 新增 `experimental/README.md`

完成标准：

- `final_document_index.md` 中所有路径都真实存在
- `package_manifest.md` 中所有路径都真实存在
- 新增文档至少写明用途、适用范围、使用规则

### 2. 统一 source of truth 口径

- [x] 统一 `CODEX_DEVELOPMENT_GOVERNANCE.md`、`final_document_index.md`、`package_manifest.md` 对“权威文档”的定义
- [x] 明确哪些文档是 authoritative，哪些只是 navigation / template / supportive
- [x] 删除或改写重复但口径不同的描述

涉及文档：

- `CODEX_DEVELOPMENT_GOVERNANCE.md`
- `final_document_index.md`
- `package_manifest.md`
- `SHORT_NAV.md`
- `README_FOR_CODEX.md`

完成标准：

- 任一入口文档对“权威文档集合”的描述一致
- 不再出现“一个文档说权威，另一个文档没列入权威”的情况

### 3. 统一启动顺序与阅读路径

- [x] 统一 `CODEX_DEVELOPMENT_GOVERNANCE.md`、`README_FOR_CODEX.md`、`START_HERE.md` 中的 read order / startup order
- [x] 给出一个正式顺序，其他文档引用这一个顺序，不再各写一套
- [x] 明确 `implementation_task_board.md` 是否属于首次必读

涉及文档：

- `CODEX_DEVELOPMENT_GOVERNANCE.md`
- `README_FOR_CODEX.md`
- `START_HERE.md`
- `codex_run_card.md`
- `codex_final_startup_prompt.md`

完成标准：

- 首次进入仓库的 agent 按任一入口文档执行，都能得到同一条阅读链路

## 第二批：把核心规格从“提纲”补到“可落地”

### 4. 扩写 replay 规格

- [x] 明确 command / event / snapshot 的定义边界
- [x] 明确 replay session 的输入格式、版本锁粒度、时间顺序规则
- [x] 明确 snapshot identity、state identity、policy version 的关系
- [x] 明确 side effect isolation 的实现约束
- [x] 明确 failure classification 的枚举和判定标准
- [x] 明确 replay 的测试样例要求

涉及文档：

- `replay_spec.md`
- `CODEX_DEVELOPMENT_GOVERNANCE.md`
- `test_governance.md`

完成标准：

- `replay_spec.md` 不再只是输入输出清单，而是能指导后续实现和验收
- 测试治理文档能映射到 replay 规格中的关键能力点

### 5. 扩写 consistency metric 规格

- [x] 为每个指标补充定义、计算口径、输入来源、统计窗口、阈值建议
- [x] 区分 baseline 指标与 increment 指标
- [x] 明确哪些指标只能观测，哪些指标可用于 gate / alarm
- [x] 明确“从 versioned state artifact 计算”的最小数据要求

涉及文档：

- `consistency_metric_catalog.md`
- `CODEX_DEVELOPMENT_GOVERNANCE.md`
- `execution_governance.md`

完成标准：

- 每个指标至少包含：名称、目的、公式或判定规则、数据源、使用场景
- 指标目录可以直接支撑后续实现数据模型和测试样例

### 6. 补齐 incident analysis 规格链路

- [x] 新建 `incident_postmortem_template.md`
- [x] 明确 incident 与 replay、regression test、rollback 的关系
- [x] 明确“mechanism-missing diagnosis”应记录哪些字段

涉及文档：

- `incident_postmortem_template.md`
- `implementation_task_board.md`
- `test_governance.md`
- `execution_governance.md`

完成标准：

- 事故复盘模板能承接 task board 中 T5 的目标
- 测试治理中“prior incidents and known failure classes”有具体落点

## 第三批：加强模板与流程，使之可审计

### 7. 强化任务模板和需求模板

- [x] 在 `task_launch_template.md` 中增加 owner / affected docs / affected contracts / target version / rollback trigger / evidence links
- [x] 在 `new_requirement_intake_template.md` 中增加 decision owner / priority / non-goals / impacted metrics / compatibility impact
- [x] 明确文档更新是必填项而不是可选提示

完成标准：

- 模板可以直接承载一次真实变更申请
- 模板字段能覆盖版本、回滚、验证、影响面四个核心维度

### 8. 重写执行流程，去掉重复和歧义

- [x] 合并 `new_requirement_execution_flow.md` 中重复的 layer classification 步骤
- [x] 明确完成、继续迭代、归档的出口条件
- [x] 明确每一步对应应更新的文档或产物

涉及文档：

- `new_requirement_execution_flow.md`
- `execution_governance.md`
- `task_launch_template.md`
- `new_requirement_intake_template.md`

完成标准：

- 执行流程每一步只有一个明确目标
- 流程能被直接照着执行，不依赖额外口头解释

### 9. 建立测试矩阵

- [x] 在 `test_governance.md` 中补一张“能力 -> 测试层 -> 证据”的映射表
- [x] 区分 baseline 必测项与 integration / increment 补充项
- [x] 明确 deterministic replay、consistency gate、incident regression 各自的验证证据

完成标准：

- 测试治理从原则文档升级为可验收清单

## 第四批：收敛路线图与集成边界

### 10. 修订 implementation task board

- [x] 为每个任务增加 status、dependency、deliverable、acceptance、owner
- [x] 把 T1-T6 和现有文档一一挂钩
- [x] 明确哪些任务属于“先补文档规格”，哪些属于“后续实现准备”

完成标准：

- `implementation_task_board.md` 能作为修订和落地的真实跟踪面板

### 11. 扩写 alpha-autopilot 集成方案

- [x] 明确 narrative state ownership precedence
- [x] 明确 read API / write-back API 的 version contract
- [x] 明确 gate bypass 防护与 fallback 行为
- [x] 明确 replay drift 的检测与处置方式

涉及文档：

- `integration_plan_alpha_autopilot.md`
- `CODEX_DEVELOPMENT_GOVERNANCE.md`
- `replay_spec.md`

完成标准：

- 集成文档不只讲原则，还能作为后续对接的约束说明

## 第五批：可选优化

### 12. 减少重复文档的机械复述

- [x] 评估 `codex_run_card.md`、`codex_short_command_card.md`、`codex_final_startup_prompt.md` 的职责边界
- [x] 保留不同粒度的入口文档，但避免内容只是换个写法重复一遍

### 13. 扩充 FAQ

- [x] 增加对 baseline / increment / experimental / archive 判定的说明
- [x] 增加对 replay、metric、incident、integration 几条关键概念的短解释

## 建议执行顺序

1. 先完成“第一批：修复文档自洽性”
2. 再完成“第二批：核心规格落地化”
3. 然后完成“第三批：模板与流程加强”
4. 最后处理“第四批：路线图与集成边界”
5. “第五批：可选优化”可穿插处理

## 建议拆分为 4 个提交

1. `docs: 补齐缺失入口与索引自洽性`
2. `docs: 扩写 replay 与 consistency 规格`
3. `docs: 强化模板、流程与测试治理`
4. `docs: 收敛任务板与 alpha-autopilot 集成边界`

## 当前判定

- 第一批是必须立刻处理的 P1 项
- 第二批和第三批是把 V1 从“骨架”升级为“可执行基线”的关键项
- 第四批适合在前面三批稳定后推进

## 当前剩余项

- `consistency_metric_catalog.md` 已有多项执行层落地，但仍不是全部指标都具备实现与验证资产
- Audit update 2026-05-06: all metrics currently listed in consistency_metric_catalog.md now have executable implementation and verification assets in alpha_sre/ and tests/.
- This audit update supersedes the prior remaining-item note above.
