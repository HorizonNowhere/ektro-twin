/**
 * OpenAIExtractor — 基于 OpenAI API 的信号提取器
 *
 * 默认模型：gpt-4o-mini（最便宜）
 * 直接用 fetch 调用 API，不依赖 openai SDK。
 */

import type { SignalExtractor, TwinSignal, Message } from "../types.js";
import {
  buildExtractionPrompt,
  buildUserPrompt,
  SIGNAL_JSON_SCHEMA,
} from "./prompt.js";
import { DIMENSIONS } from "../core/constants.js";

export interface OpenAIExtractorOptions {
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

export class OpenAIExtractor implements SignalExtractor {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(options: OpenAIExtractorOptions = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || "";
    this.model = options.model || "gpt-4o-mini";
    this.baseURL = options.baseURL || "https://api.openai.com/v1";

    if (!this.apiKey) {
      throw new Error(
        "OpenAIExtractor requires an API key. Set OPENAI_API_KEY environment variable or pass apiKey option."
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

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "twin_signals",
            schema: SIGNAL_JSON_SCHEMA,
            strict: true,
          },
        },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
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
