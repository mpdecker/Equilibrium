(module
  ;; Superseded for builds by `equilibrium_dsp.wat` (exports noiseAt + renderBlock + memory).
  ;; Kept as a minimal reference for WAT-only noise without linear memory.
  (type $f64_unary (func (param f64) (result f64)))
  (import "env" "sin" (func $sin (type $f64_unary)))
  (import "env" "floor" (func $floor (type $f64_unary)))

  ;; noiseAt: x - floor(x) for deterministic fractional part (SYNC equilibrium-dsp / preview-worklet-match)
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
)
