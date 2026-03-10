/**
 * OllamaExtractor — 基于本地 Ollama 的信号提取器
 *
 * 零费用，无需 API key，适合隐私敏感场景。
 * 默认连接 localhost:11434，默认模型 llama3.1。
 */

import type { SignalExtractor, TwinSignal, Message } from "../types.js";
import { buildExtractionPrompt, buildUserPrompt } from "./prompt.js";
import { DIMENSIONS } from "../core/constants.js";

export interface OllamaExtractorOptions {
  host?: string;
  model?: string;
}

export class OllamaExtractor implements SignalExtractor {
  private host: string;
  private model: string;

  constructor(options: OllamaExtractorOptions = {}) {
    this.host = options.host || "http://localhost:11434";
    this.model = options.model || "llama3.1";
  }

  async extract(
    messages: Message[],
    existingProfile?: Record<string, string>,
    dimensions?: string[]
  ): Promise<TwinSignal[]> {
    const dims = dimensions || [...DIMENSIONS];
    const systemPrompt = buildExtractionPrompt(dims);
    const userPrompt = buildUserPrompt(messages, existingProfile);

    const prompt = `${systemPrompt}\n\n${userPrompt}\n\nRespond with JSON only: { "signals": [{ "dimension": "...", "insight": "...", "confidence": 0.0-1.0, "xp": 5-15 }] }`;

    let response: Response;
    try {
      response = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: "json",
        }),
      });
    } catch {
      throw new Error(
        `Cannot connect to Ollama at ${this.host}. ` +
          `Make sure Ollama is running: https://ollama.com/download`
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    if (!data.response) return [];

    try {
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      const validDims = new Set(dims);

      return (parsed.signals || [])
        .filter(
          (s: any) =>
            s.confidence > 0.6 && validDims.has(s.dimension)
        )
        .map((s: any) => ({
          dimension: s.dimension,
          insight: String(s.insight),
          confidence: Number(s.confidence),
          xp: Number(s.xp),
          source: "conversation",
        }));
    } catch {
      return [];
    }
  }
}
