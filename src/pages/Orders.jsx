import { useEffect, useState } from 'react';
import { ref, get, child, update } from 'firebase/database';
import { database } from '../firebase';
import OrderModal from './OrderModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './Orders.css';

export default function ShopOrders() {
  const shopId = localStorage.getItem('shopId');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryDates, setDeliveryDates] = useState({
    start: new Date(),
    end: new Date(Date.now() + 86400000), // +1 day
    time: '12:00'
  });

  const [orders, setOrders] = useState({
    pending: [],
    approved: [],
    toDeliver: [],
    completed: []
  });

  const fetchOrders = async () => {
    if (!shopId) return;
    setLoading(true);

    try {
      const ordersSnap = await get(child(ref(database), `shopOrders/${shopId}`));
      const shopOrders = ordersSnap.exists() ? ordersSnap.val() : {};

      const categorizedOrders = {
        pending: [],
        approved: [],
        toDeliver: [],
        completed: []
      };

      Object.entries(shopOrders).forEach(([orderId, order]) => {
        const fullOrder = { ...order, orderId, shopId };
        switch (order.status) {
          case 'Pending': categorizedOrders.pending.push(fullOrder); break;
          case 'Approved': categorizedOrders.approved.push(fullOrder); break;
          case 'To Deliver': categorizedOrders.toDeliver.push(fullOrder); break;
          case 'Completed': categorizedOrders.completed.push(fullOrder); break;
        }
      });

      setOrders(categorizedOrders);
    } catch (err) {
      console.error('Failed to fetch shop orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [shopId]);

  const handleApprove = async (orderId) => {
    await update(ref(database, `shopOrders/${shopId}/${orderId}`), {
      status: 'Approved'
    });
    fetchOrders();
  };

  const handleSetDelivery = async (order) => {
    setSelectedOrder(order);
    setShowDeliveryDialog(true);
  };

  const confirmDeliveryDates = async () => {
    if (!selectedOrder) return;
    
    try {
      // Parse the time
      const [hours, minutes] = deliveryDates.time.split(':').map(Number);
      
      // Set time for both dates
      const fromDate = new Date(deliveryDates.start);
      fromDate.setHours(hours, minutes);
      
      const toDate = new Date(deliveryDates.end);
      toDate.setHours(hours, minutes);

      // Format dates as strings (matching Android format)
      const dateFmt = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      const timeFmt = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const fromStr = `${dateFmt.format(fromDate)} ${timeFmt.format(fromDate)}`;
      const toStr = `${dateFmt.format(toDate)} ${timeFmt.format(toDate)}`;

      // Update both shopOrders and userOrders
      const updates = {
        [`/shopOrders/${shopId}/${selectedOrder.orderId}/status`]: 'To Deliver',
        [`/shopOrders/${shopId}/${selectedOrder.orderId}/deliveryEstimate`]: {
          from: fromStr,
          to: toStr
        },
        [`/userOrders/${selectedOrder.buyerId}/${selectedOrder.orderId}/status`]: 'To Deliver',
        [`/userOrders/${selectedOrder.buyerId}/${selectedOrder.orderId}/deliveryEstimate`]: {
          from: fromStr,
          to: toStr
        }
      };

      await update(ref(database), updates);
      fetchOrders();
      setShowDeliveryDialog(false);
      alert(`Delivery estimate set: ${fromStr} – ${toStr}`);
    } catch (error) {
      console.error('Error setting delivery dates:', error);
      alert('Failed to set delivery dates. Please try again.');
    }
  };

  return (
    <div className="dashboard">
      <h1>Shop Orders</h1>
      {loading ? (
        <div>Loading orders...</div>
      ) : (
        <>
          <OrderCategory 
            title="Pending Orders" 
            orders={orders.pending} 
            onApprove={handleApprove} 
            onCardClick={setSelectedOrder} 
          />
          <OrderCategory 
            title="Approved Orders" 
            orders={orders.approved} 
            onSetDelivery={handleSetDelivery} 
            onCardClick={setSelectedOrder} 
          />
          <OrderCategory 
            title="To Deliver Orders" 
            orders={orders.toDeliver} 
            onCardClick={setSelectedOrder} 
          />
          <OrderCategory 
            title="Completed Orders" 
            orders={orders.completed} 
            onCardClick={setSelectedOrder} 
          />
        </>
      )}
      
      {selectedOrder && (
        <OrderModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}

      {showDeliveryDialog && (
        <div className="modal-backdrop">
          <div className="delivery-dialog">
            <h3>Set Delivery Estimate</h3>
            <div className="form-group">
              <label>Start Date:</label>
              <DatePicker
                selected={deliveryDates.start}
                onChange={(date) => setDeliveryDates(prev => ({ ...prev, start: date }))}
                minDate={new Date()}
                maxDate={new Date(Date.now() + 12096e5)} // 14 days
                dateFormat="MMMM d, yyyy"
              />
            </div>
            <div className="form-group">
              <label>End Date:</label>
              <DatePicker
                selected={deliveryDates.end}
                onChange={(date) => setDeliveryDates(prev => ({ ...prev, end: date }))}
                minDate={deliveryDates.start}
                maxDate={new Date(Date.now() + 12096e5)} // 14 days
                dateFormat="MMMM d, yyyy"
              />
            </div>
            <div className="form-group">
              <label>Time:</label>
              <input
                type="time"
                value={deliveryDates.time}
                onChange={(e) => setDeliveryDates(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <div className="dialog-actions">
              <button onClick={() => setShowDeliveryDialog(false)}>Cancel</button>
              <button 
                onClick={confirmDeliveryDates}
                disabled={!deliveryDates.start || !deliveryDates.end || !deliveryDates.time}
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCategory({ title, orders, onApprove, onSetDelivery, onCardClick }) {
  return (
    <div className="column">
      <h2>{title}</h2>
      {orders.length === 0 ? (
        <div>No orders in this category.</div>
      ) : (
        <div className="product-order-grid">
          {orders.map((order, orderIdx) =>
            (order.items || []).map((item, itemIdx) => (
              <div
                key={`${orderIdx}-${itemIdx}`}
                className="product-order-card"
                onClick={() => onCardClick(order)}
              >
                <img src={item.imageUrl} alt={item.productName} />
                <div className="product-order-info">
                  <strong>{item.productName}</strong>
                  <p><small>Order ID:</small> <code>{order.orderId}</code></p>
                  <p><small>Buyer:</small> {order.buyerFullName}</p>
                  <p><small>Status:</small> {order.status}</p>
                  <p><small>Total:</small> ₱{(order.grandTotal || 0).toLocaleString()}</p>

                  {order.status === 'Pending' && onApprove && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onApprove(order.orderId); 
                      }} 
                      className="btn-approve"
                    >
                      Approve
                    </button>
                  )}

                  {order.status === 'Approved' && onSetDelivery && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDelivery(order);
                      }}
                      className="btn-deliver"
                    >
                      Set Delivery
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}