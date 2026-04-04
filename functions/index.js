const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https = require("https");
admin.initializeApp();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = "https://grace-of-touch.web.app";

// Legacy single price (GraceVox backward compat)
const PRICE_ID = process.env.STRIPE_PRICE_ID;

// ============================================================
// AI Proofreading Engine (Patent Pending — Server-side only)
// © 2024-2026 Grace of Touch Co. All rights reserved.
// ============================================================

// Proper name corrections (voice recognition misrecognitions)
const PROPER_NAMES = [
  [/グレイスボックス|グレースボックス|グレイスボイス/g, 'GraceVox'],
  [/グレースオブタッチ|グレイスオブタッチ|プレイスボックス|ブレースボックス|ブレスオブタッチ|グライスオブタッチ/g, 'Grace of Touch'],
  [/トラックフォン[ジズ]?|トラックホン[ジズ]?|トラックフォルジュ/g, 'TrackForge'],
  [/トンネルスキャン/g, 'TunnelScan'],
  [/ウォールガード/g, 'WallGuard'],
  [/メガロケット/g, 'Mega Rocket'],
  [/ドリームオン/g, 'Dream On'],
  [/ファイアーベース|ファイヤーベース/g, 'Firebase'],
  [/クロードコード|クロウドコード/g, 'Claude Code'],
  [/クロード(?=で|に|が|は|の|を)/g, 'Claude'],
  [/ジェミニ/g, 'Gemini'],
  [/スペースエックス/g, 'SpaceX'],
  [/ギットハブ|ギッドハブ/g, 'GitHub'],
  [/リアクト/g, 'React'],
  [/スリージェーエス|スリーJS/g, 'Three.js'],
  [/テイルウィンド/g, 'Tailwind'],
  [/レコーズ(?=で|に|が|は|の|を|ページ)/g, 'Records'],
  [/グレースオブタッチレコーズ|グレイスオブタッチレコーズ/g, 'Grace of Touch Records'],
  [/ドローンガード/g, 'DroneGuard'],
  [/トンネルドローン/g, 'TunnelDrone'],
  [/パンダワールド/g, 'Panda World'],
  [/ロケットキャド|ロケットカド/g, 'RocketCAD'],
  [/エッグビレッジ/g, 'Egg Village'],
  [/アンチグラビティ|アンチグウラビティ/g, 'Antigravity'],
  [/プレイライト/g, 'Playwright'],
  [/タイプスクリプト/g, 'TypeScript'],
  [/ジャバスクリプト/g, 'JavaScript'],
  [/ファイアストア/g, 'Firestore'],
  [/ブレンダー(?=で|に|が|は|の|を|MCP)/g, 'Blender'],
  [/オブシディアン/g, 'Obsidian'],
  [/ノーション/g, 'Notion'],
];

// Homophone corrections (context-aware)
const HOMOPHONES = [
  [/正門/g, '声紋'],
  [/専門(?=の|が|は|を|で|ビジュアライザー|表示|分析)/g, '声紋'],
  [/感じの変換/g, '漢字の変換'],
  [/変換した感じ/g, '変換した漢字'],
  [/番組があります/g, '場合があります'],
];

// Server-side proofread function
function serverProofread(text) {
  let r = text;
  const corrections = [];

  PROPER_NAMES.forEach(([pattern, replacement]) => {
    r = r.replace(pattern, (match) => {
      if (match !== replacement) corrections.push({ orig: match, corrected: replacement });
      return replacement;
    });
  });

  HOMOPHONES.forEach(([pattern, replacement]) => {
    r = r.replace(pattern, (match) => {
      if (match !== replacement) corrections.push({ orig: match, corrected: replacement });
      return replacement;
    });
  });

  // Duplicate particles removal
  r = r.replace(/([をにがはで])([をにがはで])\1/g, '$1$2');

  return { text: r, corrections };
}

// ============================================================
// Interim Copy Technology (Patent Pending — Server-side only)
// © 2024-2026 Grace of Touch Co. All rights reserved.
// ============================================================

// Japanese filler words for removal
const FILLERS_JA = ['えーと','えっと','あのー','あの','えー','ええと','まあ','そのー','その','なんか','こう','ほら','ね','さ','うーん','うん','ああ','あー'];

// Similarity detection for retake/correction (言い直し検出)
function isSimilar(a, b) {
  if (!a || !b) return false;
  const na = a.replace(/[。、！？\s]/g, ''), nb = b.replace(/[。、！？\s]/g, '');
  if (na.length < 2 || nb.length < 2) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  let prefixMatch = 0;
  for (let i = 0; i < Math.min(na.length, nb.length); i++) {
    if (na[i] === nb[i]) prefixMatch++; else break;
  }
  if (prefixMatch >= 3 && prefixMatch / Math.max(na.length, nb.length) > 0.4) return true;
  let common = 0;
  const shorter = na.length <= nb.length ? na : nb, longer = na.length > nb.length ? na : nb;
  const used = new Set();
  for (let i = 0; i < shorter.length; i++) {
    const idx = longer.indexOf(shorter[i], 0);
    if (idx !== -1 && !used.has(idx)) { common++; used.add(idx); }
  }
  return common / Math.max(na.length, nb.length) > 0.5;
}

// Server-side text cleaning (filler removal + proofreading)
function serverClean(text, options = {}) {
  let r = text;
  // Filler removal
  if (options.removeFiller !== false) {
    FILLERS_JA.forEach(f => {
      r = r.replace(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    });
  }
  // Apply proofreading
  const proofResult = serverProofread(r);
  r = proofResult.text;
  // Clean up whitespace
  r = r.replace(/\s{2,}/g, ' ').trim();
  return { text: r, corrections: proofResult.corrections };
}

// Cloud Function: Interim Copy Processing API
exports.interimProcess = functions.https.onCall(async (data, context) => {
  const { text, sentences, lang, options } = data;
  if (!text || typeof text !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "text is required");
  }
  if (text.length > 10000) {
    throw new functions.https.HttpsError("invalid-argument", "text too long (max 10000)");
  }
  if (lang && !lang.startsWith("ja")) {
    return { text, sentences: sentences || [], corrections: [] };
  }

  // Clean and proofread the new text
  const cleaned = serverClean(text, options || {});

  // Retake detection: compare against existing sentences
  const resultSentences = Array.isArray(sentences) ? [...sentences] : [];
  if (options && options.smartCorrection !== false && resultSentences.length > 0) {
    const lastIdx = resultSentences.length - 1;
    if (isSimilar(resultSentences[lastIdx], cleaned.text)) {
      resultSentences[lastIdx] = cleaned.text; // Replace with retake
    } else if (resultSentences.length > 1 && isSimilar(resultSentences[lastIdx - 1], cleaned.text)) {
      resultSentences[lastIdx - 1] = cleaned.text;
      resultSentences.splice(lastIdx, 1);
    } else {
      resultSentences.push(cleaned.text);
    }
  } else {
    resultSentences.push(cleaned.text);
  }

  return {
    text: cleaned.text,
    sentences: resultSentences,
    finalTranscript: resultSentences.join(''),
    corrections: cleaned.corrections,
  };
});

// Cloud Function: AI Proofreading API
exports.proofread = functions.https.onCall(async (data, context) => {
  const { text, lang } = data;
  if (!text || typeof text !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "text is required");
  }
  if (text.length > 10000) {
    throw new functions.https.HttpsError("invalid-argument", "text too long (max 10000)");
  }
  // Only Japanese proofreading for now
  if (lang && !lang.startsWith("ja")) {
    return { text, corrections: [] };
  }
  return serverProofread(text);
});

// Create Stripe Checkout Session (multi-app対応)
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "ログインが必要です");
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email || "";
  const { appId, planId, mode: payMode } = data;

  let priceId = PRICE_ID;
  let checkoutMode = "subscription";
  let successUrl = `${APP_URL}/gracevox.html?payment=success`;
  let cancelUrl = `${APP_URL}/gracevox.html?payment=cancel`;

  // appIdが指定されている場合、Firestoreのpricingから取得
  if (appId && planId) {
    const db = admin.firestore();
    const pricingDoc = await db.collection("pricing").doc(appId).get();
    if (!pricingDoc.exists) {
      throw new functions.https.HttpsError("not-found", `アプリ ${appId} の料金設定が見つかりません`);
    }
    const pricing = pricingDoc.data();
    const plan = pricing.plans?.[planId];
    if (!plan || !plan.stripePriceId) {
      throw new functions.https.HttpsError("not-found", `プラン ${planId} が見つかりません`);
    }
    priceId = plan.stripePriceId;
    checkoutMode = plan.mode || "subscription"; // "subscription" or "payment"
    successUrl = `${APP_URL}/${pricing.successPath || appId + '.html'}?payment=success`;
    cancelUrl = `${APP_URL}/${pricing.cancelPath || appId + '.html'}?payment=cancel`;
  }

  // 従量課金の場合
  if (payMode === "payment") checkoutMode = "payment";

  const session = await stripe.checkout.sessions.create({
    mode: checkoutMode,
    payment_method_types: ["card"],
    customer_email: email,
    metadata: { firebaseUID: uid, appId: appId || "gracevox", planId: planId || "pro" },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: "ja",
  });

  return { url: session.url };
});

// Firestore pricing一覧取得（フロントエンド用）
exports.getPricing = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();
  const { appId } = data;

  if (appId) {
    const doc = await db.collection("pricing").doc(appId).get();
    if (!doc.exists) return null;
    const d = doc.data();
    // stripePriceIdは公開しない
    const plans = {};
    for (const [k, v] of Object.entries(d.plans || {})) {
      plans[k] = { name: v.name, price: v.price, interval: v.interval, features: v.features, mode: v.mode };
    }
    return { id: doc.id, title: d.title, plans };
  }

  // 全アプリの料金一覧
  const snap = await db.collection("pricing").where("active", "==", true).get();
  return snap.docs.map(doc => {
    const d = doc.data();
    const plans = {};
    for (const [k, v] of Object.entries(d.plans || {})) {
      plans[k] = { name: v.name, price: v.price, interval: v.interval, features: v.features, mode: v.mode };
    }
    return { id: doc.id, title: d.title, category: d.category, plans };
  });
});

// Stripe Webhook — subscription lifecycle
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const db = admin.firestore();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const uid = session.metadata?.firebaseUID;
      if (!uid) break;

      const appId = session.metadata?.appId || "gracevox";
      const planId = session.metadata?.planId || "pro";

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const periodEnd = new Date(subscription.current_period_end * 1000);

        await db.collection("subscriptions").doc(uid).set({
          [appId]: {
            plan: planId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            expiresAt: admin.firestore.Timestamp.fromDate(periodEnd),
          },
          // Legacy flat field for backward compat
          ...(appId === "gracevox" ? { plan: planId } : {}),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`${appId}/${planId} activated for ${uid} until ${periodEnd.toISOString()}`);
      } else {
        // 買い切り（payment mode）
        await db.collection("subscriptions").doc(uid).set({
          [appId]: {
            plan: planId,
            type: "one_time",
            purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`${appId}/${planId} one-time purchase for ${uid}`);
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      if (!invoice.subscription) break;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      const uid = sub.metadata?.firebaseUID;
      if (!uid) break;

      const appId = sub.metadata?.appId || "gracevox";
      const planId = sub.metadata?.planId || "pro";
      const periodEnd = new Date(sub.current_period_end * 1000);

      await db.collection("subscriptions").doc(uid).set({
        [appId]: {
          plan: planId,
          expiresAt: admin.firestore.Timestamp.fromDate(periodEnd),
        },
        ...(appId === "gracevox" ? { plan: planId, expiresAt: admin.firestore.Timestamp.fromDate(periodEnd) } : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const uid = sub.metadata?.firebaseUID;
      if (!uid) break;

      const appId = sub.metadata?.appId || "gracevox";

      await db.collection("subscriptions").doc(uid).set({
        [appId]: { plan: "free" },
        ...(appId === "gracevox" ? { plan: "free" } : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`${appId} deactivated for ${uid}`);
      break;
    }
  }

  res.json({ received: true });
});

// ============================================================
// BUG-W3: OpenSky Network CORS Proxy
// ============================================================
exports.openskyProxy = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  const params = new URLSearchParams(req.query);
  const path = '/api/states/all?' + params.toString();
  const options = { hostname: 'opensky-network.org', path, method: 'GET',
    headers: { 'User-Agent': 'GraceOfTouch/1.0' }, timeout: 8000 };
  const proxyReq = https.request(options, proxyRes => {
    let body = '';
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', () => {
      if (proxyRes.statusCode !== 200) {
        res.status(proxyRes.statusCode).json({ error: 'OpenSky returned ' + proxyRes.statusCode });
        return;
      }
      try { res.json(JSON.parse(body)); }
      catch (e) { res.status(500).json({ error: 'Invalid JSON from OpenSky' }); }
    });
  });
  proxyReq.on('error', err => res.status(500).json({ error: err.message }));
  proxyReq.on('timeout', () => { proxyReq.destroy(); res.status(504).json({ error: 'OpenSky timeout' }); });
  proxyReq.end();
});
