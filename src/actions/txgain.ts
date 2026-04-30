import { action, KeyDownEvent, DialRotateEvent, DialDownEvent, DidReceiveSettingsEvent, WillAppearEvent } from "@elgato/streamdeck";
import { AudioControlAction } from "./baseAction";
import { CounterSettings, ApiResponse } from "../types";

/**
 * TX Gain Control action - Controls output gain levels via API.
 */
@action({ UUID: "com.aurawave.pbox.txgain" })
export class IncrementCounter extends AudioControlAction {
	protected initializeSettings(
		ev: WillAppearEvent<CounterSettings> | DidReceiveSettingsEvent<CounterSettings>
	): void {
		if (ev.payload.settings.count === undefined) {
			ev.payload.settings.count = 0;
		}
		if (!ev.payload.settings.txPair) {
			ev.payload.settings.txPair = "0,1"; // Default to Ubalance-1/2
		}
		ev.action.setSettings(ev.payload.settings);
	}

	protected async sendVolumeUpdate(
		newCount: number,
		settings: CounterSettings,
		ev: KeyDownEvent<CounterSettings> | DialDownEvent<CounterSettings> | DialRotateEvent<CounterSettings>
	): Promise<void> {
		// Validate credentials
		const ipAddress = settings.ipAddress?.trim() || "";
		const token = settings.token?.trim() || "";

		if (!ipAddress || !token) {
			console.error("IP Address and Token must be configured");
			ev.action.showAlert();
			return;
		}

		try {
			// Parse TX pair
			const [tx1, tx2] = this.parsePair(settings.txPair || "0,1");

			console.log(`Sending TX Gain update - DB: ${newCount}, TX Pair: ${tx1},${tx2}`);

			const response = await this.fetchWithTimeout(`http://${ipAddress}/api/aoip/volume-tx`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json;charset=utf-8",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					volumes: [
						{
							"tx-no": tx1,
							db: newCount,
							"tx-mute": false,
						},
						{
							"tx-no": tx2,
							db: newCount,
							"tx-mute": false,
						},
					],
				}),
			});

			const data = (await response.json()) as ApiResponse;
			console.log("TX Gain API response:", data);

			// Validate response
			if (!this.validateApiResponse(data)) {
				ev.action.showAlert();
				return;
			}

			// Update settings and display
			settings.count = newCount;
			await ev.action.setSettings(settings);
			this.updateDisplay(this.currentTitle, newCount, ev);
			this.updateDialFeedback(ev, newCount, "TX Gain");
		} catch (error) {
			console.error("TX Gain API request failed:", error);
			ev.action.showAlert();
		}
	}

	override onTitleParametersDidChange(ev: any): void | Promise<void> {
		let title = ev.payload.title || "";
		title = title.split("\n")[0].trim();
		this.currentTitle = title;
		const count = ev.payload.settings.count ?? 0;
		this.updateDisplay(this.currentTitle, count, ev);
	}
}