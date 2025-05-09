// src/pages/ShopProfile.jsx
import { useEffect, useState } from "react";
import { ref, get, update } from "firebase/database";
import { database } from "../firebase";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import "./ShopProfile.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function ShopProfile() {
  const shopId = localStorage.getItem("shopId");
  const storage = getStorage();

  const [shop, setShop] = useState({
    storeName: "",
    shopAddress: "",
    storeDescription: "",
    storePhotoUrl: "",
    storeBackgroundUrl: "",
  });

  const [productCount, setProductCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ ...shop });
  const [storePhotoFile, setStorePhotoFile] = useState(null);
  const [storeBackgroundFile, setStoreBackgroundFile] = useState(null);

  useEffect(() => {
    if (!shopId) return;

    const fetchShopDetails = async () => {
      const shopRef = ref(database, `shops/${shopId}`);
      const snapshot = await get(shopRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const shopData = {
          storeName: data.storeName || "My Shop",
          shopAddress: data.shopAddress || "Not set",
          storeDescription: data.storeDescription || "No description available.",
          storePhotoUrl: data.storePhotoUrl || null,
          storeBackgroundUrl: data.storeBackgroundUrl || null,
        };

        setShop(shopData);
        setForm(shopData);
        const products = data.products || {};
        setProductCount(Object.keys(products).length);
      }
    };

    fetchShopDetails();
  }, [shopId]);

  useEffect(() => {
    const listener = (e) => {
      if (e.data.address) {
        setForm((prev) => ({ ...prev, shopAddress: e.data.address }));
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === "storePhoto") {
        setStorePhotoFile(file);
        setForm((prev) => ({ ...prev, storePhotoUrl: URL.createObjectURL(file) }));
      } else if (type === "storeBackground") {
        setStoreBackgroundFile(file);
        setForm((prev) => ({ ...prev, storeBackgroundUrl: URL.createObjectURL(file) }));
      }
    }
  };

  const handleSave = async () => {
    if (!shopId) return;

    const updates = {
      storeName: form.storeName,
      shopAddress: form.shopAddress,
      storeDescription: form.storeDescription,
    };

    try {
      if (storePhotoFile) {
        const photoRef = storageRef(storage, `shopImages/${shopId}/storePhoto.jpg`);
        await uploadBytes(photoRef, storePhotoFile);
        updates.storePhotoUrl = await getDownloadURL(photoRef);
      } else {
        updates.storePhotoUrl = form.storePhotoUrl;
      }

      if (storeBackgroundFile) {
        const backgroundRef = storageRef(storage, `shopImages/${shopId}/background.jpg`);
        await uploadBytes(backgroundRef, storeBackgroundFile);
        updates.storeBackgroundUrl = await getDownloadURL(backgroundRef);
      } else {
        updates.storeBackgroundUrl = form.storeBackgroundUrl;
      }

      await update(ref(database, `shops/${shopId}`), updates);
      setShop({ ...form, ...updates });
      setIsEditing(false);
      toast.success("Shop info updated successfully!");
    } catch (error) {
      toast.error("Failed to update shop info.");
    }
  };

  const openLocateWindow = () => {
    window.open("/locateaddress", "_blank", "width=800,height=600");
  };

  const cancelEdit = () => {
    setForm(shop);
    setStorePhotoFile(null);
    setStoreBackgroundFile(null);
    setIsEditing(false);
  };

  return (
    <div className="shop-profile">
      <div
        className="shop-header-banner"
        style={{ backgroundImage: `url(${shop.storeBackgroundUrl || "/default-banner.jpg"})` }}
      >
        <div className="shop-info">
          {shop.storePhotoUrl && (
            <img src={shop.storePhotoUrl} alt="Shop Logo" className="shop-profile-photo" />
          )}
          <h1 className="shop-name">{shop.storeName}</h1>
        </div>
      </div>

      <div className="shop-details-card">
        <h2>Shop Information</h2>
        {isEditing ? (
          <div className="shop-edit-form">
            <label>Store Name:<input name="storeName" value={form.storeName} onChange={handleChange} /></label>
            <label>Address:
              <div className="address-row">
                <input name="shopAddress" value={form.shopAddress} onChange={handleChange} />
                <button type="button" onClick={openLocateWindow}>📍</button>
              </div>
            </label>
            <label>Description:<textarea name="storeDescription" value={form.storeDescription} onChange={handleChange} /></label>
            <label>
              Store Photo:
              {form.storePhotoUrl && <img src={form.storePhotoUrl} alt="Preview" className="preview-image" />}
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "storePhoto")} />
            </label>
            <label>
              Background Image:
              {form.storeBackgroundUrl && <img src={form.storeBackgroundUrl} alt="Preview" className="preview-image" />}
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "storeBackground")} />
            </label>
            <div className="edit-buttons">
              <button className="save-button" onClick={handleSave}>Save</button>
              <button className="cancel-button" onClick={cancelEdit}>Cancel</button>
            </div>
          </div>
        ) : (
          <ul className="shop-info-list">
            <li><strong>Store Name:</strong> {shop.storeName}</li>
            <li><strong>Address:</strong> {shop.shopAddress}</li>
            <li><strong>Description:</strong> {shop.storeDescription}</li>
            <li><strong>Number of Products:</strong> {productCount}</li>
          </ul>
        )}
        {!isEditing && <button className="edit-button" onClick={() => setIsEditing(true)}>Edit Shop Info</button>}
      </div>
    </div>
  );
}

export default ShopProfile;
