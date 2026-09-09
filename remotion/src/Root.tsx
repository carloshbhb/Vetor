import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";
import { HorizontalLongVideo } from "./components/HorizontalLongVideo";
import videoData from "../video-data.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RemotionComposition = Composition as any;

export const Root: React.FC = () => {
  const { meta } = videoData as any;
  const isLongForm = meta.format === "horizontal";

  return (
    <RemotionComposition
      id={isLongForm ? "LongVideo" : "ShortVideo"}
      component={isLongForm ? HorizontalLongVideo : ShortVideo}
      durationInFrames={meta.duration * meta.fps}
      fps={meta.fps}
      width={isLongForm ? 1920 : meta.resolution.width}
      height={isLongForm ? 1080 : meta.resolution.height}
      defaultProps={{
        data: videoData,
      }}
    />
  );
};
