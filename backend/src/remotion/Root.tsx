import { Composition } from "remotion";
import { SlideVideo } from "./SlideVideo";
import type { AnimationPreset } from "../types";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AutopilotVideo"
      component={SlideVideo as any}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        pages: [],
        animationPreset: {
          textEntrance: "fade-in",
          textDuration: 600,
          kenBurns: true,
          kenBurnsDirection: "zoom-in",
          kenBurnsIntensity: 0.25,
          backgroundEffect: "none",
          backgroundOpacity: 0,
          endingType: "none",
          endingDuration: 1500,
        } as AnimationPreset,
      }}
    />
  );
};
