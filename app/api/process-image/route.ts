import sharp from "sharp"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const width = formData.get("width") as string | null
  const height = formData.get("height") as string | null
  const quality = parseInt((formData.get("quality") as string) ?? "80", 10)
  const format = (formData.get("format") as string) ?? "jpeg"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let pipeline = sharp(buffer)

  const parsedWidth = width ? parseInt(width, 10) : undefined
  const parsedHeight = height ? parseInt(height, 10) : undefined

  if (parsedWidth || parsedHeight) {
    pipeline = pipeline.resize({
      width: parsedWidth || undefined,
      height: parsedHeight || undefined,
      fit: "inside",
      withoutEnlargement: false,
    })
  }

  let output: Buffer
  let mimeType: string

  switch (format) {
    case "png":
      output = await pipeline.png({ quality }).toBuffer()
      mimeType = "image/png"
      break
    case "webp":
      output = await pipeline.webp({ quality }).toBuffer()
      mimeType = "image/webp"
      break
    case "avif":
      output = await pipeline.avif({ quality }).toBuffer()
      mimeType = "image/avif"
      break
    case "jpeg":
    default:
      output = await pipeline.jpeg({ quality }).toBuffer()
      mimeType = "image/jpeg"
      break
  }

  return new NextResponse(output, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="processed.${format}"`,
    },
  })
}
