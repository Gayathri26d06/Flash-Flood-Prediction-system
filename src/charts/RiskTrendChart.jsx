import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea } from 'recharts'
import ChartTooltip from './ChartTooltip'

/** data: [{ time: '10:00', risk_score: 34 }, ...] */
export default function RiskTrendChart({ data = [], height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#232A35" strokeDasharray="3 5" vertical={false} />
        <ReferenceArea y1={80} y2={100} fill="#F0473F" fillOpacity={0.06} />
        <ReferenceArea y1={55} y2={80} fill="#FB923C" fillOpacity={0.06} />
        <ReferenceArea y1={30} y2={55} fill="#FBBF24" fillOpacity={0.05} />
        <ReferenceArea y1={0} y2={30} fill="#34D399" fillOpacity={0.05} />
        <XAxis dataKey="time" tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: '#232A35' }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="risk_score"
          name="Risk Score"
          stroke="#2DD4E8"
          strokeWidth={2.5}
          dot={{ r: 2.5, fill: '#2DD4E8', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
