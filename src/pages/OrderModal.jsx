import { useEffect, useState } from 'react';
import { ref, get, child } from 'firebase/database';
import { database } from '../firebase';
import './Modal.css';

// 🔁 In-memory product cache (shared across modal uses)
const productCache = {};

export default function OrderModal({ order, onClose }) {
  const [productDetails, setProductDetails] = useState({});

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!order?.items?.length || !order.shopId) return;

      const details = {};

      for (const item of order.items) {
        const productId = item.productId;

        // ✅ Use cache if available
        if (productCache[productId]) {
          details[productId] = productCache[productId];
        } else {
          try {
            const productRef = child(ref(database), `shops/${order.shopId}/products/${productId}`);
            const snap = await get(productRef);
            if (snap.exists()) {
              const productData = snap.val();
              productCache[productId] = productData; // cache it
              details[productId] = productData;
            }
          } catch (err) {
            console.error(`Failed to fetch product ${productId}`, err);
          }
        }
      }

      setProductDetails(details);
    };

    fetchProductDetails();
  }, [order]);

  if (!order) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Order Details</h2>
        <p><strong>Order ID:</strong> {order.orderId}</p>
        <p><strong>Buyer:</strong> {order.buyerFullName}</p>
        <p><strong>Address:</strong> {order.address}</p>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Delivery Method:</strong> {order.deliveryMethod}</p>
        <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
        <p><strong>Total Price:</strong> ₱{(order.grandTotal || 0).toLocaleString()}</p>

        {order.status === "To Deliver" && order.deliveryEstimate ? (
          <>
            <p><strong>Delivery From:</strong> {order.deliveryEstimate.from}</p>
            <p><strong>Delivery To:</strong> {order.deliveryEstimate.to}</p>
          </>
        ) : order.status === "Approved" ? (
          <p><em>Waiting for delivery date to be set...</em></p>
        ) : order.status === "Pending" ? (
          <p><em>Order is still pending approval.</em></p>
        ) : null}

        {order.status === "Completed" && order.receivedTimestamp && (
          <p><strong>Received:</strong> {new Date(order.receivedTimestamp).toLocaleString()}</p>
        )}

        <h3>Items</h3>
        <div className="modal-items-list">
          {(order.items || []).map((item, idx) => {
            const product = productDetails[item.productId];
            return (
              <div key={idx} className="modal-item-card">
                {product?.imageUrl ? (
                  <img src={product.imageUrl} alt={product.productName || 'Product'} />
                ) : (
                  <div className="img-placeholder">No Image</div>
                )}
                <div>
                  <p><strong>{product?.productName || 'Unnamed Product'}</strong></p>
                  <p>Qty: {item.quantity}</p>
                  <p>₱{product?.price?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} className="close-btn">Close</button>
      </div>
    </div>
  );
}
