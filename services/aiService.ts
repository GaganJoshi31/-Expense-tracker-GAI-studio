import { GoogleGenAI, Type } from "@google/genai";
import type { Transaction, Category, CategorizationSuggestion } from '../types';

let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        if (!process.env.API_KEY) {
            // This error will be caught by the calling function, preventing a top-level crash.
            throw new Error("Gemini API key is not configured. Please set it up to use AI features.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

export const suggestCategories = async (
    transactions: Transaction[],
    availableCategories: Category[]
): Promise<CategorizationSuggestion[]> => {
    if (transactions.length === 0) {
        return [];
    }

    const model = 'gemini-2.5-flash';
    
    const transactionDetails = transactions.map(t => 
        `{ "id": "${t.id}", "description": "${t.description.replace(/"/g, "'")}", "type": "${t.debit ? 'Debit' : 'Credit'}" }`
    ).join(',\n');

    const prompt = `
        You are a financial assistant. Your task is to categorize bank transactions.
        Based on the following list of available categories, suggest the most appropriate category for each transaction provided.

        Strictly use one of the following categories:
        - ${availableCategories.join('\n- ')}

        Analyze these transactions:
        [
        ${transactionDetails}
        ]

        Return your response as a valid JSON array of objects. Each object must contain the transaction "id", the "suggestedCategory" you chose from the list, and a brief "reasoning" (under 10 words) for your choice. Do not create new categories.
    `;

    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "The unique ID of the transaction." },
                            suggestedCategory: { type: Type.STRING, description: "The suggested category from the provided list." },
                            reasoning: { type: Type.STRING, description: "A brief reason for the suggestion." }
                        },
                        required: ['id', 'suggestedCategory', 'reasoning']
                    }
                }
            }
        });
        
        const jsonText = response.text.trim();
        const suggestions: CategorizationSuggestion[] = JSON.parse(jsonText);

        return suggestions;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get categorization suggestions: ${error.message}`);
        }
        throw new Error("An unknown error occurred while contacting the AI model.");
    }
};