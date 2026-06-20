# 最近三次修复方案整理

更新时间：2026-06-20

本文整理最近三次主要修复方案，按从近到远排列。用途是交接、复盘和后续验收，不替代具体 PR diff。

## 1. Player-Safe Contract System

目标：普通玩家可见内容必须来自一份可验证的 `PlayerContract`，不能混入 AI 原文、后台字段、GM 调试数据或运行时临时状态。

### 核心问题

此前普通 UI、GM 调试、AI 原文和系统权威状态之间边界不够硬，导致这些风险：

- 普通玩家摘要可能继续显示 `当前压力`、`经历事件`、`当前评分`、`剧情压力`。
- UI 有机会绕过 LifeNode 或 selector，直接读取 `currentEvent`、`playerText`、`statePatch` 等 raw 字段。
- AI prompt 可能继续吃到后台 ID、旧正文、无效事件文本，引发输出污染。
- 运行时 fallback 可能把调试字段泄漏给普通玩家。

### 定版方案

建立三层合同加 prompt 合同：

```text
RawContract
  AI 原文、currentEvent、playerText、statePatch、validator 报告
  只允许 debug / GM / runtime 内部使用

CanonicalContract
  eventLog、LifeNode、growthLedger、yearlyOutcome、panelViews
  是系统承认的权威投影

PlayerContract
  普通玩家 UI 唯一输入
  只包含 header、currentScene、choices、timeline、panels、visibleChanges

PromptContract
  AI 输入合同
  只给可见场景摘要、允许压力、选择方向
```

### 代码落点

新增或强化：

```text
src/contracts/raw/
src/contracts/canonical/
src/contracts/player/
src/contracts/gm/
src/contracts/prompt/
schemas/player-contract.schema.json
schemas/gm-contract.schema.json
web/player/
web/gm/
```

改造：

```text
src/web-session-store.js
src/ai-provider.js
web/app.js
src/index.js
```

### 门禁

Schema 门禁：

- `PlayerContract` 不允许包含 `currentEvent`、`eventHistory`、`playerText`、`statePatch`、`annualFactPackage`、`curriculumSlot`、`threeLayerFocus`、`debug`、`gmView`。

静态门禁：

- `web/player` 不能出现 `currentEvent`、`eventHistory`、`playerText`、`statePatch`、`rawResponse`、`annualFactPackage` 等 raw 字段访问。

运行时门禁：

- 普通 UI 渲染前执行 `assertPlayerContractSafe(playerContract)`。
- 失败时显示安全 fallback，不渲染污染内容。

Prompt 门禁：

- AI prompt 不得包含后台 ID、raw event body、旧无效 `playerText`。
- 只允许喂 LifeNode 摘要、observable scene、allowed choice pressure。

### 验收标准

- 普通玩家 UI 只读取 `PlayerContract`。
- GM/debug 可以读取 `GMContract` 和 `RawContract`。
- `PlayerContract` JSON 中不出现后台字段和后台术语。
- `web/player` 静态扫描不出现 raw 字段。
- AI prompt 不出现 `mentor_attention`、`curriculumSlot`、`threeLayerFocus`、`主轴`、`副轴`、`背景回响`、`旧线索`。
- CI 增加 `npm run test:contracts`。

## 2. Attribute Type Patch + Origin Compatibility + Prompt/Asset 收口

目标：把属性类型、家境出身、旧资产预算和 AI 输入净化做成底层规则，不停留在 UI 文案。

### 核心问题

当前 `growth-ledger` 已经让 `familyBackground`、`luck` 不走 maturity cap，但仍有缺口：

- `appearance` 仍可能被当作年龄封存属性。
- 不能把 `appearance` 简单归入现实属性，否则会变成出生即完全兑现。
- 家境可能先随机到低家境身份，再用高家境数值硬补解释。
- 旧资产预算存在，但白鹿、后山、玉片、册子等资产池和 LifeNode 复核仍需补强。
- AI prompt 中仍可能出现后台结构和术语。

### 定版方案

把“是否封存”和“是否出生即生效”拆开：

```js
const MATURITY_CAPPED_ATTRIBUTES = new Set([
  "constitution",
  "intelligence"
]);

const IMMEDIATE_REALITY_ATTRIBUTES = new Set([
  "familyBackground",
  "luck"
]);
```

属性规则：

```text
体质 constitution
  身体承载；年龄封存；随成长、训练、伤病、营养变化

智力 intelligence
  认知与学习；经验封存；随教育、经历、训练、记忆变化

颜值 appearance
  外貌与气质发育；不走 maturityCap；显示“尚未定型”

家境 familyBackground
  出生现实 / 家庭资源；出生时生效；不封存

运气 luck
  概率倾向 / 机缘偏置；不封存
```

### 属性档位

统一属性档位表：

```text
0      极端缺陷
1      很差
2      较差
3      略低普通
4      普通
5-6    高于普通
7-9    优秀
10-12  精英
13-16  凡人顶级
17-20  凡人极限
20+    超常规
```

服务对象：

- 属性面板同龄评价
- AI prompt 属性现实说明
- 家境出身筛选
- 事件成功率 / 失败率参考
- NPC 反应
- 年度人生机会

### 家境反向约束身份

正确顺序：

```text
玩家加点 + 天赋家境加成
  ↓
计算最终 familyBackground potential
  ↓
得到家境档位
  ↓
按档位筛 identitySeed
  ↓
WorldOriginResolver 生成具体出身
  ↓
开局和后续剧情都承认这个出身
```

高家境禁止抽到：

```text
普通猎户、贫苦农户、边境孤儿、矿场童工、流民、破产家庭、底层劳工
```

低家境禁止抽到：

```text
贵族、旧钱、宗门旁支、商号之家、资源配给者家庭、管理层家庭、旧设施继承者
```

### 三世界家境解释

修仙世界高家境：

```text
商号之家、宗门外缘家庭、修仙家族旁支、旧传承家庭、药铺/器坊资源家庭
```

克苏鲁世界高家境：

```text
旧钱家庭、教授家庭、医生家庭、律师家庭、公务系统家庭、商人家庭
```

废土世界高家境：

```text
营地管理层家庭、技术员家庭、医疗站家庭、资源配给者家庭、武装队亲属、旧设施权限继承者
```

### 旧资产预算强化

规则不做虚的 70/30 语义百分比，改成可测规则：

- `requiredLifeDelta` 必须在主体段落完成。
- 选择项至少 2/3 围绕 `requiredLifeDelta`。
- 旧资产不得出现在第一段开头。
- 旧资产最多一句背景回响。
- 旧资产不得进入选择项核心。

预算示例：

```js
{
  whiteDeer: {
    role: "background_echo",
    maxSentences: 1,
    cannotOpenScene: true,
    cannotDriveChoices: true,
    cooldownUntilAge: 11
  },
  backMountain: {
    role: "suppressed",
    maxSentences: 0,
    cooldownUntilAge: 12
  }
}
```

### AI 输入净化

新增 `Prompt Sanitizer`：

后台输入：

```text
mentor_attention、curriculumSlot、threeLayerFocus、annualFactPackage、旧线索、背景回响、主轴、副轴
```

转换为玩家可见中文：

```text
一位可信大人开始更认真地指导你。
今年的生活变化是：学习安排发生改变。
此前的山中传闻只能作为一句背景影响，不得成为今年主事件。
```

### 验收标准

- `maturityCapForAge(0, "appearance") === MAX_SAFE_INTEGER`
- `maturityCapForAge(0, "familyBackground") === MAX_SAFE_INTEGER`
- `maturityCapForAge(0, "luck") === MAX_SAFE_INTEGER`
- 只有 `constitution`、`intelligence` 走 maturity cap。
- `familyBackground >= 20` 不得生成低家境身份。
- `familyBackground <= 2` 不得生成高家境身份。
- 三世界高家境解释不同但同档。
- AI prompt 不含后台 ID 和后台术语。
- 5-10 岁连续模拟时旧资产不能连续主导。

## 3. Canonical Life Runtime

目标：普通玩家看到的不是 AI 原始输出，而是系统承认的 `LifeNode`。AI 只填文学片段，事件和引擎决定人生节点。

### 核心问题

如果 UI 直接展示 AI 的 `playerText.title/body`，会出现这些问题：

- 时间线标题重复或暴露后台意图。
- 同一年年度事件和行动结果可能复用同一段正文。
- AI 会把后台术语写进普通玩家文本。
- 旧资产容易每年重新成为主线。
- 属性别名可能污染普通 UI，例如把五个基础属性换成修仙词。

### 定版方案

把流程改成：

```text
事件生成 LifeNode
  ↓
AI 只填 proseFragments / choiceDrafts
  ↓
引擎验证和组装
  ↓
UI 只展示 LifeNode
```

普通玩家时间线取消标题，只显示年龄和正文：

```text
8 岁

你八岁了。村里的孩子开始用新的眼光看你……
```

同一年多个节点时，类型要清楚：

```text
9 岁
年度事件正文……

选择后结果
你选择按先生的安排继续学习……
```

### 权威对象 LifeNode

```js
{
  schemaVersion: "mvp.life_node.v1",
  nodeId: "year_9_annual_mentor_attention",
  age: 9,
  nodeType: "annual_event",
  sourceEventIds: [
    "annual.outcome_recorded:year_9_mentor_attention"
  ],
  visibleContract: {
    requiredLifeDelta: "一位可信大人改变了对你的学习或照看方式",
    mainHumanDomain: "learning_or_mentor",
    forbiddenText: [
      "mentor_attention",
      "curriculumSlot",
      "年度变化",
      "人生课程",
      "旧线索",
      "背景回响",
      "主轴",
      "副轴"
    ]
  },
  attributeReality: {},
  originReality: {},
  storyAssetBudgets: {},
  paragraphs: [],
  choices: [],
  visibleChanges: []
}
```

### 节点类型

```text
opening_year       0-6 岁早年节点
annual_event       每年系统结算出的年度人生变化
action_resolution  玩家选择或自由行动后的结果
ending             阶段性结局
```

去重规则：

- 同一个 `nodeId` 只能投影一次。
- `annual_event` 和 `action_resolution` 不能复用正文。
- `action_resolution` 不能复制年度事件正文。

### 属性类型固定

普通 UI、普通剧情、visibleChanges 只允许五个基础属性：

```text
体质 constitution
智力 intelligence
颜值 appearance
家境 familyBackground
运气 luck
```

普通玩家文本不能把它们替换成：

```text
仙姿、悟性、根骨、出身/底蕴、气运
```

### 家境决定出生现实

正确链路：

```text
玩家加点 + 天赋
  ↓
计算 familyBackground 最终值
  ↓
判定家境档位
  ↓
筛选兼容 identitySeed
  ↓
WorldOriginResolver 生成具体出身
  ↓
开局和后续剧情承认这个出身
```

家境 20+ 在不同世界必须得到对应解释：

- 修仙：商号、宗门外缘、修仙家族旁支、旧传承、药铺/器坊资源家庭。
- 克苏鲁：旧钱、教授、医生、公务系统、商人家庭、研究机构边缘家庭。
- 废土：营地管理层、技术员、医疗站、资源配给者、旧设施继承者。

### AI 只填片段

AI 不返回完整 `playerText`，只返回：

```js
{
  proseFragments: {
    dailyContext: "...",
    humanChange: "...",
    playerReaction: "...",
    choicePressure: "..."
  },
  choiceDrafts: [
    "...",
    "...",
    "..."
  ]
}
```

引擎负责组装：

```text
年龄
dailyContext + humanChange + playerReaction + choicePressure

1. choiceDraft
2. choiceDraft
3. choiceDraft
```

### LifeNode Validator

检查项：

- 没有标题。
- 没有 backend id。
- 没有 `年度变化`、`人生课程`、`旧线索`、`背景回响`、`主轴`、`副轴`。
- 属性名没有被世界别名替换。
- 家境和出身兼容。
- 旧资产没有超预算。
- 年度节点有人生主变化。
- 选择项围绕本年人生变化。
- `action_resolution` 不重复年度正文。

失败处理：

```text
先尝试重新渲染片段
再失败则使用引擎模板 fallback
绝不让非法文本进普通 UI
```

### 事件溯源链路

`LifeNode` 必须进入事件链，不做临时 UI 状态：

```text
DomainEvents
  ↓
run projection
  ↓
LifeNode Builder
  ↓
life.node_recorded
  ↓
run.worldState.storyState.lifeNodes
  ↓
panelViews.timeline
  ↓
web UI
```

### 代码落点

新增：

```text
src/life-node.js
src/life-node-builder.js
src/life-node-validator.js
src/life-node-projector.js
src/attribute-type-system.js
```

改造：

```text
src/growth-ledger.js
src/world-origin-resolver.js
src/initial-run.js
src/opening-sequence.js
src/annual-state-transition.js
src/yearly-outcome.js
src/ai-provider.js
src/mock-ai.js
src/domain/events/patch-to-events.js
src/domain/reducers/run-reducer.js
src/selectors/story-panel-selector.js
web/app.js
```

### 验收标准

- 时间线只显示年龄，不显示事件标题。
- 9 岁不会重复同一段事件。
- 普通 UI 只出现体质、智力、颜值、家境、运气。
- 体质显示年龄封存。
- 智力显示经验封存。
- 颜值、家境、运气不显示封存数值。
- 运气和家境底层不走 maturity cap。
- 家境 20+ 不会出生为普通猎户、贫农、流民、破产家庭。
- 年度事件必须有人生变化。
- 旧线资产不能连续多年当主线。
- 普通玩家文本没有 backend id 和系统术语。
- 三世界测试都通过。

## 后续建议

这三次方案的关系是递进的：

```text
Canonical Life Runtime
  定义普通玩家应该看到什么：LifeNode

Attribute / Origin / Asset / Prompt Patch
  修正 LifeNode 背后的现实边界和输入污染

Player-Safe Contract System
  用合同、schema、静态扫描和运行时门禁防止回归
```

后续执行时，优先级建议：

1. 先保证普通 UI 只读 `PlayerContract`。
2. 再保证 `PlayerContract` 的 timeline 来自合法 `LifeNode`。
3. 最后补齐属性类型、家境反向约束、旧资产预算和跨世界验收矩阵。
