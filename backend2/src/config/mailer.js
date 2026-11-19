
import nodemailer from "nodemailer";
import env from "./env.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: env.EMAIL_USER.trim(),
        pass: env.EMAIL_PASS.replace(/\s/g, "")
    }
});

export default transporter;
