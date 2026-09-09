import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RemotionComposition = Composition as any;

export const Root: React.FC = () => {
  return (
    <RemotionComposition
      id="ShortVideo"
      component={ShortVideo}
      durationInFrames={1350}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        data: {
          meta: {
            palette: {
              primary: "#6C5CE7",
              secondary: "#00CEC9",
              accent: "#FD79A8",
              dark: "#0A0A0F",
              surface: "#1A1A2E",
              text: "#FFFFFF",
            },
          },
          sections: [],
        },
      }}
    />
  );
};
