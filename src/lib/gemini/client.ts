import { GoogleGenAI, Type } from '@google/genai';
import type { Agent1Output, Agent4Input, Agent4Output } from '@/types/agent';
import { AGENT1_SYSTEM_PROMPT, AGENT4_SCENE_FINGERPRINT_PROMPT } from './prompts';
import { mockAgent1Response, mockAgent4Response } from './mockResponses';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export function shouldUseGeminiMock(): boolean {
  return !apiKey || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export async function classifyPhotoWithGemini(input: {
  photoBase64: string;
  mimeType: string;
  seed: string;
}): Promise<Agent1Output> {
  if (shouldUseGeminiMock() || !ai) {
    return mockAgent1Response(input.seed);
  }

  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: AGENT1_SYSTEM_PROMPT },
            { inlineData: { data: input.photoBase64, mimeType: input.mimeType } },
            { text: 'Classify this civic issue.' },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            severity: { type: Type.INTEGER },
            confidence: { type: Type.NUMBER },
            geminiDescription: { type: Type.STRING },
            isValidIssue: { type: Type.BOOLEAN },
            rejectionReason: { type: Type.STRING },
          },
          required: ['category', 'severity', 'confidence', 'geminiDescription', 'isValidIssue'],
        },
        temperature: 0.1,
      },
    }),
  );

  return parseAgent1Response(response.text || '');
}

export async function verifyResolutionWithGemini(input: Agent4Input): Promise<Agent4Output> {
  if (shouldUseGeminiMock() || !ai) {
    return mockAgent4Response(input);
  }

  // @google/genai image embedding support has changed across releases. This implementation
  // uses structured Gemini scene fingerprints instead of persisting raw embedding vectors.
  const [original, resolution] = await Promise.all([
    sceneFingerprint(input.originalPhotoUrl),
    sceneFingerprint(input.resolutionPhotoUrl),
  ]);
  const similarity = cosineSimilarity(original, resolution);
  return {
    verificationStatus: similarity >= 0.35 ? 'awaiting_citizen' : 'visual_fraud',
    visualSimilarity: similarity,
    citizenConfirmRequired: similarity >= 0.35,
    flaggedForSupervisor: similarity < 0.35,
  };
}

export function parseAgent1Response(raw: string): Agent1Output {
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Agent1Output;
    return {
      category: parsed.category,
      severity: parsed.severity,
      confidence: parsed.confidence,
      geminiDescription: parsed.geminiDescription,
      isValidIssue: parsed.isValidIssue,
      rejectionReason: parsed.rejectionReason,
    };
  } catch (error) {
    console.error('Gemini returned invalid JSON:', error);
    return {
      category: 'other',
      severity: 3,
      confidence: 0.1,
      geminiDescription: 'Unable to classify automatically. Marked for manual review.',
      isValidIssue: true,
    };
  }
}

async function sceneFingerprint(photoReference: string): Promise<number[]> {
  if (!ai) return new Array(12).fill(0);
  const response = await callGeminiWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${AGENT4_SCENE_FINGERPRINT_PROMPT}\n${photoReference}` }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sceneFingerprint: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          },
          required: ['sceneFingerprint'],
        },
        temperature: 0,
      },
    }),
  );
  const parsed = JSON.parse(response.text || '{"sceneFingerprint":[]}') as { sceneFingerprint: number[] };
  return parsed.sceneFingerprint.slice(0, 12);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
      if (status === 429) {
        const delay = Math.pow(2, attempt) * 4000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Gemini rate limit exceeded after max retries');
}
