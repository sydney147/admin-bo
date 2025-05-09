import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import LocateAddress from "./components/LocateAddress";
import ShopProfile from './pages/ShopProfile';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Orders from './pages/Orders';  
// Import other pages...
import ProtectedRoute from './components/ProtectedRoute';
import Feedback from './pages/Feedback';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="shopprofile" element={<ShopProfile />} />   {/* ✅ Relative path */}
          <Route path="products" element={<Products />} />    
          <Route path="sales" element={<Sales />} />     
          <Route path="orders" element={<Orders />} />     
          <Route path="feedback" element={<Feedback />} />  
          <Route path="settings" element={<Settings />} />  
          <Route path="notifications" element={<Notifications />} />        {/* ✅ Relative path */}
        </Route>

        {/* This one must stay OUTSIDE /home */}
        <Route path="/locateaddress" element={<LocateAddress />} /> {/* ✅ Correct */}
      </Routes>
    </BrowserRouter>

  );
}

export default App;
