import { Schema, model } from "mongoose";

const admin = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
},
    { timestamps: true }
)

export default model('Admin', admin, 'admins')