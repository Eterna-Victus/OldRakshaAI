import LiveSensorPanel from './LiveSensorPanel'
import PredictiMaintOverview from './PredictiMaintOverview'

export default function DashboardWithSensorWall() {
  return <div className="dashboard-sensor-wall"><PredictiMaintOverview /><LiveSensorPanel /></div>
}
