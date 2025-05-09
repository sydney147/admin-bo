// src/components/TopProductsBarChart.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

function TopProductsBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="productName" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="predictedNextMonth" fill="#dd9d74" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default TopProductsBarChart;
