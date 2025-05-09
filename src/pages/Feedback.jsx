import { useEffect, useState } from 'react';
import { ref, get, child } from 'firebase/database';
import { database } from '../firebase';
import './Feedback.css';

export default function Feedback() {
  const shopId = localStorage.getItem('shopId');
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;

    const cacheKey = `feedback_cache_${shopId}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      setFeedbackList(JSON.parse(cached));
      setLoading(false);
      return;
    }

    const fetchFeedbacks = async () => {
      setLoading(true);
      const feedback = [];

      try {
        const productsSnap = await get(child(ref(database), `shops/${shopId}/products`));
        if (productsSnap.exists()) {
          const products = productsSnap.val();

          for (const [productId, product] of Object.entries(products)) {
            const productImage = product.imageUrl?.trim() || null;
            const ratings = product.ratings || {};

            for (const rating of Object.values(ratings)) {
              feedback.push({
                productId,
                productName: product.productName || 'Unnamed Product',
                productImage,
                userFullName: rating.userFullName || 'Anonymous',
                stars: rating.stars || 0,
                comment: rating.comment || '',
                ratingImage: rating.imageUrl?.trim() || null,
                timestamp: rating.timestamp || 0
              });
            }
          }

          feedback.sort((a, b) => b.timestamp - a.timestamp);
        }

        setFeedbackList(feedback);
        sessionStorage.setItem(cacheKey, JSON.stringify(feedback));
      } catch (err) {
        console.error("Failed to load feedback:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [shopId]);

  return (
    <div className="feedback-page">
      <h1>Product Feedback</h1>

      {loading ? (
        <p>Loading feedback...</p>
      ) : feedbackList.length === 0 ? (
        <p>No feedback available.</p>
      ) : (
        <div className="feedback-list">
          {feedbackList.map((fb, idx) => (
            <div key={idx} className="feedback-card">
              {fb.productImage ? (
                <img src={fb.productImage} alt={fb.productName} className="product-img" />
              ) : (
                <div className="img-placeholder">No Product Image</div>
              )}

              <div className="feedback-info">
                <h3>{fb.productName}</h3>
                <p><strong>User:</strong> {fb.userFullName}</p>
                <p><strong>Rating:</strong> {'⭐'.repeat(fb.stars)} ({fb.stars} stars)</p>
                <p><strong>Comment:</strong> {fb.comment || 'No comment'}</p>

                {fb.ratingImage && (
                  <img src={fb.ratingImage} alt="User Feedback" className="feedback-img" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
