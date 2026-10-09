import { Composition } from "remotion";
import { COMPOSITION_ID, type StoryVideoProps } from "../lib/style";
import { totalFrames } from "../lib/timeline";
import { StoryVideo } from "./StoryVideo";

const PLACEHOLDER: StoryVideoProps = {
  input: {
    width: 1080,
    height: 1920,
    fps: 30,
    totalDurationSec: 1,
    shots: [],
    narration: { src: "", durationSec: 0, startSec: 0 },
    music: null,
    captions: null,
    verse: null,
    brand: null,
  },
  depthSrc: {},
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={StoryVideo}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={30}
    defaultProps={PLACEHOLDER}
    calculateMetadata={({ props }) => ({
      durationInFrames: totalFrames(props.input.totalDurationSec, props.input.fps),
      fps: props.input.fps,
      width: props.input.width,
      height: props.input.height,
    })}
  />
);
