import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLiveSensors } from '../hooks/useLiveSensors'
import UnifiedAnalyticsChart from './UnifiedAnalyticsChart'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
}

const signalColors = { temperature: '#ff8b5c', pressure: '#66b5ff', vibration: '#ff5f6d', humidity: '#b58cff', flow: '#3dd6b0' }

function CustomTooltip({ active, payload, label, sensor }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><strong>{payload[0].value} {sensor.unit}</strong><span>{formatTime(label)} · {sensor.status}</span></div>
}

function FleetTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip fleet-tooltip"><strong>{formatTime(label)}</strong>{payload.map((item) => <span key={item.dataKey}><i style={{ background: item.color }} />{item.name}: {Number(item.value).toFixed(0)}% baseline deviation</span>)}</div>
}

function FleetTelemetryChart({ sensors }) {
  const data = sensors[0].history.map((point, index) => {
    const result = { label: point.timestamp.getTime() }
    sensors.forEach((sensor) => {
      const reading = sensor.history[index]?.value ?? sensor.value
      const direction = sensor.direction === 'high' ? 1 : -1
      result[sensor.id] = Math.max(-100, Math.min(100, ((reading - sensor.baseline) / sensor.baseline) * 100 * direction))
    })
    return result
  })

  return <div className="fleet-telemetry"><div className="fleet-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}><CartesianGrid stroke="#26364b" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="label" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} axisLine={false} tickLine={false} tick={{ fill: '#71839b', fontSize: 10 }} minTickGap={42} /><YAxis domain={[-100, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: '#71839b', fontSize: 10 }} width={40} /><ReferenceLine y={0} stroke="#52657d" /><Tooltip content={<FleetTooltip />} />{sensors.map((sensor) => <Line key={sensor.id} type="monotone" dataKey={sensor.id} name={sensor.type} stroke={signalColors[sensor.id]} strokeWidth={2.2} dot={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div><div className="fleet-legend">{sensors.map((sensor) => <span key={sensor.id}><i style={{ background: signalColors[sensor.id] }} />{sensor.type}<b>{sensor.formattedValue} {sensor.unit}</b></span>)}</div></div>
}

export default function SensorChart({ sensor, windowSize, highlightTimestamp }) {
  const { sensors } = useLiveSensors()
  const data = sensor.history.slice(-windowSize).map((point) => ({ ...point, label: point.timestamp.getTime() }))
  const values = data.map((point) => point.value)
  const padding = Math.max((Math.max(...values, sensor.criticalThreshold) - Math.min(...values, sensor.direction === 'low' ? sensor.criticalThreshold : sensor.normalMin)) * 0.18, sensor.precision === 2 ? 0.06 : 1)
  const min = Math.min(...values, sensor.direction === 'low' ? sensor.criticalThreshold : sensor.normalMin) - padding
  const max = Math.max(...values, sensor.direction === 'high' ? sensor.criticalThreshold : sensor.normalMax) + padding
  const anomalyAreas = data.filter((point) => sensor.status === 'Critical' || (sensor.direction === 'high' ? point.value >= sensor.warningThreshold : point.value <= sensor.warningThreshold))

  const highlight = highlightTimestamp ? new Date(highlightTimestamp).getTime() : null
  return <><UnifiedAnalyticsChart sensors={sensors} /><div className="fleet-heading"><div><p className="eyebrow">Live fleet signal map</p><h2>All telemetry in one view</h2><p>Normalized against each sensor baseline for instant comparison.</p></div><span><i className="live-pulse" /> UPDATING EVERY 1.5S</span></div><FleetTelemetryChart sensors={sensors} /><div className="sensor-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}><YAxis domain={[min, max]} hide /><XAxis dataKey="label" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} axisLine={false} tickLine={false} tick={{ fill: '#8b98a9', fontSize: 10 }} minTickGap={32} /><ReferenceArea y1={sensor.normalMin} y2={sensor.normalMax} fill="#159a70" fillOpacity={0.06} ifOverflow="extendDomain" />{highlight && <ReferenceArea x1={highlight - 1100} x2={highlight + 1100} fill="#d34b53" fillOpacity={0.11} />}<ReferenceLine y={sensor.baseline} stroke="#718096" strokeDasharray="4 4" label={{ value: 'Baseline', fill: '#718096', fontSize: 10, position: 'insideTopRight' }} /><ReferenceLine y={sensor.warningThreshold} stroke="#c88216" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#c88216', fontSize: 10, position: 'insideBottomRight' }} /><ReferenceLine y={sensor.criticalThreshold} stroke="#d34b53" strokeDasharray="3 3" label={{ value: 'Critical', fill: '#d34b53', fontSize: 10, position: 'insideTopRight' }} />{anomalyAreas.map((point) => <ReferenceArea key={point.label} x1={point.label - 750} x2={point.label + 750} fill="#d34b53" fillOpacity={0.07} />)}<Tooltip content={<CustomTooltip sensor={sensor} />} /><Line type="monotone" dataKey="value" stroke={sensor.status === 'Critical' ? '#d34b53' : sensor.status === 'Warning' ? '#c88216' : '#2b8def'} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></>
}
