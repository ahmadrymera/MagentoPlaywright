// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  
  /* Mengurangi paralelisme untuk menghindari overload pada website yang lambat */
  fullyParallel: false,
  
  /* Menambah jumlah retry untuk menangani kegagalan karena lambatnya website */
  retries: process.env.CI ? 2 : 1,
  
  /* Mengurangi jumlah workers untuk menghindari overload */
  workers: process.env.CI ? 1 : 3,
  
  reporter: 'html',

  timeout: 120000, // Global timeout
  expect: {
    timeout: 60000, // Timeout for expect statements
  },

  use: {
    /* Mengaktifkan trace untuk semua test untuk memudahkan debugging */
    trace: 'on',

    /* Meningkatkan timeout untuk navigasi dan aksi */
    navigationTimeout: 90000,
    actionTimeout: 60000,

    /* Menambahkan konfigurasi browser untuk menangani website yang lambat */
    launchOptions: {
      slowMo: 100,  // Menambah delay 100ms antar aksi
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials'
      ]
    },

    /* Mengambil screenshot saat test gagal */
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },  // Menetapkan ukuran viewport yang konsisten
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
