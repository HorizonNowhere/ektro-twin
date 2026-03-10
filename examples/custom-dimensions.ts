/**
 * 自定义维度示例 — 用自己的维度替代默认 8 维度
 *
 * 运行: OPENAI_API_KEY=sk-xxx npx tsx examples/custom-dimensions.ts
 */

import { createTwin } from "../src/index.js";

// 为美食推荐 App 定义自定义维度
const twin = createTwin({
  provider: "openai",
  dimensions: [
    "taste",           // 口味偏好
    "cuisine",         // 菜系偏好
    "dining_style",    // 用餐风格（正式/随意）
    "dietary",         // 饮食限制
    "adventure",       // 冒险程度（爱尝新/守旧）
  ],
});

const messages = [
  { role: "user" as const, content: "我特别喜欢吃辣，四川菜和湘菜都爱，但我不太能接受生鱼片。" },
  { role: "assistant" as const, content: "看来你偏好熟食和重口味的菜系。" },
  { role: "user" as const, content: "对，但我偶尔也会尝试新的菜系。上周试了埃塞俄比亚菜，还不错！" },
  { role: "assistant" as const, content: "愿意尝试不同文化的料理，这很棒。" },
];

const signals = await twin.feed("foodie_user", messages);
console.log("Signals:", signals);

const profile = await twin.getProfile("foodie_user");
console.log("Profile:", JSON.stringify(profile, null, 2));
