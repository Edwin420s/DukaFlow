# Kane CLI Test: Coupon Validation, Zone Delivery & Checkout
# Target: Desktop Web (http://localhost:5173/storefront)

## Objective
Verify that a customer can apply a promotional coupon code, choose doorstep delivery with dynamic zone calculation, complete checkout, and trigger an M-Pesa STK push prompt.

## Steps
1. Navigate to "http://localhost:5173/storefront"
2. Click the "Add" button on "Unga Wa Dola Premium Maize Meal 2kg"
3. Click the "Add" button on "Golden Fry Pure Vegetable Cooking Oil 1L"
4. Open the shopping cart drawer
5. Locate the coupon input field and enter "KARIBU10"
6. Click the "Apply" button
7. Assert that "Coupon KARIBU10 applied!" confirmation appears
8. Assert that the discount line shows a deduction
9. Click "Proceed to Checkout"
10. Fill in "Full Name" with "Samuel Kiprop"
11. Fill in "Phone Number" with "0722123456"
12. Under Fulfilment Method, select "Doorstep Express Delivery"
13. Select Delivery Zone "Westlands / Parklands"
14. Fill in "Street Address" with "Apt 4B, Rhapta Road"
15. Under Payment Method, select "M-Pesa STK Push"
16. Click "Confirm & Place Order"
17. Assert that the "Order Confirmed!" screen appears
18. Assert that an order reference starting with "ORD-" is displayed
19. Assert that the "M-Pesa STK Push Sent!" prompt card appears
20. Click "Simulate Customer Entered PIN"
21. Assert that payment status transitions to "PAID"
