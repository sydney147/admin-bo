import { useEffect, useState } from 'react';
import { ref, child, get, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../firebase';
import './Settings.css';

export default function Settings() {
  const userId = localStorage.getItem('userId');
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    profilePicUrl: ''
  });
  const [newProfilePic, setNewProfilePic] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchUserDetails = async () => {
      try {
        const snap = await get(child(ref(database), `users/${userId}`));
        if (snap.exists()) {
          const data = snap.val();
          setUserInfo(data);
          setEditForm({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            address: data.address || '',
            profilePicUrl: data.profilePicUrl || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfilePic(e.target.files[0]);
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    let updatedData = { ...editForm };

    try {
      if (newProfilePic) {
        const imageRef = storageRef(storage, `profile_pics/${userId}_${Date.now()}`);
        await uploadBytes(imageRef, newProfilePic);
        const downloadUrl = await getDownloadURL(imageRef);
        updatedData.profilePicUrl = downloadUrl;
      }

      await update(ref(database, `users/${userId}`), updatedData);
      setUserInfo((prev) => ({ ...prev, ...updatedData }));
      setEditForm(updatedData);
      setNewProfilePic(null);
      setEditMode(false);
    } catch (err) {
      console.error('Failed to save changes:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-page"><p>Loading settings...</p></div>;
  if (!userInfo) return <div className="settings-page"><p>User info not found.</p></div>;

  const {
    email,
    subscriptionStatus,
    subscriptionStartDate,
    subscriptionEndDate
  } = userInfo;

  return (
    <div className="settings-page">
      <h1>Account Settings</h1>

      <div className="settings-card">
        <div className="profile-pic-wrapper">
          <img
            src={
              newProfilePic
                ? URL.createObjectURL(newProfilePic)
                : editForm.profilePicUrl || '/default-profile.png'
            }
            alt="Profile"
            className="settings-profile-pic"
          />
          {editMode && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="upload-input"
            />
          )}
        </div>

        <div className="settings-details">
          {editMode ? (
            <>
              <label>First Name</label>
              <input name="firstName" value={editForm.firstName} onChange={handleChange} />

              <label>Last Name</label>
              <input name="lastName" value={editForm.lastName} onChange={handleChange} />

              <label>Phone</label>
              <input name="phone" value={editForm.phone} onChange={handleChange} />

              <label>Address</label>
              <input name="address" value={editForm.address} onChange={handleChange} />

              <button className="save-btn" onClick={saveChanges} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="cancel-btn" onClick={() => setEditMode(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <p><strong>Full Name:</strong> {editForm.firstName} {editForm.lastName}</p>
              <p><strong>Phone:</strong> {editForm.phone}</p>
              <p><strong>Address:</strong> {editForm.address}</p>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>Membership:</strong> {subscriptionStatus}</p>
              <p><strong>Start Date:</strong> {subscriptionStartDate?.split('T')[0]}</p>
              <p><strong>End Date:</strong> {subscriptionEndDate?.split('T')[0]}</p>

              <button className="edit-btn" onClick={() => setEditMode(true)}>
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}