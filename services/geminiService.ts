
/**
 * Call the secure Vercel Serverless Function to interact with Gemini.
 * This prevents exposing the API key on the frontend.
 */
async function callBackendApi(payload: any): Promise<string> {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            // Throw the specific error returned by the backend (e.g., "API Key Invalid", "Quota Exceeded")
            throw new Error(data.error || `Server Error: ${response.status} ${response.statusText}`);
        }

        if (data.success && data.image) {
            return data.image;
        }

        throw new Error(data.error || "Unknown error occurred: No image data returned.");
    } catch (error: any) {
        console.error("API Call Failed:", error);
        throw new Error(error.message || "Failed to connect to the server.");
    }
}

/**
 * Edit an existing image based on a prompt (Image-to-Image)
 */
export const editImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  return callBackendApi({
      type: 'image-to-image',
      prompt,
      image: {
          data: base64Image,
          mimeType
      }
  });
};

/**
 * Generate a new image from text (Text-to-Image)
 */
export const generateImageFromText = async (
  prompt: string
): Promise<string> => {
  return callBackendApi({
      type: 'text-to-image',
      prompt
  });
};
