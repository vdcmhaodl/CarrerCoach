import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { selectedOption?: string };
    const selectedOption = body.selectedOption;

    if (!selectedOption) {
      return NextResponse.json(
        { error: "selectedOption is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `Create questions for the ${selectedOption} field base on three tags: Background, Situation, Technical. 
    For each tag, generates 10 questions, and start each question with [TAG_NAME]. Make sure to ONLY output with bullet points.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM Error" },
      { status: 500 }
    );
  }
}
