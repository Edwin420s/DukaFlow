import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes } from '../utils/format.js';
import { Save, CheckCircle, Shield, CreditCard, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsView() {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [taxRate, setTaxRate] = useState(16);
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [mpesaShortcode, setMpesaShortcode] = useState('');
  const [mpesaPasskey, setMpesaPasskey] = useState('');
  const [mpesaEnvironment, setMpesaEnvironment] = useState('sandbox');
  const [mpesaEnabled, setMpesaEnabled] = useState(true);

  useEffect(() => {
    loadShop();
  }, []);

  async function loadShop() {
    try {
      setLoading(true);
      const res = await api.getShop();
      const s = res.shop || {};
      setShop(s);
      setName(s.name || '');
      setPhone(s.phone || '');
      setEmail(s.email || '');
      setStreet(s.address?.street || '');
      setCity(s.address?.city || '');
      setTaxRate(s.taxRate || 16);
      setReceiptHeader(s.receiptHeader || '');
      setReceiptFooter(s.receiptFooter || '');
      setMpesaShortcode(s.mpesaConfig?.shortcode || '174379');
      setMpesaPasskey(s.mpesaConfig?.passkey || '');
      setMpesaEnvironment(s.mpesaConfig?.environment || 'sandbox');
      setMpesaEnabled(s.mpesaConfig?.enabled ?? true);
    } catch (err) {
      console.error('Failed to load shop settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSavedSuccess(false);

    try {
      await api.updateShop({
        name,
        phone,
        email,
        address: { street, city, country: 'Kenya' },
        taxRate: Number(taxRate),
        receiptHeader,
        receiptFooter,
        mpesaConfig: {
          shortcode: mpesaShortcode,
          passkey: mpesaPasskey,
          environment: mpesaEnvironment,
          enabled: mpesaEnabled
        }
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="admin-page"><p>Loading shop settings...</p></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Shop Configuration & Integrations</h1>
          <p className="muted">Configure business profile, statutory tax rates, printed receipts, and M-Pesa Daraja gateway.</p>
        </div>
      </div>

      {savedSuccess && (
        <div className="sf-alert success mb-4">
          <CheckCircle size={16} /> Shop settings saved and applied successfully.
        </div>
      )}

      {error && <div className="sf-alert danger mb-4">{error}</div>}

      <form onSubmit={handleSave} className="settings-form">
        <div className="panel mb-4">
          <h2>Business Profile</h2>
          <p className="muted">Information displayed on customer storefront and invoices.</p>

          <div className="form-grid-2 mt-3">
            <label>
              Shop Name *
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Contact Phone
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>

          <div className="form-grid-2">
            <label>
              Contact Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Default VAT Rate (%)
              <input type="number" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </label>
          </div>

          <div className="form-grid-2">
            <label>
              Street Address
              <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} />
            </label>
            <label>
              City / Region
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          </div>
        </div>

        {/* M-Pesa Integration Settings */}
        <div className="panel mb-4">
          <h2>M-Pesa Daraja Payment Gateway</h2>
          <p className="muted">Lipa na M-Pesa Online (STK Push) API configuration.</p>

          <div className="form-grid-2 mt-3">
            <label>
              Business Shortcode
              <input type="text" value={mpesaShortcode} onChange={(e) => setMpesaShortcode(e.target.value)} />
            </label>
            <label>
              Environment
              <select value={mpesaEnvironment} onChange={(e) => setMpesaEnvironment(e.target.value)}>
                <option value="sandbox">Sandbox Test Mode</option>
                <option value="production">Production Live</option>
              </select>
            </label>
          </div>

          <label>
            Lipa Na M-Pesa Online Passkey
            <input type="password" value={mpesaPasskey} onChange={(e) => setMpesaPasskey(e.target.value)} />
          </label>

          <label className="checkbox-label mt-2">
            <input type="checkbox" checked={mpesaEnabled} onChange={(e) => setMpesaEnabled(e.target.checked)} />
            <span>Enable M-Pesa checkout method on customer storefront</span>
          </label>
        </div>

        {/* Receipt Customization */}
        <div className="panel mb-4">
          <h2>Receipt & Invoicing Templates</h2>
          <p className="muted">Header and footer texts formatted for thermal POS slips and digital invoices.</p>

          <div className="form-grid-2 mt-3">
            <label>
              Receipt Header Text
              <textarea rows="3" value={receiptHeader} onChange={(e) => setReceiptHeader(e.target.value)} />
            </label>
            <label>
              Receipt Footer Note
              <textarea rows="3" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
            </label>
          </div>
        </div>

        <button type="submit" className="primary-button">
          <Save size={16} /> Save Settings
        </button>
      </form>
    </div>
  );
}
