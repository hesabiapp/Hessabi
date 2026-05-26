import { Schema, model } from "mongoose";

const igMessageSchema = new Schema(
  {
    accountId:            { type: String, required: true },
    accountUsername:      { type: String, default: null },
    conversationId:       { type: String, required: true },
    participantId:        { type: String, default: null },
    participantName:      { type: String, default: null },
    participantUsername:  { type: String, default: null },
    participantPicture:   { type: String, default: null },
    message:              { type: String, default: "" },
    direction:            { type: String, enum: ["incoming", "outgoing"], required: true },
    sentAt:               { type: Date, required: true },
    isRead:               { type: Boolean, default: false },
    platformMessageId:    { type: String, default: null },
    attachments:          { type: Array, default: [] },
  },
  { timestamps: true }
);

/* Index for fast conversation lookups */
igMessageSchema.index({ accountId: 1, conversationId: 1, sentAt: 1 });

export default model("IgMessage", igMessageSchema, "igMessages");
