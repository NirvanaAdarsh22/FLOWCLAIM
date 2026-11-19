import dotenv from "dotenv";
dotenv.config();

console.log({
    EMAIL_USER: Boolean(process.env.EMAIL_USER),
    EMAIL_PASS: Boolean(process.env.EMAIL_PASS),
    FRONTEND_URL: Boolean(process.env.FRONTEND_URL)
});
