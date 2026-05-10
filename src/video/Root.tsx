import { Composition } from "remotion";
import { CouldaMadeFinanceVideo } from "./templates/CouldaMadeFinanceVideo";
import { videoInputSchema } from "../shared/types";

export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_DURATION_FRAMES = 22 * VIDEO_FPS;

export function RemotionRoot() {
  return (
    <Composition
      id="CouldaMadeFinance"
      component={CouldaMadeFinanceVideo}
      durationInFrames={VIDEO_DURATION_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      schema={videoInputSchema}
      defaultProps={videoInputSchema.parse({})}
    />
  );
}
