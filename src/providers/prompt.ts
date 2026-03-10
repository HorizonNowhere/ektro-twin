/**
 * 共享信号提取 Prompt — 所有 provider 共用
 */

import { DIMENSION_LABELS } from "../core/constants.js";

/** 生成维度描述段（支持自定义维度） */
function buildDimensionBlock(dimensions: string[]): string {
  return dimensions
    .map((d) => {
      const label = DIMENSION_LABELS[d];
      if (label) {
        // 内置维度：有精调描述
        const descriptions: Record<string, string> = {
          personality: "性格（内外向、理性感性、处事风格）",
          values: "价值观（核心信仰、生活优先级、什么最重要）",
          decision: "决策（数据驱动/直觉、果断/谨慎、风险态度）",
          aesthetics: "审美（视觉偏好、设计品味、被什么吸引）",
          communication: "沟通（表达方式、社交风格、直接/委婉）",
          knowledge: "知识（专业领域、兴趣方向、学习偏好）",
          prediction: "预测（对未来的判断方式、风险偏好）",
          boundaries: "边界（隐私态度、对AI的信任程度、开放度）",
        };
        return `- ${d}: ${descriptions[d] || label}`;
      }
      // 自定义维度：用名称作描述
      return `- ${d}: ${d}`;
    })
    .join("\n");
}

/** 生成完整的提取 system prompt */
export function buildExtractionPrompt(dimensions: string[]): string {
  return `You are a Digital Twin signal extractor. Analyze the recent conversation between a user and AI, and extract new insights about the user.

## Dimensions

${buildDimensionBlock(dimensions)}

## Rules

- Only extract characteristics that are ACTUALLY REVEALED in the conversation, do not guess
- confidence > 0.6 is worth recording
- If the conversation is purely transactional ("help me look something up"), return an empty array
- Each insight should be a brief description (10-20 characters) of the user's characteristic, not their behavior
- XP based on signal strength: weak signal (implicit inference) 5-8, medium signal (explicit expression) 9-12, strong signal (deep self-disclosure) 13-15
- Do not repeat information already in the existing profile
- A conversation typically yields only 0-2 signals, do not over-extract`;
}

/** JSON schema 描述（用于各 provider 的结构化输出） */
export const SIGNAL_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    signals: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          dimension: {
            type: "string" as const,
            description: "Dimension name, must be one of the defined dimensions",
          },
          insight: {
            type: "string" as const,
            description: "New insight about the user, brief, 10-20 characters",
          },
          confidence: {
            type: "number" as const,
            minimum: 0,
            maximum: 1,
            description: "Confidence score, 0-1",
          },
          xp: {
            type: "number" as const,
            minimum: 5,
            maximum: 15,
            description:
              "Experience points: weak 5-8, medium 9-12, strong 13-15",
          },
        },
        required: ["dimension", "insight", "confidence", "xp"],
      },
    },
  },
  required: ["signals"],
};

/** 构建用户 prompt（对话 + 已知画像） */
export function buildUserPrompt(
  messages: { role: string; content: string }[],
  existingProfile?: Record<string, string>
): string {
  const profileContext = existingProfile
    ? `\n\nExisting profile:\n${Object.entries(existingProfile)
        .filter(([, v]) => v && v !== "待深入了解")
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")}`
    : "";

  const conversationText = messages
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  return `${profileContext}\n\nRecent conversation:\n${conversationText}`;
}
