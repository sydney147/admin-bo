import './Dashboard.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, child } from 'firebase/database';
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
    totalRevenue: 0,
    monthlySalesTrend: {},
    topThisMonth: [],
    topForecasts: [],
    activeProducts: 0,
    averageRating: 0,
    productTypes: {},
    recentFeedback: []
  });

  useEffect(() => {
    if (!shopId) return;

    const cacheKey = `dashboard_cache_${shopId}_${mth}_${yr}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      setShopInfo(parsed.shopInfo);
      setStats(parsed.stats);
      return; // ✅ Use cached data and skip fetch
    }

    setLoading(true);

    (async () => {
      try {
        const [perfRes, prodRes, shopsRes, fcRes] = await Promise.all([
          axios.get(`${BASE_API}/shop-performance/${shopId}?month=${mth}&year=${yr}`),
          axios.get(`${BASE_API}/products/shop/${shopId}`),
          axios.get(`${BASE_API}/shops`),
          axios.get(`${BASE_API}/forecast/shop/${shopId}?month=${mth}&year=${yr}`)
        ]);

        const products = Array.isArray(prodRes.data) ? prodRes.data : [];
        const productMap = Object.fromEntries(products.map(p => [p.productId, p.productName]));

        const salesSnap = await get(child(ref(database), 'sales'));
        const allSales = salesSnap.exists() ? salesSnap.val() : {};

        const topRaw = {};
        Object.values(allSales).forEach(prodSales => {
          Object.values(prodSales).forEach(sale => {
            if (sale.shopId !== shopId) return;
            const ts = sale.timestamp > 1e12 ? sale.timestamp : sale.timestamp * 1000;
            const d = new Date(ts);
            if (d.getFullYear() === yr && (d.getMonth() + 1) === mth) {
              const pid = sale.productId;
              if (!topRaw[pid]) topRaw[pid] = {
                productId: pid,
                productName: productMap[pid] || 'Unknown',
                quantitySold: 0
              };
              topRaw[pid].quantitySold += sale.quantity || 0;
            }
          });
        });
        const topThisMonth = Object.values(topRaw).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);

        const trendRaw = {};
        Object.values(allSales).forEach(prodSales => {
          Object.values(prodSales).forEach(sale => {
            if (sale.shopId !== shopId) return;
            const ts = sale.timestamp > 1e12 ? sale.timestamp : sale.timestamp * 1000;
            const d = new Date(ts);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            trendRaw[key] = (trendRaw[key] || 0) + (sale.quantity || 0);
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
        const updatedStats = {
          totalOrders: perfRes.data.totalOrders,
          totalRevenue: perfRes.data.totalRevenue,
          monthlySalesTrend,
          topThisMonth,
          topForecasts: fcRes.data.productForecasts?.slice(0, 5) || [],
          activeProducts: products.length,
          averageRating: allStars.length
            ? allStars.reduce((a, b) => a + b, 0) / allStars.length
            : 0,
          productTypes: types,
          recentFeedback: ratings.slice(0, 5)
        };

        setShopInfo(updatedShopInfo);
        setStats(updatedStats);

        // ✅ Cache it
        sessionStorage.setItem(cacheKey, JSON.stringify({
          shopInfo: updatedShopInfo,
          stats: updatedStats
        }));
      }
      catch (err) {
        console.error("Dashboard fetch failed:", err);
      }
      finally {
        setLoading(false);
      }
    })();
  }, [shopId, mth, yr]);

  const formatMonthYear = () =>
    new Date(yr, mth - 1)
      .toLocaleString('default', { month: 'long', year: 'numeric' })

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
          <div className="card">
            💰 <strong>Revenue</strong><br />
            ₱{(stats.totalRevenue || 0).toLocaleString()}
          </div>
          <div className="card">📦 <strong>Products</strong><br />{stats.activeProducts}</div>
          <div className="card">⭐ <strong>Avg. Rating</strong><br />{stats.averageRating.toFixed(1)}</div>
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

      {/* Top Selling */}
      <div className="column">
        <div className="column-header">
          <h2>Top Selling Products – {formatMonthYear()}</h2>
        </div>
        {loading
          ? <div>Loading top products…</div>
          : stats.topThisMonth.length === 0
            ? <div>No sales data for {formatMonthYear()}</div>
            : <TopSellingProductsChart data={stats.topThisMonth} />
        }
      </div>

      {/* Forecast */}
      <div className="column">
        <div className="column-header"><h2>Top Forecasted Products Next Month</h2></div>
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
