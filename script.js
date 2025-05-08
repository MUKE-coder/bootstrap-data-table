// Wait for document to be fully loaded
$(document).ready(function () {
  // Initialize date and time display
  updateDateTime();
  // Update time every second
  setInterval(updateDateTime, 1000);

  // Fetch data and initialize table
  initializeInventoryTable();
});

/**
 * Updates the current date and time displays
 */
function updateDateTime() {
  const now = new Date();

  // Format date: Day of week, Month Day, Year
  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const dateStr = now.toLocaleDateString("en-US", dateOptions);

  // Format time: Hours:Minutes:Seconds AM/PM
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };
  const timeStr = now.toLocaleTimeString("en-US", timeOptions);

  // Update elements
  $("#current-date").text(dateStr);
  $("#current-time").text(timeStr);
}

/**
 * Fetches inventory data from API and initializes the DataTable
 */
function initializeInventoryTable() {
  // Fetch data using jQuery Ajax from the API
  $.ajax({
    url: "https://v1.nocodeapi.com/jbwebdev/google_sheets/MATfwGAhcupKAcBv?tabId=products",
    dataType: "json",
    success: function (apiResponse) {
      // Check if the data exists and has the expected structure
      if (
        !apiResponse ||
        !apiResponse.data ||
        !Array.isArray(apiResponse.data)
      ) {
        console.error("Invalid API response format!");
        return;
      }

      // Transform the API data to match the expected format for DataTables
      const transformedData = apiResponse.data.map((item) => {
        return {
          id: item.ID,
          name: item.NAME,
          category: item.CATEGORY,
          current_stock: item["CURRENT STOCK"],
          supplier_contact: item["SUPPLIER CONTACT"],
          price: item.PRICE,
          cost_price: item["COST PRICE"],
        };
      });

      // Initialize DataTable with custom options
      const table = $("#inventoryTable").DataTable({
        data: transformedData,
        columns: [
          { data: "name", title: "Product Name" },
          { data: "category", title: "Category" },
          {
            data: "current_stock",
            title: "Current Stock",
            render: function (data, type, row) {
              if (type === "display") {
                // Convert to number for comparison
                const stockValue = parseInt(data, 10);
                let stockClass = "text-green-600 font-medium";
                if (stockValue <= 10) {
                  stockClass = "text-red-600 font-medium";
                } else if (stockValue <= 20) {
                  stockClass = "text-yellow-600 font-medium";
                }
                return '<span class="' + stockClass + '">' + data + "</span>";
              }
              return data;
            },
          },
          { data: "supplier_contact", title: "Supplier Contact" },
          {
            data: "price",
            title: "Price",
            render: function (data, type, row) {
              if (type === "display") {
                // Format as currency (UGX)
                return formatCurrency(data);
              }
              return data;
            },
          },
          {
            data: "cost_price",
            title: "Cost Price",
            render: function (data, type, row) {
              if (type === "display") {
                // Format as currency (UGX)
                return formatCurrency(data);
              }
              return data;
            },
          },
          {
            data: null,
            title: "Actions",
            defaultContent:
              '<div class="flex">' +
              '<button class="bg-blue-500 text-white p-1 rounded mr-1 edit-btn"><i class="fas fa-edit"></i></button>' +
              '<button class="bg-cyan-500 text-white p-1 rounded mr-1 view-btn"><i class="fas fa-eye"></i></button>' +
              '<button class="bg-red-500 text-white p-1 rounded delete-btn"><i class="fas fa-trash"></i></button>' +
              "</div>",
            orderable: false,
          },
        ],
        responsive: true,
        // Enable built-in search but hide it - we'll use custom search input
        searching: true,
        dom: 'rt<"mt-4 flex items-center justify-between"<"flex-1 text-sm text-gray-600"i><"flex"p>>',
        pageLength: 10,
        lengthChange: false, // Disable length change dropdown
        language: {
          info: "Showing _START_ to _END_ of _TOTAL_ entries",
          paginate: {
            first: '<i class="fas fa-angle-double-left"></i>',
            previous: '<i class="fas fa-angle-left"></i>',
            next: '<i class="fas fa-angle-right"></i>',
            last: '<i class="fas fa-angle-double-right"></i>',
          },
          search: "",
          searchPlaceholder: "Search...",
        },
        order: [[0, "asc"]],
        initComplete: function () {
          // Connect custom search input to DataTable search
          $("#search-input").on("keyup", function () {
            table.search($(this).val()).draw();
          });

          // Excel export button
          $("#btn-excel").on("click", function () {
            table.button(".buttons-excel").trigger();
          });

          // PDF export button
          $("#btn-pdf").on("click", function () {
            table.button(".buttons-pdf").trigger();
          });

          // Print button
          $("#btn-print").on("click", function () {
            table.button(".buttons-print").trigger();
          });

          // Apply custom styles to pagination
          stylePagination();
        },
        buttons: [
          {
            extend: "excel",
            text: "Excel",
            className: "buttons-excel hidden", // Hide default button
            exportOptions: {
              columns: [0, 1, 2, 3, 4, 5],
            },
            title: "Inventory Report",
          },
          {
            extend: "pdf",
            text: "PDF",
            className: "buttons-pdf hidden", // Hide default button
            exportOptions: {
              columns: [0, 1, 2, 3, 4, 5],
            },
            title: "Inventory Report",
          },
          {
            extend: "print",
            text: "Print",
            className: "buttons-print hidden", // Hide default button
            exportOptions: {
              columns: [0, 1, 2, 3, 4, 5],
            },
          },
        ],
        drawCallback: function () {
          // Apply Tailwind classes to table
          $("#inventoryTable").addClass("w-full");
          $("#inventoryTable tbody tr").addClass("hover:bg-gray-50");
          $("#inventoryTable tbody td").addClass(
            "px-4 py-3 text-sm text-gray-700 border-b"
          );

          // Re-apply pagination styles when table redraws
          stylePagination();
        },
      });

      // Update dashboard stats after table is loaded
      updateDashboardStats(transformedData);

      // Add event listeners for action buttons
      $("#inventoryTable").on("click", ".edit-btn", function () {
        const data = table.row($(this).closest("tr")).data();
        alert("Edit product: " + data.name);
      });

      $("#inventoryTable").on("click", ".view-btn", function () {
        const data = table.row($(this).closest("tr")).data();
        alert("View details for: " + data.name);
      });

      $("#inventoryTable").on("click", ".delete-btn", function () {
        const data = table.row($(this).closest("tr")).data();
        if (confirm("Are you sure you want to delete " + data.name + "?")) {
          alert("Product deleted: " + data.name);
        }
      });
    },
    error: function (xhr, status, error) {
      console.error("Error loading inventory data:", error);
      $("#inventoryTable tbody").html(
        '<tr><td colspan="7" class="px-4 py-3 text-center text-red-500">' +
          "Failed to load inventory data. Error: " +
          error +
          "</td></tr>"
      );
    },
  });
}

/**
 * Format number as UGX currency
 * @param {string|number} value - The value to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
  // Convert to number
  const numValue = parseInt(value, 10);

  // Format with commas
  return "UGX " + numValue.toLocaleString("en-US");
}

/**
 * Applies Tailwind CSS classes to DataTable pagination elements
 */
function stylePagination() {
  // Style pagination container
  $(".dataTables_paginate").addClass("flex items-center");

  // Style pagination buttons
  $(".paginate_button").each(function () {
    $(this).addClass("px-3 py-1 mx-1 text-sm rounded-md cursor-pointer");

    if ($(this).hasClass("current")) {
      $(this).addClass("bg-blue-500 text-white");
      $(this).removeClass("text-gray-700");
    } else {
      $(this).addClass("text-gray-700 hover:bg-gray-100");
    }

    if ($(this).hasClass("disabled")) {
      $(this).addClass("text-gray-400 cursor-not-allowed hover:bg-transparent");
    }
  });

  // Remove default styling that might conflict with Tailwind
  $(".paginate_button").css({
    "min-width": "auto",
    "margin-left": "0",
  });
}

/**
 * Updates the dashboard statistics
 */
function updateDashboardStats(data) {
  if (!data || !Array.isArray(data)) return;

  // Calculate stats
  const totalProducts = data.length;

  const lowStockItems = data.filter(function (item) {
    return parseInt(item.current_stock, 10) <= 10;
  }).length;

  // Calculate total inventory value
  let totalValue = 0;
  data.forEach(function (item) {
    const costPrice = parseInt(item.cost_price, 10);
    const stockQuantity = parseInt(item.current_stock, 10);
    if (!isNaN(costPrice) && !isNaN(stockQuantity)) {
      totalValue += costPrice * stockQuantity;
    }
  });

  // Get unique categories
  const categories = [];
  data.forEach(function (item) {
    if (categories.indexOf(item.category) === -1) {
      categories.push(item.category);
    }
  });
  const categoriesCount = categories.length;

  // Update UI with animation
  animateCounter("total-products", 0, totalProducts, 1000);
  animateCounter("low-stock", 0, lowStockItems, 1000);
  $("#inventory-value").text("UGX " + totalValue.toLocaleString("en-US"));
  animateCounter("categories-count", 0, categoriesCount, 1000);
}

/**
 * Animates a counter from start to end value over a duration
 * @param {string} elementId - The ID of the element to update
 * @param {number} start - Starting value
 * @param {number} end - Ending value
 * @param {number} duration - Duration in milliseconds
 */
function animateCounter(elementId, start, end, duration) {
  let startTimestamp = null;
  const element = document.getElementById(elementId);
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentValue = Math.floor(progress * (end - start) + start);
    element.textContent = currentValue;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = end;
    }
  };
  window.requestAnimationFrame(step);
}
