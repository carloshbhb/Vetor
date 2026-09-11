import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";
import { HorizontalLongVideo } from "./components/HorizontalLongVideo";
import videoData from "../video-data.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RemotionComposition = Composition as any;

export const Root: React.FC = () => {
  const { meta } = videoData as any;
  const durationInFrames = meta.duration * meta.fps;

  // Both compositions are always registered so `render ShortVideo` and
  // `render LongVideo` both resolve regardless of video-data.json format.
  // Props contract unchanged: { data: video-data.json } via defaultProps.
  return (
    <>
      <RemotionComposition
        id="ShortVideo"
        component={ShortVideo}
        durationInFrames={durationInFrames}
        fps={meta.fps}
        width={meta.resolution.width}
        height={meta.resolution.height}
        defaultProps={{
          data: videoData,
        }}
      />
      <RemotionComposition
        id="LongVideo"
        component={HorizontalLongVideo}
        durationInFrames={durationInFrames}
        fps={meta.fps}
        width={1920}
        height={1080}
        defaultProps={{
          data: videoData,
        }}
      />
    </>
  );
};
