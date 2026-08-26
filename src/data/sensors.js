export const sensorDefinitions = [
  {
    id: 'temperature',
    name: 'ThermoSense T-104',
    type: 'Temperature',
    unit: '°C',
    baseline: 40,
    normalRange: '38–42°C',
    normalMin: 38,
    normalMax: 42,
    warningThreshold: 55,
    criticalThreshold: 70,
    initialValue: 40.46,
    precision: 1,
    direction: 'high',
    step: 0.32,
    noise: 0.12,
  },
  {
    id: 'pressure',
    name: 'PressGuard P-104',
    type: 'Pressure',
    unit: 'bar',
    baseline: 500,
    normalRange: '495–505 bar',
    normalMin: 495,
    normalMax: 505,
    warningThreshold: 450,
    criticalThreshold: 400,
    initialValue: 499.53,
    precision: 1,
    direction: 'low',
    step: 0.5,
    noise: 0.2,
  },
  {
    id: 'humidity',
    name: 'HydroTrack H-104',
    type: 'Humidity',
    unit: '%',
    baseline: 54,
    normalRange: '40–60%',
    normalMin: 40,
    normalMax: 60,
    warningThreshold: 65,
    criticalThreshold: 75,
    initialValue: 54,
    precision: 1,
    direction: 'high',
    step: 0.42,
    noise: 0.16,
  },
  {
    id: 'flow',
    name: 'FlowPulse F-104',
    type: 'Water Flow',
    unit: 'L/min',
    baseline: 100,
    normalRange: '95–105 L/min',
    normalMin: 95,
    normalMax: 105,
    warningThreshold: 85,
    criticalThreshold: 75,
    initialValue: 99.88,
    precision: 1,
    direction: 'low',
    step: 0.3,
    noise: 0.15,
  },
  {
    id: 'current',
    name: 'AmpSense A-104',
    type: 'Current',
    unit: 'A',
    baseline: 10,
    normalRange: '9.5–10.5 A',
    normalMin: 9.5,
    normalMax: 10.5,
    warningThreshold: 13,
    criticalThreshold: 16,
    initialValue: 10.16,
    precision: 2,
    direction: 'high',
    step: 0.05,
    noise: 0.02,
  },
]

// Vibration analysis data — NOT a live sensor card.
// These derived features feed the backend predictive-maintenance model
// and will be displayed in a dedicated "Vibration Analysis" section later.
export const vibrationAnalysisConfig = {
  unit: 'mm/s',
  baseline: 0.05,
  normalRange: '0.03–0.07 mm/s',
  normalMin: 0.03,
  normalMax: 0.07,
  warningThreshold: 0.2,
  criticalThreshold: 0.5,
  features: [
    {
      id: 'vib_rms',
      label: 'Vibration RMS',
      unit: 'mm/s',
      baseline: 0.05,
      normalRange: '0.03–0.07 mm/s',
      normalMin: 0.03,
      normalMax: 0.07,
      warningThreshold: 0.2,
      criticalThreshold: 0.5,
      initialValue: 0.055,
      precision: 4,
      direction: 'high',
      step: 0.001,
      noise: 0.0005,
    },
    {
      id: 'vib_kurtosis',
      label: 'Kurtosis',
      unit: '',
      baseline: 3.0,
      normalRange: '2.9–3.1',
      normalMin: 2.9,
      normalMax: 3.1,
      warningThreshold: 4.5,
      criticalThreshold: 6.0,
      initialValue: 2.993,
      precision: 3,
      direction: 'high',
      step: 0.01,
      noise: 0.005,
    },
    {
      id: 'vib_freq',
      label: 'Dominant Frequency',
      unit: 'Hz',
      baseline: 29.5,
      normalRange: '29.0–30.0 Hz',
      normalMin: 29.0,
      normalMax: 30.0,
      warningThreshold: 40,
      criticalThreshold: 55,
      initialValue: 29.63,
      precision: 2,
      direction: 'high',
      step: 0.1,
      noise: 0.05,
    },
  ],
}

export function getSensorStatus(sensor, value) {
  const isCritical = sensor.direction === 'high'
    ? value >= sensor.criticalThreshold
    : value <= sensor.criticalThreshold
  const isWarning = sensor.direction === 'high'
    ? value >= sensor.warningThreshold
    : value <= sensor.warningThreshold

  if (isCritical) return 'Critical'
  if (isWarning) return 'Warning'
  return 'Normal'
}

export function formatSensorValue(sensor, value) {
  return Number(value).toFixed(sensor.precision)
}
