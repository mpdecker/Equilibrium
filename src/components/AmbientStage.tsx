import React from "react";
import { motion } from "motion/react";
import type { AmbientParams, EvolutionSettings } from "../lib/synth";
import type { EngineAnalyserLike } from "../lib/engine/types";
import { AudioVisualizer } from "./AudioVisualizer";

const NOISE_SVG =
  "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')";

export type AmbientStageProps = {
  params: AmbientParams;
  settings: EvolutionSettings;
  isPlaying: boolean;
  prefersReducedMotion: boolean;
  analyser: EngineAnalyserLike | null;
};

export function AmbientStage({
  params,
  settings,
  isPlaying,
  prefersReducedMotion,
  analyser,
}: AmbientStageProps) {
  const [c0, c1, c2] = params.colorPalette;
  const mist = `${c0}33`;

  return (
    <>
      {/* Deep base + palette bloom */}
      <div
        className="absolute inset-0 z-0 transition-opacity duration-1000 overflow-hidden mix-blend-screen pointer-events-none"
        style={{
          filter: "blur(88px)",
          opacity: isPlaying ? 0.82 : 0.34,
        }}
      >
        <motion.div
          className="absolute -inset-[100%] transition-colors duration-[3000ms]"
          animate={
            prefersReducedMotion
              ? { x: "0%", y: "0%" }
              : {
                  x: ["-5%", "10%", "-5%", "-5%"],
                  y: ["-10%", "5%", "10%", "-10%"],
                }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 25 + (1 - settings.evolutionSpeed) * 25,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
          style={{
            background: `radial-gradient(circle at 38% 38%, ${c0} 0%, transparent 38%)`,
          }}
        />
        <motion.div
          className="absolute -inset-[100%] transition-colors duration-[3000ms]"
          animate={
            prefersReducedMotion
              ? { x: "0%", y: "0%" }
              : {
                  x: ["10%", "-5%", "5%", "10%"],
                  y: ["5%", "10%", "-5%", "5%"],
                }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 30 + (1 - settings.evolutionSpeed) * 30,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
          style={{
            background: `radial-gradient(circle at 62% 48%, ${c1} 0%, transparent 36%)`,
          }}
        />
        <motion.div
          className="absolute -inset-[100%] transition-colors duration-[3000ms]"
          animate={
            prefersReducedMotion
              ? { x: "0%", y: "0%" }
              : {
                  x: ["-10%", "5%", "10%", "-10%"],
                  y: ["10%", "-10%", "5%", "10%"],
                }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 35 + (1 - settings.evolutionSpeed) * 35,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
          style={{
            background: `radial-gradient(circle at 50% 64%, ${c2} 0%, transparent 38%)`,
          }}
        />
        {/* Soft ember accent — ties chroma to UI accent without overpowering palette */}
        <motion.div
          className="absolute -inset-[100%] opacity-40 pointer-events-none"
          animate={
            prefersReducedMotion
              ? { scale: 1, rotate: 0 }
              : { scale: [1, 1.06, 1], rotate: [0, 4, 0] }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 48, repeat: Infinity, ease: "easeInOut" }
          }
          style={{
            background: `radial-gradient(circle at 50% 120%, rgba(199, 160, 58, 0.35) 0%, transparent 45%)`,
          }}
        />
      </div>

      {/* Fine grain */}
      <motion.div
        className="absolute inset-0 z-0 mix-blend-overlay opacity-[0.18]"
        animate={
          prefersReducedMotion ? { backgroundPosition: "0% 0%" } : { backgroundPosition: ["0% 0%", "100% 100%"] }
        }
        transition={prefersReducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 22, ease: "linear" }}
        style={{
          backgroundImage: NOISE_SVG,
          backgroundColor: "transparent",
        }}
      />
      {/* Coarser grain pass */}
      <div
        className="absolute inset-0 z-0 mix-blend-soft-light opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundSize: "240px 240px",
        }}
      />

      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <AudioVisualizer
          analyser={analyser}
          isPlaying={isPlaying}
          colorPalette={params.colorPalette}
          particleDensity={settings.particleDensity}
        />
      </div>

      {/* Vignette + letterbox depth */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 120% 85% at 50% 45%, transparent 0%, rgba(5, 2, 8, 0.15) 52%, rgba(5, 2, 8, 0.88) 100%),
            linear-gradient(to bottom, rgba(5,2,8,0.55) 0%, transparent 12%, transparent 88%, rgba(5,2,8,0.65) 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none mix-blend-screen opacity-[0.12]"
        style={{
          background: `radial-gradient(circle at 50% -10%, ${mist}, transparent 55%)`,
        }}
      />
    </>
  );
}
