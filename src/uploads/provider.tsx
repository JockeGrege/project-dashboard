import { type ReactNode } from "react";
import { ImageUploaderContext } from "./uploader-context";
import type { ImageUploader } from "./image-uploader";

export interface ImageUploaderProviderProps {
  uploader: ImageUploader;
  children: ReactNode;
}

export function ImageUploaderProvider({
  uploader,
  children,
}: ImageUploaderProviderProps) {
  return (
    <ImageUploaderContext.Provider value={uploader}>
      {children}
    </ImageUploaderContext.Provider>
  );
}
