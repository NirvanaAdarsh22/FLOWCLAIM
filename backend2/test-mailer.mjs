import transporter from "./src/config/mailer.js";

try {
    await transporter.verify();
    console.log("Gmail SMTP connection successful!");
} catch (error) {
    console.error("Gmail SMTP error:", error.message);
} finally {
    transporter.close();
}
