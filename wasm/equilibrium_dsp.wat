(module
  ;; Unified preview DSP WASM (deterministic noise + optional full mono block renderer).
  ;; SYNC with src/lib/dsp/preview-worklet-match.ts — run vitest wasm + preview-worklet-parity.
  (type $f_u (func (param f64) (result f64)))
  (type $pow_ty (func (param f64) (param f64) (result f64)))

  (import "env" "sin" (func $sin (type $f_u)))
  (import "env" "floor" (func $floor (type $f_u)))
  (import "env" "pow" (func $pow (type $pow_ty)))

  (memory (export "memory") 4)

  ;; Mem layout: lp f64 @0, chord iv[6] f64 @64, mono out @2048 .. (max frame 8192 f64 samples)

  (func $clamp (param $x f64) (param $lo f64) (param $hi f64) (result f64)
    (f64.min (local.get $hi) (f64.max (local.get $lo) (local.get $x))))

  ;; noiseAt(phaseSamples, sampleIndexAsF64) — fractional part backbone (same as TS / JS worklet)
  (func $noiseAt (export "noiseAt") (param $phase f64) (param $i f64) (result f64)
    (local $x f64)
    local.get $phase
    local.get $i
    f64.add
    f64.const 12.9898
    f64.mul
    call $sin
    f64.const 43758.5453
    f64.mul
    local.set $x
    local.get $x
    local.get $x
    call $floor
    f64.sub
  )

  ;; renderBlock(...) -> newPhase (samples). Reads/writes lp @0; reads iv[6] @64; writes f64 out @2048+i*8.
  ;; maxChord ∈ [0,6]: number of chord voices; maxHInclusive ∈ [2,8]: last harmonic partial index included.
  (func $renderBlock (export "renderBlock")
    (param $phase0 f64) (param $n i32) (param $sr f64)
    (param $speed f64) (param $pole f64) (param $amp f64) (param $fund f64)
    (param $noiseAmt f64) (param $delayMix f64) (param $lfoSp f64) (param $chorDepth f64)
    (param $maxChord i32) (param $maxHInclusive i32)
    (result f64)

    (local $i i32)
    (local $lp f64)
    (local $t f64)
    (local $s f64)
    (local $acc f64)
    (local $k i32)
    (local $iv f64)
    (local $freq f64)
    (local $h i32)
    (local $hF f64)
    (local $fi f64)
    (local $lfoCap f64)
    (local $lfoSlow f64)
    (local $noiseS f64)
    (local $v f64)
    (local $contrib f64)

    (local.set $lp (f64.load (i32.const 0)))
    (local.set $i (i32.const 0))

    (block $samplesDone
      (loop $samples
        (br_if $samplesDone (i32.ge_u (local.get $i) (local.get $n)))

          ;; t = (phase0 + i) / sr
          (f64.convert_i32_s (local.get $i))
          (local.set $fi)
          (f64.div
            (f64.add (local.get $phase0) (local.get $fi))
            (local.get $sr))
          (local.set $t)

          ;; chord partials
          (local.set $acc (f64.const 0))
          (local.set $k (i32.const 0))
          (block $chDone
            (loop $chLoop
              (br_if $chDone (i32.ge_u (local.get $k) (local.get $maxChord)))
              ;; iv at byte 64 + k*8
              (local.set $iv
                (f64.load
                  (i32.add (i32.const 64) (i32.mul (local.get $k) (i32.const 8)))))

              ;; freq = fund * pow(2, iv/12)
              (local.set $freq
                (f64.mul
                  (local.get $fund)
                  (call $pow
                    (f64.const 2)
                    (f64.div (local.get $iv) (f64.const 12)))))

              (local.set $contrib
                (call $sin
                  (f64.mul
                    (f64.const 6.283185307179586)
                    (f64.mul (local.get $freq) (local.get $t)))))

              (local.set $acc (f64.add (local.get $acc) (local.get $contrib)))

              (local.set $k (i32.add (local.get $k) (i32.const 1)))
              (br $chLoop)
            )
          )

          ;; s = chord mean or 0 when maxChord==0
          (if (result f64)
            (i32.eq (local.get $maxChord) (i32.const 0))
            (then (f64.const 0))
            (else (f64.div (local.get $acc) (f64.convert_i32_s (local.get $maxChord))))
          )
          (local.set $s)

          ;; additive harmonics h=2 .. maxHInclusive
          (local.set $h (i32.const 2))
          (block $harmDone
            (loop $harmLoop
              (br_if $harmDone (i32.gt_s (local.get $h) (local.get $maxHInclusive)))
              (f64.convert_i32_s (local.get $h))
              (local.set $hF)
              (local.set $contrib
                (f64.mul
                  (f64.div (f64.const 0.11) (local.get $hF))
                  (call $sin
                    (f64.mul
                      (f64.const 6.283185307179586)
                      (f64.mul
                        (f64.mul (local.get $fund) (local.get $hF))
                        (local.get $t))))))
              (local.set $s (f64.add (local.get $s) (local.get $contrib)))
              (local.set $h (i32.add (local.get $h) (i32.const 1)))
              (br $harmLoop)
            )
          )

          ;; lfoSlow = sin(2*pi*min(lfoSp,2)*t) * 0.06 * chorDepth ; s *= 1 + lfoSlow
          (if (result f64)
            (f64.gt (local.get $lfoSp) (f64.const 2))
            (then (f64.const 2))
            (else (local.get $lfoSp)))
          (local.set $lfoCap)
          (local.set $lfoSlow
            (f64.mul
              (call $sin
                (f64.mul
                  (f64.const 6.283185307179586)
                  (f64.mul (local.get $lfoCap) (local.get $t))))
              (f64.mul (f64.const 0.06) (local.get $chorDepth))))
          (local.set $s (f64.mul (local.get $s) (f64.add (f64.const 1) (local.get $lfoSlow))))

          ;; noise
          (f64.convert_i32_s (local.get $i))
          (local.set $fi)
          (local.set $noiseS
            (call $noiseAt (local.get $phase0) (local.get $fi)))
          ;; v = amp*s + (noiseS*2-1)*noiseAmt*0.22
          (local.set $v
            (f64.add
              (f64.mul (local.get $amp) (local.get $s))
              (f64.mul
                (f64.sub (f64.mul (local.get $noiseS) (f64.const 2)) (f64.const 1))
                (f64.mul (local.get $noiseAmt) (f64.const 0.22)))))

          ;; delay mix
          (local.set $v (f64.mul (local.get $v) (local.get $delayMix)))
          ;; clamp [-1,1]
          (local.set $v (call $clamp (local.get $v) (f64.const -1) (f64.const 1)))

          ;; one-pole lowpass envelope (same pole as TS)
          (local.set $lp
            (f64.add
              (f64.mul (local.get $pole) (local.get $lp))
              (f64.mul (f64.sub (f64.const 1) (local.get $pole)) (local.get $v))))

          ;; out[i]
          (f64.store
            (i32.add (i32.const 2048) (i32.mul (local.get $i) (i32.const 8)))
            (local.get $lp))

          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $samples)
      )
    )

    (f64.store (i32.const 0) (local.get $lp))
    (f64.add
      (local.get $phase0)
      (f64.mul (f64.convert_i32_s (local.get $n)) (local.get $speed)))
  )
)
