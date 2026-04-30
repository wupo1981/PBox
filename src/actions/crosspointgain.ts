import { action, KeyDownEvent, DialRotateEvent, DialDownEvent, DidReceiveSettingsEvent, WillAppearEvent } from "@elgato/streamdeck";
import { AudioControlAction } from "./baseAction";
import { CounterSettings, ApiResponse } from "../types";

/**
 * Crosspoint Gain Control action - Adjusts crosspoint (mix) gain levels via API.
 */
@action({ UUID: "com.aurawave.pbox.crosspointgain" })
export class CrosspointGain extends AudioControlAction {
	protected initializeSettings(
		ev: WillAppearEvent<CounterSettings> | DidReceiveSettingsEvent<CounterSettings>
	): void {
		if (ev.payload.settings.count === undefined) {
			ev.payload.settings.count = 0;
		}
		if (!ev.payload.settings.txPair) {
			ev.payload.settings.txPair = "0,1"; // Default to Ubalance-1/2
		}
		if (!ev.payload.settings.rxPair) {
			ev.payload.settings.rxPair = "0,1"; // Default to Ubalance-1/2
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
			// Parse TX and RX pairs
			const [tx1, tx2] = this.parsePair(settings.txPair || "0,1");
			const [rx1, rx2] = this.parsePair(settings.rxPair || "0,1");

			console.log(`Sending Crosspoint Gain update - DB: ${newCount}, TX: ${tx1},${tx2}, RX: ${rx1},${rx2}`);

			const response = await this.fetchWithTimeout(`http://${ipAddress}/api/aoip/volume-mix`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json;charset=utf-8",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					volumes: [
						{
							"tx-no": tx1,
							"rx-no": rx1,
							db: newCount,
							"rx-mute": false,
						},
						{
							"tx-no": tx2,
							"rx-no": rx2,
							db: newCount,
							"rx-mute": false,
						},
					],
				}),
			});

			const data = (await response.json()) as ApiResponse;
			console.log("Crosspoint Gain API response:", data);

			// Validate response
			if (!this.validateApiResponse(data)) {
				ev.action.showAlert();
				return;
			}

			// Update settings and display
			settings.count = newCount;
			await ev.action.setSettings(settings);
			this.updateDisplay(this.currentTitle, newCount, ev);
			this.updateDialFeedback(ev, newCount, "Crosspoint Gain");
		} catch (error) {
			console.error("Crosspoint Gain API request failed:", error);
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
