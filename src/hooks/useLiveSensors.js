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

export const MAINTENANCE_STATES = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  STOPPED_FOR_MAINTENANCE: 'STOPPED_FOR_MAINTENANCE',
  REPAIRING: 'REPAIRING',
  READY_TO_RESTART: 'READY_TO_RESTART',
  MONITORING: 'MONITORING',
}

const HEALTH_INDEX_THRESHOLDS = { warning: 0.35, critical: 0.70 }

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

function healthDeviation(sensor, value) {
  const distance = sensor.direction === 'high'
    ? value - sensor.baseline
    : sensor.baseline - value
  const criticalDistance = sensor.direction === 'high'
    ? sensor.criticalThreshold - sensor.baseline
    : sensor.baseline - sensor.criticalThreshold
  return clamp(distance / criticalDistance)
}

function calculateHealthIndex(sensorMap, vibrationAnalysis) {
  const weightedSignals = [
    ['vibration', vibrationAnalysis.vib_rms, 0.4],
    ['temperature', sensorMap.temperature, 0.15],
    ['pressure', sensorMap.pressure, 0.15],
    ['flow', sensorMap.flow, 0.15],
    ['current', sensorMap.current, 0.15],
  ]

  return weightedSignals.reduce((score, [, signal, weight]) => (
    score + (signal ? healthDeviation(signal, signal.value) : 0) * weight
  ), 0)
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
  const [maintenanceState, setMaintenanceState] = useState(MAINTENANCE_STATES.NORMAL)
  const [healthIndex, setHealthIndex] = useState(0)
  const [alarmHistory, setAlarmHistory] = useState([])
  const intervalRef = useRef(null)
  const indexRef = useRef(0)
  const previousHealthIndexRef = useRef(0)
  const warningAlarmedRef = useRef(false)
  const criticalAlarmedRef = useRef(false)

  const totalRows = pumpP104Telemetry.length

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsMonitoring(false)
    setMaintenanceState((current) => current === MAINTENANCE_STATES.CRITICAL
      ? MAINTENANCE_STATES.STOPPED_FOR_MAINTENANCE
      : current)
  }, [])

  const resetHealthState = useCallback(() => {
    previousHealthIndexRef.current = 0
    warningAlarmedRef.current = false
    criticalAlarmedRef.current = false
    setHealthIndex(0)
    setAlarmHistory([])
    setMaintenanceState(MAINTENANCE_STATES.NORMAL)
  }, [])

  const processRow = useCallback((row) => {
    const updatedAt = new Date()
    let nextHealthIndex = 0

    setSensors((current) => {
      const updated = {}

      for (const sensor of sensorDefinitions) {
        const telemetryKey = Object.keys(TELEMETRY_SENSOR_MAP).find(
          (key) => TELEMETRY_SENSOR_MAP[key] === sensor.id
        )
        const previous = current[sensor.id]
        const value = telemetryKey && row[telemetryKey] !== undefined
          ? row[telemetryKey]
          : previous.value
        const history = [...previous.history, { timestamp: updatedAt, value }].slice(-60)
        updated[sensor.id] = buildSensor(sensor, value, history, updatedAt)
      }

      const vibAnalysis = {}
      for (const feature of vibrationAnalysisConfig.features) {
        const telemetryKey = Object.keys(TELEMETRY_VIB_MAP).find(
          (key) => TELEMETRY_VIB_MAP[key] === feature.id
        )
        const previous = current._vibrationAnalysis[feature.id]
        const value = telemetryKey && row[telemetryKey] !== undefined
          ? row[telemetryKey]
          : previous.value
        const history = [...previous.history, { timestamp: updatedAt, value }].slice(-60)
        vibAnalysis[feature.id] = buildVibrationFeature(feature, value, history, updatedAt)
      }
      updated._vibrationAnalysis = vibAnalysis
      nextHealthIndex = calculateHealthIndex(updated, vibAnalysis)
      return updated
    })

    const previousHealthIndex = previousHealthIndexRef.current
    const warningCrossed = !warningAlarmedRef.current
      && previousHealthIndex < HEALTH_INDEX_THRESHOLDS.warning
      && nextHealthIndex >= HEALTH_INDEX_THRESHOLDS.warning
    const criticalCrossed = !criticalAlarmedRef.current
      && previousHealthIndex < HEALTH_INDEX_THRESHOLDS.critical
      && nextHealthIndex >= HEALTH_INDEX_THRESHOLDS.critical

    previousHealthIndexRef.current = nextHealthIndex
    setHealthIndex(nextHealthIndex)

    if (warningCrossed) {
      warningAlarmedRef.current = true
      setAlarmHistory((current) => [...current, { severity: 'WARNING', healthIndex: nextHealthIndex, detectedAt: updatedAt }])
      setMaintenanceState(MAINTENANCE_STATES.WARNING)
      window.dispatchEvent(new CustomEvent('pump-alarm', {
        detail: { severity: 'WARNING', healthIndex: nextHealthIndex, detectedAt: updatedAt },
      }))
    }

    if (criticalCrossed) {
      criticalAlarmedRef.current = true
      setAlarmHistory((current) => [...current, { severity: 'CRITICAL', healthIndex: nextHealthIndex, detectedAt: updatedAt }])
      setMaintenanceState(MAINTENANCE_STATES.CRITICAL)
      window.dispatchEvent(new CustomEvent('pump-alarm', {
        detail: { severity: 'CRITICAL', healthIndex: nextHealthIndex, detectedAt: updatedAt },
      }))
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsMonitoring(false)
      setMaintenanceState(MAINTENANCE_STATES.STOPPED_FOR_MAINTENANCE)
    } else if (!warningCrossed && nextHealthIndex < HEALTH_INDEX_THRESHOLDS.warning) {
      setMaintenanceState(MAINTENANCE_STATES.MONITORING)
    }
  }, [])

  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return // Prevent duplicate intervals
    if (indexRef.current >= totalRows) return // Already complete
    if ([MAINTENANCE_STATES.STOPPED_FOR_MAINTENANCE, MAINTENANCE_STATES.REPAIRING].includes(maintenanceState)) return

    setIsMonitoring(true)
    setIsComplete(false)
    setMaintenanceState(MAINTENANCE_STATES.MONITORING)

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

      processRow(pumpP104Telemetry[idx])

      indexRef.current = idx + 1
      setCurrentIndex(idx + 1)
    }, 1000) // Exactly 1 second per row
  }, [maintenanceState, processRow, totalRows])

  const startRepair = useCallback(() => {
    if (maintenanceState !== MAINTENANCE_STATES.STOPPED_FOR_MAINTENANCE) return
    setMaintenanceState(MAINTENANCE_STATES.REPAIRING)
  }, [maintenanceState])

  const completeRepair = useCallback(() => {
    if (maintenanceState !== MAINTENANCE_STATES.REPAIRING) return
    setMaintenanceState(MAINTENANCE_STATES.READY_TO_RESTART)
  }, [maintenanceState])

  const restartMonitoring = useCallback(() => {
    if (maintenanceState !== MAINTENANCE_STATES.READY_TO_RESTART) return
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
    resetHealthState()
    startMonitoring()
  }, [maintenanceState, resetHealthState, startMonitoring])

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
    healthIndex,
    maintenanceState,
    alarmHistory,
    isMonitoring,
    currentIndex,
    isComplete,
    totalRows,
    startMonitoring,
    stopMonitoring,
    restartMonitoring,
    startRepair,
    completeRepair,
  }
}
