/**
 * Quickstart — 最简示例（3 行核心代码）
 *
 * 运行: OPENAI_API_KEY=sk-xxx npx tsx examples/quickstart.ts
 */

import { createTwin } from "../src/index.js";

const twin = createTwin({ provider: "openai" });

// 模拟一段对话
const messages = [
  { role: "user" as const, content: "我觉得做产品最重要的是先让它能跑，完美主义是创业杀手。" },
  { role: "assistant" as const, content: "同意，先验证再优化是更高效的路径。" },
  { role: "user" as const, content: "而且我特别不喜欢花里胡哨的UI，越简单越好，信息密度高就行。" },
  { role: "assistant" as const, content: "极简主义的设计确实能让用户更聚焦核心功能。" },
];

// 喂入对话，提取信号
const signals = await twin.feed("user_demo", messages);
console.log("Extracted signals:", signals);

// 查看画像
const profile = await twin.getProfile("user_demo");
console.log("User profile:", JSON.stringify(profile, null, 2));
