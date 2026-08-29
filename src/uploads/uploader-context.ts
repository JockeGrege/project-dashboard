import { createContext, useContext } from "react";
import type { ImageUploader } from "./image-uploader";

export const ImageUploaderContext = createContext<ImageUploader | null>(null);

/** The image-upload seam. Throws if no provider is above it. */
export function useImageUploader(): ImageUploader {
  const uploader = useContext(ImageUploaderContext);
  if (!uploader) {
    throw new Error(
      "useImageUploader must be used within <ImageUploaderProvider>.",
    );
  }
  return uploader;
}
