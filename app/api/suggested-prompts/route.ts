import { getTogether } from "@/lib/get-together";
import { getIPAddress, getRateLimiter } from "@/lib/rate-limiter";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const schema = z.array(z.string());
const jsonSchema = z.toJSONSchema(schema);

export const revalidate = 86400;

const ratelimit = getRateLimiter();

const SYSTEM_PROMPT = `Suggest exactly 3 simple image edits. Output ONLY a JSON array of 3 short strings (5-8 words each). Example: ["edit 1","edit 2","edit 3"]`;

async function fetchAndCompressImage(imageUrl: string): Promise<string> {
  // 若已是 base64 data URL，直接回傳
  if (imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  // 一般 URL：fetch 後轉成 base64
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${base64}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const imageUrl = searchParams.get("imageUrl");
  const model = searchParams.get("model") || "Qwen/Qwen3.5-9B";

  if (!imageUrl) {
    return NextResponse.json(
      { error: "imageUrl query parameter is required" },
      { status: 400 },
    );
  }

  const userAPIKey = request.headers.get("x-api-key") || null;

  if (ratelimit && !userAPIKey) {
    const ipAddress = await getIPAddress();

    const { success } = await ratelimit.limit(`${ipAddress}-suggestions`);
    if (!success) {
      return NextResponse.json(
        { suggestions: [] },
        {
          status: 429,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  }

  const together = getTogether(userAPIKey);

  try {
    // Compress image server-side to reduce tokens
    const compressedImageUrl = await fetchAndCompressImage(imageUrl);

    const response = await together.chat.completions.create({
      model,
      max_tokens: 200,
      temperature: 0.6,
      reasoning: { enabled: false },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: compressedImageUrl } },
            { type: "text", text: "Suggest 3 edits." },
          ],
        },
      ],
      response_format: { type: "json_object", schema: jsonSchema },
    } as any);

    if (!response?.choices?.[0]?.message?.content) {
      return NextResponse.json({ suggestions: [] });
    }

    const json = JSON.parse(response.choices[0].message.content);
    const result = schema.safeParse(json);

    if (result.error) {
      return NextResponse.json({ suggestions: [] });
    }

    return NextResponse.json(
      { suggestions: result.data },
      {
        headers: {
          "Vercel-CDN-Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=604800",
          "CDN-Cache-Control": "public, s-maxage=86400",
          "Cache-Control": "public, max-age=0, s-maxage=86400",
        },
      },
    );
  } catch (e) {
    console.error("suggested-prompts error:", e);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
