逐文件深挖 review
1) alpha_sre/state.py
当前职责
这是整个系统的叙事状态内核，定义了 snapshot 里所有核心状态对象。

现状优点
使用 immutable dataclass，适合做版本化状态快照
每个 state 对象都有 validate()
NarrativeSnapshot 已经统一承载多个子状态
主要问题
1.1 叙事原生实体缺失
当前只建模了：

CharacterState
RelationshipState
MemoryState
ConstraintState
WorldRuleState
ChapterIntentState
但 PR 目标要求的是更强的 narrative kernel，至少应显式包含：

FactState
BeliefState
PlotThreadState / ObligationState
CapabilityState
VisibilityEdgeState 或可等价的可见性图结构
为什么这是问题
现在的状态只能表示“角色、记忆、规则”，但不能精确表达：

某个事实存在于世界中
某角色是否相信该事实
某事实对谁可见
某行为是否有能力约束
某剧情义务是否已经兑现
这意味着很多 V2 需要判定的 failure class 根本没有状态载体。

1.2 CharacterState 语义仍然偏弱
它目前只有：

current_goal
emotional_state
relationship_links
active_constraints
memory_references
knowledge_scope
缺少：

belief references
visible facts
current capabilities / action permissions
plot obligations
scene participation / presence information
影响
角色状态无法支撑：

false belief conflict
capability violation
scene-level action eligibility
knowledge boundary enforcement
1.3 WorldRuleState 过于静态
WorldRuleState 当前只是：

rule text
domain
enforcement strength
exceptions
provenance
缺少：

active/inactive 生命周期
applicability scope
rule dependencies
rule activation evidence
rule interaction with plot / capability
影响
无法判断：

规则是否当前生效
规则是否被局部覆盖
规则是否仅在某场景/某角色下有效
1.4 NarrativeSnapshot.validate() 仍偏结构验证
当前主要检查：

snapshot_id
state_identity
dangling relationship
dangling memory
组件自身 validate
但没有检查：

fact/belief consistency
capability availability
visibility graph integrity
plot obligation completeness
rule activation correctness
post-state semantic coherence
影响
它更像“对象图完整性验证”，不是“叙事状态验证”。

1.5 clone() 语义值得注意
clone() 通过 deepcopy + replace 复制字典字段，这在当前结构上可用，但在未来加入更多交叉引用后要小心：

是否保持引用一致性
是否保留对象身份语义
是否会复制出不一致的 graph 边
建议
未来如果引入图结构，最好改为显式 snapshot copy builder，而不是依赖深拷贝。

2) alpha_sre/serialization.py
当前职责
所有 state / event / result 的字典化和反序列化。

现状优点
反序列化函数拆分清晰
对 snapshot / event / replay / metrics / incident 都已有入口
适合继续扩展
主要问题
2.1 结构性扩展成本高
每新增一个 narrative primitive，就要补：

*_from_dict
对应 to_jsonable 兼容
上游调用处的字段传递
测试
影响
如果 V2 一次性引入 FactState、BeliefState、CapabilityState、PlotThreadState 等，serialization 会成为改动密度最高的文件之一。

2.2 缺少 schema evolution 策略
现在默认靠：

schema_version
get(..., default)
但没有看到明确的：

backward compatibility policy
migration path
deprecation handling
versioned parser strategy
影响
一旦 V2 上线后再改状态结构，旧快照、旧 replay artifact、旧 incident artifact 可能无法稳定读回。

2.3 _event_payload_from_dict() 只对少数 payload 做特殊处理
目前只对：

visibility_scope
add_memory
world_rule_update
做了适配。

问题
当新增事件类型后，如果 payload 中包含嵌套 state，必须手工维护这里，否则反序列化会悄悄偏掉。

建议
引入更系统化的 payload registry 或 event-type handler map。

3) alpha_sre/causal_validation.py
当前职责
对 replay 事件链做因果和可见性相关校验，并输出 findings。

现状优点
已经有结构化 CausalFinding
有推荐 regression test 字段
已经能检测部分关键问题：
duplicate event id
duplicate causal index
hidden reveal leak
unauthorized world rule overwrite
missing precondition
hidden knowledge in outcome
主要问题
3.1 仍是事件中心，不是状态中心
当前主要围绕 event type 做分支判断：

reveal
world_rule_update
chapter_outcome
add_memory
问题
V2 的问题很多不是“某类事件坏了”，而是“最终状态不满足叙事约束”。

例如：

一个 outcome 看起来合法，但它建立在错误 belief 上
一个角色执行了能力上不可能的动作
一个 plot payoff 被漏掉但没有任何单一事件可直接指向
3.2 缺少 false belief conflict
现在只有 hidden knowledge / hidden reveal 相关逻辑，但没有：

belief 与 fact 不一致
belief 被错误更新
role-local belief 与 world fact 冲突
belief leak / belief overwrite 的区分
影响
很多“角色明明不该知道/不该相信”的叙事错误会被漏掉。

3.3 缺少 capability / impossible action 判定
系统没有 CapabilityState，因而也没有：

action eligibility
capability boundary
scene-level permission model
影响
无法把 “impossible action” 做成真正的结构化失败类，只能靠弱规则兜底。

3.4 缺少 plot obligation / payoff 生命周期
没有 plot thread，也就无法表达：

setup
obligation
fulfillment
payoff
unresolved miss
影响
这会让“前文埋伏笔但后文没回收”这种故事性问题完全不可见。

3.5 validated outcome 只检查 prerequisite event
chapter_outcome 现在只判断 prerequisite event 存不存在，但没有验证：

prerequisite 是否在正确 visibility scope
prerequisite 是否被角色真的可访问
prerequisite 是否语义上足以支持 outcome
outcome 是否符合 capability / rule / belief 状态
影响
语义因果仍然很浅。

4) alpha_sre/metrics.py
当前职责
把 replay / validation / incident / review 等汇总成指标。

现状优点
指标结构已经相当完整
兼容多数据源
已有一些 narrative 风格指标，比如：
plot_inconsistency_rate
character_ooc_rate
world_rule_violation_rate
foreshadowing_payoff_rate
主要问题
4.1 核心分母不对
当前有：

causality_break_rate = causality_breaks / total_issues
visibility_leak_rate = visibility_leaks / total_issues
问题
total_issues 是验证问题数，不是 narrative check units。

PR 明确要求不能用 issue 总数做分母，否则指标会被噪声稀释。

影响
轻微问题多时，严重叙事错误的比率被压低
跨场景比较不稳定
gate threshold 不可信
4.2 checked unit counters 不完整
现在虽然有：

checked_outcome_count
checked_rule_change_count
checked_write_back_count
checked_memory_reference_count
但仍缺少更完整的 narrative unit counters，比如：

checked visibility decisions
checked action eligibility decisions
checked belief/fact comparisons
checked plot obligation evaluations
checked post-state surfaces
4.3 一些指标语义仍然偏旧
比如：

snapshot_freshness
edit_amplitude
second_generation_rate
这些是有价值的，但它们更多是 control-plane / release-plane 指标，不是核心 narrative correctness 指标。

建议
把这些保留为辅助维度，但不要让它们掩盖核心语义指标。

4.4 foreshadowing_payoff_rate 仍比较粗
它目前依赖 review record 里的 setup/resolved 计数。

问题
这只能近似衡量“伏笔回收”，但不能表达：

哪个 setup item 对应哪个 payoff
payoff 是否按时出现
payoff 是否被错误替代
payoff 是否仍悬空
5) alpha_sre/gate.py
当前职责
根据 replay + metrics 判断是否允许继续流程。

现状优点
gating 模型清晰
blocking/warning 分离合理
去重做得不错
主要问题
5.1 仍然依赖 issue code 白名单/黑名单
CRITICAL_ISSUE_CODES 里是现有事件级和结构级问题。

问题
V2 需要的是 narrative-native failure class，而不是只看一组 issue code。

影响
如果新语义问题没有加入这个集合，gate 不会自然阻断。

5.2 gate 没有层次化失败策略
现在看起来是：

replay 出问题就阻断
metrics 过阈值就阻断
但 V2 其实需要不同等级的处理：

hard block：post-state mismatch、visibility leak、capability violation
soft block / warning：轻微 plot drift、未完成 payoff
informational：编辑幅度较大但仍可解释
5.3 replay_availability < 1.0 只给 warning
这点本身可以接受，但说明 gate 仍然偏“工程可用性”而不是“叙事真实性”。

建议
把 gate 的主轴转向 semantic correctness，再保留 operational availability 作为次级信号。

6) alpha_sre/integration.py
当前职责
把读、写、漂移、incident export、release attempt 串成控制面。

现状优点
结构完整
WriteBackRequest / WriteBackResult / ReleaseAttemptRecord 设计不错
漂移报告和 incident export 都已经有骨架
主要问题
6.1 Drift signature 仍然过窄
_snapshot_signature() 只比较：

snapshot_id
state_identity
schema_version
policy_version
visibility_version
ids 集合
问题
它没有包含 narrative kernel 关键语义面：

facts
beliefs
capability availability
plot obligations
visibility edges
影响
即使结构没变，语义变了，drift 也未必能捕获。

6.2 write_back() 的最终判断仍受 replay 质量限制
现在：

replay
metrics
gate
drift report
这条链是对的，但只要 replay 不做 locked post-state verification，整个 write-back 的真实性仍然不够强。

6.3 read_snapshot() 是纯 version/identity 比对
它只做：

state identity
schema version
visibility version
问题
这只是“读取契约”，不是“叙事一致性读取”。

影响
读到的 snapshot 可能在语义上已经失真，但仍被视为 OK。

6.4 incident export 的语义输入太依赖 upstream
export_incident() 本身没有太大问题，但它能输出什么，完全取决于 IncidentReport 和上游 validation 的质量。

影响
如果 causality / replay 没有新 failure taxonomy，这里的 incident artifact 也会继续偏粗。

7) alpha_sre/replay.py 相关说明
虽然你这次没贴出完整文件，但从 metrics / integration / causal validation 的调用方式可以推断其现状。

主要推断问题
7.1 还没有 locked post-state 校验
这是 V2 最大的缺口之一。
如果 replay 不和预期 post-state 比对，很多一致性问题只是“运行过了”，不能证明“结果对了”。

7.2 observation frame 可能存在，但未完整语义化
ObservationFrame 已经存在于 serialization 和 replay 结构里，但从 metrics 里看，很多字段并没有被真正作为决定条件。

7.3 replay 很可能只做事件 apply，而非语义模拟
如果 replay 只是重放事件，那么它仍然不能判断：

hidden fact leak
false belief conflict
capability violation
plot obligation miss
更高层的文件间协同问题
A. state、replay、metrics、gate 没有共同语义词典
每层都在做自己的校验，但它们还没有共享统一的 narrative taxonomy。

结果
state 表达不了的，replay 也判不了
metrics 的分母和 gate 的阈值没有稳定语义基础
incident 只能拿到“结果”，拿不到“故事上为什么错”
B. validation 与 gate 有重叠但边界不清
validation 负责 issue，gate 负责允许/阻断。
但现在很多关键语义实际上只有 issue，没有更高层的 semantic class。

结果
issue code 越堆越多
gate 逻辑越来越像 if/else 黑名单
未来扩展会变得很脆
C. integration 依赖上游语义，但不能补救上游缺失
这意味着 V2 不能只改 integration，也不能只改 metrics。
必须从 kernel 开始，往上逐层打通。

逐文件的修改优先级建议
必须先改的
alpha_sre/state.py
alpha_sre/replay.py
alpha_sre/causal_validation.py
alpha_sre/metrics.py
紧随其后的
alpha_sre/gate.py
alpha_sre/integration.py
alpha_sre/serialization.py