import { useMutation } from "@tanstack/react-query";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import userService, { type SignInReq } from "@/api/services/userService";

import { toast } from "sonner";
import type { UserInfo, UserToken } from "#/entity";
import { StorageEnum } from "#/enum";

type UserStore = {
	userInfo: Partial<UserInfo>;
	userToken: UserToken;

	actions: {
		setUserInfo: (userInfo: UserInfo) => void;
		setUserToken: (token: UserToken) => void;
		clearUserInfoAndToken: () => void;
	};
};

const useUserStore = create<UserStore>()(
	persist(
		(set) => ({
			userInfo: {},
			userToken: {},
			actions: {
				setUserInfo: (userInfo) => {
					set({ userInfo });
				},
				setUserToken: (userToken) => {
					set({ userToken });
				},
				clearUserInfoAndToken() {
					set({ userInfo: {}, userToken: {} });
				},
			},
		}),
		{
			name: "userStore", // name of the item in the storage (must be unique)
			storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
			partialize: (state) => ({
				[StorageEnum.UserInfo]: state.userInfo,
				[StorageEnum.UserToken]: state.userToken,
			}),
		},
	),
);

export const useUserInfo = () => useUserStore((state) => state.userInfo);
export const useUserToken = () => useUserStore((state) => state.userToken);
export const useUserPermissions = () => useUserStore((state) => state.userInfo.permissions || []);
export const useUserRoles = () => useUserStore((state) => state.userInfo.roles || []);
export const useUserActions = () => useUserStore((state) => state.actions);

export const useSignIn = () => {
	const { setUserToken, setUserInfo } = useUserActions();

	const signInMutation = useMutation({
		mutationFn: userService.signin,
	});

	const signIn = async (data: SignInReq) => {
		try {
			const res = await signInMutation.mutateAsync(data);
			// Patch: support both access_token and accessToken for compatibility
			const accessToken = res.accessToken || res.access_token;
			const refreshToken = res.refreshToken || res.refresh_token;
			// Store all user fields, not just username/email
			const user = {
				id: res.user.username, // Use username as id for mock
				...res.user, // Spread all user fields (including dynamic)
			};
			setUserToken({ accessToken, refreshToken });
			setUserInfo(user);

			// Ensight: set identity with username and dynamic fields
			if (user.username !== "guest" && window.ensight && typeof window.ensight.identify === "function") {
				const { username, ...properties } = user;
				console.log("Ensight properties:", properties);
				window.ensight.identify(username, properties);
			}

			return { ...res, user }; // Return patched user for Ensight
		} catch (err) {
			toast.error(err.message, {
				position: "top-center",
			});
			throw err;
		}
	};

	return signIn;
};

export default useUserStore;
