/**
 * Settings for audio control actions.
 */
export type CounterSettings = {
	count?: number;
	incrementBy?: number;
	ipAddress?: string;
	token?: string;
	txPair?: string; // format: "0,1" representing the two tx-no values
	rxPair?: string; // format: "0,1" representing the two rx-no values (crosspoint only)
};

/**
 * API response structure.
 */
export type ApiResponse = {
	status?: number;
	code?: string;
};

/**
 * Audio pair configuration with labels.
 */
export const AUDIO_PAIRS = {
	"0,1": "Ubalance-1/2",
	"2,3": "Balance-1/2",
	"4,6": "USB-L/R",
	"8,9": "Dante1/2",
	"16,17": "Stream1-1/2",
	"20,21": "Stream2-1/2",
} as const;
