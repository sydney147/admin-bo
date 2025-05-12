// DeliveryEstimateDialog.js
import { useState } from "react";
import { ref, update } from "firebase/database";
import { database } from "../firebase";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const BASE_API = "https://fastapi-service-830671346894.asia-southeast1.run.app";

export default function DeliveryEstimateDialog({ order, shopId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000)); // +1 day
  const [time, setTime] = useState("12:00");

  const handleSubmit = async () => {
    if (!startDate || !endDate || !time) {
      alert("Please select all date and time fields");
      return;
    }

    setLoading(true);

    try {
      // Parse the time
      const [hours, minutes] = time.split(":").map(Number);
      
      // Set time for both dates
      const fromDate = new Date(startDate);
      fromDate.setHours(hours, minutes);
      
      const toDate = new Date(endDate);
      toDate.setHours(hours, minutes);

      // Format dates as strings
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

      const deliveryMap = {
        from: fromStr,
        to: toStr,
      };

      const updates = {
        [`/shopOrders/${shopId}/${order.orderId}/deliveryEstimate`]: deliveryMap,
        [`/shopOrders/${shopId}/${order.orderId}/status`]: "To Deliver",
        [`/userOrders/${order.buyerId}/${order.orderId}/deliveryEstimate`]: deliveryMap,
        [`/userOrders/${order.buyerId}/${order.orderId}/status`]: "To Deliver",
      };

      await update(ref(database), updates);

      // Send notification
      const shopNameResponse = await axios.get(`${BASE_API}/shops/${shopId}`);
      const shopName = shopNameResponse.data?.storeName || "Crafter's Paradise";
      
      const payload = {
        buyer_id: order.buyerId,
        order_id: order.orderId,
        shop_name: shopName,
      };

      await axios.post(`${BASE_API}/notifyDeliveryStarted`, payload);

      onSuccess(`Estimated delivery set: ${fromStr} – ${toStr}`);
      onClose();
    } catch (error) {
      console.error("Error setting delivery estimate:", error);
      alert(`Update failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delivery-dialog">
      <h3>Set Delivery Estimate</h3>
      
      <div className="form-group">
        <label>Start Date:</label>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          minDate={new Date()}
          maxDate={new Date(Date.now() + 12096e5)} // 14 days
        />
      </div>

      <div className="form-group">
        <label>End Date:</label>
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          minDate={startDate}
          maxDate={new Date(Date.now() + 12096e5)} // 14 days
        />
      </div>

      <div className="form-group">
        <label>Time:</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div className="dialog-actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}