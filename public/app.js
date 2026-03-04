
const countrySelector = document.getElementById('country');
const productGrid = document.querySelector('.product-grid');
const cartItemsList = document.getElementById('cart-items');
const cartTotalSpan = document.getElementById('cart-total');
const checkoutFlowButton = document.getElementById('checkout-flow');
const checkoutHPPButton = document.getElementById('checkout-hpp');
const checkoutPaymentLinkButton = document.getElementById('checkout-payment-link');
const flowOverlay = document.getElementById('flow-overlay');
const flowCloseButton = document.getElementById('flow-close-button');
const aiInput = document.getElementById('ai-input');
const aiSendButton = document.getElementById('ai-send-button');
const aiChatMessages = document.getElementById('ai-chat-messages');


let cart = [];
let currentCurrency = '£';

const currencyMap = {
    'GB': { symbol: '£', factor: 1.0 },
    'US': { symbol: '$', factor: 1.25 }, // Example conversion factor
    'HK': { symbol: 'HK$', factor: 9.75 }, // Example conversion factor
    'AE': { symbol: 'د.إ', factor: 4.59 } // Example conversion factor
};

const currencyCodeMap = {
    'GB': 'GBP',
    'US': 'USD',
    'HK': 'HKD',
    'AE': 'AED'
};

const localeMap = {
    'GB': 'en-GB',
    'US': 'en-GB',
    'HK': 'zh-HK',
    'AE': 'ar'
};

function hideFlowOverlay() {
    flowOverlay.classList.add('hidden');
}

function showFlowOverlay() {
    flowOverlay.classList.remove('hidden');
}

async function getCkoPublicKey() {
    try {
        const res = await fetch('/config').then(res => res.json());
        return res.ckoPublicKey;
    } catch (error) {
        console.error('Error fetching Checkout.com Public Key:', error);
        alert('Could not fetch public key. Please check console for details.');
        return null; // Return null on error
    }
}

function updatePricesAndCurrency() {
    const selectedCountry = countrySelector.value;
    const { symbol, factor } = currencyMap[selectedCountry];
    currentCurrency = symbol;

    document.querySelectorAll('.product-card').forEach(card => {
        const basePrice = parseFloat(card.dataset.price);
        const newPrice = (basePrice * factor).toFixed(2);
        card.querySelector('.price').textContent = `${symbol}${newPrice}`;
    });
    updateCartDisplay();
}

function updateCartDisplay() {
    cartItemsList.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `${item.name} - ${currentCurrency}${(item.price * item.quantity).toFixed(2)} (${item.quantity} x ${currentCurrency}${item.price.toFixed(2)}) <button class="remove-item" data-name="${item.name}">Remove</button>`;
        cartItemsList.appendChild(li);
        total += item.price * item.quantity;
    });

    cartTotalSpan.textContent = `${currentCurrency}${total.toFixed(2)}`;
    updateCheckoutButtonState();
}

function emptyCart() {
    cart = [];
    updateCartDisplay();
}

function updateCheckoutButtonState() {
    const isDisabled = cart.length === 0;
    checkoutFlowButton.disabled = isDisabled;
    checkoutHPPButton.disabled = isDisabled;
    checkoutPaymentLinkButton.disabled = isDisabled;
}

productGrid.addEventListener('click', (event) => {
    if (event.target.classList.contains('add-to-cart')) {
        const productCard = event.target.closest('.product-card');
        const productName = productCard.dataset.name;
        const productPrice = parseFloat(productCard.dataset.price);

        const existingItem = cart.find(item => item.name === productName);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ name: productName, price: productPrice, quantity: 1 });
        }
        updateCartDisplay();
    }
});

countrySelector.addEventListener('change', updatePricesAndCurrency);

// Initial price and currency update
updatePricesAndCurrency();
updateCheckoutButtonState(); // Set initial state of checkout buttons

// Checkout buttons functionality (simulated for now)
checkoutFlowButton.addEventListener('click', async () => {
    alert('Simulating Checkout with Flow');

    const ckoPublicKey = await getCkoPublicKey();

    if (!ckoPublicKey) {
        console.error('Checkout.com Public Key not available.');
        alert('Checkout with Flow is not configured. Please ensure PUBLIC_KEY is set in .env and server is exposing it.');
        return;
    }

    const totalAmount = parseFloat(cartTotalSpan.textContent.replace(/[^0-9.-]+/g, "")) * 100; // Amount in minor units
    const selectedCurrencyCode = currencyCodeMap[countrySelector.value];
    const selectedCountryCode = countrySelector.value;
    const selectedLocale = localeMap[countrySelector.value];

    const paymentDetail = {
        amount: totalAmount,
        currency: selectedCurrencyCode,
        billing: {
            address: {
                country: selectedCountryCode
            }
        },
        locale: selectedLocale
    };
    console.log('Payment Details:', paymentDetail);


    const paymentSessionResponse = await fetch('/create-payment-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: paymentDetail.amount,
            currency: paymentDetail.currency,
            billing: paymentDetail.billing,
            locale: paymentDetail.locale,
        })
    });

    const paymentSession = await paymentSessionResponse.json();
    console.log(paymentSession);

    showFlowOverlay(); // Show overlay when Flow component is about to be mounted
    const checkout = await CheckoutWebComponents({
        publicKey: ckoPublicKey,
        environment: "sandbox",
        locale: paymentDetail.locale,
        paymentSession,
        componentOptions: {
            'remember_me': {
                acceptedCardSchemes: [
                    'american_express',
                    'cartes_bancaires',
                    'china_union_pay',
                    'diners_club_international',
                    'discover',
                    'jcb',
                    'mada',
                    'mastercard',
                    'visa']
            }
        },
        onReady: () => {
            console.log("onReady");
        },
        onPaymentCompleted: (_component, paymentResponse) => {
            console.log("Create Payment with PaymentId: ", paymentResponse.id);
            emptyCart(); // Empty the cart on successful payment
            flowComponentInstance.unmount();
            flowComponentInstance = null;
            hideFlowOverlay();
            alert("flow checkout complete!")
        },
        onChange: (component) => {
            console.log(
                `onChange() -> isValid: "${component.isValid()}" for "${component.type
                }"`,
            );
        },
        onError: (component, error) => {
            console.log("onError", error, "Component", component.type);
            hideFlowOverlay(); // Hide overlay on error
        },
    });

    // authComponentInstance = checkout.create("authentication")
    flowComponentInstance = checkout.create("flow"); // Store the instance
    // authComponentInstance.mount(document.getElementById("authentication-container"));
    flowComponentInstance.mount(document.getElementById("flow-container"));

    flowCloseButton.addEventListener('click', () => {
        if (flowComponentInstance) {
            flowComponentInstance.unmount();
            flowComponentInstance = null; // Clear the instance
        }
        hideFlowOverlay();
    });

});

checkoutHPPButton.addEventListener('click', async () => {
    alert('Simulating Checkout with HPP');

    const ckoPublicKey = await getCkoPublicKey();

    if (!ckoPublicKey) {
        console.error('Checkout.com Public Key not available.');
        alert('Checkout with Flow is not configured. Please ensure PUBLIC_KEY is set in .env and server is exposing it.');
        return;
    }

    const totalAmount = parseFloat(cartTotalSpan.textContent.replace(/[^0-9.-]+/g, "")) * 100; // Amount in minor units
    const selectedCurrencyCode = currencyCodeMap[countrySelector.value];
    const selectedCountryCode = countrySelector.value;
    const selectedLocale = localeMap[countrySelector.value];

    const paymentDetail = {
        amount: totalAmount,
        currency: selectedCurrencyCode,
        billing: {
            address: {
                country: selectedCountryCode
            }
        },
        locale: selectedLocale
    };
    console.log('Payment Details:', paymentDetail);

    const paymentSessionResponse = await fetch('/create-hosted-payment-page', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: paymentDetail.amount,
            currency: paymentDetail.currency,
            billing: paymentDetail.billing,
            locale: paymentDetail.locale,
        })
    });
    const paymentSession = await paymentSessionResponse.json();
    window.open(paymentSession._links.redirect.href, '_blank');
});

checkoutPaymentLinkButton.addEventListener('click', async () => {
    alert('Simulating Checkout with Payment Link');
    const ckoPublicKey = await getCkoPublicKey();

    if (!ckoPublicKey) {
        console.error('Checkout.com Public Key not available.');
        alert('Checkout with Flow is not configured. Please ensure PUBLIC_KEY is set in .env and server is exposing it.');
        return;
    }

    const totalAmount = parseFloat(cartTotalSpan.textContent.replace(/[^0-9.-]+/g, "")) * 100; // Amount in minor units
    const selectedCurrencyCode = currencyCodeMap[countrySelector.value];
    const selectedCountryCode = countrySelector.value;
    const selectedLocale = localeMap[countrySelector.value];

    const paymentDetail = {
        amount: totalAmount,
        currency: selectedCurrencyCode,
        billing: {
            address: {
                country: selectedCountryCode
            }
        },
        locale: selectedLocale
    };
    console.log('Payment Details:', paymentDetail);

    const paymentSessionResponse = await fetch('/create-payment-link', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: paymentDetail.amount,
            currency: paymentDetail.currency,
            billing: paymentDetail.billing,
            locale: paymentDetail.locale,
        })
    });

    const paymentSession = await paymentSessionResponse.json();
    console.log(paymentSession)
});

cartItemsList.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-item')) {
        const productName = event.target.dataset.name;
        cart = cart.filter(item => item.name !== productName);
        updateCartDisplay();
    }
});



function appendMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    messageElement.textContent = text;
    aiChatMessages.appendChild(messageElement);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight; // Auto-scroll to bottom
}



async function handleAIChat() {
    const userMessage = aiInput.value.trim();
    if (userMessage) {
        appendMessage('user', userMessage);
        aiInput.value = '';

        console.log('front end', userMessage)
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            appendMessage('ai', data.reply);
        } catch (error) {
            console.error('Error communicating with AI agent:', error);
            appendMessage('ai', 'Oops! Something went wrong with the AI agent. Please try again later.');
        }
    }
}

aiSendButton.addEventListener('click', handleAIChat);

aiInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleAIChat();
    }
});

