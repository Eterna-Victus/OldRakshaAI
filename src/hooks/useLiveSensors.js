import { useEffect, useState } from 'react'
import { formatSensorValue, getSensorStatus, sensorDefinitions } from '../data/sensors'

function round(value, precision) {
  return Number(value.toFixed(precision))
}

function buildSensor(sensor, value, history, updatedAt) {
  const percentageChange = ((value - sensor.baseline) / sensor.baseline) * 100
  return {
    ...sensor,
    value,
    formattedValue: formatSensorValue(sensor, value),
    history,
    status: getSensorStatus(sensor, value),
    percentageChange,
    updatedAt,
  }
}

function nextReading(sensor, value) {
  const direction = sensor.direction === 'high' ? 1 : -1
  const controlledNoise = (Math.random() - 0.5) * sensor.noise
  return Math.max(0, round(value + direction * sensor.step + controlledNoise, sensor.precision))
}

function createInitialState() {
  const updatedAt = new Date()
  return sensorDefinitions.reduce((result, sensor) => {
    result[sensor.id] = buildSensor(sensor, sensor.initialValue, [{ timestamp: updatedAt, value: sensor.initialValue }], updatedAt)
    return result
  }, {})
}

export function useLiveSensors(intervalMs = 1500) {
  const [sensors, setSensors] = useState(createInitialState)

  useEffect(() => {
    const interval = window.setInterval(() => {
      const updatedAt = new Date()
      setSensors((current) => Object.fromEntries(sensorDefinitions.map((sensor) => {
        const previous = current[sensor.id]
        const value = nextReading(sensor, previous.value)
        const history = [...previous.history, { timestamp: updatedAt, value }].slice(-60)
        return [sensor.id, buildSensor(sensor, value, history, updatedAt)]
      })))
    }, intervalMs)

    return () => window.clearInterval(interval)
  }, [intervalMs])

  return {
    sensors: sensorDefinitions.map((sensor) => sensors[sensor.id]),
    sensorMap: sensors,
    connectedCount: sensorDefinitions.length,
  }
}
