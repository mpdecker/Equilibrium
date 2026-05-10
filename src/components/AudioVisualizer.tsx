import React, { useEffect, useRef, useState } from "react";

/** Duck-type compatible with Tone.Analyser for waveform visualization */
export type WaveformAnalyser = {
  getValue(): Float32Array | number[];
};

interface AudioVisualizerProps {
  analyser: WaveformAnalyser | null;
  isPlaying: boolean;
  colorPalette: string[];
  particleDensity: number;
  /**
   * Override accessibility motion reduction. When omitted, `(prefers-reduced-motion: reduce)`
   * is read via `matchMedia` so the canvas respects OS settings when embedded elsewhere.
   */
  reduceMotion?: boolean;
}

function useSystemPrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }

    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  return reduced;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  baseRadius: number;
  id_offset: number;
}

export function AudioVisualizer({
  analyser,
  isPlaying,
  colorPalette,
  particleDensity,
  reduceMotion: reduceMotionProp,
}: AudioVisualizerProps) {
  const systemReducedMotion = useSystemPrefersReducedMotion();
  const reduceMotion = reduceMotionProp ?? systemReducedMotion;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, hover: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        hover: true
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.hover = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseLeave);

    const capDensity = reduceMotion ? Math.min(particleDensity, 40) : particleDensity;
    const enableClusterForces = !reduceMotion;
    const sway = reduceMotion ? 0.05 : 0.15;
    const spawnChance = reduceMotion ? 0.06 : 0.2;
    const initCount = reduceMotion ? 22 : 50;
    const phaseStep = reduceMotion ? 0.002 : 0.005;

    // Helper to get a random color from the palette
    const getRandomColor = () => {
      if (!colorPalette || colorPalette.length === 0) return "#ffffff";
      return colorPalette[Math.floor(Math.random() * colorPalette.length)];
    };

    const createParticle = (width: number, height: number): Particle => {
      return {
        x: Math.random() * width,
        y: height + 20 + Math.random() * 50, // Start slightly below screen
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(Math.random() * 0.2 + 0.1), // Move upwards very slowly
        baseRadius: Math.random() * 3 + 1, // Slightly larger base for softer glow
        radius: 0,
        color: getRandomColor(),
        alpha: 0,
        life: 0,
        maxLife: Math.random() * 800 + 400, // Longer life span for gentle drifting
        id_offset: Math.random() * Math.PI * 2,
      };
    };

    // Initialize some particles
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < initCount; i++) {
      const p = createParticle(rect.width, rect.height);
      p.y = Math.random() * rect.height; // Distribute initial particles
      p.life = Math.random() * p.maxLife;
      particlesRef.current.push(p);
    }

    let phase = 0;
    let smoothedAudioLevel = 0;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Gentle fade out for trailing effect
      ctx.fillStyle = "rgba(10, 5, 2, 0.2)";
      ctx.fillRect(0, 0, width, height);

      let audioLevel = 0;

      if (analyser && isPlaying) {
        const values = analyser.getValue() as Float32Array;
        // Calculate a rough audio level (RMS) to gently pulse particles
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
          sum += values[i] * values[i];
        }
        audioLevel = Math.sqrt(sum / values.length); 
      }
      
      // Smooth the audio level to prevent sudden jumps
      smoothedAudioLevel += (audioLevel - smoothedAudioLevel) * 0.03;

      // Add new particles periodically
      if (particlesRef.current.length < capDensity) {
        if (Math.random() < spawnChance) {
          particlesRef.current.push(createParticle(width, height));
        }
      }

      const particles = particlesRef.current;

      // Apply subtle clustering/attraction forces (skipped under reduced motion)
      if (enableClusterForces) {
        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distSq = dx * dx + dy * dy;
            const maxDist = 80; // 80px interaction radius
            const maxDistSq = maxDist * maxDist;

            if (distSq > 0 && distSq < maxDistSq) {
              const dist = Math.sqrt(distSq);
              // Gentle force: stronger when closer, but still very weak overall
              const force = (1 - dist / maxDist) * 0.003;

              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              p1.vx += fx;
              p1.vy += fy;
              p2.vx -= fx;
              p2.vy -= fy;
            }
          }

          // Dampen velocity to prevent runaway speeds and maintain slow drift
          p1.vx *= 0.99;
          p1.vy *= 0.99;

          // Ensure they maintain a gentle upward lift
          if (p1.vy > -0.1) {
            p1.vy -= 0.005;
          }

          // Cap maximum speed
          const speed = Math.sqrt(p1.vx * p1.vx + p1.vy * p1.vy);
          const maxSpeed = 0.6;
          if (speed > maxSpeed) {
            p1.vx = (p1.vx / speed) * maxSpeed;
            p1.vy = (p1.vy / speed) * maxSpeed;
          }
        }
      } else {
        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          p1.vx *= 0.99;
          p1.vy *= 0.99;
          if (p1.vy > -0.1) {
            p1.vy -= 0.005;
          }
          const speed = Math.sqrt(p1.vx * p1.vx + p1.vy * p1.vy);
          const maxSpeed = 0.35;
          if (speed > maxSpeed) {
            p1.vx = (p1.vx / speed) * maxSpeed;
            p1.vy = (p1.vy / speed) * maxSpeed;
          }
        }
      }

      // Update and draw particles
      ctx.globalCompositeOperation = "screen";

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        
        p.life++;
        p.x += p.vx + Math.sin(phase + p.id_offset) * sway; // Gentle swaying
        p.y += p.vy - (smoothedAudioLevel * 0.3); // Very small lift from audio

        // Subtly pulse size and alpha with smoothed audio level
        const pulse = Math.sin(phase * 20 + p.id_offset) * smoothedAudioLevel;
        
        // Audio influence: gently increase radius based on smoothed audio volume and pulse
        let currentRadius = Math.max(0.1, p.baseRadius + (smoothedAudioLevel * 5 * p.baseRadius) + (pulse * p.baseRadius * 2));
        
        // Smooth fade in and out across lifespan
        const fadeInTicks = 150;
        const fadeOutTicks = 150;
        let maxAlpha = Math.max(0, 0.4 + (smoothedAudioLevel * 0.2) + (pulse * 0.15)); // Translucent, slightly brighter with audio

        const mouse = mouseRef.current;
        if (mouse.hover) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const hoverRadius = 150;
          if (distSq < hoverRadius * hoverRadius) {
            const dist = Math.sqrt(distSq);
            const factor = Math.pow(1 - (dist / hoverRadius), 1.5); // Ease out effect
            currentRadius += factor * 3; // Subtle scaling
            maxAlpha += factor * 0.3;    // Subtle opacity increase
          }
        }

        if (p.life < fadeInTicks) {
          p.alpha = (p.life / fadeInTicks) * maxAlpha;
        } else if (p.maxLife - p.life < fadeOutTicks) {
          p.alpha = ((p.maxLife - p.life) / fadeOutTicks) * maxAlpha;
        } else {
          p.alpha = maxAlpha;
        }

        p.alpha = Math.max(0, Math.min(1, p.alpha));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        
        // Create a soft glowing gradient for each particle
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius * 2);
        
        // Convert hex to rgb string for alpha manipulation
        // Simple hack: assumption is colorPalette provides hex strings #RRGGBB
        let r = 255, g = 255, b = 255;
        if (p.color.length === 7) {
          r = parseInt(p.color.slice(1, 3), 16);
          g = parseInt(p.color.slice(3, 5), 16);
          b = parseInt(p.color.slice(5, 7), 16);
        }

        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.alpha})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();

        // Remove dead particles or particles out of bounds
        if (p.life >= p.maxLife || p.y < -50 || p.x < -50 || p.x > width + 50) {
          particlesRef.current.splice(i, 1);
        }
      }

      ctx.globalCompositeOperation = "source-over"; // Reset
      phase += phaseStep;
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", updateSize);
    };
  }, [analyser, isPlaying, colorPalette, particleDensity, reduceMotion]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

