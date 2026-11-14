const mongoose =  require("mongoose");
const claimSchema = new mongoose.Schema(
    {
        claimId:
        {
            type : String,
            required : true,
            unique : true
        },
        employeeId :
        {
            type : String,
            required : true
        },
        category: {
            type : String,
            enum : [
                "Travel",
                "Food",
                "Accommodation",
                "Fuel",
                "Office Supplies",
                "Other"
            ],
            required : true
        },
        expenseDate: {
            type : Date,
            required : true
        },
        amount : {
            type : Number,
            required : true,
            min : 0
        },
        currency : {
            type : String,
            default : "INR"
        },
        description: {
            type: String,
            trim: true
        },

        receiptUrl: {
            type: String,
            default: null
        },

        claimFingerprint: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Approved",
                "Rejected",
                "Reimbursed",
                "Flagged"
            ],
            default: "Pending"
        }
    },
    {
        timestamps: true
    }
);
const Claim = mongoose.model("Claim",claimSchema);
module.exports = Claim;
