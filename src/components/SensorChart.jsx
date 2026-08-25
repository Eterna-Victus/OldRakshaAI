import { Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
}

function CustomTooltip({ active, payload, label, sensor }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><strong>{payload[0].value} {sensor.unit}</strong><span>{formatTime(label)} · {sensor.status}</span></div>
}

export default function SensorChart({ sensor, windowSize }) {
  const data = sensor.history.slice(-windowSize).map((point) => ({ ...point, label: point.timestamp.getTime() }))
  const values = data.map((point) => point.value)
  const padding = Math.max((Math.max(...values, sensor.criticalThreshold) - Math.min(...values, sensor.direction === 'low' ? sensor.criticalThreshold : sensor.normalMin)) * 0.18, sensor.precision === 2 ? 0.06 : 1)
  const min = Math.min(...values, sensor.direction === 'low' ? sensor.criticalThreshold : sensor.normalMin) - padding
  const max = Math.max(...values, sensor.direction === 'high' ? sensor.criticalThreshold : sensor.normalMax) + padding
  const anomalyAreas = data.filter((point) => sensor.status === 'Critical' || (sensor.direction === 'high' ? point.value >= sensor.warningThreshold : point.value <= sensor.warningThreshold))

  return <div className="sensor-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}><YAxis domain={[min, max]} hide /><XAxis dataKey="label" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatTime} axisLine={false} tickLine={false} tick={{ fill: '#8b98a9', fontSize: 10 }} minTickGap={32} /><ReferenceArea y1={sensor.normalMin} y2={sensor.normalMax} fill="#159a70" fillOpacity={0.06} ifOverflow="extendDomain" /><ReferenceLine y={sensor.baseline} stroke="#718096" strokeDasharray="4 4" label={{ value: 'Baseline', fill: '#718096', fontSize: 10, position: 'insideTopRight' }} /><ReferenceLine y={sensor.warningThreshold} stroke="#c88216" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#c88216', fontSize: 10, position: 'insideBottomRight' }} /><ReferenceLine y={sensor.criticalThreshold} stroke="#d34b53" strokeDasharray="3 3" label={{ value: 'Critical', fill: '#d34b53', fontSize: 10, position: 'insideTopRight' }} />{anomalyAreas.map((point) => <ReferenceArea key={point.label} x1={point.label - 750} x2={point.label + 750} fill="#d34b53" fillOpacity={0.07} />)}<Tooltip content={<CustomTooltip sensor={sensor} />} /><Line type="monotone" dataKey="value" stroke={sensor.status === 'Critical' ? '#d34b53' : sensor.status === 'Warning' ? '#c88216' : '#2b8def'} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
}
