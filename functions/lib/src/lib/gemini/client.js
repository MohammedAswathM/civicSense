"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUseGeminiMock = shouldUseGeminiMock;
exports.classifyPhotoWithGemini = classifyPhotoWithGemini;
exports.verifyResolutionWithGemini = verifyResolutionWithGemini;
exports.parseAgent1Response = parseAgent1Response;
exports.cosineSimilarity = cosineSimilarity;
const genai_1 = require("@google/genai");
const prompts_1 = require("./prompts");
const mockResponses_1 = require("./mockResponses");
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new genai_1.GoogleGenAI({ apiKey }) : null;
function shouldUseGeminiMock() {
    return !apiKey || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}
async function classifyPhotoWithGemini(input) {
    if (shouldUseGeminiMock() || !ai) {
        return (0, mockResponses_1.mockAgent1Response)(input.seed);
    }
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    { text: prompts_1.AGENT1_SYSTEM_PROMPT },
                    { inlineData: { data: input.photoBase64, mimeType: input.mimeType } },
                    { text: 'Classify this civic issue.' },
                ],
            },
        ],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: genai_1.Type.OBJECT,
                properties: {
                    category: { type: genai_1.Type.STRING },
                    severity: { type: genai_1.Type.INTEGER },
                    confidence: { type: genai_1.Type.NUMBER },
                    geminiDescription: { type: genai_1.Type.STRING },
                    isValidIssue: { type: genai_1.Type.BOOLEAN },
                    rejectionReason: { type: genai_1.Type.STRING },
                },
                required: ['category', 'severity', 'confidence', 'geminiDescription', 'isValidIssue'],
            },
            temperature: 0.1,
        },
    }));
    return parseAgent1Response(response.text || '');
}
async function verifyResolutionWithGemini(input) {
    if (shouldUseGeminiMock() || !ai) {
        return (0, mockResponses_1.mockAgent4Response)(input);
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
function parseAgent1Response(raw) {
    try {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
            category: parsed.category,
            severity: parsed.severity,
            confidence: parsed.confidence,
            geminiDescription: parsed.geminiDescription,
            isValidIssue: parsed.isValidIssue,
            rejectionReason: parsed.rejectionReason,
        };
    }
    catch (error) {
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
async function sceneFingerprint(photoReference) {
    if (!ai)
        return new Array(12).fill(0);
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `${prompts_1.AGENT4_SCENE_FINGERPRINT_PROMPT}\n${photoReference}` }] }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: genai_1.Type.OBJECT,
                properties: {
                    sceneFingerprint: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.NUMBER } },
                },
                required: ['sceneFingerprint'],
            },
            temperature: 0,
        },
    }));
    const parsed = JSON.parse(response.text || '{"sceneFingerprint":[]}');
    return parsed.sceneFingerprint.slice(0, 12);
}
function cosineSimilarity(a, b) {
    const length = Math.min(a.length, b.length);
    if (length === 0)
        return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
async function callGeminiWithRetry(fn, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
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
