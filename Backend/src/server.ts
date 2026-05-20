import app from "./express.js";
import { mongoClient } from "./config/mongo.js";

const port = process.env.PORT || 3000;

mongoClient().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch((err) => {
  console.log(err);
});
