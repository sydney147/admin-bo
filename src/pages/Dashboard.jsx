import './Dashboard.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, child, onValue } from 'firebase/database';
import { database } from '../firebase';
import axios from 'axios';
import MonthlySalesChart from '../components/MonthlySalesChart';
import ProjectedTopProductsChart from '../components/TopProductsBarChart';
import TopSellingProductsChart from '../components/TopSellingProductsChart';
import MonthYearPicker from '../components/MonthYearPicker';

const BASE_API = 'https://fastapi-service-830671346894.asia-southeast1.run.app';

export default function Dashboard() {
  const navigate = useNavigate();
  const shopId = localStorage.getItem("shopId");

  const [mth, setMth] = useState(new Date().getMonth() + 1);
  const [yr, setYr] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const [shopInfo, setShopInfo] = useState({
    storeName: '', storePhotoUrl: null, storeBackgroundUrl: null
  });
  const [stats, setStats] = useState({
    totalOrders: 0,
    itemsSold: 0,
    totalRevenue: 0,
    monthlySalesTrend: {},
    topForecasts: [],
    activeProducts: 0,
    averageRating: 0,
    productTypes: {},
    recentFeedback: [],
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

    return () => unsubscribe(); // Cleanup on unmount
  }, [shopId]);

  useEffect(() => {
  if (!shopId) return;

  const cacheKey = `dashboard_cache_${shopId}_${mth}_${yr}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    const parsed = JSON.parse(cached);
    setShopInfo(parsed.shopInfo);
    setStats(prev => ({
      ...parsed.stats,
      forecastSummary: parsed.stats.forecastSummary ?? {
        totalPredictedUnits: 0,
        totalEstimatedWorkers: 0,
        totalEstimatedRattanMeters: 0,
        totalProjectedRevenue: 0,
        explanation: "No forecast available."
      },
      activeProducts: prev.activeProducts
    }));
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

      const productsSnap = await get(ref(database, `shops/${shopId}/products`));
      const products = productsSnap.exists() ? Object.values(productsSnap.val()) : [];

      const ratings = [];
      const types = {};
      products.forEach(p => {
        Object.values(p.ratings || {}).forEach(r => {
          ratings.push({ ...r, productName: p.productName });
        });
        if (!types[p.productType]) types[p.productType] = [];
        types[p.productType].push(p);
      });
      const allStars = ratings.map(r => r.stars);

      const shopsList = Array.isArray(shopsRes.data) ? shopsRes.data : [];
      const me = shopsList.find(s => s.shopId === shopId) || {};

      const updatedShopInfo = {
        storeName: me.storeName || 'Your Shop',
        storePhotoUrl: me.storePhotoUrl || null,
        storeBackgroundUrl: me.storeBackgroundUrl || null
      };

      const forecastData = fcRes.data || {};
      const topForecasts = (forecastData.productForecasts || [])
        .sort((a, b) => b.predictedNextMonth - a.predictedNextMonth)
        .slice(0, 5);

      const updatedStats = {
        totalOrders: perfRes.data.totalOrders || 0,
        itemsSold: perfRes.data.itemsSold || 0,
        totalRevenue: perfRes.data.totalRevenue || 0,
        monthlySalesTrend: perfRes.data.monthlySalesTrend || {},
        topForecasts: topForecasts,
        forecastSummary: {
          totalPredictedUnits: forecastData.totalPredictedUnits || 0,
          totalEstimatedWorkers: forecastData.totalEstimatedWorkers || 0,
          totalEstimatedRattanMeters: forecastData.totalEstimatedRattanMeters || 0,
          totalProjectedRevenue: forecastData.totalProjectedRevenue || 0,
          explanation: forecastData.explanation || "No explanation available."
        },
        averageRating: allStars.length
          ? allStars.reduce((a, b) => a + b, 0) / allStars.length
          : 0,
        productTypes: types,
        recentFeedback: ratings.slice(0, 5)
      };

      setShopInfo(updatedShopInfo);
      setStats(prev => ({
        ...updatedStats,
        activeProducts: prev.activeProducts
      }));

      sessionStorage.setItem(cacheKey, JSON.stringify({
        shopInfo: updatedShopInfo,
        stats: updatedStats
      }));
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
    } finally {
      setLoading(false);
    }
  })();
}, [shopId, mth, yr]);


  const formatMonthYear = () =>
    new Date(yr, mth - 1)
      .toLocaleString('default', { month: 'long', year: 'numeric' });

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
          <h2>Overview</h2>
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
          <div className="card">📊 <strong>Products</strong><br />{stats.activeProducts}</div>
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

      {/* Sales Forecast Summary */}
      <div className="column">
        <div className="column-header"><h2>Next Month Forecast</h2></div>
        {loading ? (
          <div>Loading forecast...</div>
        ) : (
          <div className="forecast-summary">
            <div className="forecast-card">
              <h3>Projected Sales</h3>
              <p>{stats.forecastSummary?.totalPredictedUnits ?? 0} units</p>
            </div>
            <div className="forecast-card">
              <h3>Projected Revenue</h3>
              <p>₱{(stats.forecastSummary?.totalProjectedRevenue ?? 0).toLocaleString()}</p>
            </div>
            <div className="forecast-card">
              <h3>Materials Needed</h3>
              <p>{stats.forecastSummary?.totalEstimatedRattanMeters ?? 0}m rattan</p>
            </div>
            <div className="forecast-card">
              <h3>Workers Needed</h3>
              <p>{stats.forecastSummary?.totalEstimatedWorkers ?? 0}</p>
            </div>
            <div className="forecast-explanation">
              <p>{stats.forecastSummary?.explanation ?? "No explanation available."}</p>
            </div>
          </div>

        )}
      </div>

      {/* Top Forecasted Products */}
      <div className="column">
        <div className="column-header"><h2>Top Forecasted Products</h2></div>
        {loading
          ? <div>Loading forecasts…</div>
          : stats.topForecasts.length === 0
            ? <div>No forecast data</div>
            : <ProjectedTopProductsChart data={stats.topForecasts} />
        }
      </div>

      {/* Product Overview */}
      <div className="column">
        <div className="column-header">
          <h2>Product Overview</h2>
          <button className="btn-outline" onClick={() => navigate('/home/products')}>
            See more
          </button>
        </div>

        {Object.entries(stats.productTypes).map(([type, list]) => (
          <div key={type} className="category-section">
            <div className="category-header">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div className="category-products">
              {list.map(p => (
                <div key={p.productId} className="product-card">
                  <img
                    src={p.imageUrl}
                    alt={p.productName}
                  />
                  <div className="product-name">{p.productName}</div>
                  <div className="product-stock">Stock: {p.stock}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Feedback */}
      <div className="column">
        <div className="column-header">
          <h2>Recent Feedback</h2>
          <button className="btn-outline" onClick={() => navigate('/products')}>
            See more
          </button>
        </div>
        <ul>
          {stats.recentFeedback.map((f, i) => (
            <li key={i}>
              {"⭐".repeat(f.stars)} — {f.stars} stars<br />
              <em>by {f.userFullName}</em> on <strong>{f.productName}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}