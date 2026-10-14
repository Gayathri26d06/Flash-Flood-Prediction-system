import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import ChartTooltip from './ChartTooltip'

/**
 * data: [{ time: '10:00', rainfall: 42 }, ...]
 */
export default function RainfallChart({ data = [], height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="rainfallFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2DD4E8" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2DD4E8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#232A35" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: '#232A35' }} tickLine={false} />
        <YAxis tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={34} />
        <Tooltip content={<ChartTooltip unit="mm" />} />
        <Area type="monotone" dataKey="rainfall" stroke="#2DD4E8" strokeWidth={2} fill="url(#rainfallFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
