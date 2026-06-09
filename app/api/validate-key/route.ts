export const runtime = 'edge';

import { getTogether } from "@/lib/get-together";

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "API key is required",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const together = getTogether(apiKey);
    const VALIDATION_MODEL = "moonshotai/Kimi-K2.5";

    try {
      // Make a simple chat completion call to validate the API key
      console.log(`[validate-key] 開始驗證 API KEY，使用模型：${VALIDATION_MODEL}`);
      await together.chat.completions.create({
        model: VALIDATION_MODEL,
        messages: [
          {
            role: "user",
            content: "Hello, how are you?",
          },
        ],
        max_tokens: 1, // Minimal tokens for validation
      });

      console.log(`[validate-key] 驗證成功，模型：${VALIDATION_MODEL}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "API key is valid",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error(`[validate-key] 驗證失敗，模型：${VALIDATION_MODEL}，錯誤：`, error);

      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : undefined;

      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid API key or service unavailable",
          code: errorCode || "VALIDATION_ERROR",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("Request processing failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Invalid request format",
        code: "INVALID_REQUEST",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
}
