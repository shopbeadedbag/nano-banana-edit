import { GoogleGenAI } from "@google/genai";

// 1. Get API Key exclusively from environment variables
const getApiKey = (): string => {
  // STRICTLY use the environment variable process.env.API_KEY
  // Fixing error: Property 'env' does not exist on type 'ImportMeta'
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("❌ CRITICAL ERROR: API_KEY is missing in environment variables!");
    // Return empty string to allow the error to be caught downstream if needed, 
    // or checks in the functions below will fail gracefully.
    return "";
  }

  // 2. Debugging: Log the key prefix to Console
  // This helps you verify if the deployed app is using the NEW key or an OLD one.
  // We slice it to keep it secure while allowing verification.
  console.log("🔑 Gemini Service initialized. Using Key Prefix:", apiKey.slice(0, 8) + "...");
  
  return apiKey;
};

// Helper to parse and clean Gemini API errors
const handleGeminiError = (error: any): never => {
  console.error("Gemini API Error Details:", error);
  
  let errorMessage = error.message || error.toString();

  // 1. Check for Rate Limiting / Quota (429)
  if (
      errorMessage.includes('429') || 
      errorMessage.includes('RESOURCE_EXHAUSTED') || 
      errorMessage.includes('Quota exceeded')
  ) {
    throw new Error("⚠️ High Traffic / Quota Exceeded. The free tier limit for this model has been reached. Please wait a minute and try again.");
  }

  // 2. Check for Safety Blocks
  if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
    throw new Error("🛡️ Content Blocked. The request was flagged by safety filters. Please try a different prompt.");
  }

  // 3. Try to parse if it's a raw JSON string (common with some API responses)
  if (typeof errorMessage === 'string' && (errorMessage.trim().startsWith('{') || errorMessage.includes('{"error":'))) {
      try {
          const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : errorMessage;
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.error) {
              if (parsed.error.code === 429 || parsed.error.status === 'RESOURCE_EXHAUSTED') {
                 throw new Error("⚠️ High Traffic / Quota Exceeded. The free tier limit has been reached. Retrying...");
              }
              errorMessage = parsed.error.message || errorMessage;
          }
      } catch (e) {
          // If parsing fails, use the original message
      }
  }

  throw new Error(`Generation Failed: ${errorMessage}`);
};

/**
 * Retries an async operation with exponential backoff.
 * Useful for handling 429/503 errors from the API.
 */
async function withRetry<T>(
    operation: () => Promise<T>, 
    retries: number = 3, 
    initialDelay: number = 2000
): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const msg = error.message || "";
            
            // Only retry on specific transient errors or rate limits
            const isRetryable = 
                msg.includes("429") || 
                msg.includes("503") || 
                msg.includes("Quota") ||
                msg.includes("High Traffic") ||
                msg.includes("RESOURCE_EXHAUSTED") ||
                msg.includes("fetch failed");

            if (!isRetryable || i === retries - 1) {
                throw error;
            }

            const delay = initialDelay * Math.pow(2, i); // 2s, 4s, 8s...
            console.log(`⚠️ API Error (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

// Configuration for image generation
const MODEL_NAME = 'gemini-2.5-flash-image'; 

/**
 * Edit an existing image based on a prompt (Image-to-Image)
 */
export const editImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not configured");

  return withRetry(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
        // Note: responseModalities not strictly needed if model defaults to image, 
        // but helps ensure intent if supported. 
        // For now, we rely on the model returning an image part.
      });

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) throw new Error("No content generated");

      for (const part of parts) {
        if (part.inlineData) {
           return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      
      // If we got text instead of an image (e.g. "I cannot do that")
      const textPart = parts.find(p => p.text);
      if (textPart) {
          throw new Error(`Model Refused: ${textPart.text}`);
      }

      throw new Error("No image data found in response");

    } catch (error) {
      handleGeminiError(error);
    }
    return ""; // Should not reach here due to throw
  });
};

/**
 * Generate a new image from text (Text-to-Image)
 */
export const generateImageFromText = async (
  prompt: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not configured");

  return withRetry(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [{ text: prompt }],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) throw new Error("No content generated");

      for (const part of parts) {
        if (part.inlineData) {
           return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }

      const textPart = parts.find(p => p.text);
      if (textPart) {
          throw new Error(`Model Refused: ${textPart.text}`);
      }

      throw new Error("No image data found in response");

    } catch (error) {
        handleGeminiError(error);
    }
    return "";
  });
};