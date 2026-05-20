import { Schema, model } from "mongoose";

const user = new Schema(
  {
    businessID: { type: Schema.Types.ObjectId, ref: "Users", default: null },
    username:   { type: String, required: true, unique: true },
    Fname:      { type: String, required: true },
    Lname:      { type: String, required: true },
    email:      { type: String, required: true, unique: true },
    password:   { type: String, required: true },
    mobile:     { type: String, default: null },
    photo:      { type: String, default: null },
    role: {
      type:    String,
      enum:    ["Admin", "Accountant"],
      default: "Admin",
    },

    // ── Instagram fields ──────────────────────
    igAccessToken:  { type: String, default: null },
    igConnectedAt:  { type: Date,   default: null },
    igTokenExpires: { type: Date,   default: null },
    // ─────────────────────────────────────────

    userStatus: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default model("Users", user, "users");