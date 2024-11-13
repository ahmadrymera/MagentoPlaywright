const { test, expect } = require('@playwright/test');

test.describe('Magento Website Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set default timeout untuk page
    page.setDefaultTimeout(90000);

    // Tunggu sampai network idle
    await page.goto('https://magento.softwaretestingboard.com/', {
      waitUntil: 'networkidle',
      timeout: 90000
    });
  });

  test('1. Verify that search box is working properly', async ({ page }) => {
    try {
      // Tunggu sampai search box muncul dan bisa diinteraksi
      await page.waitForSelector('#search', { state: 'visible', timeout: 60000 });
      
      // Isi search box dengan kata kunci
      await page.fill('#search', 'Jacket');
      
      // Tekan enter dan tunggu sampai halaman hasil pencarian dimuat
      await page.press('#search', 'Enter');
      
      // Tunggu sampai network idle untuk memastikan semua produk sudah dimuat
      await page.waitForLoadState('networkidle', { timeout: 60000 });
      
      // Tunggu sampai produk pertama muncul
      await page.waitForSelector('.product-item', { 
        state: 'visible',
        timeout: 60000 
      });
  
      // Ambil semua produk yang ditampilkan
      const products = await page.$$('.product-item-name');
      
      // Pastikan ada produk yang ditemukan
      expect(products.length).toBeGreaterThan(0);
  
      // Periksa setiap nama produk mengandung kata 'jacket'
      for (const product of products) {
        const productName = await product.innerText();
        expect(productName.toLowerCase()).toContain('jacket');
      }
    } catch (error) {
      // Ambil screenshot jika terjadi error
      await page.screenshot({ path: `search-error-${Date.now()}.png` });
      throw error;
    }
  });
  
  test('2. Verify that Sort functionality is working properly', async ({ page }) => {
    try {
      // Buka halaman jaket pria dan tunggu sampai halaman selesai dimuat
      await page.goto('https://magento.softwaretestingboard.com/men/tops-men/jackets-men.html', {
        waitUntil: 'networkidle',
        timeout: 90000
      });
  
      // Fungsi helper untuk menunggu pengurutan selesai
      async function waitForSorting() {
        await page.waitForLoadState('networkidle', { timeout: 60000 });
        // Tunggu animasi loading selesai jika ada
        await page.waitForSelector('.loading-mask', { state: 'hidden', timeout: 60000 }).catch(() => {});
      }
  
      // Fungsi helper untuk mendapatkan daftar harga
      async function getPrices() {
        await waitForSorting();
        return page.$$eval('.price-wrapper', elements => 
          elements.map(e => parseFloat(e.getAttribute('data-price-amount')))
        );
      }
  
      // Tunggu dropdown sorter muncul
      await page.waitForSelector('#sorter', { state: 'visible', timeout: 60000 });
  
      // Pilih pengurutan berdasarkan harga
      await page.selectOption('#sorter', 'price');
  
      // Klik tombol untuk mengurutkan dari tertinggi
      await page.waitForSelector('.sorter-action[title="Set Descending Direction"]', {
        state: 'visible',
        timeout: 60000
      });
      await page.click('.sorter-action[title="Set Descending Direction"]');
  
      // Ambil daftar harga setelah pengurutan tertinggi
      let prices = await getPrices();
      console.log('Prices after descending sort:', prices);
  
      // Verifikasi urutan harga dari tertinggi ke terendah
      const sortedPricesDesc = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sortedPricesDesc);
  
      // Klik tombol untuk mengurutkan dari terendah
      await page.waitForSelector('.sorter-action[title="Set Ascending Direction"]', {
        state: 'visible',
        timeout: 60000
      });
      await page.click('.sorter-action[title="Set Ascending Direction"]');
  
      // Ambil daftar harga setelah pengurutan terendah
      prices = await getPrices();
      console.log('Prices after ascending sort:', prices);
  
      // Verifikasi urutan harga dari terendah ke tertinggi
      const sortedPricesAsc = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPricesAsc);
    } catch (error) {
      console.error('Error during sorting test:', error);
      // Ambil screenshot jika terjadi error
      await page.screenshot({ path: `sort-error-${Date.now()}.png` });
      throw error;
    }
  });
  
  test('3. Verify "Add to Cart" is working correctly', async ({ page }) => {
    // Fungsi helper untuk menunggu dan retry
    async function waitForElementWithRetry(selector, options = {}) {
      const maxRetries = 3;
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          await page.waitForSelector(selector, { 
            timeout: 60000,
            ...options 
          });
          return;
        } catch (error) {
          retries++;
          if (retries === maxRetries) throw error;
          // Tunggu sebentar sebelum retry
          await page.waitForTimeout(5000);
        }
      }
    }

    try {
      // Buka halaman produk jacket dengan networkidle
      await page.goto('https://magento.softwaretestingboard.com/men/tops-men/jackets-men.html', {
        waitUntil: 'networkidle',
        timeout: 90000
      });
      
      // Tunggu dan klik produk pertama
      await waitForElementWithRetry('.product-item-link:first-child');
      await page.click('.product-item-link:first-child');

      // Tunggu halaman detail produk
      await page.waitForLoadState('networkidle');

      // Pilih ukuran dengan retry
      await waitForElementWithRetry('.swatch-option.text[option-label="M"]');
      await page.click('.swatch-option.text[option-label="M"]');

      // Pilih warna dengan retry
      await waitForElementWithRetry('.swatch-option.color:first-child');
      await page.click('.swatch-option.color:first-child');

      // Tambah ke cart
      await waitForElementWithRetry('#product-addtocart-button');
      await page.click('#product-addtocart-button');

      // Verifikasi pesan sukses dengan timeout yang lebih lama
      await waitForElementWithRetry('.message-success', { timeout: 65000 });
      const successMessage = await page.textContent('.message-success');
      expect(successMessage).toContain('You added');

      // Buka cart dengan retry
      await waitForElementWithRetry('.action.showcart');
      await page.click('.action.showcart');
      
      await waitForElementWithRetry('.action.viewcart');
      await page.click('.action.viewcart');

      // Tunggu halaman cart
      await page.waitForLoadState('networkidle');
      await waitForElementWithRetry('.cart-container');

      // Verifikasi detail produk
      const cartItemDetails = await page.textContent('.item-info');
      expect(cartItemDetails).toContain('M');

      // Update quantity dengan retry
      await waitForElementWithRetry('input.qty');
      const initialSubtotalElement = await page.waitForSelector('.subtotal .price');
      const initialSubtotal = await initialSubtotalElement.textContent();

      await page.fill('input.qty', '2');
      await page.click('button[name="update_cart_action"][value="update_qty"]');

      // Tunggu perubahan subtotal dengan timeout yang lebih lama
      await page.waitForFunction(
        (oldSubtotal) => {
          const subtotalElement = document.querySelector('.subtotal .price');
          return subtotalElement && subtotalElement.textContent !== oldSubtotal;
        },
        initialSubtotal,
        { timeout: 65000 }
      );

      // Verifikasi subtotal baru
      const priceElement = await page.waitForSelector('.price-excluding-tax .price');
      const priceText = await priceElement.textContent();
      const unitPrice = parseFloat(priceText.replace('$', ''));

      const updatedSubtotalElement = await page.waitForSelector('.subtotal .price');
      const updatedSubtotalText = await updatedSubtotalElement.textContent();
      const newSubtotal = parseFloat(updatedSubtotalText.replace('$', ''));
      
      const expectedTotal = unitPrice * 2;
      expect(Math.abs(newSubtotal - expectedTotal)).toBeLessThan(0.01);

    } catch (error) {
      // Ambil screenshot jika test gagal
      await page.screenshot({ path: `failure-${Date.now()}.png` });
      throw error;
    }
  });
});