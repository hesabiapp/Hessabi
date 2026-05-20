import { Request, Response } from "express";
import Admin from "../collections/admin-collection.js";
import User from "../collections/user-collection.js";
import Sales from "../collections/sales-collection.js";
import Expenses from "../collections/expenses-collection.js";
import Product from "../collections/product-collection.js";
import Subscription from "../collections/subscription-collection.js";
import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";


export const adminLogin = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(400).json({ message: "Input is required." });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
        return res.status(400).json({ message: "Invalid credentials." });
    }

    if (!(await compare(password, admin.password))) {
        return res.status(400).json({ message: "Invalid credentials." });
    }

    const JWT_SECRET = process.env.JWT_SECRET || "hessabi_jwt_secret_key_2024";
    const token = jwt.sign(
        {
            id:         admin._id.toString(),
            role:       "SuperAdmin",
            username:   admin.username,
            businessId: null,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    return res.status(200).json({ message: "Admin logged in.", token });
};

export const adminLogout = async (req: Request, res: Response) => {
    return res.status(200).json({ message: "Logged out." });
};

// Create the super admin account (run once)
export const createAdmin = async (req: Request, res: Response) => {
    const existing = await Admin.findOne({});
    if (existing) {
        return res.status(400).json({ message: "Super admin already exists." });
    }

    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    const hashedPassword = await hash(password, 10);
    const admin = await Admin.create({ username, password: hashedPassword });

    return res.status(200).json({ message: "Super admin created.", username: admin.username });
};

// Get all businesses with subscription data included
export const getAllBusinesses = async (req: Request, res: Response) => {
    try {
        
        const admins = await User.find({ role: "Admin" }).sort({ createdAt: -1 });

        const businesses = await Promise.all(admins.map(async (admin) => {
            // ← businessID (capital D) matches all schemas
            const staffCount   = await User.countDocuments({ businessID: admin._id, role: { $ne: "Admin" } });
            const productCount = await Product.countDocuments({ businessID: admin._id });
            const salesData    = await Sales.find({ businessID: admin._id });
            const expensesData = await Expenses.find({ businessID: admin._id });
            const subscription = await Subscription.findOne({ businessId: admin._id });

            const totalSales    = salesData.reduce((sum, s) => sum + (s.totalSales || 0), 0);
            const totalExpenses = expensesData.reduce((sum, e) => sum + (e.amount || 0), 0);

            return {
                businessId:        admin._id.toString(),
                ownerName:         `${admin.Fname} ${admin.Lname}`,
                username:          admin.username,
                email:             admin.email,
                userStatus:        admin.userStatus,
                staffCount,
                productCount,
                totalSales,
                totalExpenses,
                createdAt:         admin.createdAt,
                planType:          subscription?.planType          ?? null,
                planStatus:        subscription?.planStatus        ?? null,
                installmentMonths: subscription?.installmentMonths ?? null,
                paidAmount:        subscription?.paidAmount        ?? 0,
                totalAmount:       subscription?.totalAmount       ?? 0,
                lastLogin:         subscription?.lastLogin         ?? null,
            };
        }));

        return res.status(200).json({ message: "Businesses found.", businesses });
    } catch (err) {
        return res.status(500).json({ message: "Server error." });
    }
};

// Get system-wide stats
export const getSystemStats = async (req: Request, res: Response) => {
    try {
        const totalUsers    = await User.countDocuments({});
        const totalAdmins   = await User.countDocuments({ role: "Admin" });
        const activeUsers   = await User.countDocuments({ userStatus: true });
        const totalProducts = await Product.countDocuments({});
        const allSales      = await Sales.find({});
        const allExpenses   = await Expenses.find({});

        const totalSales    = allSales.reduce((sum, s) => sum + (s.totalSales || 0), 0);
        const totalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalProfit   = allSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0);

        return res.status(200).json({
            message: "Stats found.",
            stats: {
                totalUsers,
                totalAdmins,
                activeUsers,
                totalProducts,
                totalSales,
                totalExpenses,
                totalProfit,
            }
        });
    } catch (err) {
        return res.status(500).json({ message: "Server error." });
    }
};

// Get all users across all businesses
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        const usersData = users.map(u => ({
            userId:     u._id,
            username:   u.username,
            Fname:      u.Fname,
            Lname:      u.Lname,
            email:      u.email,
            role:       u.role,
            userStatus: u.userStatus,
            businessId: u.businessID,
            createdAt:  u.createdAt,
        }));
        return res.status(200).json({ message: "Users found.", users: usersData });
    } catch (err) {
        return res.status(500).json({ message: "Server error." });
    }
};

// Toggle user/business status
export const toggleUserStatus = async (req: Request, res: Response) => {
    const { userId, userStatus } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required." });

    const user = await User.findByIdAndUpdate(userId, { userStatus }, { returnDocument: "after" });
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({ message: "User status updated.", userStatus: user.userStatus });
};

// Get all subscriptions (Subscriptions tab)
export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const subs = await Subscription.find({}).sort({ createdAt: -1 });

    const data = await Promise.all(subs.map(async (s: any) => {
      const user = await User.findById(s.businessId).select("Fname Lname email username");
      return {
        businessId:        s.businessId?.toString(),
        ownerName:         user ? `${user.Fname} ${user.Lname}` : "Unknown",
        email:             user?.email ?? "Unknown",
        planType:          s.planType,
        planStatus:        s.planStatus,
        startDate:         s.startDate,
        endDate:           s.endDate,
        totalAmount:       s.totalAmount,
        paidAmount:        s.paidAmount,
        installmentMonths: s.installmentMonths ?? null,
        lastLogin:         s.lastLogin ?? null,
      };
    }));

    return res.status(200).json({ subscriptions: data });
  } catch (err) {
    console.error("getAllSubscriptions ERROR:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// Get single business profile with full details
export const getBusinessProfile = async (req: Request, res: Response) => {
    const { businessId } = req.params;
    try {
        const admin = await User.findById(businessId);
        if (!admin) return res.status(404).json({ message: "Business not found." });

        
        const staffCount   = await User.countDocuments({ businessID: admin._id, role: { $ne: "Admin" } });
        const productCount = await Product.countDocuments({ businessID: admin._id });
        const salesData    = await Sales.find({ businessID: admin._id });
        const expensesData = await Expenses.find({ businessID: admin._id });
        const subscription = await Subscription.findOne({ businessId: admin._id });

        return res.status(200).json({
            business: {
                businessId:    admin._id.toString(),
                ownerName:     `${admin.Fname} ${admin.Lname}`,
                username:      admin.username,
                email:         admin.email,
                userStatus:    admin.userStatus,
                createdAt:     admin.createdAt,
                staffCount,
                productCount,
                totalSales:    salesData.reduce((s, x) => s + (x.totalSales || 0), 0),
                totalExpenses: expensesData.reduce((s, x) => s + (x.amount || 0), 0),
                totalProfit:   salesData.reduce((s, x) => s + (x.grossProfit || 0), 0),
            },
            subscription,
        });
    } catch (err) {
        return res.status(500).json({ message: "Server error." });
    }
};