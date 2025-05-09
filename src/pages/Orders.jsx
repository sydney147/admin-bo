import { useEffect, useState } from 'react';
import { ref, get, child, update } from 'firebase/database';
import { database } from '../firebase';
import OrderModal from './OrderModal';
import './Orders.css';

export default function ShopOrders() {
  const shopId = localStorage.getItem('shopId');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

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

  const handleSetDelivery = async (orderId, from, to) => {
    await update(ref(database, `shopOrders/${shopId}/${orderId}`), {
      status: 'To Deliver',
      deliveryEstimate: { from, to }
    });
    fetchOrders();
  };

  return (
    <div className="dashboard">
      <h1>Shop Orders</h1>
      {loading ? (
        <div>Loading orders...</div>
      ) : (
        <>
          <OrderCategory title="Pending Orders" orders={orders.pending} onApprove={handleApprove} onCardClick={setSelectedOrder} />
          <OrderCategory title="Approved Orders" orders={orders.approved} onSetDelivery={handleSetDelivery} onCardClick={setSelectedOrder} />
          <OrderCategory title="To Deliver Orders" orders={orders.toDeliver} onCardClick={setSelectedOrder} />
          <OrderCategory title="Completed Orders" orders={orders.completed} onCardClick={setSelectedOrder} />
        </>
      )}
      {selectedOrder && <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}

function OrderCategory({ title, orders, onApprove, onSetDelivery, onCardClick }) {
  const [inputs, setInputs] = useState({});

  const handleInputChange = (orderId, field, value) => {
    setInputs(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }));
  };

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
                    <button onClick={(e) => { e.stopPropagation(); onApprove(order.orderId); }} className="btn-approve">Approve</button>
                  )}

                  {order.status === 'Approved' && onSetDelivery && (
                    <div className="delivery-form" onClick={(e) => e.stopPropagation()}>
                      <label>From:</label>
                      <input
                        type="datetime-local"
                        onChange={(e) => handleInputChange(order.orderId, 'from', e.target.value)}
                      />
                      <label>To:</label>
                      <input
                        type="datetime-local"
                        onChange={(e) => handleInputChange(order.orderId, 'to', e.target.value)}
                      />
                      <button
                        className="btn-deliver"
                        onClick={() =>
                          onSetDelivery(
                            order.orderId,
                            inputs[order.orderId]?.from,
                            inputs[order.orderId]?.to
                          )
                        }
                        disabled={!inputs[order.orderId]?.from || !inputs[order.orderId]?.to}
                      >
                        Set Delivery Date
                      </button>
                    </div>
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
