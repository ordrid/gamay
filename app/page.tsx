"use client"

import { useRef, useState, useCallback } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

type OutputFormat = "jpeg" | "png" | "webp" | "avif"

interface ImageInfo {
  name: string
  size: number
  previewUrl: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function detectFormat(file: File): OutputFormat {
  const mime = file.type
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  if (mime === "image/avif") return "avif"
  return "jpeg"
}

function stripExtension(name: string): string {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(0, i) : name
}

function defaultFilename(file: File, fmt: OutputFormat): string {
  return `${stripExtension(file.name)}-processed.${fmt}`
}

export default function Page() {
  const { resolvedTheme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null)
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [quality, setQuality] = useState(80)
  const [format, setFormat] = useState<OutputFormat>("jpeg")
  const [outputFilename, setOutputFilename] = useState("")
  const [filenameEdited, setFilenameEdited] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ url: string; size: number; blob: Blob } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setResult(null)
    setError(null)
    const url = URL.createObjectURL(f)
    setImageInfo({ name: f.name, size: f.size, previewUrl: url })
    const detected = detectFormat(f)
    setFormat(detected)
    setOutputFilename(defaultFilename(f, detected))
    setFilenameEdited(false)
  }, [])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const process = async () => {
    if (!file) return
    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      const fd = new FormData()
      fd.append("file", file)
      if (width) fd.append("width", width)
      if (height) fd.append("height", height)
      fd.append("quality", String(quality))
      fd.append("format", format)

      const res = await fetch("/api/process-image", { method: "POST", body: fd })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? "Processing failed")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setResult({ url, size: blob.size, blob })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsProcessing(false)
    }
  }

  const changeFormat = (f: OutputFormat) => {
    setFormat(f)
    if (!filenameEdited && file) {
      setOutputFilename(defaultFilename(file, f))
    }
  }

  const download = () => {
    if (!result) return
    const a = document.createElement("a")
    a.href = result.url
    a.download = outputFilename || `processed.${format}`
    a.click()
  }

  const formats: OutputFormat[] = ["jpeg", "png", "webp", "avif"]

  return (
    <div className="flex min-h-svh items-start justify-center p-6 pt-12">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-base font-medium">Image Resizer</h1>
            <p className="text-sm text-muted-foreground">Resize and convert images using sharp</p>
          </div>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left column: input + controls */}
          <div className="flex flex-col gap-6 lg:w-1/2">
            {/* Drop zone */}
            <div
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-sm transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onInputChange}
              />
              {imageInfo ? (
                <div className="flex flex-col items-center gap-1 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageInfo.previewUrl}
                    alt="preview"
                    className="mb-2 max-h-40 max-w-full rounded-lg object-contain"
                  />
                  <span className="font-medium">{imageInfo.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(imageInfo.size)}</span>
                  <span className="mt-1 text-xs text-muted-foreground">Click or drop to replace</span>
                </div>
              ) : (
                <>
                  <span className="font-medium">Drop image here or click to upload</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, SVG, WebP, AVIF, GIF…</span>
                </>
              )}
            </div>

            {/* Options */}
            <div className="flex flex-col gap-4">
              {/* Dimensions */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dimensions <span className="normal-case font-normal">(leave blank to keep original)</span>
                </label>
                <div className="flex gap-3">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground text-xs">W</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="auto"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="w-full bg-transparent outline-none placeholder:text-muted-foreground/50"
                    />
                    <span className="text-muted-foreground text-xs">px</span>
                  </div>
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground text-xs">H</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="auto"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-transparent outline-none placeholder:text-muted-foreground/50"
                    />
                    <span className="text-muted-foreground text-xs">px</span>
                  </div>
                </div>
              </div>

              {/* Quality */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Quality</span>
                  <span className="font-mono normal-case">{quality}%</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Smallest</span>
                  <span>Best quality</span>
                </div>
              </div>

              {/* Format */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Output format
                </label>
                <div className="flex gap-2">
                  {formats.map((f) => (
                    <button
                      key={f}
                      onClick={() => changeFormat(f)}
                      className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                        format === f
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filename */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Output filename
                </label>
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => {
                    setOutputFilename(e.target.value)
                    setFilenameEdited(true)
                  }}
                  placeholder={file ? defaultFilename(file, format) : "processed.jpeg"}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary"
                />
              </div>
            </div>

            {/* Action */}
            <Button
              onClick={process}
              disabled={!file || isProcessing}
              size="lg"
              className="w-full"
            >
              {isProcessing ? "Processing…" : "Process image"}
            </Button>

            {/* Error */}
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Right column: result */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-12 lg:w-1/2">
            {result ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Result</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(result.size)}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.url}
                  alt="processed"
                  className="max-h-96 w-full rounded-lg object-contain"
                />
                {imageInfo && (
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(imageInfo.size)} → {formatBytes(result.size)}{" "}
                    <span className={result.size < imageInfo.size ? "text-green-500" : "text-amber-500"}>
                      ({result.size < imageInfo.size ? "-" : "+"}
                      {Math.abs(Math.round((1 - result.size / imageInfo.size) * 100))}%)
                    </span>
                  </p>
                )}
                <Button onClick={download} variant="outline" size="sm" className="self-start">
                  Download .{format}
                </Button>
              </div>
            ) : (
              <div className="hidden items-center justify-center rounded-xl border-2 border-dashed border-border p-10 text-sm text-muted-foreground lg:flex lg:min-h-64">
                Processed image will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
