import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      unique: true,
    },

    // "trial" | "subscription" | "full"
    planType: {
      type: String,
      enum: ["trial", "subscription", "full"],
      default: "trial",
    },

    // "active" | "overdue" | "expired" | "cancelled"
    planStatus: {
      type: String,
      enum: ["active", "overdue", "expired", "cancelled"],
      default: "active",
    },

    startDate:  { type: Date, default: Date.now },
    endDate:    { type: Date },          // null = no expiry 

    // Pricing
    totalAmount:       { type: Number, default: 0 }, 
    paidAmount:        { type: Number, default: 0 },  
    installmentMonths: { type: Number, default: null }, // null = paid in full / subscription

    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export default model("Subscription", subscriptionSchema, "subscriptions");
