import './Dashboard.css';
import '../pages/Sales.css';;
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, child, onValue } from 'firebase/database';
import { database } from '../firebase';
import axios from 'axios';
import MonthYearPicker from '../components/MonthYearPicker';
import MonthlySalesChart from '../components/MonthlySalesChart';
import TopSellingProductsChart from '../components/TopSellingProductsChart';
import TopProductsBarChart from '../components/TopProductsBarChart';

const BASE_API = 'https://fastapi-service-830671346894.asia-southeast1.run.app';

export default function Sales() {
  const navigate = useNavigate();
  const shopId = localStorage.getItem('shopId');

  const [mth, setMth] = useState(new Date().getMonth() + 1);
  const [yr, setYr] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const [shopInfo, setShopInfo] = useState({
    storeName: '',
    storePhotoUrl: null,
    storeBackgroundUrl: null
  });

  const [stats, setStats] = useState({
    totalOrders: 0,
    itemsSold: 0,
    totalRevenue: 0,
    monthlySalesTrend: {},
    topSelling: [],
    forecastProducts: [],
    forecastSummary: {
      totalPredictedUnits: 0,
      totalEstimatedWorkers: 0,
      totalEstimatedRattanMeters: 0,
      totalProjectedRevenue: 0,
      explanation: ""
    }
  });

  // Real-time product count listener
  useEffect(() => {
    if (!shopId) return;

    const productsRef = ref(database, `shops/${shopId}/products`);
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      setStats(prev => ({
        ...prev,
        activeProducts: count
      }));
    });

    return () => unsubscribe();
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;

    const cacheKey = `sales_cache_${shopId}_${mth}_${yr}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      setShopInfo(parsed.shopInfo);
      setStats(parsed.stats);
      return;
    }

    setLoading(true);

    (async () => {
      try {
        const [perfRes, shopsRes, fcRes] = await Promise.all([
          axios.get(`${BASE_API}/shop-performance/${shopId}?month=${mth}&year=${yr}`),
          axios.get(`${BASE_API}/shops`),
          axios.get(`${BASE_API}/forecast/shop/${shopId}?month=${mth}&year=${yr}`)
        ]);

        const shopsList = Array.isArray(shopsRes.data) ? shopsRes.data : [];
        const shopData = shopsList.find(s => s.shopId === shopId) || {};

        const updatedShopInfo = {
          storeName: shopData.storeName || 'Your Shop',
          storePhotoUrl: shopData.storePhotoUrl || null,
          storeBackgroundUrl: shopData.storeBackgroundUrl || null
        };

        const forecastData = fcRes.data || {};
        let forecastProducts = (forecastData.productForecasts || [])
          .sort((a, b) => b.predictedNextMonth - a.predictedNextMonth)
          .slice(0, 5);

        // Get product details for forecast products
        const productsSnap = await get(ref(database, `shops/${shopId}/products`));
        if (productsSnap.exists()) {
          const products = productsSnap.val();
          forecastProducts = forecastProducts.map(item => {
            const product = products[item.productId] || {};
            return {
              ...item,
              productName: product.productName || 'Unknown Product',
              imageUrl: product.imageUrl || '/placeholder-product.png'
            };
          });
        }

        // Get top selling products
        const salesSnap = await get(child(ref(database), 'sales'));
        const allSales = salesSnap.exists() ? salesSnap.val() : {};
        const topMap = {};

        Object.values(allSales).forEach(prodSales => {
          Object.values(prodSales).forEach(sale => {
            if (sale.shopId !== shopId) return;
            const ts = sale.timestamp > 1e12 ? sale.timestamp / 1000 : sale.timestamp;
            const d = new Date(ts * 1000);
            
            if (d.getFullYear() === yr && (d.getMonth() + 1) === mth) {
              const pid = sale.productId;
              const qty = sale.quantity || 0;

              if (!topMap[pid]) {
                topMap[pid] = {
                  productId: pid,
                  quantitySold: 0,
                  productName: 'Unknown'
                };
              }
              topMap[pid].quantitySold += qty;
            }
          });
        });

        const topSelling = Object.values(topMap)
          .sort((a, b) => b.quantitySold - a.quantitySold)
          .slice(0, 5);

        // Get product names for top selling
        if (productsSnap.exists()) {
          const products = productsSnap.val();
          topSelling.forEach(item => {
            if (products[item.productId]) {
              item.productName = products[item.productId].productName;
              item.imageUrl = products[item.productId].imageUrl;
            }
          });
        }

        const updatedStats = {
          totalOrders: perfRes.data.totalOrders || 0,
          itemsSold: perfRes.data.itemsSold || 0,
          totalRevenue: perfRes.data.totalRevenue || 0,
          monthlySalesTrend: perfRes.data.monthlySalesTrend || {},
          topSelling,
          forecastProducts,
          forecastSummary: {
            totalPredictedUnits: forecastData.totalPredictedUnits || 0,
            totalEstimatedWorkers: forecastData.totalEstimatedWorkers || 0,
            totalEstimatedRattanMeters: forecastData.totalEstimatedRattanMeters || 0,
            totalProjectedRevenue: forecastData.totalProjectedRevenue || 0,
            explanation: forecastData.explanation || "No explanation available."
          }
        };

        setShopInfo(updatedShopInfo);
        setStats(updatedStats);
        sessionStorage.setItem(cacheKey, JSON.stringify({
          shopInfo: updatedShopInfo,
          stats: updatedStats
        }));
      } catch (err) {
        console.error("Sales data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId, mth, yr]);

  const formatMonthYear = () =>
    new Date(yr, mth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="dashboard">
      {/* Header */}
      <div
        className="shop-header-banner"
        style={{
          backgroundImage: `url(${shopInfo.storeBackgroundUrl || '/default-banner.jpg'})`
        }}
      >
        <div className="shop-info">
          {shopInfo.storePhotoUrl && (
            <img
              src={shopInfo.storePhotoUrl}
              alt="Shop Logo"
              className="shop-profile-photo"
            />
          )}
          <h1 className="shop-name">{shopInfo.storeName}</h1>
        </div>
      </div>

      {/* Overview */}
      <div className="column">
        <div className="column-header">
          <h2>Sales Overview</h2>
          <MonthYearPicker
            month={mth}
            year={yr}
            onChange={(mm, yy) => { setMth(mm); setYr(yy); }}
          />
        </div>
        <div className="stats-cards">
          <div className="card">🛒 <strong>Orders</strong><br />{stats.totalOrders}</div>
          <div className="card">📦 <strong>Items Sold</strong><br />{stats.itemsSold}</div>
          <div className="card">
            💰 <strong>Revenue</strong><br />
            ₱{(stats.totalRevenue || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Monthly Sales Trend */}
      <div className="column">
        <div className="column-header"><h2>Monthly Sales Trend</h2></div>
        {loading
          ? <div>Loading sales trend…</div>
          : <MonthlySalesChart data={stats.monthlySalesTrend} />
        }
      </div>

      {/* Top Selling Products */}
      <div className="column">
        <div className="column-header">
          <h2>Top Selling – {formatMonthYear()}</h2>
        </div>
        {loading
          ? <div>Loading top sales…</div>
          : stats.topSelling.length === 0
            ? <div>No sales data</div>
            : <TopSellingProductsChart data={stats.topSelling} />
        }
      </div>

      {/* Forecast Summary */}
      <div className="column">
        <div className="column-header"><h2>Next Month Forecast</h2></div>
        <div className="forecast-summary">
          <div className="forecast-card">
            <h3>Projected Sales</h3>
            <p>{stats.forecastSummary.totalPredictedUnits} units</p>
          </div>
          <div className="forecast-card">
            <h3>Projected Revenue</h3>
            <p>₱{(stats.forecastSummary.totalProjectedRevenue || 0).toLocaleString()}</p>
          </div>
          <div className="forecast-card">
            <h3>Materials Needed</h3>
            <p>{stats.forecastSummary.totalEstimatedRattanMeters}m rattan</p>
          </div>
          <div className="forecast-card">
            <h3>Workers Needed</h3>
            <p>{stats.forecastSummary.totalEstimatedWorkers}</p>
          </div>
          {stats.forecastSummary.explanation && (
            <div className="forecast-explanation">
              <p>{stats.forecastSummary.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Forecasted Products */}
      <div className="column">
        <div className="column-header"><h2>Top Forecasted Products</h2></div>
        {loading
          ? <div>Loading forecasts…</div>
          : stats.forecastProducts.length === 0
            ? <div>No forecast data</div>
            : <TopProductsBarChart data={stats.forecastProducts} />
        }
      </div>

      {/* Forecast Product List */}
      <div className="column">
        <div className="column-header">
          <h2>📊 Forecast Product List</h2>
        </div>
        <div className="forecast-list-scroll">
          {stats.forecastProducts.map((f, idx) => (
            <div key={idx} className="forecast-product-card">
              <div className="forecast-product-image-container">
                <img
                  src={f.imageUrl || '/placeholder-product.png'}
                  alt={f.productName}
                  className="forecast-product-image"
                  onError={(e) => {
                    e.target.src = '/placeholder-product.png';
                  }}
                />
              </div>
              <div className="forecast-product-details">
                <h4>{f.productName}</h4>
                <p className="forecast-units">🔮 {f.predictedNextMonth} units</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}