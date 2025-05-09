import { useEffect, useState } from "react";
import { ref, get, remove, update, push } from "firebase/database";
import { database } from "../firebase";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import "./Products.css";

const storage = getStorage();

const rattanTypes = [
  "Natural Rattan",
  "Wicker Rattan",
  "Reed Rattan",
  "Synthetic Rattan",
];

const productTypes = ["Chair", "Sofa", "Baskets", "Table Deco", "Others"];

function Products() {
  const shopId = localStorage.getItem("shopId");
  const [productsByType, setProductsByType] = useState({});
  const [cache, setCache] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newImage, setNewImage] = useState(null);
  const [newGallery, setNewGallery] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shopId || cache) return;

    const fetchProducts = async () => {
      const productsRef = ref(database, `shops/${shopId}/products`);
      const snapshot = await get(productsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const grouped = {};

        for (const id in data) {
          const product = data[id];
          const type = product.productType || "Others";
          if (!grouped[type]) grouped[type] = [];
          grouped[type].push({ ...product, id });
        }

        setProductsByType(grouped);
        setCache(grouped);
      }
    };

    fetchProducts();
  }, [shopId, cache]);

  const handleDelete = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      await remove(ref(database, `shops/${shopId}/products/${productId}`));
      window.location.reload();
    }
  };

  const handleEditStart = () => {
    setIsEditing(true);
    setEditForm({ ...selectedProduct });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) setNewImage(e.target.files[0]);
  };

  const handleGalleryChange = (e) => {
    if (e.target.files) setNewGallery([...e.target.files]);
  };

  const uploadAndSave = async () => {
    if (!editForm.productName || !editForm.price) {
      alert("Product name and price are required.");
      return;
    }

    setLoading(true);
    const updates = { ...editForm };

    if (newImage) {
      const imageRef = sRef(storage, `product_images/${Date.now()}.jpg`);
      await uploadBytes(imageRef, newImage);
      updates.imageUrl = await getDownloadURL(imageRef);
    }

    if (newGallery.length > 0) {
      const galleryUrls = [];
      for (const file of newGallery) {
        const imgRef = sRef(storage, `product_gallery/${Date.now()}_${file.name}`);
        await uploadBytes(imgRef, file);
        const url = await getDownloadURL(imgRef);
        galleryUrls.push(url);
      }
      updates.galleryImages = galleryUrls;
    }

    await update(ref(database, `shops/${shopId}/products/${selectedProduct.id}`), updates);
    setLoading(false);
    window.location.reload();
  };

  const filteredProducts = (list) =>
    list.filter((p) =>
      p.productName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="products-page">
      <div className="products-header">
        <h1>Your Products</h1>
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button
          className="add-button"
          onClick={() => {
            setSelectedProduct({}); // empty product
            setIsEditing(true);
          }}
        >
          + Add Product
        </button>
      </div>

      {productTypes.map((type) => (
        <div className="product-group" key={type}>
          <h2>{type}</h2>
          <div className="product-list">
            {filteredProducts(productsByType[type] || []).map((product) => (
              <div
                className="product-card"
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  setIsEditing(false);
                  setNewImage(null);
                  setNewGallery([]);
                }}
              >
                <img
                  src={product.imageUrl || "/placeholder.jpg"}
                  alt={product.productName}
                />
                <h3>{product.productName}</h3>
                <p>Stock: {product.stock}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {isEditing ? (
              <>
                <input
                  name="productName"
                  placeholder="Product Name"
                  value={editForm.productName || ""}
                  onChange={handleEditChange}
                />
                <input
                  name="price"
                  placeholder="Price"
                  value={editForm.price || ""}
                  onChange={handleEditChange}
                />
                <input
                  name="stock"
                  placeholder="Stock"
                  value={editForm.stock || ""}
                  onChange={handleEditChange}
                />
                <input
                  name="color"
                  placeholder="Color"
                  value={editForm.color || ""}
                  onChange={handleEditChange}
                />
                <input
                  name="width"
                  placeholder="Width"
                  value={editForm.width || ""}
                  onChange={handleEditChange}
                />
                <input
                  name="height"
                  placeholder="Height"
                  value={editForm.height || ""}
                  onChange={handleEditChange}
                />
                <input
                  name="depth"
                  placeholder="Depth"
                  value={editForm.depth || ""}
                  onChange={handleEditChange}
                />
                <input
                  name="weight"
                  placeholder="Weight"
                  value={editForm.weight || ""}
                  onChange={handleEditChange}
                />

                <select
                  name="rattanType"
                  value={editForm.rattanType || ""}
                  onChange={handleEditChange}
                >
                  <option value="">Select Rattan Type</option>
                  {rattanTypes.map((type, i) => (
                    <option key={i} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  name="productType"
                  value={editForm.productType || ""}
                  onChange={handleEditChange}
                >
                  <option value="">Select Product Type</option>
                  {productTypes.map((type, i) => (
                    <option key={i} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <textarea
                  name="careInstructions"
                  placeholder="Care Instructions"
                  value={editForm.careInstructions || ""}
                  onChange={handleEditChange}
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  value={editForm.description || ""}
                  onChange={handleEditChange}
                />
                <input
                  name="tags"
                  placeholder="Tags (comma separated)"
                  value={editForm.tags || ""}
                  onChange={handleEditChange}
                />
                <label>Main Image</label>
                <input type="file" onChange={handleImageChange} />
                <label>Gallery Images</label>
                <input type="file" multiple onChange={handleGalleryChange} />
              </>
            ) : (
              <>
                <img
                  className="modal-main-image"
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.productName}
                />
                <h2>{selectedProduct.productName}</h2>
                <p><strong>Price:</strong> ₱{selectedProduct.price}</p>
                <p><strong>Stock:</strong> {selectedProduct.stock}</p>
                <p><strong>Size:</strong> {selectedProduct.width} x {selectedProduct.height} x {selectedProduct.depth} cm</p>
                <p><strong>Weight:</strong> {selectedProduct.weight} kg</p>
                <p><strong>Color:</strong> {selectedProduct.color}</p>
                <p><strong>Rattan Type:</strong> {selectedProduct.rattanType}</p>
                <p><strong>Type:</strong> {selectedProduct.productType}</p>
                <p><strong>Tags:</strong> {selectedProduct.tags?.join(", ")}</p>
                <p><strong>Description:</strong> {selectedProduct.description}</p>

                {selectedProduct.galleryImages?.length > 0 && (
                  <>
                    <h4>Gallery</h4>
                    <div className="modal-gallery">
                      {selectedProduct.galleryImages.map((img, idx) => (
                        <img key={idx} src={img} alt={`gallery-${idx}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="modal-actions">
              {isEditing ? (
                <>
                  <button onClick={uploadAndSave} disabled={loading}>
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setIsEditing(false)}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={handleEditStart}>Edit</button>
                  <button
                    className="danger"
                    onClick={() => handleDelete(selectedProduct.id)}
                  >
                    Delete
                  </button>
                  <button onClick={() => setSelectedProduct(null)}>Close</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
