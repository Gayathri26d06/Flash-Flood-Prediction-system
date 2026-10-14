import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import ChartTooltip from './ChartTooltip'

/** data: [{ time: '10:00', river_level: 55 }, ...] */
export default function RiverLevelChart({ data = [], height = 220, dangerThreshold = 80 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="riverFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FB923C" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#FB923C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#232A35" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: '#232A35' }} tickLine={false} />
        <YAxis tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={34} />
        <Tooltip content={<ChartTooltip unit="%" />} />
        <ReferenceLine y={dangerThreshold} stroke="#F0473F" strokeDasharray="4 4" strokeOpacity={0.6} />
        <Area type="monotone" dataKey="river_level" name="River Level" stroke="#FB923C" strokeWidth={2} fill="url(#riverFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
