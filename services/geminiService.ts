import { GoogleGenAI, Part } from "@google/genai";

// Helper to safely access environment variables in various environments (Vite, Next.js, etc.)
const getApiKey = (): string => {
  // 1. Try import.meta.env (Vite standard)
  // @ts-ignore - import.meta might not be typed in all contexts
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env.VITE_GOOGLE_API_KEY) return import.meta.env.VITE_GOOGLE_API_KEY;
    // @ts-ignore
    if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
    // @ts-ignore
    if (import.meta.env.GOOGLE_API_KEY) return import.meta.env.GOOGLE_API_KEY;
  }
  
  // 2. Try process.env (standard Node/Webpack/some Vite polyfills)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
    if (process.env.API_KEY) return process.env.API_KEY;
  }

  return "";
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
          // Attempt to find and parse the JSON object within the error string
          const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : errorMessage;
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.error) {
              if (parsed.error.code === 429) {
                   throw new Error("⚠️ High Traffic. Please try again later.");
              }
              if (parsed.error.message) {
                  // Clean up common technical prefixes
                  return handleGeminiError({ message: parsed.error.message }); // Recursively check the inner message
              }
          }
      } catch (e) {
          // Parsing failed, fall through to default cleanup
      }
  }

  // 4. General cleanup for other errors
  // Truncate extremely long error messages
  if (errorMessage.length > 150) {
      errorMessage = errorMessage.substring(0, 150) + "...";
  }

  throw new Error(`API Error: ${errorMessage}`);
};

export const generateImageFromText = async (prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key not found. Please check your environment variables (VITE_GOOGLE_API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }]
          },
      });

      // Iterate through parts to find the image
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
      
      // Check for safety refusal or text-only response
      const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
      if (textPart && textPart.text) {
          // If the model returns text instead of an image, it might be a refusal
          throw new Error(textPart.text); 
      }

      throw new Error("No image was generated in the response.");
  } catch (error: any) {
      handleGeminiError(error);
      return ""; // unreachable due to throw
  }
};

export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key not found. Please check your environment variables (VITE_GOOGLE_API_KEY).");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: Part[] = [
      {
        inlineData: {
          data: base64ImageData,
          mimeType: mimeType,
        },
      }
    ];

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts,
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart && textPart.text) {
        throw new Error(textPart.text);
    }

    throw new Error("No image was generated in the response.");
  } catch (error: any) {
    handleGeminiError(error);
    return ""; // unreachable
  }
};