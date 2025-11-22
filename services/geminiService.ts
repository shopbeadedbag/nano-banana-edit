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

export const generateImageFromText = async (prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key not found. Please check your environment variables (VITE_GOOGLE_API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
      // Switched to gemini-2.5-flash-image for broader availability compared to Imagen
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }]
          },
          // No explicit image config needed for standard 1:1 generation
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
          throw new Error(`Model response: ${textPart.text}`);
      }

      throw new Error("No image was generated in the response.");
  } catch (error: any) {
      console.error("Error generating image with Gemini:", error);
      // Pass the actual error message to the UI
      throw new Error(error.message || "Failed to generate image.");
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
    
    // Check if the model returned text (e.g. safety refusal)
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart && textPart.text) {
        throw new Error(`Model response: ${textPart.text}`);
    }

    throw new Error("No image was generated in the response.");
  } catch (error: any) {
    console.error("Error editing image with Gemini:", error);
    throw new Error(error.message || "Failed to edit image.");
  }
};