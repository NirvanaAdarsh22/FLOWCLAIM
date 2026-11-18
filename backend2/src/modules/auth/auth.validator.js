
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must contain at least 8 characters"),
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  department: z.string().trim().optional().default("General")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required")
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email")
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "New password must contain at least 8 characters")
});
