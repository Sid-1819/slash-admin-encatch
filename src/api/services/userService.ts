import type { UserInfo, UserToken } from "#/entity";
import { DB_USER } from "@/_mock/assets_backup";
import apiClient from "../apiClient";

export interface SignInReq {
	username: string;
	password?: string;
}

export interface SignUpReq extends SignInReq {
	email: string;
}
export type SignInRes = UserToken & { user: UserInfo };

export enum UserApi {
	SignIn = "/auth/signin",
	SignUp = "/auth/signup",
	Logout = "/auth/logout",
	Refresh = "/auth/refresh",
	User = "/user",
}

// Helper to get users from localStorage
function getLocalUsers() {
	const users = localStorage.getItem("slashadmin_users");
	return users ? JSON.parse(users) : [];
}

// Helper to save users to localStorage
function setLocalUsers(users: any[]) {
	localStorage.setItem("slashadmin_users", JSON.stringify(users));
}

const signin = async (data: SignInReq) => {
	// Check localStorage first, then fallback to DB_USER
	const localUsers = getLocalUsers();
	const allUsers = localUsers.length > 0 ? localUsers : DB_USER;

	// Try to find existing user
	let user = allUsers.find((u: any) => {
		if (u.username !== data.username) return false;
		// If password is provided, validate it; otherwise allow login without password
		return !data.password || u.password === data.password;
	});

	// If user doesn't exist, create a new user on the fly
	if (!user) {
		// If password is provided for non-existent user, validate against it (but allow any username)
		// For passwordless login, create user automatically
		user = {
			id: `user_${data.username}_id`,
			username: data.username,
			email: `${data.username}@slash.com`,
			avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
			password: data.password || "",
		};
		// Optionally save to localStorage for persistence
		const updatedUsers = [...allUsers, user];
		setLocalUsers(updatedUsers);
	} else if (data.password && user.password !== data.password) {
		// If password is provided and doesn't match, throw error
		throw new Error("Invalid credentials");
	}

	// Simulate token and user info
	return {
		access_token: "test-token",
		refresh_token: "test-refresh-token",
		user: user,
	};
};

const signup = async (data: SignUpReq) => {
	const users = getLocalUsers();
	if (users.some((u: any) => u.username === data.username)) {
		throw new Error("Username already exists");
	}
	users.push(data);
	setLocalUsers(users);
	// Simulate token and user info
	return {
		access_token: "test-token",
		refresh_token: "test-refresh-token",
		user: data,
	};
};

const logout = () => apiClient.get({ url: UserApi.Logout });
const findById = (id: string) => apiClient.get<UserInfo[]>({ url: `${UserApi.User}/${id}` });

export default {
	signin,
	signup,
	findById,
	logout,
};
