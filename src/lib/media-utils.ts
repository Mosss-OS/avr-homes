import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 90 * 1024 * 1024;
const MAX_DIM = 2048;

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }
  if (!ffmpegLoaded) {
    const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegLoaded = true;
  }
  return ffmpegInstance;
}

export async function compressImage(file: File): Promise<File> {
  if (file.size <= IMAGE_MAX_BYTES) return file;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = URL.createObjectURL(file);
  });

  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(img.src);

  let quality = 0.8;
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size <= IMAGE_MAX_BYTES) break;
    quality -= 0.15;
  }

  const ext = file.name.match(/\.\w+$/)?.[0]?.toLowerCase() || ".jpg";
  const name = file.name.replace(/\.[^.]+$/, "") + ext;
  return new File([blob!], name, { type: "image/jpeg" });
}

export async function compressVideo(file: File, onProgress?: (pct: number) => void): Promise<File> {
  if (file.size <= VIDEO_MAX_BYTES) return file;

  const ffmpeg = await getFFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(99, Math.round(progress * 100)));
    });
  }

  const inputName = "input" + (file.name.match(/\.[^.]+$/)?.[0] || ".mp4");
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  await ffmpeg.exec([
    "-i", inputName,
    "-c:v", "libx264",
    "-crf", "28",
    "-preset", "fast",
    "-maxrate", "2M",
    "-bufsize", "4M",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y", outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  const blob = new Blob([data], { type: "video/mp4" });
  const name = file.name.replace(/\.[^.]+$/, "") + ".mp4";
  return new File([blob], name, { type: "video/mp4" });
}

export function sizeHint(mediaType: "image" | "video" | "document"): string {
  if (mediaType === "video") return "Max 100 MB per video.";
  if (mediaType === "image") return "Max 10 MB per image.";
  return "";
}
