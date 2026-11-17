# Kane CLI Test: Point of Sale (POS) Cashier Workflow
# Target: Desktop Web (http://localhost:5173/pos)

## Objective
Verify that a shop cashier can use the rapid POS interface to search for items, calculate change tendered, complete a cash sale, and generate an instant receipt.

## Steps
1. Navigate to "http://localhost:5173/pos"
2. Assert that the POS Quick Sale header is visible
3. In the barcode / search input, type "Brookside"
4. Click on the "Brookside Homogenized Fresh Milk 500ml" card
5. Assert that the item appears in the active ticket with price "KSh 65.00"
6. In the cash tendered input, enter "100"
7. Assert that "Change Due" calculates to "KSh 35.00" (or net after VAT)
8. Click "Complete Sale"
9. Assert that the "Sale Completed!" dialog appears
10. Assert that the change return banner displays the exact change
11. Click "Start Next Sale"
12. Assert that the ticket resets cleanly
