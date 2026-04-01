// @ts-check
const { test, expect } = require('@playwright/test');

// デプロイ前確認テスト — Grace of Touch
// firebase serve --only hosting (port 5000) で起動済み前提

const BASE = 'http://localhost:5000';

// ===== GraceVox =====
test.describe('GraceVox', () => {
  test('ページが正常に読み込まれる', async ({ page }) => {
    await page.goto(`${BASE}/gracevox.html`);
    await expect(page).toHaveTitle(/GraceVox/);
    // 録音ボタンが存在する
    await expect(page.locator('#recBtn')).toBeVisible();
  });

  test('ログインボタンが1つだけ表示される', async ({ page }) => {
    await page.goto(`${BASE}/gracevox.html`);
    // ログインモーダルを開く
    await page.locator('#loginBtn').click();
    await page.waitForTimeout(500);
    // Googleログインボタンが1つだけ
    const googleBtns = page.locator('#googleLoginBtn');
    await expect(googleBtns).toHaveCount(1);
    // GIS renderButtonが表示されていない（重複防止）
    const gisBtn = page.locator('#googleSignInBtn');
    const gisCount = await gisBtn.count();
    if (gisCount > 0) {
      // 存在しても中身が空であること
      const inner = await gisBtn.innerHTML();
      expect(inner.trim()).toBe('');
    }
  });

  test('メール入力は折りたたまれている', async ({ page }) => {
    await page.goto(`${BASE}/gracevox.html`);
    await page.locator('#loginBtn').click();
    await page.waitForTimeout(300);
    // detailsタグが閉じている
    const details = page.locator('#loginEmailDetails');
    const isOpen = await details.getAttribute('open');
    expect(isOpen).toBeNull();
  });

  test('スクリーンショット撮影', async ({ page }) => {
    await page.goto(`${BASE}/gracevox.html`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/gracevox-main.png', fullPage: false });
    // ログインモーダル
    await page.locator('#loginBtn').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/gracevox-login.png', fullPage: false });
  });
});

// ===== Terminal =====
test.describe('Terminal', () => {
  test('ページが読み込まれる', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await expect(page).toHaveTitle(/Grace of Touch/);
  });

  test('主要リンクが存在する', async ({ page }) => {
    await page.goto(`${BASE}/index.html`);
    await page.waitForTimeout(2000);
    // Resonance Drum リンク
    const resLink = page.locator('a[href="resonance-drum.html"]');
    await expect(resLink.first()).toBeAttached();
    // Browser リンク
    const browserLink = page.locator('a[href="browser.html"]');
    await expect(browserLink.first()).toBeAttached();
  });
});

// ===== Browser =====
test.describe('Browser', () => {
  test('NTPが表示される', async ({ page }) => {
    await page.goto(`${BASE}/browser.html`);
    await expect(page).toHaveTitle(/Grace Browser/);
    await page.waitForTimeout(1000);
    // Music Studio セクション
    const studio = page.locator('text=MUSIC STUDIO');
    await expect(studio).toBeVisible();
  });

  test('スクリーンショット撮影', async ({ page }) => {
    await page.goto(`${BASE}/browser.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'tests/screenshots/browser-ntp.png', fullPage: false });
  });
});

// ===== 全ページ 404チェック =====
test.describe('全ページ読み込み確認', () => {
  const pages = [
    'index.html', 'gracevox.html', 'browser.html', 'records.html',
    'resonance-drum.html', 'pandaworld.html', 'rocket.html',
    'grace-engine-demo.html', 'tower.html'
  ];
  for (const p of pages) {
    test(`${p} が200を返す`, async ({ request }) => {
      const res = await request.get(`${BASE}/${p}`);
      expect(res.status()).toBe(200);
    });
  }
});
