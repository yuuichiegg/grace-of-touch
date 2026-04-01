# GraceVox Stripe Setup Guide

## 1. Stripeアカウント作成
https://dashboard.stripe.com/register (無料)

## 2. Stripe商品の作成
Stripeダッシュボード → 商品 → 「+商品を追加」
- 名前: GraceVox Pro
- 料金: ¥2,980/月（サブスクリプション）
- 作成後、Price IDをコピー（price_xxxxx）

## 3. Firebase Blazeプラン
Firebase Console → プロジェクト設定 → Blazeプランにアップグレード
（従量課金。Cloud Functionsの無料枠: 月125,000回呼び出し）

## 4. Dependencies インストール
```bash
cd functions
npm install
```

## 5. Firebase Functions config設定
```bash
firebase functions:config:set \
  stripe.secret="sk_live_xxxxx" \
  stripe.price_id="price_xxxxx" \
  stripe.webhook_secret="whsec_xxxxx"
```

## 6. デプロイ
```bash
firebase deploy --only functions
```

## 7. Stripe Webhook設定
Stripeダッシュボード → 開発者 → Webhooks → エンドポイント追加
- URL: https://us-central1-grace-of-touch.cloudfunctions.net/stripeWebhook
- イベント: checkout.session.completed, invoice.paid, customer.subscription.deleted
- 署名シークレットをコピー → Step 5のwebhook_secretに設定

## テスト
Stripeテストモード（sk_test_xxxxx）で先にテストしてから本番に切替
