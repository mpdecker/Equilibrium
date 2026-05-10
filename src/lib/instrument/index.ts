export {
  mapGestureToMacros,
  nudgeMacros,
  type GestureSnapshot,
  type StageAxes,
  type MacroState,
  type MacroDelta,
} from "./gesture-mapping";
export {
  useStageGesture,
  useStageGestureState,
  type GestureSourceOptions,
} from "./gesture-source";
export {
  useEngineParamCommit,
  type ParamCommitController,
  type ParamCommitOptions,
} from "./param-commit";
export { useStageA11y, STAGE_ARIA, type StageA11yHandlers } from "./a11y";
export { MOTION, SCALE, withReducedMotion, type Transition } from "./motion-system";
export {
  readInstrumentMode,
  writeInstrumentMode,
  resolveInstrumentMode,
  parseRolloutInstrumentValue,
  readDrawerDefault,
  writeDrawerDefault,
  type InstrumentMode,
  type InstrumentModeSource,
  type ServerInstrumentRolloutValue,
  type DrawerDefault,
} from "./feature-flag";
export { readAudioLabExpertOpen, writeAudioLabExpertOpen } from "./audio-lab-prefs";
