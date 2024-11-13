const { test, expect } = require('@playwright/test');

test.describe('Magento Website Tests', () => {
  // Helper functions untuk menunggu loading mask menghilang
  const waitForLoadingMaskToDisappear = async (page, timeout = 30000) => {
    await page.waitForSelector('.loading-mask', { 
      state: 'hidden', 
      timeout 
    }).catch(() => {});
  };

  // Helper functions untuk menunggu elemen muncul dan bisa diklik
  const waitAndClick = async (page, selector, options = {}) => {
    await page.waitForSelector(selector, { 
      state: 'visible', 
      timeout: 60000, 
      ...options 
    });
    await waitForLoadingMaskToDisappear(page);
    await page.click(selector);
  };

  // Setup awal sebelum setiap test dijalankan
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(90000);
    await page.goto('https://magento.softwaretestingboard.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });
  });

  // Test Case 1: Memverifikasi fungsi search box
  test('1. Verify that search box is working properly', async ({ page }) => {
    // Tunggu search box muncul dan isi dengan kata kunci
    await page.waitForSelector('#search', { state: 'visible' });
    await page.fill('#search', 'Jacket');
    await page.press('#search', 'Enter');
    
    // Tunggu hasil pencarian dimuat
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.product-item-link', { state: 'visible' });

    // Ambil semua nama produk hasil pencarian
    const productNames = await page.$$eval('.product-item-link', 
      elements => elements.map(el => el.textContent.trim())
    );
    
    // Verifikasi hasil pencarian
    expect(productNames.length).toBeGreaterThan(0);
    expect(productNames.some(name => name.toLowerCase().includes('jacket'))).toBeTruthy();
  });

  // Test Case 2: Memverifikasi fungsi pengurutan (sort)
  test('2. Verify that Sort functionality is working properly', async ({ page }) => {
    // Buka halaman jaket pria
    await page.goto('https://magento.softwaretestingboard.com/men/tops-men/jackets-men.html', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
  
    // Fungsi untuk memastikan semua elemen sudah terender dengan sempurna
    async function waitForFullRender() {
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('.loading-mask', { state: 'hidden' }).catch(() => {});
      await page.waitForSelector('.product-item-info', { state: 'visible' });
      await page.waitForSelector('.price-box', { state: 'visible' });
      // Pastikan semua harga sudah dimuat dengan benar
      await page.waitForFunction(() => {
        const prices = document.querySelectorAll('.price-wrapper');
        return prices.length > 0 && Array.from(prices).every(price => price.getAttribute('data-price-amount'));
      });
    }
  
    // Fungsi untuk mengambil daftar harga produk
    async function getPrices() {
      await waitForFullRender();
      return page.$$eval('.price-wrapper', elements => 
        elements.map(e => parseFloat(e.getAttribute('data-price-amount')))
      );
    }
  
    await waitForFullRender();
  
    // Urutkan berdasarkan harga
    await page.selectOption('#sorter', 'price');
    await waitForFullRender();
  
    // Urutkan dari harga tertinggi ke terendah
    await page.click('.sorter-action[title="Set Descending Direction"]');
    await waitForFullRender();
    let prices = await getPrices();
    console.log('Harga setelah diurutkan menurun:', prices);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  
    // Urutkan dari harga terendah ke tertinggi
    await page.click('.sorter-action[title="Set Ascending Direction"]');
    await waitForFullRender();
    prices = await getPrices();
    console.log('Harga setelah diurutkan menaik:', prices);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });  
  
  // Test Case 3: Memverifikasi fungsi Add to Cart
  test('3. Verify "Add to Cart" is working correctly', async ({ page }) => {
    // Buka halaman jaket pria
    await page.goto('https://magento.softwaretestingboard.com/men/tops-men/jackets-men.html', {
      waitUntil: 'domcontentloaded'
    });
    await waitForLoadingMaskToDisappear(page);

    // Pilih produk pertama
    await waitAndClick(page, '.product-item-link:first-child');
    await waitForLoadingMaskToDisappear(page);

    // Pilih ukuran dan warna
    await waitAndClick(page, '.swatch-option.text[option-label="M"]');
    await waitAndClick(page, '.swatch-option.color:first-child');

    // Tambahkan ke keranjang
    await waitAndClick(page, '#product-addtocart-button');
    
    // Verifikasi pesan sukses
    const successMessage = await page.waitForSelector('.message-success');
    expect(await successMessage.textContent()).toContain('You added');

    // Buka halaman keranjang
    await page.waitForTimeout(2000);
    await waitAndClick(page, '.action.showcart');
    await waitAndClick(page, '.action.viewcart');
    await waitForLoadingMaskToDisappear(page);

    // Verifikasi isi keranjang
    const cartItemDetails = await page.textContent('.item-info');
    expect(cartItemDetails).toContain('M');

    // Update jumlah barang
    const qtyInput = await page.waitForSelector('input.qty');
    await qtyInput.fill('2');
    
    // Simpan subtotal awal untuk perbandingan
    const initialSubtotal = await page.textContent('.subtotal .price');
    await waitAndClick(page, 'button[name="update_cart_action"][value="update_qty"]');
    
    // Verifikasi total setelah update
    await page.waitForTimeout(2000);
    const unitPrice = parseFloat((await page.textContent('.price-excluding-tax .price'))
      .replace(/[^0-9.]/g, ''));
    const newSubtotal = parseFloat((await page.textContent('.subtotal .price'))
      .replace(/[^0-9.]/g, ''));
    
    // Pastikan total harga sesuai dengan jumlah barang
    expect(Math.abs(newSubtotal - (unitPrice * 2))).toBeLessThan(0.01);
  });
});
