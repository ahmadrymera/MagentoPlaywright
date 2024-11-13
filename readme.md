# PlaywrightMagento Test Automation Project

This project is a test automation suite created for NRI recruitment, focusing on automating test scenarios for the Magento demo site (https://magento.softwaretestingboard.com/) using Playwright with JavaScript.

## Test Scenarios

The automation covers three main scenarios:

### 1. Search Box Functionality
- Verifies the search functionality using the keyword "Jacket"
- Validates that all search results contain the word "Jacket"

### 2. Sort Functionality
- Validates the price sorting functionality:
  - Sort by highest price first
  - Sort by lowest price first

### 3. Add to Cart Functionality
- Verifies the complete add-to-cart flow:
  - Product selection with size and color options
  - Add to cart notification display
  - Shopping cart content verification
  - Quantity update and subtotal recalculation

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/playwrightMagento.git
cd playwrightMagento
```