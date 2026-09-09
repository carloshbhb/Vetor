import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { GradientBackground } from "./GradientBackground";
import { KineticCaption } from "./KineticCaption";
import { QRCodeAnimated } from "./QRCodeAnimated";
import { UrgencyCounter } from "./UrgencyCounter";
import { BuyButton } from "./BuyButton";
import { SocialProof } from "./SocialProof";

interface CTAProps {
  section: {
    narration: string;
    visual: {
      background: { colors: string[]; angle: number };
      qr_code: { enabled: boolean; url: string; size: number; animation: { type: string; delay: number } };
      urgency: { enabled: boolean; text: string; countdown: boolean; startValue: number; color: string; fontSize: number; animation: string };
      buy_button: { text: string; url: string; color: string; textColor: string; fontSize: number; borderRadius: number; animation: { type: string; stiffness: number; damping: number } };
      captions: { style: string; position: string; fontSize: number; highlightColor: string };
      social_proof: { stars: number; reviewCount: number; avatars: { count: number; style: string } };
    };
  };
  palette: Record<string, string>;
}

export const CTA: React.FC<CTAProps> = ({ section, palette }) => {
  const frame = useCurrentFrame();
  const { visual, narration } = section;

  const contentOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradientBackground colors={visual.background.colors} angle={visual.background.angle} animated={false} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: contentOpacity,
          flexDirection: "column",
          gap: 40,
        }}
      >
        <AbsoluteFill style={{ top: 100, justifyContent: "center", alignItems: "center" }}>
          <KineticCaption
            text={narration}
            fontSize={visual.captions.fontSize}
            fontWeight={700}
            color={palette.text}
            highlightColor={visual.captions.highlightColor}
            wordByWord={true}
            effect="scale_spring"
          />
        </AbsoluteFill>

        {visual.urgency.enabled && (
          <UrgencyCounter
            text={visual.urgency.text}
            startValue={visual.urgency.startValue}
            color={visual.urgency.color}
            fontSize={visual.urgency.fontSize}
          />
        )}

        {visual.qr_code.enabled && (
          <QRCodeAnimated
            url={visual.qr_code.url}
            size={visual.qr_code.size}
            delay={visual.qr_code.animation.delay}
          />
        )}

        <BuyButton
          text={visual.buy_button.text}
          color={visual.buy_button.color}
          textColor={visual.buy_button.textColor}
          fontSize={visual.buy_button.fontSize}
          borderRadius={visual.buy_button.borderRadius}
          stiffness={visual.buy_button.animation.stiffness}
          damping={visual.buy_button.animation.damping}
        />

        <SocialProof
          stars={visual.social_proof.stars}
          reviewCount={visual.social_proof.reviewCount}
          avatarCount={visual.social_proof.avatars.count}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
