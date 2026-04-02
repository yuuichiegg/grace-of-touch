#!/usr/bin/env node
// seed-pricing.js — Firestore pricing コレクション初期データ投入
// 使い方: node scripts/seed-pricing.js
// Firebase Admin SDKを使用（サービスアカウントキーが必要）
// © 2024-2026 Grace of Touch Co. All rights reserved.

const admin = require('firebase-admin');

// Firebase初期化（環境変数 or サービスアカウント）
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'grace-of-touch',
  });
}

const db = admin.firestore();

// ============================================================
// Firestore pricing コレクション設計
// ============================================================
// pricing/{appId}
//   - title: string (アプリ名)
//   - category: "b2b" | "game" | "tool" | "content"
//   - active: boolean
//   - successPath: string (決済成功時リダイレクト先)
//   - cancelPath: string (決済キャンセル時リダイレクト先)
//   - plans: {
//       [planId]: {
//         name: string,
//         price: number (月額円、0=無料、-1=要相談)
//         annualPrice?: number (年払い月額)
//         interval: "month" | "year" | "one_time"
//         mode: "subscription" | "payment"
//         stripePriceId: string (Stripe Price ID — 本番時設定)
//         features: string[]
//       }
//     }
//   - dynamicPricing: {
//       enabled: boolean,
//       lastReviewedAt: Timestamp,
//       changeLog: [{ date, reason, oldPrice, newPrice }]
//     }
//   - updatedAt: Timestamp
// ============================================================

const pricingData = {
  // ===== B2B =====
  infrascan: {
    title: 'InfraScan AI',
    category: 'b2b',
    active: true,
    successPath: 'tunneldrone.html',
    cancelPath: 'tunneldrone.html',
    plans: {
      free: {
        name: 'デモモード',
        price: 0,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '', // Stripe審査後に設定
        features: ['3検出まで', '幅計測なし', '座標出力なし', 'ウォーターマーク付き'],
      },
      basic: {
        name: 'ベーシック',
        price: 9800,
        annualPrice: 7840,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['50枚/月', 'ひび割れ検出 + 幅計測', '座標出力 (CSV)', 'メールサポート'],
      },
      pro: {
        name: 'プロフェッショナル',
        price: 29800,
        annualPrice: 23840,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['無制限検出', 'DXF出力対応', '経年比較レイヤー', 'API連携', '優先サポート'],
      },
      payPerUse: {
        name: '従量課金',
        price: 500,
        interval: 'one_time',
        mode: 'payment',
        stripePriceId: '',
        features: ['1解析あたり¥500', '都度払い', 'クレジットカード決済'],
      },
      pack10: {
        name: '10回パック',
        price: 3980,
        interval: 'one_time',
        mode: 'payment',
        stripePriceId: '',
        features: ['10回分', '1回あたり¥398', '有効期限6ヶ月'],
      },
    },
    dynamicPricing: {
      enabled: true,
      lastReviewedAt: admin.firestore.Timestamp.now(),
      changeLog: [],
    },
  },

  // ===== B2B: イベント管理 =====
  eventgate: {
    title: 'Event Management Suite',
    category: 'b2b',
    active: true,
    successPath: 'eventgate.html',
    cancelPath: 'eventgate.html',
    plans: {
      free: {
        name: '無料プラン',
        price: 0,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['1イベント/月', '最大50名', '基本受付機能', 'QRコード発行'],
      },
      business: {
        name: 'ビジネス',
        price: 4980,
        annualPrice: 3984,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['無制限イベント', '参加者数無制限', 'QRコード受付', '同意書電子署名', '入退場管理', 'データエクスポート'],
      },
    },
    dynamicPricing: { enabled: false, lastReviewedAt: admin.firestore.Timestamp.now(), changeLog: [] },
  },

  // ===== ツール: GraceVox =====
  gracevox: {
    title: 'GraceVox',
    category: 'tool',
    active: true,
    successPath: 'gracevox.html',
    cancelPath: 'gracevox.html',
    plans: {
      free: {
        name: 'フリー',
        price: 0,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['音声入力', '基本校正', '5分/セッション'],
      },
      pro: {
        name: 'プロ',
        price: 500,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '', // STRIPE_PRICE_ID env varから移行予定
        features: ['無制限セッション', 'AI校正エンジン', 'エクスポート', '声紋分析'],
      },
    },
    dynamicPricing: { enabled: false, lastReviewedAt: admin.firestore.Timestamp.now(), changeLog: [] },
  },

  // ===== ゲーム: Mega Rocket =====
  rocket: {
    title: 'Mega Rocket Explorer',
    category: 'game',
    active: true,
    successPath: 'rocket.html',
    cancelPath: 'rocket.html',
    plans: {
      free: {
        name: 'フリー',
        price: 0,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['基本プレイ', '1機体'],
      },
      premium: {
        name: 'プレミアム',
        price: 300,
        interval: 'one_time',
        mode: 'payment',
        stripePriceId: '',
        features: ['全機体アンロック', 'カスタムパーツ', 'マルチプレイ'],
      },
    },
    dynamicPricing: { enabled: true, lastReviewedAt: admin.firestore.Timestamp.now(), changeLog: [] },
  },

  // ===== ゲーム: Panda World =====
  pandaworld: {
    title: 'Panda World',
    category: 'game',
    active: true,
    successPath: 'pandaworld.html',
    cancelPath: 'pandaworld.html',
    plans: {
      free: {
        name: 'フリー',
        price: 0,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['基本プレイ', 'パンダ1匹'],
      },
      premium: {
        name: 'プレミアム',
        price: 300,
        interval: 'one_time',
        mode: 'payment',
        stripePriceId: '',
        features: ['全パンダアンロック', 'カスタムアイテム', '浮島拡張'],
      },
    },
    dynamicPricing: { enabled: false, lastReviewedAt: admin.firestore.Timestamp.now(), changeLog: [] },
  },

  // ===== ツール: TrackForge =====
  trackforge: {
    title: 'TrackForge',
    category: 'tool',
    active: true,
    successPath: 'trackforge/',
    cancelPath: 'trackforge/',
    plans: {
      free: {
        name: 'フリー',
        price: 0,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['基本DTM機能', 'Podcast基本'],
      },
      pro: {
        name: 'プロ',
        price: 500,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['全機能アンロック', '432Hzチューナー', 'エクスポート無制限', '貢献度証明'],
      },
    },
    dynamicPricing: { enabled: false, lastReviewedAt: admin.firestore.Timestamp.now(), changeLog: [] },
  },

  // ===== ゲームサブスク =====
  allgames: {
    title: 'Grace Games Pass',
    category: 'game',
    active: true,
    successPath: 'index.html',
    cancelPath: 'index.html',
    plans: {
      monthly: {
        name: '月額パス',
        price: 500,
        interval: 'month',
        mode: 'subscription',
        stripePriceId: '',
        features: ['全ゲームプレイ可能', 'Mega Rocket', 'Panda World', 'AR Golf', 'TunnelDrone', '新作自動追加'],
      },
    },
    dynamicPricing: { enabled: true, lastReviewedAt: admin.firestore.Timestamp.now(), changeLog: [] },
  },
};

async function seed() {
  console.log('Firestore pricing コレクション投入開始...\n');

  for (const [appId, data] of Object.entries(pricingData)) {
    const docRef = db.collection('pricing').doc(appId);
    await docRef.set({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const planCount = Object.keys(data.plans).length;
    console.log(`  ✅ pricing/${appId} — ${data.title} (${planCount}プラン)`);
  }

  console.log(`\n完了: ${Object.keys(pricingData).length}アプリの料金データを投入しました`);
  console.log('\n⚠️  stripePriceIdは空です。Stripe審査完了後に各プランのPrice IDを設定してください。');
  console.log('   Stripe Dashboard → Products → 各商品のPrice IDをFirestoreに入力');
}

seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
