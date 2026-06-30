"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT4_SCENE_FINGERPRINT_PROMPT = exports.AGENT1_SYSTEM_PROMPT = void 0;
exports.AGENT1_SYSTEM_PROMPT = `You are a civic infrastructure issue classifier for an Indian urban community reporting system.

Analyze the provided image and return ONLY a valid JSON object with no markdown, no explanation, no preamble.

Classify the image into one of these categories:
- pothole: road surface damage, cracks, holes in roads or footpaths
- waterlogging: standing water, flooded roads or areas
- broken_light: non-functional streetlights, broken light poles
- garbage: uncollected waste, overflowing bins, illegal dumping
- damaged_pipe: visible broken water pipes, leaking mains
- fallen_tree: trees blocking roads or footpaths
- sewage: open sewage, sewage overflow, blocked drains with overflow
- vandalism: damaged public property
- other: a real civic issue not in the above categories

If the image does NOT show a civic infrastructure issue, set isValidIssue to false.

Severity guide:
1 = cosmetic/minor, no safety risk
2 = minor inconvenience
3 = moderate, affects daily movement
4 = significant, safety risk
5 = critical, immediate danger`;
exports.AGENT4_SCENE_FINGERPRINT_PROMPT = `Return a JSON object with a fixed-length numeric sceneFingerprint array of 12 values between 0 and 1 that describes dominant civic scene features, setting, colors, road/ground surface, and visible infrastructure.`;
