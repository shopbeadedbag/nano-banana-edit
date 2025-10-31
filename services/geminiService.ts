import { GoogleGenAI, Modality, Part } from "@google/genai";

export const generateImageFromText = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  try {
      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
          },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      }
      
      throw new Error("No image was generated in the response.");
  } catch (error) {
      console.error("Error generating image with Gemini:", error);
      throw new Error("Failed to generate image. Please try again.");
  }
};

export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  // Fix: Instantiated GoogleGenAI client inside the function to ensure the API key
  // from process.env is available at the time of the API call. This can prevent
  // errors in environments where environment variables are loaded late.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

  try {
    // Fix: Explicitly type the `parts` array with the `Part` type from `@google/genai`
    // to allow it to hold both image and text parts, resolving the TypeScript error.
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
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    throw new Error("No image was generated in the response.");
  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    throw new Error("Failed to edit image. Please try again.");
  }
};