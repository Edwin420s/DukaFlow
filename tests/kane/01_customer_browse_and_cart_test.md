# Kane CLI Test: Customer Storefront Browse & Cart Operations
# Target: Desktop Web (http://localhost:5173/storefront)

## Objective
Verify that a customer can navigate to the DukaFlow storefront, browse categories, search for products, view real-time availability in KES, and add items to their shopping basket.

## Steps
1. Navigate to "http://localhost:5173/storefront"
2. Assert that the shop brand title "DukaFlow" is visible in the header
3. Assert that the announcement banner displays "Same-Day Express Delivery across Nairobi"
4. Click on the category tab "Grains, Flour & Baking"
5. Assert that "Unga Wa Dola Premium Maize Meal 2kg" is displayed in the product grid
6. Assert that the price displays "KSh 220.00"
7. Click the "Add" button on the "Unga Wa Dola" product card
8. Assert that the shopping basket drawer opens automatically
9. Assert that the cart contains "Unga Wa Dola Premium Maize Meal 2kg" with quantity 1
10. Click the "+" button to increment quantity to 2
11. Assert that the item total updates to "KSh 440.00"
12. Assert that the cart subtotal displays "KSh 440.00"
