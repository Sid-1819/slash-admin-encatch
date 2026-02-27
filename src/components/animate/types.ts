export type EasingTuple = [number, number, number, number];

export type VariantsType = {
	durationIn?: number;
	durationOut?: number;
	easeIn?: EasingTuple;
	easeOut?: EasingTuple;
	distance?: number;
};

export type TranHoverType = {
	duration?: number;
	ease?: EasingTuple;
};
export type TranEnterType = {
	durationIn?: number;
	easeIn?: EasingTuple;
};
export type TranExitType = {
	durationOut?: number;
	easeOut?: EasingTuple;
};

export type BackgroundType = {
	duration?: number;
	ease?: "linear" | "easeIn" | "easeOut" | "easeInOut";
	colors?: string[];
};
