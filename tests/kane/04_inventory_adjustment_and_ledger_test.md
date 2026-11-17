# Kane CLI Test: Inventory Adjustment & Immutable Movement Ledger
# Target: Desktop Web (http://localhost:5173/inventory)

## Objective
Verify that stock levels reflect on-hand and reserved units, manual stock adjustments require mandatory audit reasons, and every inventory mutation creates an immutable record in the movement ledger.

## Steps
1. Navigate to "http://localhost:5173/inventory"
2. Assert that the "Inventory & Stock Ledger" page loads
3. Find the product "Unga Wa Dola Premium Maize Meal 2kg"
4. Note the current "On-Hand" quantity
5. Click the "Adjust" button on the product row
6. Assert that the "Adjust Inventory" modal opens
7. In "New Physical On-Hand Count", enter an adjusted value (e.g. 50)
8. Select Mandatory Reason "Physical Inventory Count Correction"
9. In Audit Explanation Notes, enter "Routine stock take verification"
10. Click "Confirm Adjustment"
11. Assert that the on-hand quantity in the table updates to 50
12. Click on the "Movement History Ledger" tab
13. Assert that the top record shows the product name, reason "count correction", and the exact quantity change
