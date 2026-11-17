# Kane CLI Test: Order Fulfilment Lifecycle State Machine
# Target: Desktop Web (http://localhost:5173/orders)

## Objective
Verify that staff can progress customer orders through validated lifecycle stages: Pending -> Confirmed -> Preparing -> Dispatched -> Completed.

## Steps
1. Navigate to "http://localhost:5173/orders"
2. Click on the first order in the table
3. Assert that the Order Details drawer opens
4. Click "✓ Confirm Order"
5. Assert that the status updates to "CONFIRMED"
6. Click "📦 Start Preparing"
7. Assert that the fulfilment status shows "PACKING"
8. Click "🚚 Dispatch Rider" or "✓ Ready for Collection"
9. Click "✓ Mark Completed"
10. Assert that the order status reaches the terminal "COMPLETED" state
11. Assert that the activity timeline records each transition with actor and timestamp
