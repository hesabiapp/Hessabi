import mongoose, { Schema, Document } from "mongoose";

export interface ICounter extends Document {
  name: string;
  businessID: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  name: {
    type: String,
    required: true,
  },
  businessID: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

counterSchema.index({ name: 1, businessID: 1 }, { unique: true });

export default mongoose.model<ICounter>("Counter", counterSchema);
