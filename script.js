/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Show initial placeholder */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  window.allProducts = data.products;
  return data.products;
}

/* Store selected product IDs as strings */
const selectedProductIds = new Set();

/* Load selected product IDs from localStorage */
function loadSelectedFromStorage() {
  const saved = localStorage.getItem("selectedProductIds");
  if (saved) {
    try {
      const arr = JSON.parse(saved);
      arr.forEach((id) => selectedProductIds.add(id));
    } catch {}
  }
}

/* Save selected product IDs to localStorage */
function saveSelectedToStorage() {
  localStorage.setItem("selectedProductIds", JSON.stringify(Array.from(selectedProductIds)));
}

/* Clear all selections */
function clearAllSelections() {
  selectedProductIds.clear();
  saveSelectedToStorage();
  updateSelectedProducts();
  // Also update the grid
  const cards = productsContainer.querySelectorAll(".product-card.selected");
  cards.forEach((card) => card.classList.remove("selected"));
}

/* Update the Selected Products section */
function updateSelectedProducts() {
  const selected = (window.allProducts || []).filter((product) =>
    selectedProductIds.has(product.id.toString())
  );

  if (selected.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    // Show clear button only if there are items
    const clearBtn = document.getElementById("clearSelectionsBtn");
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }

  // Add a "Clear All" button above the list
  selectedProductsList.innerHTML =
    `<button id="clearSelectionsBtn" style="margin-bottom:10px;padding:6px 14px;font-size:15px;cursor:pointer;background:#eee;border:1px solid #ccc;border-radius:6px;">Clear All</button>` +
    selected
      .map(
        (product) => `
        <div class="product-card selected" style="flex:0 1 180px;min-height:auto;position:relative;">
          <button class="remove-selected-btn" data-product-id="${product.id}" title="Remove" style="position:absolute;top:8px;right:8px;background:#fff;border:1px solid #ccc;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:18px;line-height:1;">&times;</button>
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button class="toggle-desc-btn" data-product-id="${product.id}" style="margin-top:8px;font-size:13px;padding:2px 8px;cursor:pointer;">Show Description</button>
            <p class="product-desc" style="font-size:13px;color:#333;margin-top:8px;display:none;">${product.description}</p>
          </div>
        </div>
      `
      )
      .join("");

  // "Clear All" button event
  const clearBtn = document.getElementById("clearSelectionsBtn");
  if (clearBtn) {
    clearBtn.style.display = "block";
    clearBtn.onclick = clearAllSelections;
  }

  // Remove button event listeners
  const removeBtns = selectedProductsList.querySelectorAll(".remove-selected-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const productId = btn.getAttribute("data-product-id");
      selectedProductIds.delete(productId);
      saveSelectedToStorage();
      const card = productsContainer.querySelector(`.product-card[data-product-id="${productId}"]`);
      if (card) card.classList.remove("selected");
      updateSelectedProducts();
      e.stopPropagation();
    });
  });

  // Toggle description event listeners
  const toggleBtns = selectedProductsList.querySelectorAll(".toggle-desc-btn");
  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const desc = btn.parentElement.querySelector(".product-desc");
      if (desc.style.display === "none") {
        desc.style.display = "block";
        btn.textContent = "Hide Description";
      } else {
        desc.style.display = "none";
        btn.textContent = "Show Description";
      }
    });
  });
}

/* Render product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProductIds.has(product.id.toString()) ? " selected" : ""
    }" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="toggle-desc-btn" data-product-id="${product.id}" style="margin-top:8px;font-size:13px;padding:2px 8px;cursor:pointer;">Show Description</button>
        <p class="product-desc" style="font-size:13px;color:#333;margin-top:8px;display:none;">${product.description}</p>
      </div>
    </div>
  `
    )
    .join("");

  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const productId = card.getAttribute("data-product-id");
      if (selectedProductIds.has(productId)) {
        selectedProductIds.delete(productId);
        card.classList.remove("selected");
      } else {
        selectedProductIds.add(productId);
        card.classList.add("selected");
      }
      saveSelectedToStorage();
      updateSelectedProducts();
    });
  });

  const toggleBtns = productsContainer.querySelectorAll(".toggle-desc-btn");
  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const desc = btn.parentElement.querySelector(".product-desc");
      if (desc.style.display === "none") {
        desc.style.display = "block";
        btn.textContent = "Hide Description";
      } else {
        desc.style.display = "none";
        btn.textContent = "Show Description";
      }
    });
  });

  updateSelectedProducts();
}

/* On page load, restore selections from localStorage */
window.addEventListener("DOMContentLoaded", async () => {
  loadSelectedFromStorage();
  // Optionally, load a default category or wait for user to select
  // If you want to show previously selected category, add code here
  // Otherwise, just update the selected products section
  updateSelectedProducts();
});

/* Filter products on category change */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
});

/* Store chat history for context */
let chatHistory = [];

/* Collect selected products and send to OpenAI API for the initial routine */
async function generateRoutine(selectedProducts) {
  const productsData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  // Start a new chat history for a new routine
  chatHistory = [
    {
      role: "system",
      content:
        "You are a helpful beauty and skincare assistant. Only answer questions about the generated routine, skincare, haircare, makeup, fragrance, or related beauty topics. If the question is unrelated, politely refuse.",
    },
    {
      role: "system",
      content:
        "You are a skincare expert. Create a simple, step-by-step skincare routine using only the provided products. Explain why each product is used and in what order.",
    },
    {
      role: "user",
      content: `Here are the selected products as JSON:\n${JSON.stringify(
        productsData,
        null,
        2
      )}`,
    },
  ];

  chatWindow.innerHTML = "Generating your routine...";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add assistant's reply to chat history
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      chatWindow.innerHTML = `<pre style="white-space:pre-wrap;">${data.choices[0].message.content}</pre>`;
    } else {
      chatWindow.innerHTML = "Sorry, something went wrong. Please try again.";
    }
  } catch (error) {
    chatWindow.innerHTML = "Error connecting to OpenAI API.";
  }
}

/* Chat form submission handler - for follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = chatForm.querySelector("input[type='text']");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  // If no routine has been generated, require product selection first
  if (chatHistory.length === 0) {
    chatWindow.innerHTML = "Please select products and generate a routine first.";
    return;
  }

  // Add user's question to chat history
  chatHistory.push({
    role: "user",
    content: userMessage,
  });

  // Show user's question in chat window (optional, for a chat-like feel)
  chatWindow.innerHTML += `<div style="margin-top:12px;"><strong>You:</strong> ${userMessage}</div>`;
  chatWindow.innerHTML += `<div style="margin-top:12px;">Thinking...</div>`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    // Remove "Thinking..." message
    chatWindow.innerHTML = chatWindow.innerHTML.replace(/Thinking\.\.\.<\/div>$/, "");

    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add assistant's reply to chat history
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      chatWindow.innerHTML += `<div style="margin-top:12px;"><strong>AI:</strong> <pre style="white-space:pre-wrap;display:inline;">${data.choices[0].message.content}</pre></div>`;
    } else {
      chatWindow.innerHTML += "<div>Sorry, something went wrong. Please try again.</div>";
    }
  } catch (error) {
    chatWindow.innerHTML += "<div>Error connecting to OpenAI API.</div>";
  }

  input.value = "";
});

/* Generate routine button handler (if you have a separate button) */
const generateButton = document.getElementById("generateRoutine");
if (generateButton) {
  generateButton.addEventListener("click", async () => {
    const allProducts = window.allProducts || [];
    const selected = allProducts.filter((product) =>
      selectedProductIds.has(product.id.toString())
    );
    if (selected.length === 0) {
      chatWindow.innerHTML = "Please select at least one product to generate a routine.";
      return;
    }
    generateRoutine(selected);
  });
}

/* RTL support: toggle RTL mode by adding/removing 'rtl' class on <body> or <html> */
/* Example: add a button or detect language, then call setRTL(true) or setRTL(false) */
function setRTL(isRTL) {
  document.body.classList.toggle('rtl', isRTL);
  document.documentElement.classList.toggle('rtl', isRTL);
}

// Example usage: setRTL(true); // Enable RTL
// Example usage: setRTL(false); // Disable RTL

// Optionally, auto-detect RTL language (like Arabic/Hebrew) and enable RTL
// function autoDetectRTL() {
//   const rtlLangs = ['ar', 'he', 'fa', 'ur'];
//   const lang = navigator.language || '';
//   setRTL(rtlLangs.some(l => lang.startsWith(l)));
// }
// window.addEventListener("DOMContentLoaded", autoDetectRTL);
