import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildPrompt } from '@/lib/prompt';
import type { GenerateInput } from '@/lib/prompt';
import { getAllReviews } from '@/lib/db';

export async function POST(req: Request) {
   try {
     const body = await req.json() as GenerateInput;

     const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) {
       return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
     }

     const genAI = new GoogleGenerativeAI(apiKey);
     // Use a stable, widely-available model
     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

     // Retrieve unique list of existing categories in the database
     const reviews = await getAllReviews();
     const existingCategories = Array.from(new Set(reviews.map(r => r.category).filter(Boolean)));

     const prompt = buildPrompt({
       ...body,
       existingCategories,
     });

     const result = await model.generateContent({
       contents: [{ role: 'user', parts: [{ text: prompt }] }],
       generationConfig: { 
         maxOutputTokens: 8192,
         temperature: 0.7,
       },
     });

     const responseText = result.response.text();
     if (!responseText) throw new Error('Empty AI response');

     // Clean and parse the JSON (the model is instructed to output JSON in the prompt)
     const jsonMatch = responseText.match(/\{[\s\S]*\}/);
     if (!jsonMatch) throw new Error('Could not parse JSON from AI response');

     const reviewJson = JSON.parse(jsonMatch[0]);

     // Return the raw JSON for the form to pre-fill
     // The form maps this to ReviewData shape
     return NextResponse.json({ success: true, data: reviewJson });
   } catch (error: any) {
     console.error('Generate error:', error);
     return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
   }
 }
