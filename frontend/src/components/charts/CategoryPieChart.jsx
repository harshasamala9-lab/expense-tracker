import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getCategoryMeta } from '../../constants/categories.js';
import {
  formatCurrency,
  percentage,
} from '../../utils/format.js';
import ChartTooltip from './ChartTooltip.jsx';

export default function CategoryPieChart({ breakdown }) {
  const data = breakdown.filter((item) => item.total > 0);
  const total = data.reduce((sum, item) => sum + item.total, 0);

  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No category spending yet.</p>
      </div>
    );
  }

  return (
    <div className="pie-layout">
      <div
        className="pie-wrap"
        role="img"
        aria-label={`Donut chart showing the share of spending for ${data.length} categories.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item) => (
                <Cell
                  key={item.category}
                  fill={getCategoryMeta(item.category).color}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-center" aria-hidden="true">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>

      <ul className="pie-legend">
        {data.map((item) => (
          <li key={item.category}>
            <span
              className="category-dot"
              style={{
                backgroundColor: getCategoryMeta(item.category).color,
              }}
              aria-hidden="true"
            />
            <span>{item.category}</span>
            <strong>{percentage(item.total, total)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
