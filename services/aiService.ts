import { GoogleGenAI, Type } from "@google/genai";
import type { Transaction, Category } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface CategorizationSuggestion {
    id: string;
    suggestedCategory: Category;
    reasoning: string;
}

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
        const response = await ai.models.generateContent({
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
        throw new Error("Failed to get categorization suggestions from the AI. The model may be temporarily unavailable.");
    }
};
