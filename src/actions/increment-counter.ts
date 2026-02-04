import { action, KeyDownEvent, SingletonAction, WillAppearEvent, DialRotateEvent, TitleParametersDidChangeEvent, DidReceiveSettingsEvent, KeyUpEvent, DialDownEvent, DialUpEvent } from "@elgato/streamdeck";

/**
 * An example action class that displays a count that increments by one each time the button is pressed.
 */
@action({ UUID: "com.aurawave.pbox.increment" })
export class IncrementCounter extends SingletonAction<CounterSettings> {
	private currentTitle: string = "";
	private longPressTimers: Map<string, NodeJS.Timeout> = new Map(); // Track long press timers by context

	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
	 * we're setting the title to the "count" that is incremented in {@link IncrementCounter.onKeyDown}.
	 */
	override onWillAppear(ev: WillAppearEvent<CounterSettings>): void | Promise<void> {
		const count = ev.payload.settings.count ?? 0;
		// Initialize display with SVG
		this.updateDisplay(this.currentTitle, count, ev);
		
		// Ensure settings are initialized
		if (ev.payload.settings.count === undefined) {
			ev.payload.settings.count = 0;
			ev.action.setSettings(ev.payload.settings);
		}
	}

	/**
	 * Listens for title parameter changes to capture the user-set title.
	 */
	override onTitleParametersDidChange(ev: TitleParametersDidChangeEvent<CounterSettings>): void | Promise<void> {
		// Extract the title from the payload and remove any db value suffix
		let title = ev.payload.title || "";
		// Remove any existing dB values and newlines that might have been added previously
		title = title.split('\n')[0].trim();
		this.currentTitle = title;
		
		// Update display with title and current db value
		const count = ev.payload.settings.count ?? 0;
		this.updateDisplay(this.currentTitle, count, ev);
	}

	/**
	 * Listens for settings updates from the property inspector.
	 */
	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<CounterSettings>): void | Promise<void> {
		console.log("Settings received from property inspector:", ev.payload.settings);
	}

	/**
	 * Helper method to update display using SVG with two lines of text.
	 */
	private updateDisplay(title: string, dbValue: number, ev: TitleParametersDidChangeEvent<CounterSettings> | KeyDownEvent<CounterSettings> | KeyUpEvent<CounterSettings> | DialDownEvent<CounterSettings> | DialRotateEvent<CounterSettings> | DialUpEvent<CounterSettings> | WillAppearEvent<CounterSettings>): void {
		const svg = this.createDisplaySVG(title, dbValue);
		ev.action.setImage(svg);
	}

	/**
	 * Create SVG with db value displayed centered.
	 * Designed for 72x72 pixel display with large font.
	 */
	private createDisplaySVG(title: string, dbValue: number): string {
		const svg = `<svg width="72" height="72" xmlns="http://www.w3.org/2000/svg">
			<style>
				.db { font: bold 96px Arial; fill: white; text-anchor: middle; dominant-baseline: middle; }
			</style>
			<rect width="72" height="72" fill="rgb(60, 60, 60)"/>
			<text x="36" y="36" class="db">${dbValue}dB</text>
		</svg>`;
		return `data:image/svg+xml,${encodeURIComponent(svg)}`;
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed.
	 */
	override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
		const context = ev.action.id;
		
		// Start a 3-second timer to trigger reset on long press
		const timer = setTimeout(async () => {
			const { settings } = ev.payload;
			settings.count = 0;
			await ev.action.setSettings(settings);
			
			// Update display
			this.updateDisplay(this.currentTitle, 0, ev);
			
			// Send reset to API
			await this.sendVolumeUpdate(0, settings, ev);
			console.log("Long press detected (Keypad): reset count to 0");
			
			// Clear the timer from map
			this.longPressTimers.delete(context);
		}, 3000);
		
		// Store the timer so we can cancel it on key release
		this.longPressTimers.set(context, timer);
	}

	/**
	 * Listens for key release to cancel long press timer and handle short press.
	 */
	override async onKeyUp(ev: KeyUpEvent<CounterSettings>): Promise<void> {
		const context = ev.action.id;
		const timer = this.longPressTimers.get(context);
		
		// Cancel the long press timer if it exists
		if (timer !== undefined) {
			clearTimeout(timer);
			this.longPressTimers.delete(context);
			
			// Short press - only for Keypad, not for Encoder
			if (!ev.action.isDial()) {
				const { settings } = ev.payload;
				settings.incrementBy ??= 1;
				const newCount = (settings.count ?? 0) + settings.incrementBy;
				
				await this.sendVolumeUpdate(newCount, settings, ev);
			}
		}
	}

	/**
	 * Listens for knob/dial rotation events to control volume.
	 */
	override async onDialRotate(ev: DialRotateEvent<CounterSettings>): Promise<void> {
		const { settings } = ev.payload;
		settings.incrementBy ??= 1;
		// Apply rotation: positive for clockwise, negative for counter-clockwise
		const newCount = (settings.count ?? 0) + (settings.incrementBy * ev.payload.ticks);
		
		// Clamp the value to audio range (-40 to 40 dB)
		const clampedCount = Math.max(-40, Math.min(40, newCount));
		
		await this.sendVolumeUpdate(clampedCount, settings, ev);
	}

	/**
	 * Listens for dial press (used to detect long press on dial).
	 */
	override onDialDown(ev: DialDownEvent<CounterSettings>): void | Promise<void> {
		const context = ev.action.id;
		
		// Start a 3-second timer to trigger reset on long press
		const timer = setTimeout(async () => {
			const { settings } = ev.payload;
			settings.count = 0;
			await ev.action.setSettings(settings);
			
			// Update display
			this.updateDisplay(this.currentTitle, 0, ev);
			
			// Send reset to API
			await this.sendVolumeUpdate(0, settings, ev);
			console.log("Long press detected (Dial): reset count to 0");
			
			// Clear the timer from map
			this.longPressTimers.delete(context);
		}, 3000);
		
		// Store the timer so we can cancel it on dial release
		this.longPressTimers.set(context, timer);
	}

	/**
	 * Listens for dial release to cancel long press timer.
	 */
	override async onDialUp(ev: DialUpEvent<CounterSettings>): Promise<void> {
		const context = ev.action.id;
		const timer = this.longPressTimers.get(context);
		
		// Cancel the long press timer if it exists (means it was released before 3 seconds)
		if (timer !== undefined) {
			clearTimeout(timer);
			this.longPressTimers.delete(context);
		}
	}

	/**
	 * Helper method to send volume update via API and update UI.
	 */
	private async sendVolumeUpdate(newCount: number, settings: CounterSettings, ev: KeyDownEvent<CounterSettings> | KeyUpEvent<CounterSettings> | DialDownEvent<CounterSettings> | DialRotateEvent<CounterSettings> | DialUpEvent<CounterSettings>): Promise<void> {
		// Get IP and token from settings
		const ipAddress = settings.ipAddress?.trim() || "";
		const token = settings.token?.trim() || "";
		
		// Check if both IP and token are provided
		if (!ipAddress || !token) {
			console.error("IP Address and Token must be configured");
			ev.action.showAlert();
			return;
		}

		// Send a POST request
		try {
			//aoip for dante
			//aes67 for AES67
			const response = await fetch(`http://${ipAddress}/api/aoip/volume-tx`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json;charset=utf-8",
					"Authorization": `Bearer ${token}`,
				},
				body: JSON.stringify({
					volumes: [
						{
							"tx-no": 0,
							db: newCount,
							"tx-mute": false,
						},
						{
							"tx-no": 1,
							db: newCount,
							"tx-mute": false,
						},
					],
				}),
			});
			const data = await response.json() as { status?: number; code?: string };
			console.log("POST request sent:", data);

			// Check if response indicates OutOfRange error or other errors
			if (data.status === 27 && data.code === "OutOfRange") {
				console.warn("OutOfRange error: count change stopped");
				ev.action.showAlert();
				return; // Stop here, don't update settings
			}

			// Check for other error statuses
			if (data.status && data.status !== 0) {
				console.error("API error:", data);
				ev.action.showAlert();
				return;
			}

			// Only update count if no error
			settings.count = newCount;
			await ev.action.setSettings(settings);
			
			// Update key image display
			this.updateDisplay(this.currentTitle, newCount, ev);
			
			// Update dial layout feedback
			if (ev.action.isDial()) {
				await ev.action.setFeedback({
					title: `${newCount}dB`,
					value: newCount,
				});
			}
		} catch (error) {
			console.error("POST request failed:", error);
			ev.action.showAlert();
		}
	}

}

/**
 * Settings for {@link IncrementCounter}.
 */
type CounterSettings = {
	count?: number;
	incrementBy?: number;
	ipAddress?: string;
	token?: string;
};