const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name : {
            type : String,
            required : true,
            trim : true
        },
        email : {
            type : String,
            required : true,
            unique : true,
            trim : true,
            lowercase : true
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false
        },

        employeeId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        department: {
            type: String,
            default: "General"
        },

        role: {
            type: String,
            enum: [
                "employee",
                "finance_manager",
                "admin"
            ],
            default: "employee"
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre("save",async function(){
    if(!this.isModified("password")){
        return;
    }
    const salt = await bcrypt.genSalt(12);

    this.password = await bcrypt.hash(
        this.password,
        salt
    );
});

userSchema.methods.comparePassword = async function( enteredPassword){

    return await bcrypt.compare(
        enteredPassword,
        this.password
    );
};

const User = mongoose.model("User",userSchema);

module.exports = User;