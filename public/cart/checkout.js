document.addEventListener('DOMContentLoaded', () => {
    console.log('Checkout.js v4 (Full Nav & Submit) Loaded');

    // --- PART 1: CART ITEM LISTENERS (Server-side) ---
    // This part talks to your server and reloads the page.

    const itemsContainer = document.querySelector('#order-items-container');
    if (itemsContainer) {
        itemsContainer.addEventListener('click', async (event) => {
            const target = event.target;
            // Handle quantity buttons
            if (target.classList.contains('btn-quantity')) {
                const itemId = target.dataset.id;
                const action = target.dataset.action;
                try {
                    // CORRECT PATH: /api/cart/update...
                    const response = await fetch(`/api/cart/update/${itemId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: action })
                    });
                    const result = await response.json();
                    if (result.success) {
                        window.location.reload();
                    }
                } catch (err) {
                    console.error('Error updating quantity:', err);
                }
            }
            // Handle remove buttons
            if (target.classList.contains('btn-remove')) {
                const itemId = target.dataset.id;
                if (!confirm('Remove this item from your cart?')) {
                    return;
                }
                try {
                    // CORRECT PATH: /api/cart/remove...
                    const response = await fetch(`/api/cart/remove/${itemId}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    if (result.success) {
                        window.location.reload();
                    }
                } catch (err) {
                    console.error('Error removing item:', err);
                }
            }
        });
    }

    // --- PART 2: DISCOUNT BUTTON LISTENER (Server-side) ---

    const applyButton = document.getElementById('btn-apply-discount');
    const discountInput = document.getElementById('discount-code');

    if (applyButton && discountInput) {
        applyButton.addEventListener('click', async () => {
            const code = discountInput.value;
            if (!code) {
                alert('Please enter a discount code.');
                return;
            }
            try {
                // CORRECT PATH: /api/cart/apply-discount
                const response = await fetch('/api/cart/apply-discount', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const result = await response.json();
                if (result.success) {
                    window.location.reload();
                } else {
                    alert(result.message || 'Invalid discount code');
                }
            } catch (error) {
                console.error('Error applying discount:', error);
                alert('An error occurred applying the discount.');
            }
        });
    }

    // --- PART 3: FORM NAVIGATION / STEPPER (FIXED) ---
    // This logic is client-side and is now complete.

    const steps = {
        shipping: document.getElementById('step-1'),
        payment: document.getElementById('step-2')
    };

    const forms = {
        shipping: document.getElementById('shipping-form'),
        payment: document.getElementById('payment-form')
    };

    const buttons = {
        toPayment: document.getElementById('btn-to-payment'),
        pay: document.getElementById('btn-pay')
    };

    const backLinks = {
        toShipping: document.getElementById('link-back-to-shipping')
    };

    /**
     * A central function to control which step is visible.
     * @param {'shipping' | 'payment'} stepName The step to show.
     */
    function showStep(stepName) {
        // Ensure elements exist before trying to modify them
        if (!forms.shipping || !forms.payment || !buttons.toPayment || !buttons.pay || !steps.shipping || !steps.payment) {
            console.error('Form navigation elements are missing from the page.');
            return;
        }

        // Hide all forms and buttons
        forms.shipping.style.display = 'none';
        forms.payment.style.display = 'none';
        buttons.toPayment.style.display = 'none';
        buttons.pay.style.display = 'none';

        // Deactivate all steps
        steps.shipping.classList.remove('active', 'completed');
        steps.payment.classList.remove('active', 'completed');

        // Show the correct form, button, and step
        if (stepName === 'shipping') {
            forms.shipping.style.display = 'block';
            buttons.toPayment.style.display = 'inline-block';
            steps.shipping.classList.add('active');
        } else if (stepName === 'payment') {
            forms.payment.style.display = 'block';
            buttons.pay.style.display = 'inline-block';
            steps.payment.classList.add('active');
            steps.shipping.classList.add('completed'); // Mark previous step as completed
        }
    }

    // --- Attach Listeners for Navigation ---
    if (buttons.toPayment) {
        buttons.toPayment.addEventListener('click', () => showStep('payment'));
    }

    if (backLinks.toShipping) {
        backLinks.toShipping.addEventListener('click', (e) => {
            e.preventDefault(); // Stop the link from jumping
            showStep('shipping');
        });
    }

    // --- PART 4: PLACE ORDER BUTTON (NEW) ---
    // This logic sends all the form data to your server

    if (buttons.pay) {
        buttons.pay.addEventListener('click', async () => {
            // 1. Collect all the form data
            const shippingDetails = {
                name: document.getElementById('name').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value
            };

            const paymentDetails = {
                cardNumber: document.getElementById('card-number').value,
                expiry: document.getElementById('card-expiry').value,
                cvc: document.getElementById('card-cvc').value
            };

            // Basic validation
            if (!shippingDetails.name || !shippingDetails.address || !paymentDetails.cardNumber) {
                alert('Please fill out all shipping and payment fields.');
                return;
            }

            console.log('Submitting order...');

            try {
                // 2. Send all data to your server
                // CORRECT PATH: /api/order/place
                const response = await fetch('/api/order/place', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        shipping: shippingDetails,
                        payment: paymentDetails
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // 3. Redirect to a "Thank You" page
                    alert('Order placed successfully!');
                    // You must create this success page/route
                    window.location.href = `/order/success/${result.orderId}`;
                } else {
                    alert(result.message || 'There was a problem placing your order.');
                }

            } catch (err) {
                console.error('Error placing order:', err);
                alert('A critical error occurred. Please try again.');
            }
        });
    }

    // --- INITIALIZATION ---
    // Start on the 'shipping' step by default
    showStep('shipping');

});
