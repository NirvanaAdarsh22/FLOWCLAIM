
const cleanAmount = (value) => {

    if (value === null || value === undefined || value === "") {
        return null;
    }

    let amount = String(value).trim();

    // Check accounting notation: (500) means -500
    const isNegative = amount.startsWith("(") && amount.endsWith(")");

    // Remove parentheses
    amount = amount.replace(/[()]/g, "");

    // Remove currency symbols, names and commas
    amount = amount.replace(/[₹$€£,\s]/g, "");
    amount = amount.replace(/^(INR|USD|EUR|GBP)/i, "");

    // Convert string into number
    let result = Number(amount);

    if (!Number.isFinite(result)) {
        return null;
    }

    if (isNegative) {
        result = -Math.abs(result);
    }

    return Math.round(result * 100) / 100;
};


const cleanDate = (value) => {

    if (!value) {
        return null;
    }

    // Already a Date object
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
};


const cleanText = (value) => {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
};


module.exports = {
    cleanAmount,
    cleanDate,
    cleanText
};
