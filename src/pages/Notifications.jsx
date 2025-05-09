import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, get, child, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import defaultProfile from '../assets/default-profile.png';
import './Notifications.css';

const Notifications = () => {
  const auth = getAuth();
  const db = getDatabase();
  const userId = auth.currentUser?.uid;

  const [mergedNotifications, setMergedNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const notifRef = ref(db, `notifications/${userId}`);
    const logRef = ref(db, `userActivityLogs`);

    const fetchAllNotifications = async () => {
      const notifArray = [];
      const logArray = [];
      const fetchTasks = [];

      // 🔔 1. Fetch standard notifications
      const notifSnap = await get(notifRef);
      notifSnap.forEach((childSnap) => {
        const notif = { id: childSnap.key, type: 'notif', ...childSnap.val() };
        if (notif.fromUserId) {
          const task = get(child(ref(db), `users/${notif.fromUserId}`)).then((userSnap) => {
            notif.senderName = `${userSnap.val()?.firstName || ''} ${userSnap.val()?.lastName || ''}`.trim() || 'Unknown';
            notif.senderProfileUrl = userSnap.val()?.profilePicUrl || null;
          });
          fetchTasks.push(task);
        }
        notifArray.push(notif);
      });

      // 🔘 Mark unread as read
      const updates = {};
      notifArray.forEach(n => {
        if (!n.isRead) {
          updates[`notifications/${userId}/${n.id}/isRead`] = true;
        }
      });
      if (Object.keys(updates).length > 0) await update(ref(db), updates);

      // 🧾 2. Fetch buyer activity logs
      const logSnap = await get(logRef);
      logSnap.forEach((userSnap) => {
        const uid = userSnap.key;
        userSnap.forEach((logChild) => {
          const log = { id: logChild.key, type: 'log', userId: uid, ...logChild.val() };
          if (log.action === 'purchased' || log.action === 'received') {
            const task = get(child(ref(db), `users/${uid}`)).then((userInfoSnap) => {
              log.senderName = `${userInfoSnap.val()?.firstName || ''} ${userInfoSnap.val()?.lastName || ''}`.trim();
              log.senderProfileUrl = userInfoSnap.val()?.profilePicUrl || null;
            });
            fetchTasks.push(task);
            logArray.push(log);
          }
        });
      });

      await Promise.all(fetchTasks);

      const merged = [...notifArray, ...logArray];
      merged.sort((a, b) => b.timestamp - a.timestamp);

      setMergedNotifications(merged);
      setLoading(false);
    };

    fetchAllNotifications();
  }, [userId]);

  if (loading) return <div className="notifications-page">Loading notifications...</div>;

  return (
    <div className="notifications-page">
      <h1 className="notif-title">Notifications</h1>

      <ul className="notifications-list">
        {mergedNotifications.map((entry) => (
          <li
            key={entry.id}
            className={`notification-card ${entry.type === 'notif' && !entry.isRead ? 'unread' : ''}`}
          >
            <img
              src={entry.senderProfileUrl || defaultProfile}
              alt="Sender"
              className="notification-avatar"
            />
            <div className="notification-body">
              <p className="notification-message">
                {entry.type === 'notif'
                  ? entry.message
                  : `${entry.senderName} ${entry.action === 'purchased' ? 'placed an order' : 'received a product'}`}
              </p>
              <p className="notification-meta">
                {entry.senderName} &middot; {new Date(entry.timestamp).toLocaleString()}
              </p>
            </div>
            {entry.type === 'notif' && !entry.isRead && <span className="red-dot" />}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;
