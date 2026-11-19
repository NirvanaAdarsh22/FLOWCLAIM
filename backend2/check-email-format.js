import dotenv from "dotenv";
dotenv.config();

console.log({
    emailConfigured: Boolean(process.env.EMAIL_USER),
    passwordConfigured: Boolean(process.env.EMAIL_PASS),
    passwordLength: (process.env.EMAIL_PASS || "").replace(/\s/g, "").length,
    emailAndPasswordPresent: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)
});
