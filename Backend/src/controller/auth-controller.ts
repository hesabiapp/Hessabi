import { Request, Response } from "express";
import User from "../collections/user-collection.js";
import { validateSignUp, validateLogin } from "../function/zodValidators.js";
import { compare, hash } from "bcryptjs";
import { createTrialSubscription } from "./subscription-controller.js";
import Subscription from "../collections/subscription-collection.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "hessabi_jwt_secret_key_2024";

/* sign up */
export const signup = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(404).json({ message: 'input is required.' })
    }

    const { username, Fname, Lname, email, password } = req.body

    const signUpval = validateSignUp.safeParse({ username, Fname, Lname, email, password })

    if (!signUpval.success) {
        const error = signUpval.error.issues[0]
        return res.status(400).send({ input: error.path, message: error.message })
    }

    const userExist = await User.findOne({ username })
    if (userExist) {
        return res.status(400).json({ message: 'Username exist.' })
    }

    const emailExist = await User.findOne({ email })
    if (emailExist) {
        return res.status(400).json({ message: 'Email exist.' })
    }

    const hashedPassword = await hash(password, 5)

    const signupResult = await User.create({ username, Fname, Lname, email, password: hashedPassword })
    if (!signupResult) {
        return res.status(400).json({ message: 'User could not be created.' })
    }

    await User.findByIdAndUpdate(signupResult._id, { businessID: signupResult._id });
    await createTrialSubscription(signupResult._id.toString());
    return res.status(200).json({ message: 'User is created' })
}

// login 
export const login = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(404).json({ message: 'input is required.' })
    }

    const { username, password } = req.body

    const loginVail = validateLogin.safeParse({ username, password })
    if (!loginVail.success) {
        const error = loginVail.error.issues[0]
        return res.status(400).send({ input: error.path, message: error.message })
    }

    const user = await User.findOne({ username })
    if (!user) {
        return res.status(400).json({ message: 'Username or password is incorrect.' })
    }

    if (!(await compare(password, user.password))) {
        return res.status(400).json({ message: 'Username or password is incorrect.' })
    }

    if (!user.userStatus) {
        return res.status(403).json({ message: "User is disabled." });
    }

    const businessId = user.businessID?.toString() ?? user._id.toString();

    const token = jwt.sign(
        {
            id:         user._id.toString(),
            role:       user.role,
            username:   user.username,
            businessId: businessId,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    const sub = await Subscription.findOne({ businessId });
    let subscriptionInfo = null;

    if (sub) {
        if (sub.endDate && new Date() > sub.endDate && sub.planStatus === "active") {
            sub.planStatus = sub.planType === "subscription" ? "overdue" : "expired";
            await sub.save();
        }
        if (sub.planType === "trial" && sub.planStatus === "expired") {
    return res.status(403).json({
        message: "Your free trial has expired. Please upgrade to continue.",
        trialExpired: true,
    });
}

        let daysLeft: number | null = null;
        if (sub.endDate) {
            const diff = new Date(sub.endDate).getTime() - new Date().getTime();
            daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        subscriptionInfo = {
            planType:   sub.planType,
            planStatus: sub.planStatus,
            daysLeft,
            endDate:    sub.endDate,
        };
    }

    return res.status(200).json({
        message:      'User is logged in',
        token,
        subscription: subscriptionInfo,
    })
}

export const viewUser = async (req: Request, res: Response) => {
    const user: any = req.user;

    const viewUser = await User.findOne({ _id: user.id })
    if (!viewUser) {
        return res.status(404).json({ message: 'User were not found.' })
    }

    return res.status(200).send({
        userId:   viewUser._id.toString(),
        message:  'User is sent',
        username: viewUser.username,
        Fname:    viewUser.Fname,
        Lname:    viewUser.Lname,
        email:    viewUser.email,
        role:     viewUser.role,
        mobile:   viewUser.mobile ?? null,
        photo:    viewUser.photo ?? null,
    })
}

export const viewUsers = async (req: Request, res: Response) => {
    const adminUser: any = req.user;
    const viewUsers = await User.find({ businessID: adminUser.businessId })
    if (!viewUsers) {
        return res.status(404).json({ message: 'No users were found.' })
    }

    const viewUsersD = viewUsers.map((user) => {
        return {
            userId:     user._id.toString(),
            username:   user.username,
            Fname:      user.Fname,
            Lname:      user.Lname,
            email:      user.email,
            role:       user.role,
            userStatus: user.userStatus
        }
    })

    return res.status(200).send({ message: 'Users is sent', users: viewUsersD })
}

export const createUsers = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(404).json({ message: 'input is required.' })
    }

    const { username, Fname, Lname, email, password, role } = req.body
    const adminUser: any = req.user;

    const userVal = validateSignUp.safeParse({ username, Fname, Lname, email, password })
    if (!userVal.success) {
        const err = userVal.error.issues[0]
        return res.status(400).send({ path: err.path, message: err.message })
    }

    const userExist = await User.findOne({ username })
    if (userExist) {
        return res.status(400).json({ message: 'Username exist.' })
    }

    const emailExist = await User.findOne({ email })
    if (emailExist) {
        return res.status(400).json({ message: 'Email exist.' })
    }

    const hashedPassword = await hash(password, 5)

    const createUsersR = await User.create({
        username,
        Fname,
        Lname,
        email,
        password: hashedPassword,
        role,
        businessID: adminUser.businessId
    })
    if (!createUsersR) {
        return res.status(400).json({ message: 'User could not be created.' })
    }

    return res.status(200).send({ message: 'User is created.' })
}

export const editUsers = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(404).json({ message: 'input is required.' })
    }

    const { userId, username, Fname, Lname, email, password, role, userStatus, mobile } = req.body

    if (password) {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        if (!req.body.currentPassword) {
            return res.status(400).json({ message: "Current password is required." });
        }
        const isMatch = await compare(req.body.currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }
    }

    const bodyData: any = {}

    if (username) {
        const userExist = await User.findOne({ username, _id: { $ne: userId } })
        if (userExist) {
            return res.status(400).json({ message: 'Username exist.' })
        }
        bodyData.username = username
    }

    if (Fname) bodyData.Fname = Fname
    if (Lname) bodyData.Lname = Lname
    if (mobile !== undefined) bodyData.mobile = mobile

    if (email) {
        const emailExist = await User.findOne({ email, _id: { $ne: userId } })
        if (emailExist) {
            return res.status(400).json({ message: 'Email exist.' })
        }
        bodyData.email = email
    }

    if (password) {
        const hashedPassword = await hash(password, 5)
        bodyData.password = hashedPassword
    }

    if (role) bodyData.role = role
    if (typeof userStatus === "boolean") bodyData.userStatus = userStatus

    const usernameR = await User.findOneAndUpdate({ _id: userId }, bodyData, { returnDocument: "after" })
    if (!usernameR) {
        return res.status(404).send({ message: 'User does not exist.' })
    }

    return res.status(200).send({
        message:    'User is updated.',
        username:   usernameR.username,
        Fname:      usernameR.Fname,
        Lname:      usernameR.Lname,
        email:      usernameR.email,
        role:       usernameR.role,
        userStatus: usernameR.userStatus
    })
}

export const logout = async (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Logged out successfully.' });
};

export const deleteUsers = async (req: Request, res: Response) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
        return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ message: 'User deleted successfully.' });
};
