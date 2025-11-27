import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // 1. Log entry for debugging (Visible in Vercel Logs)
  console.log(`[API] ${req.method} request received at /api/gemini`);

  // Ensure we only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Securely access the API key from the environment variable
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error("[CRITICAL] GOOGLE_API_KEY is undefined in environment variables.");
    return res.status(500).json({ error: 'Server configuration error: GOOGLE_API_KEY is missing.' });
  }

  try {
    const { type, prompt, image } = req.body;
    console.log(`[API] Processing request: Type=${type}, PromptLength=${prompt?.length || 0}`);

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-image';

    let contents;

    if (type === 'image-to-image') {
        if (!image || !image.data || !image.mimeType) {
             return res.status(400).json({ error: 'Image data (base64/mimeType) is missing for image-to-image mode.' });
        }
        contents = {
            parts: [
                {
                    inlineData: {
                        mimeType: image.mimeType,
                        data: image.data
                    }
                },
                { text: prompt }
            ]
        };
    } else if (type === 'text-to-image') {
        contents = {
            parts: [{ text: prompt }]
        };
    } else {
        return res.status(400).json({ error: `Invalid operation type: ${type}` });
    }

    console.log(`[API] Calling Gemini model: ${model}`);

    const response = await ai.models.generateContent({
        model,
        contents
    });

    console.log("[API] Gemini response received.");

    // Extract image from response
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        console.error("[API Error] No candidates returned:", JSON.stringify(response, null, 2));
        return res.status(500).json({ error: "Gemini returned no candidates." });
    }

    const parts = candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
        console.error("[API Error] No content parts returned:", JSON.stringify(candidates[0], null, 2));
        return res.status(500).json({ error: "Gemini returned no content parts." });
    }
    
    let base64Image = null;
    let mimeType = null;
    
    for (const part of parts) {
        if (part.inlineData) {
            base64Image = part.inlineData.data;
            mimeType = part.inlineData.mimeType;
            break;
        }
    }
    
    if (base64Image) {
        console.log("[API] Image successfully extracted.");
        return res.status(200).json({ 
            success: true, 
            image: `data:${mimeType};base64,${base64Image}` 
        });
    }
    
    // Check for refusal text or other issues
    const textPart = parts.find((p: any) => p.text);
    if (textPart) {
        console.warn("[API Warning] Model refused/returned text:", textPart.text);
        return res.status(400).json({ error: `Model Refused: ${textPart.text}` });
    }

    throw new Error("Response contained neither image data nor text.");

  } catch (error: any) {
    // Extensive Logging for Vercel
    console.error("----- GEMINI API ERROR -----");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    if (error.response) {
        console.error("Response Data:", JSON.stringify(error.response, null, 2));
    }
    console.error("----------------------------");

    // Return the ACTUAL error message to the frontend for debugging
    const errorMessage = error.message || "Unknown Internal Server Error";
    
    return res.status(500).json({ 
        error: errorMessage,
        details: error.toString()
    });
  }
}