import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server' }, { status: 500 });
    }

    // Clean up base64 string if it contains the data URL prefix
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Get the Gemini 1.5 Flash model for multimodal tasks
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    // Prepare the prompt
    const prompt = `
    You are an expert AI assistant that extracts key information from images (like transfer slips, shipping labels, order screenshots, etc.) to help search for an order in an Order Management System.
    Analyze the provided image and extract the most relevant text that can be used to search for an order.
    Focus on extracting things like:
    - Customer Name
    - Phone Number
    - Tracking Number
    - Order ID
    
    INSTRUCTIONS:
    1. Identify the most identifying piece of information. A phone number or tracking number is the best. If not found, look for a customer name.
    2. Format the output as a JSON object.
    3. You MUST respond with ONLY a valid JSON object (no markdown, no backticks, no explanation).
    
    EXPECTED JSON FORMAT:
    {
      "searchQuery": "string (the extracted phone number, tracking number, or customer name)",
      "confidence": number (1-100 indicating how sure you are)
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
