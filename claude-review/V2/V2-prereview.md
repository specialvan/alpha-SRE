总体评审结论
结论
当前实现不满足这份 V2 PR 需求的核心意图。

它已经具备一些“形式上的骨架”：

有 NarrativeSnapshot
有 ObservationFrame
有 ReplayEngine
有 CausalValidation
有 MetricSummary
有 ConsistencyGate
有 integration bridge
但这些能力大多是结构存在、语义不足，和 PR 要求的“可执行叙事约束”还有明显差距。

一、需求与现状的核心差距
1) Narrative state kernel 仍然不够“叙事原生”
PR 要求
必须显式建模：

FactState
belief graph
plot thread / obligation
capability / action boundary
visibility graph
并且 CharacterState / WorldRuleState / NarrativeSnapshot 都要扩展。

当前实现
alpha_sre/state.py 里只有：

CharacterState
RelationshipState
MemoryState
ConstraintState
WorldRuleState
ChapterIntentState
NarrativeSnapshot
其中：

CharacterState 只有 goal、情绪、关系、约束、memory refs
WorldRuleState 只是文本 + domain + strength
NarrativeSnapshot 没有 facts / beliefs / plot threads / capabilities / visibility edges
评审判断
这是最大缺口之一。
当前状态模型只能表达“角色、记忆、规则”的粗粒度世界，不足以表达：

角色为什么知道某事
某事实对谁可见
某行为是否真的可做
某剧情义务是否已兑现
某条规则是否处于激活态
也就是说，PR 想把“叙事一致性”提升为可验证状态机，而现在还只是文档化的概念层状态。

风险
如果直接进入 V2 而不补这层状态，会导致：

replay 仍然只是事件重放，不是语义复盘
gate 只能靠 issue list 做兜底
metrics 只能继续算“问题密度”，不能算“叙事单位密度”
hidden fact leak / false belief / impossible action 这些 failure class 无法被稳定表示
2) Replay 还不是 semantic replay
PR 要求
replay 必须：

校验 locked post-state
消费 observation frame 的语义
区分 hidden fact leak vs false belief
基于 capability / active rule / plot thread / visibility graph 做判定
当前实现
alpha_sre/replay.py 的 replay 逻辑主要是：

检查版本
逐事件 apply
对少数 event type 做简单状态写回
检查 hidden event / blocked event / missing precondition
最后调用 validate_causality
现状问题
post_state_snapshot 只在 ReplaySession.validate() 中检查 state_identity 是否一致，没有做 post-state 对账

ObservationFrame 有字段，但 replay 里真正只消费了很少一部分：

blocked_event_types
accessible_memory_ids
hidden_fact_ids 在 chapter_outcome 里被粗糙使用
visible_fact_ids

believed_fact_ids
active_world_rule_ids
这些基本没有形成执行语义

replay 没有 capability state，因此 impossible action 只能靠事件类型兜底

replay 没有 plot thread，因此无法判断 payoff missing / unresolved obligation

评审判断
当前 replay 仍然是结构重放，不是 PR 需要的语义复盘。

风险
如果不补 post-state verification，会出现很严重的问题：

replay 通过了，但实际 post-state 不一致
事件链可重放，但结果不稳定
你无法区分“机制缺失”与“结果偏移”
deterministic replay 的可信度不成立
这是 V2 里最关键的一条之一。

3) Causal validation 还不是 narrative-native explanation
PR 要求
CausalFinding / validation 必须能表达：

hidden fact leak
false belief conflict
capability missing
inactive rule
unresolved plot obligation
replayed state 与 locked post-state mismatch
当前实现
alpha_sre/causal_validation.py 现在能识别：

duplicate event id
duplicate causal index
reveal requires existing memory
hidden reveal leak
unauthorized world rule overwrite
chapter outcome missing prerequisite
outcome uses hidden knowledge
问题
这还是偏“事件级因果校验”，不是“叙事状态级失败解释”。

当前缺少：

fact 与 belief 的区分
capability violation 的结构化解释
plot obligation / payoff lifecycle
active rule misuse 的状态级解释
replay mismatch attribution
评审判断
validate_causality() 目前可视为基础因果守门，但达不到 PR 对“failure class explanation”的要求。

风险
如果这层不补：

gate 仍然只能看表面 code
incident 归因会模糊
regression test 只能覆盖“事件没发生”，无法覆盖“叙事状态错了”
4) Metrics 仍然带有旧式 issue 分母
PR 要求
明确禁止：

causality_breaks / total_validation_issues
visibility_leaks / total_validation_issues
必须改成 narrative check unit 分母，例如：

checked_outcomes
checked_visibility_decisions
checked_actor_action_count
checked_post_state_surface_count
当前实现
alpha_sre/metrics.py 里：

causality_break_rate = causality_breaks / total_issues
visibility_leak_rate = visibility_leaks / total_issues
尽管已经有一些 checked counters，比如：

checked_outcome_count
checked_rule_change_count
但它们还没覆盖 metrics 的关键分母。

评审判断
这一点与 PR 目标直接冲突。

风险
继续用 issue 总数作分母，会导致：

严重 narrative defect 被大量轻微 issue 稀释
gate 阈值变成噪声响应
指标失去叙事语义
不能做跨场景比较
5) Gate 还没有真正基于叙事原生 failure class 设计
PR 要求
gate 必须能基于 narrative-native metrics 阻断，例如：

post-state mismatch 一票否决
visibility leak 一票否决
capability violation 一票否决
active rule misuse 一票否决
plot obligation miss 可 hard/soft 配置
当前实现
alpha_sre/gate.py 主要是：

如果 replay 有 critical issue code 就阻断
metrics 超阈值就阻断
还是偏 legacy code + metric threshold 的组合
问题
它没有真正建立在“narrative check unit”上，而是依赖已有 issue code 列表。

评审判断
gate 现在更像“质量门禁聚合器”，还不是 PR 需要的叙事一致性守门器。

二、代码层面的具体观察
state.py
优点：

结构已经比较清晰
dataclass 和 validate 模式统一
适合做序列化与 round-trip
不足：

没有事实、信念、能力、plot thread、visibility edge
WorldRuleState 的激活语义不足
CharacterState 不承载当前位置、presence、belief refs、capability refs
结论：需要大改，但现有结构是可扩展的。

serialization.py
优点：

已经有完整的 from_dict/to_jsonable 流程
对 replay / snapshot / metric / incident 都有统一入口
不足：

只支持现有结构
一旦新增新一等公民 state，需要同步加大量转换函数
没有看到对新增语义字段的兼容策略
结论：这是 V2 的工作量中心之一。

replay.py
优点：

replay pipeline 已经存在
有 issue dedupe、evidence references、failure classification
有 observation frame 雏形
不足：

post-state verification 不存在
observation frame 语义未真正执行
没有新的 failure class
只对 memory/rule/hidden event 做了局部处理
结论：当前 replay 逻辑只能支撑 V1，不足以承载 V2。

causal_validation.py
优点：

有 findings 结构
已经有 “recommended_regression_test” 的意识
已经做了一些 causal chain 的输出
不足：

findings 还是事件导向，不是 narrative state 导向
缺少 failure taxonomy 的细分能力
没有 post-state mismatch attribution
结论：适合升级，但需要补一层叙事状态解释模型。

metrics.py
优点：

metrics 框架已经是可扩展的
已经有 checked counts 的基础
已经有一些 narrative 风格指标雏形，比如 foreshadowing payoff
不足：

核心比率分母不对
仍然受 total_issues 主导
没有新的 checked unit counters
结论：这一层必须改，不是可选优化。

gate.py
优点：

gate 结构清晰
与 metrics/replay 分离得不错
不足：

仍基于 issue code 白名单/黑名单
对 V2 的 narrative-native 失败类没有单独语义
hard/soft gate 的表达能力不足
结论：适合扩展，但逻辑需要重构。

integration.py
优点：

write-back / drift / release attempt 的桥接做得比较完整
说明仓库不是散的，而是有一条控制面线
不足：

drift signature 仍未包含新的 narrative state surfaces
replay 结果如果不补 post-state verification，这里的 drift 结论也会偏弱
release attempt / incident export 也会继承上游的语义缺失
结论：integration 依赖上游改造，不能单独补丁化解决。

三、这份 PR 的合理性评审
我认为这份 V2 PR 需求整体上是高质量的，原因有三个：

1. 它是“语义升级”，不是“功能堆叠”
它并没有要求一次性做完全部 narrative intelligence，而是先把最关键的执行基线打通：

状态可表达
replay 可验证
metrics 可归一
gate 可阻断
这非常合理。

2. 它显式拒绝“假落地”
文档里明确拒绝：

只加文档字段
只加 dataclass
只让测试过
只加 metric 名字
这说明需求方已经意识到这个系统最容易掉进“结构完成但语义空心”的坑。

3. 它保留了后续演进契约
没有要求：

全量生产集成
prose 自动抽取
全部 defect 覆盖
UI/monitoring 完整实现
这很好，避免 PR 过载。

四、我对 V2 PR 的风险判断
风险 1：范围偏大，容易一把做散
这份 PR 同时动：

state
serialization
replay
validation
metrics
gate
tests
docs
如果没有严格分阶段，很容易出现：

state 加了，replay 没消费
replay 改了，metrics 仍旧旧分母
tests 过了，但只是 happy path
建议
按 PR 文档建议的顺序拆分实现，并在每个阶段有独立验收。

风险 2：语义字段增加后，测试会指数膨胀
新增 facts/beliefs/capabilities/plot_threads/visibility_edges 后，状态组合空间会大很多。

建议
测试策略应采用：

golden case
failure-class-first
少量高价值组合测试
而不是大规模穷举。

风险 3：如果不先定义 schema/contract，很容易互相打架
尤其是：

fact id / belief id / visibility edge 的关联
capability 与 active rule 的优先关系
plot thread 与 causal validation 的边界
建议
先定义稳定 schema，再改 engine，不要边做边改字段名。

五、我建议的实现优先级
如果这是一个真实落地 PR，我建议优先级如下：

P0
扩展 NarrativeSnapshot
新增 FactState / BeliefState / PlotThreadState / CapabilityState / VisibilityEdgeState
补 serialization round-trip
补 validation 和 schema 文档
P1
replay 消费新状态
增加 locked post-state verification
区分 hidden fact leak / false belief conflict / capability violation / inactive rule use
P2
causal validation 丰富 failure taxonomy
metrics 改分母，增加 checked unit counters
gate 改 narrative-native blocking semantics
P3
golden cases
integration / incident / release attempt 的 drift 和 export 适配
task board / spec 文档同步
六、最终评审意见
如果我是 PR reviewer，我会给这份 PR 的需求结论是：
需求设计评价
Strong approve on direction, but implementation must be phased carefully.

对现状代码的结论
当前代码基线不足以直接满足该 PR，要做实质性重构。

最关键的 3 个必须补点
post-state locked verification
narrative-native state kernel
metrics 分母迁移
这三项不补，V2 的核心目标就不成立。

七、简短总结
这份 PR 需求抓住了当前系统最本质的问题
不是“能不能跑”，而是：

系统能不能表达叙事真相
replay 能不能证明语义一致
gate 能不能阻断真正的叙事失败
metrics 能不能反映叙事单位而不是 issue 噪声
而当前实现的答案是

结构上部分具备
语义上还不成立
工程上需要一次系统性升级