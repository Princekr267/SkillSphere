"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateText = void 0;
const HF_MODERATION_URL = 'https://api-inference.huggingface.co/models/facebook/roberta-hate-speech-dynabench-r4-target';
const LOCAL_BLACKLIST_REGEX = /\b(scam|spam|hack|cheat|fraud|abuse|toxic|offensive|fuck|bitch|asshole|bastard)\b/i;
const moderateText = async (text) => {
    if (!text || !text.trim()) {
        return { isToxic: false };
    }
    // 1. Perform Local Regex Check (instant fallback and validation check)
    if (LOCAL_BLACKLIST_REGEX.test(text)) {
        return {
            isToxic: true,
            reason: 'Content matched local blacklisted moderation keywords',
        };
    }
    // 2. Perform Huggingface Inference API scan if key is configured
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (apiKey && !apiKey.includes('placeholder')) {
        try {
            const response = await fetch(HF_MODERATION_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: text.substring(0, 1000) }), // limit payload text length
            });
            if (response.ok) {
                const result = await response.json();
                // Huggingface text classification response structure: [[ { label: string, score: number }, ... ]]
                if (Array.isArray(result) && Array.isArray(result[0])) {
                    const classifications = result[0];
                    const hateItem = classifications.find((c) => c.label.toLowerCase() === 'hate');
                    if (hateItem && typeof hateItem.score === 'number' && hateItem.score > 0.5) {
                        return {
                            isToxic: true,
                            reason: `Toxicity flags raised by HF moderation (confidence: ${Math.round(hateItem.score * 100)}%)`,
                        };
                    }
                }
            }
            else {
                const errText = await response.text();
                console.warn('Huggingface moderation API returned non-200, skipped. Detail:', errText);
            }
        }
        catch (err) {
            console.warn('Failed calling Huggingface moderation endpoint, skipped:', err);
        }
    }
    return { isToxic: false };
};
exports.moderateText = moderateText;
