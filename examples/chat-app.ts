/**
 * Chat App 集成示例 — 模拟多轮对话，展示 Twin 理解逐步深化
 *
 * 运行: OPENAI_API_KEY=sk-xxx npx tsx examples/chat-app.ts
 */

import { createTwin } from "../src/index.js";

const twin = createTwin({
  provider: "openai",
  storage: "memory",
  onSignal: (signal) => {
    console.log(
      `  📡 Signal: [${signal.dimension}] "${signal.insight}" (confidence: ${signal.confidence}, +${signal.xp}xp)`
    );
  },
});

const USER_ID = "user_alice";

// 第 1 轮对话
console.log("\n=== Round 1 ===");
await twin.feed(USER_ID, [
  { role: "user", content: "我最近在研究怎么用AI来自动化运营工作，手动发帖太慢了。" },
  { role: "assistant", content: "自动化确实能大幅提升效率。你目前用什么平台发帖？" },
  { role: "user", content: "主要是Twitter和小红书，但我更看重Twitter的国际影响力。" },
]);

// 第 2 轮对话
console.log("\n=== Round 2 ===");
await twin.feed(USER_ID, [
  { role: "user", content: "我做决策很快，错了就改，不会纠结很久。" },
  { role: "assistant", content: "快速迭代的决策风格在创业环境中很有效。" },
  { role: "user", content: "对，我最讨厌开长会。30分钟内搞不定的事不值得开会讨论。" },
]);

// 第 3 轮对话
console.log("\n=== Round 3 ===");
await twin.feed(USER_ID, [
  { role: "user", content: "我对设计的要求很高，日系的干净感觉最好，不要国产那种花里胡哨的。" },
  { role: "assistant", content: "日式设计确实以简洁和功能性著称。" },
]);

// 查看最终画像
console.log("\n=== Final Profile ===");
const profile = await twin.getProfile(USER_ID);
console.log(JSON.stringify(profile, null, 2));
