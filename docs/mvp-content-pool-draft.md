# MVP Content Pool Draft

This is a human-readable draft for the three MVP world content pools.

Content pools are searchable seed libraries, not fixed plot libraries. AI should use these seeds as reference material, then adapt them to the current save state.

Runtime JSON should only be created after review and approval.

Current status:

- Starting identity seeds use limited visibility: players see name, short description, possible routes, and approximate risk; hidden secrets, true risk, special NPCs, and family details remain backend-generated.
- Starting identity seeds, talent seeds, event seeds, and NPC template seeds have been converted into runtime JSON under `worlds/<world>/` for filtering and generation support.
- Chinese names and prose in this draft remain the human-facing reference; runtime JSON uses stable English IDs and tags.

## Cultivation World

### Starting Identity Seeds

| ID | Identity | Anchor |
|---|---|---|
| cultivation_village_child | 凡人村落孩子 | 家境偏低，接触修仙机会少，但容易走逆袭路线。 |
| hunter_family_child | 猎户之子/女 | 体质可能略高，早期生存能力较强。 |
| medicine_picker_child | 采药人家庭 | 容易接触灵草、山林、妖兽、药师路线。 |
| poor_scholar_child | 寒门书生 | 智力可能较高，家境偏低，可走文道、谋略、修仙转折。 |
| minor_clan_branch | 小修仙家族旁支 | 有基础修炼资源，但地位不高。 |
| fallen_cultivation_clan | 没落修仙家族后代 | 家族曾经辉煌，可能藏有功法、仇敌或秘密。 |
| sect_servant_child | 宗门杂役后代 | 早期能接触宗门，但身份低微。 |
| market_town_family | 坊市小商户家庭 | 家境中等，容易接触丹药、符箓、交易事件。 |
| alchemist_apprentice_family | 炼丹师/药师家庭 | 智力、家境、药道事件概率提高。 |
| border_orphan | 边荒孤儿 | 家境极低，危险高，但容易触发奇遇。 |
| noble_dynasty_child | 皇朝贵胄 | 家境高，权力资源多，但修仙资质不一定强。 |
| abandoned_omen_baby | 异象弃婴 | 运气、天赋、隐藏主线概率高，暴露风险也高。 |

### World-Specific Talent Seeds

| ID | Talent | Rarity | Seed Effect |
|---|---|---|---|
| weak_spirit_sense | 微弱灵感 | 普通 | 智力 +2，偶尔能感知灵气异常。 |
| strong_blood | 气血稍盛 | 普通 | 体质 +2，早期不易生病。 |
| herb_affinity | 草木亲和 | 精良 | 智力 +3，运气 +2，更容易发现灵草。 |
| smooth_meridians | 经脉顺畅 | 精良 | 体质 +5，修炼入门阻力降低。 |
| minor_sword_sense | 剑感初现 | 精良 | 体质 +3，智力 +2，更容易触发剑修事件。 |
| low_grade_spirit_root | 下品灵根 | 稀有 | 智力 +8，体质 +5，可以正式修炼。 |
| alchemy_nose | 丹香辨识 | 稀有 | 智力 +10，炼丹、识药事件成功率提高。 |
| beast_taming_instinct | 御兽直觉 | 稀有 | 体质 +6，运气 +6，更容易与灵兽建立联系。 |
| hidden_luck_opportunity | 暗藏仙缘 | 稀有 | 运气 +12，更容易遇到散修、高人、遗迹线索。 |
| single_spirit_root | 单灵根 | 史诗 | 智力 +20，体质 +10，修炼速度明显提高。 |
| born_sword_bone | 天生剑骨 | 史诗 | 体质 +25，智力 +10，剑道事件大幅增加。 |
| spirit_eye | 灵眼 | 史诗 | 智力 +20，运气 +10，可以看见部分灵气、阵法、伪装。 |
| noble_cultivation_blood | 修仙世家血脉 | 史诗 | 家境 +25，智力 +10，开局更容易获得功法资源。 |
| heavenly_spirit_root | 天灵根 | 传说 | 智力 +50，体质 +30，修炼速度极高，暴露值高。 |
| innate_sword_heart | 先天剑心 | 传说 | 智力 +35，体质 +35，剑修路线极强，但容易被剑道势力争夺。 |
| ancient_immortal_blood | 古仙血脉 | 传说 | 颜值 +20，体质 +40，运气 +20，可能触发血脉觉醒线。 |
| broken_then_reborn | 破而后立 | 传说 | 初期可能遭遇重大失败，但每次大难后获得额外成长。 |
| myriad_dao_body | 万法源体 | 神话 | 智力 +80，体质 +80，阶段显化，所有修炼体系适应性极强。 |
| reincarnation_memory | 轮回残忆 | 神话 | 智力 +60，运气 +80，条件觉醒，重大危机时可能恢复前世记忆。 |
| heaven_favored_one | 天道眷顾 | 神话 | 运气 +120，隐藏命格，机缘极强，但更容易卷入大因果。 |
| chaos_spirit_embryo | 混沌灵胎 | 神话 | 颜值 +40，智力 +70，体质 +100，立即/阶段显化，出生异象极强，风险极高。 |

### Event Seeds

| ID | Stage | Seed | Possible Effects |
|---|---|---|---|
| spirit_root_test | 童年/少年 | 灵根检测 | 决定是否进入修炼路线，可能暴露天赋。 |
| mountain_strange_beast | 童年/少年 | 山中异兽 | 受伤、奇遇、灵兽、妖兽袭击。 |
| village_plague | 童年 | 村庄怪病 | 体质判定、药草线、修士介入。 |
| wandering_cultivator_visit | 童年/少年 | 游方修士路过 | 收徒、骗局、试探、机缘。 |
| sect_recruitment | 少年 | 宗门收徒 | 加入宗门、落选、被看中。 |
| clan_jealousy | 少年 | 同族嫉妒 | NPC 关系恶化、暗害、竞争。 |
| market_lucky_find | 少年/青年 | 坊市捡漏 | 运气判定、法器、残卷、骗局。 |
| outer_disciple_trial | 青年 | 外门考核 | 宗门地位变化。 |
| hidden_cave | 少年/青年 | 山洞遗迹 | 功法、残魂、危险、污染。 |
| demonic_cult_attack | 任意 | 魔修袭击 | 死亡风险、仇恨线、救援线。 |
| master_attention | 少年/青年 | 长老注意 | 收徒、考验、利用。 |
| foundation_opportunity | 青年 | 筑基机缘 | 境界突破、失败反噬。 |
| pill_side_effect | 青年 | 丹药副作用 | 属性临时或永久变化。 |
| possession_suspicion | 青年 | 夺舍疑云 | 高智力/高运气触发，可能识破或被盯上。 |
| sect_conflict | 青年/成年 | 宗门内斗 | 站队、背叛、势力关系。 |
| dao_companion_bond | 青年/成年 | 道侣/同伴羁绊 | NPC 关系长期变化。 |
| secret_realm_open | 青年/成年 | 秘境开启 | 机缘、死亡、夺宝、仇敌。 |
| heavenly_tribulation | 高境界 | 天劫 | 境界突破、死亡、道心考验。 |
| ascension_clue | 高境界 | 飞升线索 | 主线推进，世界真相。 |
| karmic_debt | 任意 | 因果反噬 | 运气、业力、NPC 命运变化。 |

### NPC Template Seeds

| ID | NPC Template | Anchor |
|---|---|---|
| mortal_parents | 凡人父母 NPC | 普通亲情线，可能支持、恐惧、误解修仙。 |
| village_elder | 村中老人 NPC | 提供民间传说、山林禁忌。 |
| old_hunter | 老猎户 NPC | 生存、体质、山林事件引导。 |
| wandering_cultivator | 游方修士 NPC | 可能是贵人、骗子、魔修或高人。 |
| sect_deacon | 宗门执事 NPC | 负责测试、招收、分配资源。 |
| outer_disciple_friend | 外门朋友 NPC | 早期宗门关系，可能成长或死亡。 |
| talented_peer | 同辈天才 NPC | 竞争者、朋友、宿敌、道侣候选。 |
| jealous_clan_member | 嫉妒的同族 NPC | 家族内部矛盾，暗害或竞争。 |
| strict_master | 严厉师父 NPC | 训练、考验、保护或利用。 |
| alchemist_elder | 炼丹长老 NPC | 丹药、药道、交易、试药风险。 |
| market_merchant | 坊市商人 NPC | 信息、资源、骗局、机缘。 |
| demonic_cultivator | 魔修 NPC | 诱惑、追杀、交易、堕落路线。 |
| remnant_soul | 大能残魂 NPC | 传承、夺舍、考验、骗局。 |
| sect_leader | 宗门掌门 NPC | 高层路线、宗门战争。 |
| mysterious_senior | 神秘前辈 NPC | 关键机缘或隐藏主线触发器。 |

## Cthulhu Life World

### Starting Identity Seeds

| ID | Identity | Anchor |
|---|---|---|
| ordinary_city_family | 普通城市家庭 | 社会正常度高，异常接触低。 |
| single_parent_family | 单亲家庭 | 家庭压力较高，普通生活线明显。 |
| doctor_family | 医生家庭 | 更容易接触异常病症、医院事件。 |
| psychologist_family | 心理咨询师家庭 | 理智压力、精神异常、梦境事件更容易出现。 |
| professor_family | 大学教授家庭 | 智力资源高，禁书、学术、研究线概率提高。 |
| old_town_family | 旧城区家庭 | 更容易接触民俗、旧宅、失踪事件。 |
| coastal_town_child | 海边小镇孩子 | 海洋低语、渔村禁忌、旧神信仰线。 |
| corporate_researcher_child | 财团研究员子女 | 家境较高，异常实验、企业隐瞒线。 |
| religious_family | 宗教家庭 | 信仰、仪式、神秘接触概率提高。 |
| old_blood_family | 古老家族后代 | 家境/运气可能特殊，家族秘密深。 |
| cult_survivor_child | 邪教事件幸存者 | 神秘接触初始较高，可能有创伤或隐藏标记。 |
| missing_town_survivor | 失踪小镇幸存者 | 真相揭露种子较高，社会正常度较低。 |

### World-Specific Talent Seeds

| ID | Talent | Rarity | Seed Effect |
|---|---|---|---|
| uneasy_dreams | 不安之梦 | 普通 | 运气 +2，偶尔梦见异常片段。 |
| sensitive_child | 敏感体质 | 普通 | 智力 +2，更容易察觉细节，也更容易不安。 |
| strange_birthmark | 奇怪胎记 | 普通 | 颜值 +1，运气 +2，可能成为隐藏标记。 |
| rumor_listener | 怪谈爱好者 | 精良 | 智力 +4，真相线索识别率略升。 |
| calm_under_pressure | 临危冷静 | 精良 | 智力 +3，体质 +3，理智压力上升稍慢。 |
| lucky_miss | 刚好错过 | 精良 | 运气 +5，危机事件中更容易擦肩而过。 |
| dream_sensitivity | 梦境敏感 | 稀有 | 智力 +8，运气 +8，更容易接触梦境线。 |
| forbidden_intuition | 禁忌直觉 | 稀有 | 智力 +12，可以感觉某些事不该继续。 |
| pollution_resistance | 污染抗性 | 稀有 | 体质 +10，污染/同化上升速度降低。 |
| old_blood_trace | 旧血微光 | 稀有 | 颜值 +6，运气 +10，容易被异常存在注意。 |
| abnormal_blind_spot | 异常盲区 | 史诗 | 运气 +20，低级异常较难主动发现你，但真相揭露变慢。 |
| dream_walker | 梦境行者 | 史诗 | 智力 +15，运气 +15，可以在梦境线获得信息和风险。 |
| sanity_anchor | 理智锚点 | 史诗 | 智力 +15，体质 +15，理智压力爆发时更容易稳住。 |
| occult_family_heir | 神秘学家族继承人 | 史诗 | 家境 +25，智力 +10，开局可能继承禁书或秘密。 |
| truth_seeker | 真相追寻者 | 传说 | 智力 +40，真相揭露效率大幅提高，但理智压力更容易上升。 |
| child_of_the_dreamland | 梦境之子 | 传说 | 颜值 +20，智力 +30，运气 +30，梦境接触显著增加。 |
| blessed_by_the_unknown | 未知庇护 | 传说 | 运气 +60，重大危机中容易出现转机，但无法确定庇护来源。 |
| human_shell | 人类外壳 | 传说 | 颜值 +30，体质 +30，污染适应性提高，但同化风险增加。 |
| fate_rewriter | 命运重写者 | 神话 | 运气 +120，隐藏命格，每局可改写一次重大失败。 |
| eldritch_beloved | 旧日宠儿 | 神话 | 颜值 +50，运气 +100，异常存在更容易关注你，机会与危险同增。 |
| forbidden_genius | 禁忌天才 | 神话 | 智力 +120，可以理解禁忌知识，但真相揭露和理智压力增长更快。 |
| vessel_of_the_depth | 深渊容器 | 神话 | 体质 +100，运气 +80，污染适应性极高，可能走同化/灭世线。 |

### Event Seeds

| ID | Stage | Seed | Possible Effects |
|---|---|---|---|
| ordinary_school_day | 童年/少年 | 普通上学日 | 普通生活、朋友、成绩、社会正常度。 |
| repeated_nightmare | 童年 | 反复噩梦 | 梦境接触、理智压力。 |
| parent_strange_silence | 童年/少年 | 父母对某件事沉默 | 家族秘密、真相线索。 |
| hospital_unusual_result | 任意 | 医院检查异常 | 官方注意、污染/体质线。 |
| missing_classmate | 少年 | 同学失踪 | 普通犯罪解释或异常线索。 |
| urban_legend_forum | 少年/青年 | 网络怪谈论坛 | 真相揭露、谣言、官方监控。 |
| strange_neighbor | 童年/少年 | 奇怪邻居 | NPC 长期线，可能普通也可能异常。 |
| old_photo_detail | 任意 | 旧照片中的细节 | 家族秘密、时间错位。 |
| mirror_moment | 任意 | 镜中异常 | 污染、梦境、理智压力。 |
| official_questioning | 青年/成年 | 官方问询 | 被监控、招募、警告。 |
| cult_leaflet | 青年 | 邪教传单 | 神秘接触、危险、诱惑。 |
| corporate_coverup | 成年 | 财团掩盖事故 | 夺权、调查、社会正常度下降。 |
| therapy_session | 青年/成年 | 心理咨询 | 理智压力缓解或真相触发。 |
| wedding_wrong_guest | 成年 | 婚礼上不该出现的人 | 普通人生与异常冲突。 |
| child_draws_city | 成年/中年 | 孩子画出梦中城市 | 家族/后代线，梦境污染。 |
| news_blackout | 成年 | 新闻突然消失 | 官方封锁、真相揭露。 |
| inherited_box | 成年 | 继承一只旧箱子 | 禁书、遗物、家族路线。 |
| impossible_street | 任意 | 不存在的街道 | 梦境、污染、探索风险。 |
| survival_of_incident | 任意 | 事故幸存 | 运气、官方、旧日庇护。 |
| denial_choice | 任意 | 否认所见 | 社会正常度上升，真相揭露暂停。 |
| join_watchers | 青年/成年 | 接触守夜组织 | 反抗路线。 |
| forbidden_ritual | 成年 | 禁忌仪式 | 夺权、同化、灭世、救世。 |
| final_revelation | 成年/老年 | 真相临界点 | 结局分岔。 |
| ordinary_life_pull | 任意 | 普通生活牵引 | 家庭、工作、恋爱、养老，降低强制调查感。 |

### NPC Template Seeds

| ID | NPC Template | Anchor |
|---|---|---|
| normal_parent | 普通父母 NPC | 可能不相信异常，也可能保护玩家角色。 |
| anxious_parent | 焦虑父母 NPC | 对异常敏感，可能带玩家角色看医生或隐瞒。 |
| rational_teacher | 理性老师 NPC | 用学习压力、心理问题解释异常。 |
| suspicious_doctor | 怀疑医生 NPC | 发现异常指标，可能上报或保护。 |
| therapist | 心理咨询师 NPC | 缓解理智压力，也可能接触隐藏真相。 |
| urban_legend_friend | 怪谈爱好者 NPC | 提供线索，但真假混杂。 |
| missing_case_survivor | 失踪案幸存者 NPC | 知道部分真相，精神状态不稳定。 |
| official_agent | 官方异常部门 NPC | 监控、警告、招募、收容。 |
| cult_edge_member | 邪教边缘成员 NPC | 诱导、交易、传播仪式。 |
| corporate_researcher | 财团研究员 NPC | 研究异常，可能利用玩家角色。 |
| old_family_heir | 古老家族继承人 NPC | 家族秘密、血脉、联姻或竞争。 |
| polluted_classmate | 被污染的同学/同事 NPC | 普通关系逐渐变成异常线。 |
| dream_person | 梦中反复出现的 NPC | 梦境线索，身份不明。 |
| watcher_mentor | 守夜组织导师 NPC | 反抗路线引导。 |
| compromised_official | 被污染的官方 NPC | 隐藏反派，维稳或献祭路线。 |

## Wasteland World

### Starting Identity Seeds

| ID | Identity | Anchor |
|---|---|---|
| shelter_child | 避难所孩子 | 家境相对稳定，资源有限但安全。 |
| scavenger_child | 拾荒者孩子 | 家境低，生存经验高，危险多。 |
| nomad_tribe_child | 游牧部落孩子 | 体质可能较高，迁徙与野外生存线。 |
| caravan_family_child | 商队家庭孩子 | 家境、运气可能较好，贸易路线。 |
| medic_family_child | 废土医生家庭 | 智力资源高，药物、伤病事件多。 |
| mechanic_family_child | 机械师家庭 | 智力、家境偏实用，旧机械路线。 |
| bunker_citizen | 地下堡垒居民 | 家境较高，安全但规则森严。 |
| raider_camp_child | 掠夺者营地孩子 | 危险高，暴力环境，可能走黑暗路线。 |
| mutant_settlement_child | 变异者聚落孩子 | 体质/污染线特殊，社会歧视明显。 |
| ruined_city_orphan | 废城孤儿 | 家境极低，运气决定生死。 |
| soldier_remnant_child | 旧军人后代 | 纪律、武器、旧世界秘密。 |
| lab_survivor_child | 实验室幸存者 | 高风险，可能带变异或隐藏天赋。 |

### World-Specific Talent Seeds

| ID | Talent | Rarity | Seed Effect |
|---|---|---|---|
| hard_stomach | 铁胃 | 普通 | 体质 +2，轻微降低食物中毒风险。 |
| sharp_eyes | 眼尖 | 普通 | 运气 +2，更容易发现可用物资。 |
| heat_tolerance | 耐热 | 普通 | 体质 +2，荒野环境惩罚降低。 |
| scrap_sense | 拾荒直觉 | 精良 | 运气 +5，废墟搜索收益略高。 |
| tough_skin | 皮实 | 精良 | 体质 +5，轻伤恢复更快。 |
| quick_learner_survival | 生存学习快 | 精良 | 智力 +4，废土技能成长略快。 |
| water_finder | 找水人 | 稀有 | 运气 +10，水源事件触发率提高。 |
| radiation_tolerance | 辐射耐受 | 稀有 | 体质 +12，辐射/污染伤害降低。 |
| machine_touch | 机械手感 | 稀有 | 智力 +12，更容易修复旧设备。 |
| beast_instinct | 野兽直觉 | 稀有 | 体质 +8，运气 +6，危险预感更强。 |
| shelter_heir | 避难所继承人 | 史诗 | 家境 +25，开局资源和权力更高，但政治斗争增加。 |
| old_world_knowledge | 旧世界知识 | 史诗 | 智力 +25，遗迹、科技、地图事件优势明显。 |
| mutation_adaptation | 变异适应 | 史诗 | 体质 +30，变异风险转化为力量的概率提高。 |
| wasteland_charm_of_fate | 废土幸运星 | 史诗 | 运气 +30，危机中更容易找到出路。 |
| warlord_seed | 军阀胚子 | 传说 | 体质 +30，智力 +25，家境 +20，更容易建立势力。 |
| prewar_bloodline | 旧纪元血脉 | 传说 | 智力 +35，家境 +30，可能解锁旧世界权限。 |
| mutant_king_seed | 变异王种 | 传说 | 体质 +60，污染适应性极高，但社会排斥加重。 |
| chosen_survivor | 被废土选中的人 | 传说 | 运气 +60，重大灾难中更容易幸存。 |
| apocalypse_saint | 末日圣者 | 神话 | 运气 +100，体质 +60，更容易聚拢幸存者，救世线增强。 |
| perfect_adapted_body | 完美适应体 | 神话 | 体质 +150，污染、辐射、疾病适应性极强，可能被研究或争夺。 |
| old_world_key | 旧世界钥匙 | 神话 | 智力 +80，家境 +80，可解锁超级遗迹、AI 基地、旧纪元主线。 |
| wasteland_overlord_fate | 废土霸主命格 | 神话 | 智力 +60，体质 +60，运气 +80，更容易建立或夺取大型势力。 |

### Event Seeds

| ID | Stage | Seed | Possible Effects |
|---|---|---|---|
| ration_shortage | 童年/任意 | 口粮短缺 | 饥饿、家庭矛盾、偷窃、分配。 |
| water_source_found | 任意 | 发现水源 | 生存资源、势力争夺、污染检测。 |
| dust_storm | 任意 | 辐射沙暴 | 体质判定、避难、失散。 |
| scavenging_trip | 少年/青年 | 第一次拾荒 | 物资、受伤、遗迹入口。 |
| mutant_beast_attack | 任意 | 变异兽袭击 | 受伤、逃亡、英雄事件。 |
| caravan_arrival | 任意 | 商队到来 | 交易、信息、骗子、远行机会。 |
| raider_demand | 任意 | 掠夺者索要贡品 | 反抗、妥协、逃亡、势力关系。 |
| shelter_election | 青年/成年 | 避难所权力更替 | 政治、背叛、夺权。 |
| plague_outbreak | 任意 | 聚落疫病 | 医疗、隔离、道德抉择。 |
| old_ruin_signal | 少年/青年 | 旧世界信号 | 遗迹、AI、危险科技。 |
| broken_robot | 任意 | 捡到损坏机器人 | 修复、伙伴、陷阱。 |
| black_market_deal | 青年/成年 | 黑市交易 | 资源、背叛、稀有道具。 |
| lost_child | 任意 | 荒野中的孩子 | 善恶选择、队伍关系。 |
| faction_war | 成年 | 势力战争 | 站队、逃亡、建功。 |
| radiation_zone | 青年/成年 | 高辐射区域探索 | 高风险高收益。 |
| bunker_opening | 任意 | 封闭地堡开启 | 旧世界秘密、资源、感染。 |
| family_sacrifice | 任意 | 家人为生存做出牺牲 | 情感、性格、长期记忆。 |
| settlement_famine | 任意 | 聚落饥荒 | 资源管理、道德困境。 |
| vehicle_repair | 青年/成年 | 修好载具 | 迁徙、贸易、逃亡路线。 |
| ai_base_contact | 成年 | 接触旧世界 AI | 科技、控制、真相。 |
| mutant_identity_exposed | 任意 | 变异身份暴露 | 排斥、追杀、力量路线。 |
| found_new_settlement | 成年 | 建立新聚落 | 势力创建、管理、战争。 |
| final_oasis | 成年/老年 | 传说中的绿洲 | 救世、骗局、结局分岔。 |
| wasteland_unification | 成年/高阶 | 废土统一机会 | 霸主、救世、暴君结局。 |

### NPC Template Seeds

| ID | NPC Template | Anchor |
|---|---|---|
| tired_parent | 疲惫父母 NPC | 生存压力下的亲情与牺牲。 |
| shelter_leader | 避难所领袖 NPC | 秩序、分配、权力斗争。 |
| old_medic | 老医生 NPC | 治疗、疫病、人体实验秘密。 |
| mechanic_master | 机械师 NPC | 修理、装备、旧科技线。 |
| caravan_merchant | 商队商人 NPC | 交易、消息、远方路线。 |
| wasteland_scout | 荒野斥候 NPC | 探路、遗迹、危险预警。 |
| raider_boss | 掠夺者首领 NPC | 敌人、交易对象、黑暗路线导师。 |
| mutant_child | 变异儿童 NPC | 道德选择、歧视、同化路线。 |
| old_soldier | 旧军人 NPC | 战术、旧世界秘密、纪律。 |
| black_market_broker | 黑市中间人 NPC | 稀有资源、背叛、情报。 |
| preacher | 废土传教士 NPC | 信仰、秩序、邪教或希望。 |
| ai_robot | 旧世界机器人 NPC | 科技线、遗迹线、非人伙伴。 |
| warlord | 废土军阀 NPC | 大型势力、战争、夺权。 |
| water_baron | 水源垄断者 NPC | 资源压迫、谈判、反抗。 |
| settlement_builder | 聚落建设者 NPC | 创建势力、发展路线、普通人希望。 |

## Shared Draft Notes

- These entries are seeds, not final scenes.
- AI must combine seeds with the current save before writing events.
- NPC templates are identity anchors, not full attribute templates.
- Ordinary NPCs cannot be excellent in all five attributes without special justification.
- High attributes must trigger world-appropriate reactions.
- Runtime JSON should use stable English IDs and filtering tags.
