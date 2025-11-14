// This code runs when the page is fully loaded
document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Get all our interactive elements ---
  const productGrid = document.querySelector('.product-grid');
  const searchInput = document.querySelector('.search-bar input');

  // Get all filter checkboxes
  const filterCheckboxes = document.querySelectorAll('.filter-list input[type="checkbox"]');

  // Get all sort buttons
  const sortButtons = document.querySelectorAll('.sort-btn');

  // --- 2. The main function to fetch and render products ---
  async function fetchAndRenderProducts() {

    // A. Build the query string
    let queryParams = new URLSearchParams();

    // B. Get selected categories
    const selectedCategories = [];
    filterCheckboxes.forEach(checkbox => {
      if (checkbox.checked) {
        // We add 'categories' multiple times, e.g., ?categories=cone&categories=tub
        queryParams.append('categories', checkbox.name);
      }
    });

    // C. Get search term
    if (searchInput.value) {
      queryParams.append('search', searchInput.value);
    }

    // D. Get active sort button
    const activeSortButton = document.querySelector('.sort-btn.active');
    if (activeSortButton && activeSortButton.dataset.sort) {
       queryParams.append('sort', activeSortButton.dataset.sort);
    }

    // --- 3. Fetch data from our new API route ---
    try {
      const response = await fetch(`/api/products?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const products = await response.json();

      // --- 4. Render the new products ---
      renderProducts(products);

    } catch (error) {
      console.error('Error fetching products:', error);
      productGrid.innerHTML = '<p>Error loading products. Please try again.</p>';
    }
  }

  // --- 5. The function to render products onto the page ---
  function renderProducts(products) {
    // Clear the grid
    productGrid.innerHTML = '';

    if (products.length === 0) {
      productGrid.innerHTML = '<p>No products match your filters.</p>';
      return;
    }

    // Loop through new products and build HTML
    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';

      // We can add the accent-bg class based on category
      if (product.category === 'parfait') {
        productCard.classList.add('accent-bg-1');
      } else if (product.category === 'tub') {
        productCard.classList.add('accent-bg-2');
      } else if (product.category === 'cone') {
        productCard.classList.add('accent-bg-3');
      }

      productCard.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <h4>${product.name}</h4>
        <p>$${product.price.toFixed(2)}</p>
      `;
      productGrid.appendChild(productCard);
    });
  }

  // --- 6. Add all event listeners ---

  // Listen for clicks on ANY filter checkbox
  filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', fetchAndRenderProducts);
  });

  // Listen for typing in the search bar (with a delay)
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    // "Debounce" - wait 300ms after user stops typing
    searchTimeout = setTimeout(fetchAndRenderProducts, 300);
  });

  // Listen for clicks on sort buttons
  sortButtons.forEach(button => {
    // --- THIS IS THE FIX ---
    // Removed the "F" from "()F =>"
    button.addEventListener('click', () => {
      // First, remove 'active' from all buttons
      sortButtons.forEach(btn => btn.classList.remove('active'));
      // Then, add 'active' to the one clicked
      button.classList.add('active');

      // Add data attributes to your HTML buttons to make this work
      // e.g., <button class="sort-btn" data-sort="price-asc">Price ascending</button>
      fetchAndRenderProducts();
    });
  });
});
