import { connect } from "mongoose";

export const mongoClient = async () => {

    const URL = process.env.URL as string

    const mongo = await connect(URL)

    return URL
}
