import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Gauge, Thermometer, Waves, Zap } from 'lucide-react'

const metricConfig = [
  { id: 'health', label: 'Asset health', color: '#3dd6b0', icon: Gauge },
  { id: 'risk', label: 'Failure risk', color: '#ff6874', icon: Activity },
  { id: 'temperature', label: 'Temperature', color: '#ff9a68', icon: Thermometer },
  { id: 'vibration', label: 'Vibration', color: '#b58cff', icon: Waves },
  { id: 'energy', label: 'Energy load', color: '#66b5ff', icon: Zap },
]

function normalizeSensor(sensor, value) {
  const direction = sensor.direction === 'high' ? 1 : -1
  return Math.max(0, Math.min(100, 50 + ((value - sensor.baseline) / sensor.baseline) * 100 * direction))
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="analytics-tooltip"><strong>{new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>{payload.map((item) => <span key={item.dataKey}><i style={{ background: item.color }} />{item.name}: {Number(item.value).toFixed(1)}%</span>)}</div>
}

export default function UnifiedAnalyticsChart({ sensors }) {
  const [activeMetrics, setActiveMetrics] = useState(['health', 'risk', 'vibration'])
  const [range, setRange] = useState('24H')
  const toggleMetric = (metric) => setActiveMetrics((current) => current.includes(metric) ? current.filter((item) => item !== metric) : [...current, metric])
  const primarySensor = sensors[0]
  const data = primarySensor.history.map((point, index) => {
    const vibration = sensors.find((sensor) => sensor.id === 'vibration')
    const risk = vibration ? normalizeSensor(vibration, vibration.history[index]?.value ?? vibration.value) : 50
    const result = { label: point.timestamp.getTime(), health: 100 - risk * .72, risk }
    sensors.forEach((sensor) => { result[sensor.id] = normalizeSensor(sensor, sensor.history[index]?.value ?? sensor.value) })
    result.energy = Math.min(100, result.temperature * .42 + result.vibration * .58)
    return result
  }).slice(range === '24H' ? -48 : range === '7D' ? -60 : -60)

  return <section className="panel unified-analytics"><div className="unified-heading"><div><p className="eyebrow"><span className="live-pulse" /> Live intelligence layer</p><h2>Unified equipment telemetry</h2><p>One operating picture for health, risk, and leading failure signals.</p></div><div className="range-switcher">{['24H', '7D', '30D', '90D'].map((item) => <button type="button" key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}</button>)}</div></div><div className="metric-switcher">{metricConfig.map(({ id, label, color, icon: Icon }) => <button type="button" key={id} className={activeMetrics.includes(id) ? 'active' : ''} onClick={() => toggleMetric(id)} style={{ '--metric-color': color }}><Icon size={14} /><span>{label}</span></button>)}</div><div className="unified-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}><CartesianGrid stroke="#263c57" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="label" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} axisLine={false} tickLine={false} tick={{ fill: '#71839b', fontSize: 10 }} minTickGap={44} /><YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: '#71839b', fontSize: 10 }} width={38} /><ReferenceLine y={50} stroke="#52657d" strokeDasharray="4 4" /><Tooltip content={<ChartTooltip />} />{metricConfig.filter(({ id }) => activeMetrics.includes(id)).map(({ id, label, color }) => <Line key={id} type="monotone" dataKey={id} name={label} stroke={color} strokeWidth={id === 'risk' ? 2.8 : 2} dot={false} isAnimationActive />)}</LineChart></ResponsiveContainer></div><div className="chart-footnote"><span><i className="signal-marker" /> 50% = healthy baseline</span><span>{activeMetrics.length} signals active · {primarySensor.history.length} data points</span></div></section>
}
