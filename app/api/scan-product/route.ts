import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, products } = body;

    if (!imageBase64 || !products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Missing image or products array' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server' }, { status: 500 });
    }

    // Clean up base64 string if it contains the data URL prefix
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Get the Gemini 1.5 Flash model for multimodal tasks
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare the prompt
    const prompt = `
    You are an expert AI product identifier for a retail store.
    Analyze the provided image and find the BEST matching product from the inventory list provided below.

    INVENTORY LIST:
    ${JSON.stringify(products, null, 2)}

    INSTRUCTIONS:
    1. Identify the primary object/product in the image.
    2. Read any text (labels, tags, packaging) on the product if visible.
    3. Compare the visual features and text with the items in the INVENTORY LIST.
    4. You MUST respond with ONLY a valid JSON object (no markdown, no backticks, no explanation).
    
    EXPECTED JSON FORMAT:
    {
      "matched_id": "string (the id of the matching product, or null if no match found)",
      "confidence": number (1-100 indicating how sure you are),
      "reasoning": "string (brief explanation of why this product matches, e.g. 'Found logo XYZ and it looks like a black handbag')"
    }
    `;

    // Prepare the image part
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType || 'image/jpeg',
      },
    };

    // Call the model
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Parse the JSON output from the model
    try {
      // Clean up markdown formatting if the model still outputs it despite instructions
      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResult = JSON.parse(cleanedText);
      return NextResponse.json(parsedResult);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', responseText);
      return NextResponse.json({ error: 'Invalid response from AI model' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('AI Scan Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to scan image' }, { status: 500 });
  }
}
