// NOTE: This is a client-side simulation of authentication.
// It uses localStorage and sessionStorage and is NOT secure for a production environment.
import type { User } from '../types';

type StoredUser = Omit<User, 'email'> & { password: string };

// Helper to get users from localStorage
const getUsers = (): Record<string, StoredUser> => {
    const usersData = localStorage.getItem('users');
    if (usersData) {
        try {
            return JSON.parse(usersData);
        } catch (error) {
            console.error("Failed to parse user data from localStorage, resetting.", error);
            // If parsing fails, remove the corrupted item and fall through to create the default.
            localStorage.removeItem('users');
        }
    }
    
    // If no users exist or data was corrupt, create the default admin user
    const defaultAdmin: Record<string, StoredUser> = {
        'admin@expensetracker.com': {
            password: 'Admin@123',
            firstName: 'Admin',
            lastName: 'User',
            gender: 'Prefer not to say',
            purpose: 'Application testing and administration',
            role: 'admin',
            themeColor: 'indigo'
        }
    };
    const defaultUsersStr = JSON.stringify(defaultAdmin);
    localStorage.setItem('users', defaultUsersStr);
    return defaultAdmin;
};

// Helper to save users to localStorage
const saveUsers = (users: Record<string, StoredUser>): void => {
    localStorage.setItem('users', JSON.stringify(users));
};

export const signup = async (
    email: string, 
    password: string,
    firstName: string,
    lastName: string,
    gender: string,
    purpose: string
): Promise<{ success: boolean; message: string }> => {
    const users = getUsers();
    if (users[email]) {
        return { success: false, message: 'User with this email already exists.' };
    }

    const role = Object.keys(users).length === 0 ? 'admin' : 'user';

    users[email] = { password, firstName, lastName, gender, purpose, role, themeColor: 'teal' };
    saveUsers(users);
    
    return login(email, password);
};

export const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const users = getUsers();
    if (!users[email]) {
        return { success: false, message: 'User does not exist.' };
    }
    if (users[email].password !== password) {
        return { success: false, message: 'Incorrect password.' };
    }
    localStorage.setItem('currentUser', email);
    return { success: true, message: 'Login successful.' };
};

export const requestOtp = async (email: string): Promise<{ success: boolean, message: string }> => {
    const users = getUsers();
    if (!users[email]) {
        return { success: false, message: 'User does not exist.' };
    }
    // In a real app, you would call an API to send an OTP via SMS/email.
    // Here, we simulate it by generating a code and storing it temporarily.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem('otp', JSON.stringify({ email, code: otp, expires: Date.now() + 300000 })); // 5 minute expiry
    
    // We show the OTP to the user directly for this simulation.
    alert(`Your OTP is: ${otp}`);
    
    return { success: true, message: 'OTP has been sent.' };
};

export const loginWithOtp = async (email: string, otp: string): Promise<{ success: boolean; message: string }> => {
    const otpDataStr = sessionStorage.getItem('otp');
    if (!otpDataStr) {
        return { success: false, message: 'OTP has expired or was not requested.' };
    }
    const otpData = JSON.parse(otpDataStr);

    if (otpData.email !== email || otpData.code !== otp) {
        return { success: false, message: 'Invalid OTP.' };
    }
    if (Date.now() > otpData.expires) {
        sessionStorage.removeItem('otp');
        return { success: false, message: 'OTP has expired.' };
    }
    
    sessionStorage.removeItem('otp');
    localStorage.setItem('currentUser', email);
    return { success: true, message: 'Login successful.' };
};


export const logout = (): void => {
    localStorage.removeItem('currentUser');
};

export const getCurrentUser = (): string | null => {
    return localStorage.getItem('currentUser');
};

export const getCurrentUserDetails = (): User | null => {
    const email = getCurrentUser();
    if (!email) return null;

    const users = getUsers();
    const storedUser = users[email];
    if (!storedUser) return null;

    const { password, ...userDetails } = storedUser;

    return {
        email,
        ...userDetails
    };
};

export const updateUserDetails = async (updatedDetails: Partial<User>): Promise<{ success: boolean, user: User | null }> => {
    const email = getCurrentUser();
    if (!email) return { success: false, user: null };

    const users = getUsers();
    if (!users[email]) return { success: false, user: null };

    // Update the stored user details
    users[email] = { ...users[email], ...updatedDetails };
    saveUsers(users);

    return { success: true, user: getCurrentUserDetails() };
};