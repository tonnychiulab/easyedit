export const runtime = 'edge';

import { getAdjustedDimensions } from "@/lib/get-adjusted-dimentions";
import { getTogether } from "@/lib/get-together";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: `JSON parse error: ${e?.message}` },
      { status: 400 },
    );
  }

  const { imageUrl, prompt, width, height, userAPIKey, model } = body ?? {};

  if (!imageUrl || !prompt) {
    return NextResponse.json(
      { success: false, error: "Missing imageUrl or prompt." },
      { status: 400 },
    );
  }

  const validModel =
    model === "black-forest-labs/FLUX.2-pro"
      ? "black-forest-labs/FLUX.2-pro"
      : "black-forest-labs/FLUX.2-flex";

  const together = getTogether(userAPIKey ?? null);
  const adjustedDimensions = getAdjustedDimensions(
    Number(width) || 1024,
    Number(height) || 768,
  );

  console.log(`[generate-image] 開始生成，模型：${validModel}，尺寸：${adjustedDimensions.width}x${adjustedDimensions.height}，有無 API KEY：${!!userAPIKey}`);

  try {
    const json = await together.images.create({
      model: validModel,
      prompt,
      width: adjustedDimensions.width,
      height: adjustedDimensions.height,
      image_url: imageUrl,
    } as any);

    const url = (json as any).data[0].url;
    if (url) {
      console.log(`[generate-image] 生成成功，模型：${validModel}`);
      return NextResponse.json({ success: true, url });
    }
    console.warn(`[generate-image] 無回傳 URL，模型：${validModel}`);
    return NextResponse.json({
      success: false,
      error: "Image could not be generated. Please try again.",
    });
  } catch (e: any) {
    console.error(`[generate-image] 生成失敗，模型：${validModel}，錯誤：`, e?.message ?? e);
    if (e.toString().includes("403")) {
      return NextResponse.json({
        success: false,
        error:
          "You need a paid Together AI account to use the Pro model. Please upgrade by purchasing credits here: https://api.together.xyz/settings/billing.",
      });
    }
    return NextResponse.json({
      success: false,
      error: `Generation error: ${e?.message || "Unknown error"}`,
    });
  }
}
