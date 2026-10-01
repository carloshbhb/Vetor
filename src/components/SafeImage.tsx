"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

export const PLACEHOLDER_SRC = "/images/placeholder.svg";

type SafeImageProps = Omit<ImageProps, "src" | "onError"> & {
  src: string;
};

/**
 * next/image com fallback automático: se o upstream (ex. mlstatic)
 * falhar, troca para o placeholder local em vez de quebrar o layout.
 */
export default function SafeImage({ src, alt, ...rest }: SafeImageProps) {
  const [current, setCurrent] = useState(src || PLACEHOLDER_SRC);
  return (
    <Image
      {...rest}
      alt={alt}
      src={current}
      onError={() => {
        if (current !== PLACEHOLDER_SRC) setCurrent(PLACEHOLDER_SRC);
      }}
    />
  );
}
