# Kane CLI Test: Returns Inspection, Restock Disposition & Inventory Recirculation
# Target: Desktop Web (http://localhost:5173/returns)

## Objective
Verify that returned goods do not enter sellable stock until an inspection disposition explicitly approves restocking, and that approved restocks automatically increment available stock.

## Steps
1. Navigate to "http://localhost:5173/returns"
2. Click "Process Return"
3. Select a completed order from the dropdown
4. Specify return quantity of 1 for the first item
5. Select reason "Customer Changed Mind"
6. Click "Submit Return Request"
7. Assert that the new return appears with status "REQUESTED"
8. Click "Inspect & Dispose" on the return row
9. Select Disposition "Restock to Inventory (Good Condition)"
10. Click "Complete Inspection & Save"
11. Assert that the return status transitions to "COMPLETED"
12. Navigate to "http://localhost:5173/inventory"
13. Switch to "Movement History Ledger" tab
14. Assert that a "return_restock" movement is recorded with positive quantity change
