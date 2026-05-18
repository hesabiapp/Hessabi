import app from "./express.js";
import { config } from "dotenv";
import { mongoClient } from "./config/mongo.js";

config();

const port = process.env.PORT || 3000

mongoClient().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`)
    })
}).catch((err) => {
    console.log(err)
})