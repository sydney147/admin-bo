import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function MonthlySalesChart({ data }) {
  const now = new Date();
  const start = new Date(2024, 10); // November 2024
  const months = [];

  while (start <= now) {
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      month: key,
      sales: data[key] || 0
    });
    start.setMonth(start.getMonth() + 1);
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">📈 Monthly Sales Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={months} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="sales" stroke="#dd9d74" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlySalesChart;
