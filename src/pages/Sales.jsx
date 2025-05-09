import './Dashboard.css';
import './sales.css';
import { useEffect, useState } from 'react';
import { ref, get, child } from 'firebase/database';
import { database } from '../firebase';
import axios from 'axios';
import MonthYearPicker from '../components/MonthYearPicker';
import MonthlySalesChart from '../components/MonthlySalesChart';
import TopSellingProductsChart from '../components/TopSellingProductsChart';
import TopProductsBarChart from '../components/TopProductsBarChart';

const BASE_API = 'https://fastapi-service-830671346894.asia-southeast1.run.app';

export default function Sales() {
  const shopId = localStorage.getItem('shopId');

  const [mth, setMth] = useState(new Date().getMonth() + 1);
  const [yr, setYr] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalItemsSold: 0,
    monthlySalesTrend: {},
    topSelling: [],
    forecastSummary: {},
    forecastProducts: [],
    forecastExplanation: ''
  });

  useEffect(() => {
    if (!shopId) return;

    const cacheKey = `sales-data-${shopId}-${mth}-${yr}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      // Use cached data if available
      setMetrics(JSON.parse(cachedData));
      setLoading(false);
    } else {
      // Fetch data if not cached
      setLoading(true);

      (async () => {
        try {
          const [perfRes, forecastRes, productsRes] = await Promise.all([
            axios.get(`${BASE_API}/shop-performance/${shopId}?month=${mth}&year=${yr}`),
            axios.get(`${BASE_API}/forecast/shop/${shopId}?month=${mth}&year=${yr}`),
            axios.get(`${BASE_API}/products/shop/${shopId}`)
          ]);

          const productMap = {};
          (productsRes.data || []).forEach(p => {
            productMap[p.productId] = { name: p.productName, imageUrl: p.imageUrl };
          });

          const salesSnap = await get(child(ref(database), 'sales'));
          const allSales = salesSnap.exists() ? salesSnap.val() : {};

          let totalItemsSold = 0;
          const topMap = {};
          const trendRaw = {};

          Object.values(allSales).forEach(prodSales => {
            Object.values(prodSales).forEach(sale => {
              if (sale.shopId !== shopId) return;
              const ts = sale.timestamp > 1e12 ? sale.timestamp : sale.timestamp * 1000;
              const d = new Date(ts);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              const pid = sale.productId;
              const qty = sale.quantity || 0;

              // Accumulate total items sold for this month
              if (d.getFullYear() === yr && (d.getMonth() + 1) === mth) {
                totalItemsSold += qty;

                if (!topMap[pid]) {
                  topMap[pid] = {
                    productId: pid,
                    quantitySold: 0,
                    productName: productMap[pid]?.name || 'Unknown'
                  };
                }
                topMap[pid].quantitySold += qty;
              }

              trendRaw[key] = (trendRaw[key] || 0) + qty;
            });
          });

          const soldMonths = Object.keys(trendRaw).sort();
          const monthlySalesTrend = {};
          if (soldMonths.length) {
            let [fy, fm] = soldMonths[0].split('-').map(Number);
            const now = new Date();
            const ey = now.getFullYear();
            let em = now.getMonth() + 1;
            while (fy < ey || (fy === ey && fm <= em)) {
              const key = `${fy}-${String(fm).padStart(2, '0')}`;
              monthlySalesTrend[key] = trendRaw[key] || 0;
              fm++;
              if (fm > 12) { fm = 1; fy++; }
            }
          }

          const topSelling = Object.values(topMap)
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 5);

          const forecast = forecastRes.data;
          const forecastWithImages = (forecast.productForecasts || []).slice(0, 5).map(f => ({
            ...f,
            imageUrl: productMap[f.productId]?.imageUrl || null
          }));

          const newMetrics = {
            totalOrders: perfRes.data.totalOrders,
            totalRevenue: perfRes.data.totalRevenue,
            totalItemsSold,
            monthlySalesTrend,
            topSelling,
            forecastProducts: forecastWithImages,
            forecastExplanation: forecast.explanation || '',
            forecastSummary: {
              predictedUnits: forecast.totalPredictedUnits || 0,
              estimatedRattan: forecast.totalEstimatedRattanMeters || 0,
              estimatedWorkers: forecast.totalEstimatedWorkers || 0,
              estimatedRevenue: forecast.totalProjectedRevenue || 0
            }
          };

          // Save to cache
          localStorage.setItem(cacheKey, JSON.stringify(newMetrics));
          setMetrics(newMetrics);
        } catch (e) {
          console.error('Failed to load sales data', e);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [shopId, mth, yr]);

  const formatMonthYear = () =>
    new Date(yr, mth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="dashboard">
      <div className="column">
        <div className="column-header">
          <h2>Sales Overview</h2>
          <MonthYearPicker
            month={mth}
            year={yr}
            onChange={(mm, yy) => {
              setMth(mm);
              setYr(yy);
            }}
          />
        </div>

        <div className="stats-cards">
          <div className="card">🛒 <strong>Orders</strong><br />{metrics.totalOrders}</div>
          <div className="card">💰 <strong>Revenue</strong><br />₱{(metrics.totalRevenue || 0).toLocaleString()}</div>
          <div className="card">📦 <strong>Items Sold</strong><br />{metrics.totalItemsSold}</div>
        </div>
      </div>

      <div className="column">
        <div className="column-header"><h2>Monthly Sales Trend</h2></div>
        {loading ? <div>Loading trend…</div> : <MonthlySalesChart data={metrics.monthlySalesTrend} />}
      </div>

      <div className="column">
        <div className="column-header"><h2>Top Selling – {formatMonthYear()}</h2></div>
        {loading
          ? <div>Loading top sales…</div>
          : metrics.topSelling.length === 0
            ? <div>No sales data</div>
            : <TopSellingProductsChart data={metrics.topSelling} />}
      </div>

      <div className="column">
        <div className="column-header"><h2>Forecast: Next Month</h2></div>

        <div className="forecast-summary">
          <div>📦 Predicted Units: <strong>{metrics.forecastSummary.predictedUnits}</strong></div>
          <div>🧵 Estimated Rattan: <strong>{metrics.forecastSummary.estimatedRattan} m</strong></div>
          <div>👷 Workers: <strong>{metrics.forecastSummary.estimatedWorkers}</strong></div>
          <div>💵 Revenue: <strong>₱{(metrics.forecastSummary.estimatedRevenue || 0).toLocaleString()}</strong></div>
        </div>

        {metrics.forecastExplanation && (
          <div className="forecast-explanation">
            <em>{metrics.forecastExplanation}</em>
          </div>
        )}

        {loading
          ? <div>Loading forecasts…</div>
          : metrics.forecastProducts.length === 0
            ? <div>No forecast data</div>
            : <TopProductsBarChart data={metrics.forecastProducts} />}
      </div>

      <div className="column">
        <h3>📊 Forecast Product List</h3>
        <div className="forecast-list-scroll">
          {metrics.forecastProducts.map((f, idx) => (
            <div key={idx} className="forecast-card">
              <img
                src={f.imageUrl || '/placeholder.png'}
                alt={f.productName}
                className="forecast-image"
              />
              <div style={{ marginTop: '0.5rem' }}>
                <strong>{f.productName}</strong><br />
                🔮 {f.predictedNextMonth} units
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}