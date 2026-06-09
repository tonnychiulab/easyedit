export const runtime = 'edge';

import { getAdjustedDimensions } from "@/lib/get-adjusted-dimentions";
import { getTogether } from "@/lib/get-together";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  imageUrl: z.string(),
  prompt: z.string(),
  width: z.number(),
  height: z.number(),
  userAPIKey: z.string().nullable(),
  model: z
    .enum(["black-forest-labs/FLUX.2-flex", "black-forest-labs/FLUX.2-pro"])
    .default("black-forest-labs/FLUX.2-flex"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, prompt, width, height, userAPIKey, model } =
      schema.parse(body);

    const together = getTogether(userAPIKey);
    const adjustedDimensions = getAdjustedDimensions(width, height);

    try {
      const json = await together.images.create({
        model,
        prompt,
        width: adjustedDimensions.width,
        height: adjustedDimensions.height,
        image_url: imageUrl,
      } as any);

      const url = (json as any).data[0].url;
      if (url) {
        return NextResponse.json({ success: true, url });
      }
      return NextResponse.json({
        success: false,
        error: "Image could not be generated. Please try again.",
      });
    } catch (e: any) {
      if (e.toString().includes("403")) {
        return NextResponse.json({
          success: false,
          error:
            "You need a paid Together AI account to use the Pro model. Please upgrade by purchasing credits here: https://api.together.xyz/settings/billing.",
        });
      }
      return NextResponse.json({
        success: false,
        error: "Image could not be generated. Please try again.",
      });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request." },
      { status: 400 },
    );
  }
}
