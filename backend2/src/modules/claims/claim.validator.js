import { z } from "zod";

export const createClaimSchema = z.object({
  category: z.enum(["Travel", "Food", "Accommodation", "Fuel", "Office Supplies", "Other"]),
  expenseDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Valid expense date is required"
  }),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().default("INR"),
  description: z.string().optional().default(""),
  receiptUrl: z.string().url("Valid receipt URL required").optional().nullable()
});

export default {
  createClaimSchema
};
