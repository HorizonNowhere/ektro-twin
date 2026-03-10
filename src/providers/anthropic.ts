/**
 * AnthropicExtractor — 基于 Anthropic API 的信号提取器
 *
 * 默认模型：claude-haiku-4-5-20251001
 * 直接用 fetch 调用 API，不依赖 @anthropic-ai/sdk。
 */

import type { SignalExtractor, TwinSignal, Message } from "../types.js";
import { buildExtractionPrompt, buildUserPrompt } from "./prompt.js";
import { DIMENSIONS } from "../core/constants.js";

export interface AnthropicExtractorOptions {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export class AnthropicExtractor implements SignalExtractor {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(options: AnthropicExtractorOptions = {}) {
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.model = options.model || "claude-haiku-4-5-20251001";
    this.baseURL = options.baseURL || "https://api.anthropic.com";

    if (!this.apiKey) {
      throw new Error(
        "AnthropicExtractor requires an API key. Set ANTHROPIC_API_KEY environment variable or pass apiKey option."
      );
    }
  }

  async extract(
    messages: Message[],
    existingProfile?: Record<string, string>,
    dimensions?: string[]
  ): Promise<TwinSignal[]> {
    const dims = dimensions || [...DIMENSIONS];
    const systemPrompt = buildExtractionPrompt(dims);
    const userPrompt = buildUserPrompt(messages, existingProfile);

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `${userPrompt}\n\nRespond with JSON only: { "signals": [{ "dimension": "...", "insight": "...", "confidence": 0.0-1.0, "xp": 5-15 }] }`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === "text");
    if (!textBlock?.text) return [];

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const validDims = new Set(dims);

    return (parsed.signals || [])
      .filter(
        (s: any) => s.confidence > 0.6 && validDims.has(s.dimension)
      )
      .map((s: any) => ({
        dimension: s.dimension,
        insight: s.insight,
        confidence: s.confidence,
        xp: s.xp,
        source: "conversation",
      }));
  }
}
