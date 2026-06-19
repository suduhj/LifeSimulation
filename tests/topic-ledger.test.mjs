import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTopicProfile,
  forbiddenTopicProfiles,
  normalizeTopicLedger,
  recordTopicProfile,
  topicProfileMatchesText,
} from "../src/topic-ledger.js";

describe("topic ledger", () => {
  it("marks recently overused arenas, object focuses, topic families, and pressure types as forbidden", () => {
    const ledger = normalizeTopicLedger({
      recentTopics: [
        {
          age: 6,
          topicFamily: "jade_token_mystery_primary",
          arena: "back_mountain",
          objectFocus: "jade_token",
          institutionFocus: "biyun_sect",
          pressureType: "hidden_clue_search",
        },
        {
          age: 7,
          topicFamily: "another_hidden_search",
          arena: "old_shrine",
          objectFocus: "none",
          institutionFocus: "local_elder",
          pressureType: "hidden_clue_search",
        },
      ],
    });

    const forbidden = forbiddenTopicProfiles({
      topicLedger: ledger,
      age: 8,
      candidate: {
        age: 8,
        topicFamily: "jade_token_mystery_primary",
        arena: "back_mountain",
        objectFocus: "jade_token",
        institutionFocus: "biyun_sect",
        pressureType: "hidden_clue_search",
      },
    });

    assert.ok(forbidden.some((item) => item.forbiddenReason === "arena_recently_primary"));
    assert.ok(forbidden.some((item) => item.forbiddenReason === "object_recently_primary"));
    assert.ok(forbidden.some((item) => item.forbiddenReason === "topic_family_recently_primary"));
    assert.ok(forbidden.some((item) => item.forbiddenReason === "pressure_type_repeated"));
  });

  it("builds human-life topic profiles from curriculum slots before world flavor", () => {
    const profile = buildTopicProfile({
      age: 7,
      worldId: "cultivation",
      curriculumSlot: "peer_relationship",
      primaryDelta: { domain: "social", type: "social_reputation_shift", eventShape: "village_reputation_changes_life" },
    });

    assert.equal(profile.topicFamily, "peer_relationship_shift");
    assert.equal(profile.arena, "village_or_schoolyard");
    assert.equal(profile.pressureType, "peer_status_change");
    assert.equal(profile.objectFocus, "none");
  });

  it("records only bounded recent topic history", () => {
    let ledger = normalizeTopicLedger();
    for (let age = 1; age <= 16; age += 1) {
      ledger = recordTopicProfile(ledger, {
        age,
        topicFamily: `family_${age}`,
        arena: `arena_${age}`,
        objectFocus: "none",
        institutionFocus: "none",
        pressureType: `pressure_${age}`,
      });
    }

    assert.equal(ledger.recentTopics.length, 12);
    assert.equal(ledger.recentTopics[0].age, 5);
    assert.equal(ledger.recentTopics.at(-1).age, 16);
  });

  it("detects forbidden topic profiles in rendered text for validator use", () => {
    const profile = {
      topicFamily: "scripture_pavilion_secret",
      arena: "scripture_pavilion",
      objectFocus: "jade_token",
      institutionFocus: "biyun_sect",
      pressureType: "hidden_clue_search",
    };

    assert.equal(topicProfileMatchesText("你今年又把藏书阁和玉佩当成主线线索，继续追查碧云宗秘密。", profile), true);
    assert.equal(topicProfileMatchesText("你在村塾里和同龄人发生冲突，先生重新安排座位。", profile), false);
  });
});
