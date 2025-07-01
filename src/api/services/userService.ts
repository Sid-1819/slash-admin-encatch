import type { UserInfo, UserToken } from "#/entity";
import apiClient from "../apiClient";

export interface SignInReq {
	username: string;
	password: string;
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
	if (data.username === "guest" && data.password === "guest") {
		return {
			access_token: "test-token",
			refresh_token: "test-refresh-token",
			user: data,
		};
	}
	const users = getLocalUsers();
	const user = users.find((u: any) => u.username === data.username && u.password === data.password);
	if (!user) throw new Error("Invalid credentials");
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
