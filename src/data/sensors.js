export const sensorDefinitions = [
  {
    id: 'temperature',
    name: 'ThermoSense T-104',
    type: 'Temperature',
    unit: '°C',
    baseline: 72,
    normalRange: '65–75°C',
    normalMin: 65,
    normalMax: 75,
    warningThreshold: 80,
    criticalThreshold: 90,
    initialValue: 86,
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
    baseline: 4.5,
    normalRange: '4.2–4.8 bar',
    normalMin: 4.2,
    normalMax: 4.8,
    warningThreshold: 4.1,
    criticalThreshold: 4.0,
    initialValue: 4.1,
    precision: 2,
    direction: 'low',
    step: 0.018,
    noise: 0.008,
  },
  {
    id: 'vibration',
    name: 'VibraSense V-104',
    type: 'Vibration',
    unit: 'mm/s',
    baseline: 2.1,
    normalRange: '1.8–2.5 mm/s',
    normalMin: 1.8,
    normalMax: 2.5,
    warningThreshold: 3.0,
    criticalThreshold: 3.5,
    initialValue: 3.8,
    precision: 2,
    direction: 'high',
    step: 0.045,
    noise: 0.018,
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
    initialValue: 68,
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
    baseline: 135,
    normalRange: '125–145 L/min',
    normalMin: 125,
    normalMax: 145,
    warningThreshold: 120,
    criticalThreshold: 110,
    initialValue: 118,
    precision: 1,
    direction: 'low',
    step: 0.48,
    noise: 0.2,
  },
]

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
