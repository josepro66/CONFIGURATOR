import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  modelo: String,
  color: String,
  extras: [String],
  buyerEmail: String,
  amount: Number,
  currency: String,
  referenceCode: { type: String, unique: true },
  botones: String,
  perillas: String,
  screenshot: String,
  files: [Object],
  status: { type: String, default: "PENDING" }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);