import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CATEGORIES, getCategoryMeta } from '../../constants/categories.js';
import {
  formatCompactCurrency,
  formatCurrency,
} from '../../utils/format.js';
import ChartTooltip from './ChartTooltip.jsx';

export default function SpendingBarChart({ breakdown }) {
  const byCategory = new Map(
    breakdown.map((item) => [item.category, item]),
  );

  const data = CATEGORIES.map((category) => ({
    category,
    total: byCategory.get(category)?.total ?? 0,
  }));

  return (
    <div
      className="chart-body"
      role="img"
      aria-label={`Bar chart of spending by category. Total: ${formatCurrency(
        data.reduce((sum, item) => sum + item.total, 0),
      )}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#eaecf0"
          />
          <XAxis
            dataKey="category"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#667085', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatCompactCurrency}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#98a2b3', fontSize: 11 }}
            width={64}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(16, 24, 40, 0.04)' }}
          />
          <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={54}>
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={getCategoryMeta(entry.category).color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
