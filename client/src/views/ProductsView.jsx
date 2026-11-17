import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes } from '../utils/format.js';
import { Plus, Search, Edit2, Archive, Package, AlertTriangle } from 'lucide-react';

export default function ProductsView() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('piece');
  const [costPriceKes, setCostPriceKes] = useState('');
  const [sellingPriceKes, setSellingPriceKes] = useState('');
  const [taxCategory, setTaxCategory] = useState('standard');
  const [taxRate, setTaxRate] = useState(16);
  const [onHand, setOnHand] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [search, categoryFilter, statusFilter]);

  async function loadData() {
    try {
      setLoading(true);
      const [prodsRes, catsRes] = await Promise.all([
        api.getProducts(
          `${statusFilter ? `status=${statusFilter}&` : ''}${categoryFilter ? `categoryId=${categoryFilter}&` : ''}${search ? `search=${search}` : ''}`
        ),
        api.getCategories()
      ]);
      setProducts(prodsRes.products || []);
      setCategories(catsRes.categories || []);
      if (catsRes.categories?.length > 0 && !categoryId) {
        setCategoryId(catsRes.categories[0]._id);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingProduct(null);
    setName('');
    setSlug('');
    setSku('');
    setBarcode('');
    setUnit('piece');
    setCostPriceKes('');
    setSellingPriceKes('');
    setTaxCategory('standard');
    setTaxRate(16);
    setOnHand(10);
    setLowStockThreshold(5);
    setImageUrl('');
    setDescription('');
    setError('');
    setIsModalOpen(true);
  }

  function openEditModal(prod) {
    setEditingProduct(prod);
    setName(prod.name);
    setSlug(prod.slug);
    setSku(prod.sku);
    setBarcode(prod.barcode || '');
    setCategoryId(prod.categoryId?._id || prod.categoryId || '');
    setUnit(prod.unit || 'piece');
    setCostPriceKes((prod.costPrice / 100).toFixed(2));
    setSellingPriceKes((prod.sellingPrice / 100).toFixed(2));
    setTaxCategory(prod.taxCategory || 'standard');
    setTaxRate(prod.taxRate || 16);
    setOnHand(prod.onHand || 0);
    setLowStockThreshold(prod.lowStockThreshold || 5);
    setImageUrl(prod.imageUrl || '');
    setDescription(prod.description || '');
    setError('');
    setIsModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    const costPrice = Math.round(Number(costPriceKes) * 100);
    const sellingPrice = Math.round(Number(sellingPriceKes) * 100);

    if (isNaN(costPrice) || costPrice < 0) {
      setError('Please provide a valid cost price in KES');
      return;
    }
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      setError('Please provide a valid selling price in KES');
      return;
    }

    const payload = {
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sku: sku.toUpperCase(),
      barcode,
      categoryId,
      unit,
      costPrice,
      sellingPrice,
      taxCategory,
      taxRate: Number(taxRate),
      lowStockThreshold: Number(lowStockThreshold),
      imageUrl,
      description
    };

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct._id, payload);
      } else {
        await api.createProduct({ ...payload, onHand: Number(onHand) });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleArchive(prod) {
    if (!window.confirm(`Are you sure you want to archive "${prod.name}"?`)) return;
    try {
      await api.archiveProduct(prod._id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Product Catalogue</h1>
          <p className="muted">Manage shop items, SKUs, barcode references, pricing and inventory levels.</p>
        </div>
        <button className="primary-button" onClick={openCreateModal}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="admin-filters-bar">
        <div className="admin-search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by product name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="active">Active Products</option>
          <option value="archived">Archived Products</option>
        </select>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU / Barcode</th>
              <th>Category</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Gross Margin</th>
              <th>Stock Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>Loading catalogue...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No products found.</td></tr>
            ) : (
              products.map((p) => {
                const margin = p.sellingPrice > 0 ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(1) : 0;
                return (
                  <tr key={p._id}>
                    <td>
                      <div className="table-prod-cell">
                        <img src={p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=80&q=80'} alt="" />
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.unit}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div><code>{p.sku}</code></div>
                      {p.barcode && <small className="muted">{p.barcode}</small>}
                    </td>
                    <td>{p.categoryName || p.categoryId?.name || '-'}</td>
                    <td>{formatKes(p.costPrice)}</td>
                    <td><strong>{formatKes(p.sellingPrice)}</strong></td>
                    <td><span className="badge success">+{margin}%</span></td>
                    <td>
                      <div className="stock-cell">
                        <b>{p.available} available</b>
                        <small>({p.onHand} on hand, {p.reserved} reserved)</small>
                        {p.isLowStock && <span className="badge warning">Low Stock</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions">
                        <button className="icon-btn" onClick={() => openEditModal(p)} title="Edit Product"><Edit2 size={15} /></button>
                        {p.status === 'active' && (
                          <button className="icon-btn text-danger" onClick={() => handleArchive(p)} title="Archive Product"><Archive size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-card large">
            <h2>{editingProduct ? 'Edit Product' : 'Create New Product'}</h2>
            {error && <div className="sf-alert danger">{error}</div>}

            <form onSubmit={handleSave} className="admin-modal-form">
              <div className="form-grid-2">
                <label>
                  Product Name *
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  SKU (Unique Code) *
                  <input type="text" required value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} />
                </label>
              </div>

              <div className="form-grid-2">
                <label>
                  Barcode (Optional)
                  <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                </label>
                <label>
                  Category *
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid-3">
                <label>
                  Unit (e.g. 1kg, 500ml, packet)
                  <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </label>
                <label>
                  Cost Price (KES) *
                  <input type="number" step="0.5" required value={costPriceKes} onChange={(e) => setCostPriceKes(e.target.value)} />
                </label>
                <label>
                  Selling Price (KES) *
                  <input type="number" step="0.5" required value={sellingPriceKes} onChange={(e) => setSellingPriceKes(e.target.value)} />
                </label>
              </div>

              <div className="form-grid-3">
                <label>
                  Tax Category
                  <select value={taxCategory} onChange={(e) => setTaxCategory(e.target.value)}>
                    <option value="standard">Standard (16% VAT)</option>
                    <option value="zero_rated">Zero-Rated (0%)</option>
                    <option value="exempt">Exempt</option>
                  </select>
                </label>
                {!editingProduct && (
                  <label>
                    Initial Stock On Hand
                    <input type="number" min="0" value={onHand} onChange={(e) => setOnHand(e.target.value)} />
                  </label>
                )}
                <label>
                  Low Stock Alert Threshold
                  <input type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
                </label>
              </div>

              <label>
                Image URL
                <input type="url" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              </label>

              <label>
                Description
                <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>

              <div className="sf-modal-actions">
                <button type="submit" className="primary-button">{editingProduct ? 'Save Changes' : 'Create Product'}</button>
                <button type="button" className="outline-button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
