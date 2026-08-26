import { useCallback, useEffect, useRef, useState } from 'react'
import { formatSensorValue, getSensorStatus, sensorDefinitions, vibrationAnalysisConfig } from '../data/sensors'
import { pumpP104Telemetry } from '../data/pumpP104Telemetry'

// Map telemetry dataset keys to sensor definition IDs
const TELEMETRY_SENSOR_MAP = {
  temperature: 'temperature',
  pressure: 'pressure',
  flow_rate: 'flow',
  current: 'current',
}

// Map telemetry dataset keys to vibration analysis feature IDs
const TELEMETRY_VIB_MAP = {
  vib_rms: 'vib_rms',
  vib_kurtosis: 'vib_kurtosis',
  vib_freq: 'vib_freq',
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

function buildVibrationFeature(feature, value, history, updatedAt) {
  const percentageChange = ((value - feature.baseline) / feature.baseline) * 100
  return {
    ...feature,
    value,
    formattedValue: Number(value).toFixed(feature.precision),
    history,
    status: getSensorStatus(feature, value),
    percentageChange,
    updatedAt,
  }
}

function createInitialState() {
  const updatedAt = new Date()
  const sensors = sensorDefinitions.reduce((result, sensor) => {
    result[sensor.id] = buildSensor(sensor, sensor.initialValue, [], updatedAt)
    return result
  }, {})

  sensors._vibrationAnalysis = vibrationAnalysisConfig.features.reduce((result, feature) => {
    result[feature.id] = buildVibrationFeature(feature, feature.initialValue, [], updatedAt)
    return result
  }, {})

  return sensors
}

export function useLiveSensors() {
  const [sensors, setSensors] = useState(createInitialState)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef(null)
  const indexRef = useRef(0)

  const totalRows = pumpP104Telemetry.length

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsMonitoring(false)
  }, [])

  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return // Prevent duplicate intervals
    if (indexRef.current >= totalRows) return // Already complete

    setIsMonitoring(true)
    setIsComplete(false)

    intervalRef.current = window.setInterval(() => {
      const idx = indexRef.current
      if (idx >= totalRows) {
        // End of dataset
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsMonitoring(false)
        setIsComplete(true)
        return
      }

      const row = pumpP104Telemetry[idx]
      const updatedAt = new Date()

      setSensors((current) => {
        const updated = {}

        // Update live sensor cards from telemetry row
        for (const sensor of sensorDefinitions) {
          const telemetryKey = Object.keys(TELEMETRY_SENSOR_MAP).find(
            (key) => TELEMETRY_SENSOR_MAP[key] === sensor.id
          )
          const previous = current[sensor.id]

          if (telemetryKey && row[telemetryKey] !== undefined) {
            // Use telemetry value
            const value = row[telemetryKey]
            const history = [...previous.history, { timestamp: updatedAt, value }].slice(-60)
            updated[sensor.id] = buildSensor(sensor, value, history, updatedAt)
          } else {
            // Humidity: keep static initial value (not in dataset)
            const history = [...previous.history, { timestamp: updatedAt, value: previous.value }].slice(-60)
            updated[sensor.id] = buildSensor(sensor, previous.value, history, updatedAt)
          }
        }

        // Update vibration analysis features from telemetry row
        const vibAnalysis = {}
        for (const feature of vibrationAnalysisConfig.features) {
          const telemetryKey = Object.keys(TELEMETRY_VIB_MAP).find(
            (key) => TELEMETRY_VIB_MAP[key] === feature.id
          )
          const previous = current._vibrationAnalysis[feature.id]

          if (telemetryKey && row[telemetryKey] !== undefined) {
            const value = row[telemetryKey]
            const history = [...previous.history, { timestamp: updatedAt, value }].slice(-60)
            vibAnalysis[feature.id] = buildVibrationFeature(feature, value, history, updatedAt)
          } else {
            const history = [...previous.history, { timestamp: updatedAt, value: previous.value }].slice(-60)
            vibAnalysis[feature.id] = buildVibrationFeature(feature, previous.value, history, updatedAt)
          }
        }
        updated._vibrationAnalysis = vibAnalysis

        return updated
      })

      indexRef.current = idx + 1
      setCurrentIndex(idx + 1)
    }, 1000) // Exactly 1 second per row
  }, [totalRows])

  const restartMonitoring = useCallback(() => {
    // Stop existing timer
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Reset state
    indexRef.current = 0
    setCurrentIndex(0)
    setIsComplete(false)
    setIsMonitoring(false)
    setSensors(createInitialState())

    // Auto-start after reset
    // Use setTimeout to ensure state updates flush before starting
    window.setTimeout(() => {
      indexRef.current = 0
      setIsMonitoring(true)

      intervalRef.current = window.setInterval(() => {
        const idx = indexRef.current
        if (idx >= totalRows) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setIsMonitoring(false)
          setIsComplete(true)
          return
        }

        const row = pumpP104Telemetry[idx]
        const updatedAt = new Date()

        setSensors((current) => {
          const updated = {}

          for (const sensor of sensorDefinitions) {
            const telemetryKey = Object.keys(TELEMETRY_SENSOR_MAP).find(
              (key) => TELEMETRY_SENSOR_MAP[key] === sensor.id
            )
            const previous = current[sensor.id]

            if (telemetryKey && row[telemetryKey] !== undefined) {
              const value = row[telemetryKey]
              const history = [...previous.history, { timestamp: updatedAt, value }].slice(-60)
              updated[sensor.id] = buildSensor(sensor, value, history, updatedAt)
            } else {
              const history = [...previous.history, { timestamp: updatedAt, value: previous.value }].slice(-60)
              updated[sensor.id] = buildSensor(sensor, previous.value, history, updatedAt)
            }
          }

          const vibAnalysis = {}
          for (const feature of vibrationAnalysisConfig.features) {
            const telemetryKey = Object.keys(TELEMETRY_VIB_MAP).find(
              (key) => TELEMETRY_VIB_MAP[key] === feature.id
            )
            const previous = current._vibrationAnalysis[feature.id]

            if (telemetryKey && row[telemetryKey] !== undefined) {
              const value = row[telemetryKey]
              const history = [...previous.history, { timestamp: updatedAt, value }].slice(-60)
              vibAnalysis[feature.id] = buildVibrationFeature(feature, value, history, updatedAt)
            } else {
              const history = [...previous.history, { timestamp: updatedAt, value: previous.value }].slice(-60)
              vibAnalysis[feature.id] = buildVibrationFeature(feature, previous.value, history, updatedAt)
            }
          }
          updated._vibrationAnalysis = vibAnalysis

          return updated
        })

        indexRef.current = idx + 1
        setCurrentIndex(idx + 1)
      }, 1000)
    }, 0)
  }, [totalRows])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    sensors: sensorDefinitions.map((sensor) => sensors[sensor.id]),
    sensorMap: sensors,
    connectedCount: sensorDefinitions.length,
    vibrationAnalysis: sensors._vibrationAnalysis || {},
    isMonitoring,
    currentIndex,
    isComplete,
    totalRows,
    startMonitoring,
    stopMonitoring,
    restartMonitoring,
  }
}
