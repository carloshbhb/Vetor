import type { CSSProperties } from "react";
import AdSlot, { type AdFormat } from "./AdSlot";

type AdPlacementProps = {
  slot?: string;
  format?: AdFormat;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

// Server component. Sem client/slot configurados, não renderiza nada
// (evita caixas "Publicidade" vazias em produção).
export default function AdPlacement({ slot, format = "auto", className = "", style, ariaLabel }: AdPlacementProps) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client || !slot) return null;
  return (
    <AdSlot
      slotId={slot}
      client={client}
      format={format}
      className={className}
      style={style}
      ariaLabel={ariaLabel}
    />
  );
}
