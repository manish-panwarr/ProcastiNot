import { BASE_URL } from "./apiPaths";

//@des Validate email
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

//@des Get greeting message based on current time
export const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};

//@des Add thousands separator to number
export const addThousandsSeparator = (num) => {
    if (num == null || isNaN(num)) return "";

    const [integerPart, fractionalPart] = num.toString().split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return fractionalPart ? `${formattedInteger}.${fractionalPart}` : formattedInteger;
};

//@des Get initials from name for avatar
export const getInitials = (name) => {
    if (!name) return "";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

    let initials = "";
    for (let i = 0; i < Math.min(words.length, 2); i++) {
        initials += words[i][0];
    }
    return initials.toUpperCase();
};

//@des Get avatar URL from profile URL or name
export const getAvatarUrl = (profileUrl, name) => {
    if (profileUrl) {
        if (profileUrl.startsWith("http")) return profileUrl;
        return `${BASE_URL}/${profileUrl}`;
    }
    if (!name) return "";

    return `https://ui-avatars.com/api/?name=${getInitials(name)}&background=random&color=fff&size=150`;
};