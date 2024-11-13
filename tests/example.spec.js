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
  // Fungsi helper untuk menunggu loading mask menghilang
  async function waitForLoadingMaskToDisappear(timeout = 30000) {
    try {
      await page.waitForSelector('.loading-mask', { state: 'hidden', timeout });
    } catch (error) {
      console.log('Loading mask timeout or not found');
    }
  }

  // Fungsi helper untuk menunggu dan retry dengan penanganan loading
  async function waitAndClick(selector, options = {}) {
    await page.waitForSelector(selector, { state: 'visible', timeout: 60000, ...options });
    await waitForLoadingMaskToDisappear();
    await page.click(selector);
  }

  // Fungsi helper untuk navigasi dengan retry
  async function navigateWithRetry(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.goto(url, { timeout: 120000, waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
        return;
      } catch (error) {
        console.log(`Navigation attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) throw error;
        await page.waitForTimeout(5000);
      }
    }
  }

  try {
    // 1. Buka halaman produk jacket
    await navigateWithRetry('https://magento.softwaretestingboard.com/men/tops-men/jackets-men.html');
    await waitForLoadingMaskToDisappear(60000);
    
    // 2. Pilih produk pertama
    await waitAndClick('.product-item-link:first-child');
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await waitForLoadingMaskToDisappear();

    // 3. Pilih ukuran dan warna
    await waitAndClick('.swatch-option.text[option-label="M"]');
    await waitAndClick('.swatch-option.color:first-child');
    await waitForLoadingMaskToDisappear();

    // 4. Tambahkan ke keranjang
    await waitAndClick('#product-addtocart-button');

    // 5. Verifikasi notifikasi "Add to cart"
    const successMessage = await page.waitForSelector('.message-success', {
      state: 'visible',
      timeout: 60000
    });
    expect(await successMessage.textContent()).toContain('You added');

    // 6. Tunggu sebentar sebelum membuka cart
    await page.waitForTimeout(5000);
    
    // Buka mini cart
    await waitAndClick('.action.showcart');
    await waitForLoadingMaskToDisappear();
    
    // Tunggu dan klik view cart
    await waitAndClick('.action.viewcart');
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await waitForLoadingMaskToDisappear(60000);

    // 7. Verifikasi isi keranjang belanja
    const cartItemDetails = await page.textContent('.item-info');
    expect(cartItemDetails).toContain('M');

    // 8. Update jumlah
    const qtyInput = await page.waitForSelector('input.qty', { timeout: 60000 });
    await qtyInput.click();
    await qtyInput.fill('2');
    
    // Catat subtotal awal
    const initialSubtotal = await page.textContent('.subtotal .price');

    // Klik update dengan penanganan loading
    await waitAndClick('button[name="update_cart_action"][value="update_qty"]');
    await waitForLoadingMaskToDisappear(60000);

    // Tunggu perubahan subtotal
    await page.waitForFunction(
      (oldSubtotal) => {
        const newSubtotal = document.querySelector('.subtotal .price')?.textContent;
        return newSubtotal && newSubtotal !== oldSubtotal;
      },
      initialSubtotal,
      { timeout: 90000 }
    );

    // Verifikasi subtotal baru
    await page.waitForTimeout(5000); // Tunggu update selesai
    const unitPrice = parseFloat((await page.textContent('.price-excluding-tax .price')).replace(/[^0-9.]/g, ''));
    const newSubtotal = parseFloat((await page.textContent('.subtotal .price')).replace(/[^0-9.]/g, ''));
    const expectedTotal = unitPrice * 2;
    
    expect(Math.abs(newSubtotal - expectedTotal)).toBeLessThan(0.01);

    console.log('Test berhasil: Add to Cart berfungsi dengan benar');
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: `add-to-cart-failure-${Date.now()}.png`, fullPage: true });
    throw error;
  }
});
});