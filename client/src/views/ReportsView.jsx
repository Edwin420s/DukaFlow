import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatKes } from '../utils/format.js';
import { Download, BarChart2, TrendingUp, DollarSign, Package } from 'lucide-react';

export default function ReportsView() {
  const [salesReport, setSalesReport] = useState(null);
  const [valuationReport, setValuationReport] = useState(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const [salesRes, valRes, payRes] = await Promise.all([
        api.getSalesReport(),
        api.getInventoryValuation(),
        api.getPaymentBreakdown()
      ]);
      setSalesReport(salesRes);
      setValuationReport(valRes);
      setPaymentBreakdown(payRes.report);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }

  function downloadSalesCsv() {
    window.open('/api/v1/reports/sales/csv', '_blank');
  }

  function downloadValuationCsv() {
    window.open('/api/v1/reports/inventory-valuation/csv', '_blank');
  }

  if (loading) {
    return <div className="admin-page"><p>Loading analytics reports...</p></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Financial & Operational Reports</h1>
          <p className="muted">Detailed metrics on revenues, margins, inventory asset valuation, and payment settlements.</p>
        </div>
        <div className="header-button-row">
          <button className="outline-button" onClick={downloadSalesCsv}>
            <Download size={15} /> Export Sales CSV
          </button>
          <button className="outline-button" onClick={downloadValuationCsv}>
            <Download size={15} /> Export Valuation CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metric-grid">
        <article className="metric">
          <span>Total Settled Revenue</span>
          <strong>{formatKes(salesReport?.totalRevenue || 0)}</strong>
          <small>{salesReport?.paidOrdersCount || 0} completed paid orders</small>
        </article>

        <article className="metric">
          <span>Inventory Asset Cost</span>
          <strong>{formatKes(valuationReport?.totalCostValue || 0)}</strong>
          <small>Capital invested in current stock</small>
        </article>

        <article className="metric">
          <span>Inventory Retail Value</span>
          <strong>{formatKes(valuationReport?.totalRetailValue || 0)}</strong>
          <small>Expected sales value ({valuationReport?.totalUnits || 0} total units)</small>
        </article>

        <article className="metric">
          <span>Projected Gross Margin</span>
          <strong className="text-emerald">{formatKes(valuationReport?.projectedProfit || 0)}</strong>
          <small>Potential gross profit in stock</small>
        </article>
      </div>

      <div className="content-grid mt-4">
        {/* Payment Channels Breakdown */}
        <article className="panel">
          <h2>Payment Channel Performance</h2>
          <p className="muted">Settled volume by payment provider</p>

          <div className="payment-breakdown-list">
            <div className="pay-channel-row">
              <div>
                <b>M-Pesa STK Push</b>
                <small className="muted d-block">{paymentBreakdown?.mpesa?.count || 0} transactions</small>
              </div>
              <strong>{formatKes(paymentBreakdown?.mpesa?.total || 0)}</strong>
            </div>

            <div className="pay-channel-row">
              <div>
                <b>Cash at Counter / Pickup</b>
                <small className="muted d-block">{paymentBreakdown?.cash?.count || 0} transactions</small>
              </div>
              <strong>{formatKes(paymentBreakdown?.cash?.total || 0)}</strong>
            </div>

            <div className="pay-channel-row">
              <div>
                <b>Simulated / Card Gateway</b>
                <small className="muted d-block">{paymentBreakdown?.simulated?.count || 0} transactions</small>
              </div>
              <strong>{formatKes(paymentBreakdown?.simulated?.total || 0)}</strong>
            </div>
          </div>
        </article>

        {/* Taxes & Discounts Summary */}
        <article className="panel">
          <h2>Tax & Promotional Deductions</h2>
          <p className="muted">Authoritative summary of applied statutory VAT and discounts</p>

          <div className="payment-breakdown-list">
            <div className="pay-channel-row">
              <div>
                <b>VAT Collected (16%)</b>
                <small className="muted d-block">Statutory tax liability</small>
              </div>
              <strong>{formatKes(salesReport?.totalTaxes || 0)}</strong>
            </div>

            <div className="pay-channel-row">
              <div>
                <b>Promotional Discounts</b>
                <small className="muted d-block">Coupons and reductions</small>
              </div>
              <strong className="text-danger">-{formatKes(salesReport?.totalDiscounts || 0)}</strong>
            </div>

            <div className="pay-channel-row">
              <div>
                <b>Delivery Fees Collected</b>
                <small className="muted d-block">Doorstep courier fees</small>
              </div>
              <strong>{formatKes(salesReport?.totalDeliveryFees || 0)}</strong>
            </div>
          </div>
        </article>
      </div>

      {/* Stock Valuation Table */}
      <div className="admin-table-card mt-4">
        <div className="panel-heading p-4">
          <div>
            <h2>Inventory Item Valuation Breakdown</h2>
            <p className="muted">Itemized stock valuation, cost versus retail price, and gross margin per product.</p>
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th>On-Hand</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Total Cost Value</th>
              <th>Total Retail Value</th>
              <th>Gross Margin</th>
            </tr>
          </thead>
          <tbody>
            {valuationReport?.rows?.map((r, idx) => (
              <tr key={idx}>
                <td><code>{r.sku}</code></td>
                <td><strong>{r.name}</strong></td>
                <td>{r.category}</td>
                <td><b>{r.onHand}</b></td>
                <td>{formatKes(r.costPrice)}</td>
                <td>{formatKes(r.sellingPrice)}</td>
                <td>{formatKes(r.totalCostValue)}</td>
                <td><strong>{formatKes(r.totalRetailValue)}</strong></td>
                <td><span className="badge success">+{r.marginPercent}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
