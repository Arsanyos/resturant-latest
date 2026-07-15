import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export class MenuUploadError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "MenuUploadError";
  }
}

async function saveRestaurantImage(
  restaurantId: string,
  file: File,
  kind: "menu" | "branding" | "ads"
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new MenuUploadError("Only JPEG, PNG, WebP, and GIF images are allowed");
  }

  const ext = EXT_BY_TYPE[file.type] ?? ".bin";
  const filename = `${randomBytes(16).toString("hex")}${ext}`;
  const relativeDir = path.join("uploads", kind, restaurantId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);

  await mkdir(absoluteDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absoluteDir, filename), buffer);

  return `/${relativeDir.replace(/\\/g, "/")}/${filename}`;
}

export async function saveMenuImage(
  restaurantId: string,
  file: File
): Promise<string> {
  return saveRestaurantImage(restaurantId, file, "menu");
}

export async function saveBrandLogo(
  restaurantId: string,
  file: File
): Promise<string> {
  return saveRestaurantImage(restaurantId, file, "branding");
}

export async function saveAdImage(
  restaurantId: string,
  file: File
): Promise<string> {
  return saveRestaurantImage(restaurantId, file, "ads");
}
