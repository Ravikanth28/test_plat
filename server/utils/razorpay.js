import crypto from "crypto";
import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

// If keys are absent we run in DEMO/mock mode so the app still works end-to-end.
export const isRazorpayLive = Boolean(keyId && keySecret);

let instance = null;
if (isRazorpayLive) {
  instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export const getPublicKey = () => keyId || "";

// Create a payment order. Returns a shape the frontend can use in both modes.
export const createPaymentOrder = async (amountRupees, receipt) => {
  const amountPaise = Math.round(amountRupees * 100);
  if (isRazorpayLive) {
    const order = await instance.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
    });
    return { mode: "live", id: order.id, amount: order.amount, currency: order.currency };
  }
  // demo mode
  return {
    mode: "demo",
    id: "demo_" + Date.now(),
    amount: amountPaise,
    currency: "INR",
  };
};

// Verify signature for live mode; demo mode always verifies true.
export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!isRazorpayLive) return true;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
};
