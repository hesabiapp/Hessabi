import express from "express";
import cors from 'cors';
import session from "express-session";
import ConnectMongoDBSession from "connect-mongodb-session";
import authRoutes from './routes/auth-routes.js';
import productRoutes from './routes/product-routes.js';
import salesRoutes from './routes/sales-routes.js';
import expensesRoutes from './routes/expenses-routes.js';
import summaryRoutes from './routes/summary-routes.js';
import aiRoutes from './routes/Ai-routes.js';
import reportRoutes from './routes/report-routes.js';
import path from "path";
import adminRoutes from "./routes/admin.routes.js";
import subscriptionRouter from "./routes/subscription-routes.js";


const MongoDBStore = ConnectMongoDBSession(session);

const store = new MongoDBStore({
  uri: process.env.MONGODB_URI!,
  collection: "sessions",
});

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET || "as.jkdjaskljjo32jedkl23nmedkl32nolejh23oiejno23enoi23kenml32ned",
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://hessabi.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());
app.use("/productsImages", express.static(path.resolve("src/productsImages")));
app.use("/subscriptions", subscriptionRouter);
app.use('/auth',     authRoutes);
app.use('/product',  productRoutes);
app.use('/sales',    salesRoutes);
app.use('/expenses', expensesRoutes);
app.use('/summary',  summaryRoutes);
app.use('/admin',    adminRoutes);
app.use('/ai',       aiRoutes);
app.use('/reports',  reportRoutes);

app.get('/', (req, res) => { return res.send('api is working...') });

export default app;
