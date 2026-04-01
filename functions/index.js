const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const stripe = require("stripe")(
  functions.config().stripe?.secret || process.env.STRIPE_SECRET_KEY
);

const PRICE_ID = functions.config().stripe?.price_id || process.env.STRIPE_PRICE_ID;
const WEBHOOK_SECRET = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = "https://grace-of-touch.web.app";

// Create Stripe Checkout Session
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "ログインが必要です");
  }

  const uid = context.auth.uid;
  const email = context.auth.token.email || "";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    metadata: { firebaseUID: uid },
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/gracevox.html?payment=success`,
    cancel_url: `${APP_URL}/gracevox.html?payment=cancel`,
    locale: "ja",
  });

  return { url: session.url };
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

      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const periodEnd = new Date(subscription.current_period_end * 1000);

      await db.collection("subscriptions").doc(uid).set({
        plan: "pro",
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        expiresAt: admin.firestore.Timestamp.fromDate(periodEnd),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`Pro activated for ${uid} until ${periodEnd.toISOString()}`);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      const uid = sub.metadata?.firebaseUID;
      if (!uid) break;

      const periodEnd = new Date(sub.current_period_end * 1000);
      await db.collection("subscriptions").doc(uid).set({
        plan: "pro",
        expiresAt: admin.firestore.Timestamp.fromDate(periodEnd),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const uid = sub.metadata?.firebaseUID;
      if (!uid) break;

      await db.collection("subscriptions").doc(uid).set({
        plan: "free",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`Pro deactivated for ${uid}`);
      break;
    }
  }

  res.json({ received: true });
});
