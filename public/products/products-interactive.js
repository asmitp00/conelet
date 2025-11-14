document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Get elements ---
  const productGrid = document.querySelector('.product-grid');
  const searchInput = document.querySelector('.search-bar input');
  const allCheckboxes = document.querySelectorAll('.filter-list input[type="checkbox"]');
  const sortButtons = document.querySelectorAll('.sort-btn');
  const priceSlider = document.querySelector('#price-slider');
  const priceValue = document.querySelector('#price-value');
  const keywordContainer = document.querySelector('#keyword-container');

  // --- NEW: Get the counter element ---
  const cartCounter = document.querySelector('#cart-counter');

  // --- 2. Main fetch function (no changes) ---
  async function fetchAndRenderProducts() {
    let queryParams = new URLSearchParams();
    const selectedCategories = [];
    const selectedSizes = [];
    allCheckboxes.forEach(checkbox => {
      if (checkbox.checked) {
        const category = checkbox.name;
        if (['cone', 'tub', 'parfait'].includes(category)) {
          selectedCategories.push(category);
        } else if (['small', 'medium', 'large'].includes(category)) {
          selectedSizes.push(category);
        }
      }
    });
    if (selectedCategories.length > 0) selectedCategories.forEach(cat => queryParams.append('categories', cat));
    if (selectedSizes.length > 0) selectedSizes.forEach(size => queryParams.append('sizes', size));
    queryParams.append('maxPrice', priceSlider.value);
    if (searchInput.value) queryParams.append('search', searchInput.value);
    const activeSortButton = document.querySelector('.sort-btn.active');
    if (activeSortButton && activeSortButton.dataset.sort) queryParams.append('sort', activeSortButton.dataset.sort);
    updateKeywords();
    try {
      const response = await fetch(`/api/products?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const products = await response.json();
      renderProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      productGrid.innerHTML = '<p>Error loading products. Please try again.</p>';
    }
  }

  // --- 3. Render function (no changes) ---
  function renderProducts(products) {
    productGrid.innerHTML = '';
    if (products.length === 0) {
      productGrid.innerHTML = '<p>No products match your filters.</p>';
      return;
    }
    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';
      if (product.category === 'parfait') productCard.classList.add('accent-bg-1');
      else if (product.category === 'tub') productCard.classList.add('accent-bg-2');
      else if (product.category === 'cone') productCard.classList.add('accent-bg-3');
      productCard.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h4>${product.name}</h4>
        <p>$${product.price.toFixed(2)}</p>
        <button class="btn-add-to-cart"
          data-id="${product._id}"
          data-name="${product.name}"
          data-price="${product.price}"
          data-image="${product.image}">
          Add to Cart
        </button>
      `;
      productGrid.appendChild(productCard);
    });
  }

  // --- 4. Keyword function (no changes) ---
  function updateKeywords() {
    keywordContainer.innerHTML = '';
    allCheckboxes.forEach(checkbox => {
      if (checkbox.checked) {
        const keywordTag = document.createElement('div');
        keywordTag.className = 'keyword-tag';
        const label = checkbox.closest('li').querySelector('label').textContent;
        keywordTag.innerHTML = `
          <span>${label}</span>
          <button data-filter="${checkbox.id}">&times;</button>
        `;
        keywordContainer.appendChild(keywordTag);
      }
    });
  }

  // --- 5. NEW: Function to update the cart counter ---
  async function updateCartCounter() {
    try {
      const response = await fetch('/api/cart/count');
      const result = await response.json();
      if (result.success) {
        cartCounter.textContent = result.count;
      }
    } catch (err) {
      console.error('Error updating cart counter:', err);
    }
  }

  // --- 6. Event listeners ---
  allCheckboxes.forEach(checkbox => checkbox.addEventListener('change', fetchAndRenderProducts));
  priceSlider.addEventListener('input', () => { priceValue.textContent = `$0-${priceSlider.value}`; });
  priceSlider.addEventListener('change', fetchAndRenderProducts);
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchAndRenderProducts, 300);
  });
  sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      sortButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      fetchAndRenderProducts();
    });
  });
  keywordContainer.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
      const filterId = event.target.dataset.filter;
      const checkboxToUncheck = document.querySelector(`#${filterId}`);
      if (checkboxToUncheck) {
        checkboxToUncheck.checked = false;
        fetchAndRenderProducts();
      }
    }
  });

  // --- 7. UPDATED: Add to Cart Listener ---
  productGrid.addEventListener('click', async (event) => {
    if (event.target.classList.contains('btn-add-to-cart')) {
      const button = event.target;
      const { id, name, price, image } = button.dataset;
      try {
        const response = await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: id, name: name, price: parseFloat(price), image: image
          }),
        });
        const result = await response.json();
        if (result.success) {
          button.textContent = 'Added!';
          // --- NEW: Update the counter after adding ---
          updateCartCounter();
          setTimeout(() => { button.textContent = 'Add to Cart'; }, 2000);
        } else {
          button.textContent = 'Error';
        }
      } catch (err) {
        console.error('Error adding to cart:', err);
        button.textContent = 'Error';
      }
    }
  });

  // --- 8. Initial Page Setup ---
  updateKeywords();
  // --- NEW: Update counter on page load ---
  updateCartCounter();
});
