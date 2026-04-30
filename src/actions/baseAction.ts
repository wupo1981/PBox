import {
	KeyDownEvent,
	SingletonAction,
	WillAppearEvent,
	DialRotateEvent,
	TitleParametersDidChangeEvent,
	DidReceiveSettingsEvent,
	KeyUpEvent,
	DialDownEvent,
	DialUpEvent,
	WillDisappearEvent,
} from "@elgato/streamdeck";
import { CounterSettings, ApiResponse } from "../types";

/**
 * Base class for audio control actions (TxGain, CrosspointGain).
 * Provides common functionality for dial/encoder controls with API integration.
 */
export abstract class AudioControlAction extends SingletonAction<CounterSettings> {
	protected currentTitle: string = "";
	private longPressTimers: Map<string, NodeJS.Timeout> = new Map();
	protected apiTimeout = 5000; // 5 second timeout for API requests

	/**
	 * Initialize display on action appear (including page switches).
	 */
	override onWillAppear(ev: WillAppearEvent<CounterSettings>): void | Promise<void> {
		const count = ev.payload.settings.count ?? 0;
		// Refresh display with current saved values when action reappears
		// Use currentTitle if available, otherwise empty string (will be set by onTitleParametersDidChange)
		this.updateDisplay(this.currentTitle, count, ev);
		
		// Also restore dial feedback indicator if this is a dial action
		if (ev.action.isDial()) {
			const indicatorValue = ((count + 40) / 80) * 100;
			ev.action.setFeedback({
				title: this.currentTitle || "Audio Control",
				value: `${count}dB`,
				indicator: {
					value: Math.round(indicatorValue),
				},
			});
		}
		
		this.initializeSettings(ev);
	}

	/**
	 * Cleanup timers when action disappears.
	 */
	override onWillDisappear(ev: WillDisappearEvent<CounterSettings>): void | Promise<void> {
		this.longPressTimers.forEach((timer) => clearTimeout(timer));
		this.longPressTimers.clear();
	}

	/**
	 * Capture user-set title from title parameters.
	 */
	override onTitleParametersDidChange(
		ev: TitleParametersDidChangeEvent<CounterSettings>
	): void | Promise<void> {
		let title = ev.payload.title || "";
		title = title.split("\n")[0].trim();
		this.currentTitle = title;
		const count = ev.payload.settings.count ?? 0;
		this.updateDisplay(this.currentTitle, count, ev);
	}

	/**
	 * Handle settings updates from property inspector.
	 */
	override onDidReceiveSettings(
		ev: DidReceiveSettingsEvent<CounterSettings>
	): void | Promise<void> {
		console.log("Settings received from property inspector:", ev.payload.settings);
		this.initializeSettings(ev);
	}

	/**
	 * Handle button press (with long-press support).
	 */
	override async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
		const context = ev.action.id;
		const timer = setTimeout(async () => {
			await this.handleLongPress(ev);
			this.longPressTimers.delete(context);
		}, 3000);

		this.longPressTimers.set(context, timer);
	}

	/**
	 * Handle button release (short-press).
	 */
	override async onKeyUp(ev: KeyUpEvent<CounterSettings>): Promise<void> {
		const context = ev.action.id;
		const timer = this.longPressTimers.get(context);

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
	 * Handle dial/encoder rotation.
	 */
	override async onDialRotate(ev: DialRotateEvent<CounterSettings>): Promise<void> {
		const { settings } = ev.payload;
		settings.incrementBy ??= 1;
		const newCount = (settings.count ?? 0) + settings.incrementBy * ev.payload.ticks;

		// Clamp the value to audio range (-40 to 40 dB)
		const clampedCount = Math.max(-40, Math.min(40, newCount));
		await this.sendVolumeUpdate(clampedCount, settings, ev);
	}

	/**
	 * Handle dial press (with long-press support).
	 */
	override onDialDown(ev: DialDownEvent<CounterSettings>): void | Promise<void> {
		const context = ev.action.id;
		const timer = setTimeout(async () => {
			await this.handleLongPress(ev);
			this.longPressTimers.delete(context);
		}, 3000);

		this.longPressTimers.set(context, timer);
	}

	/**
	 * Handle dial release.
	 */
	override async onDialUp(ev: DialUpEvent<CounterSettings>): Promise<void> {
		const context = ev.action.id;
		const timer = this.longPressTimers.get(context);

		if (timer !== undefined) {
			clearTimeout(timer);
			this.longPressTimers.delete(context);
		}
	}

	/**
	 * Initialize settings with defaults.
	 */
	protected abstract initializeSettings(
		ev:
			| WillAppearEvent<CounterSettings>
			| DidReceiveSettingsEvent<CounterSettings>
	): void;

	/**
	 * Handle long-press action (typically reset to 0).
	 */
	protected async handleLongPress(
		ev:
			| KeyDownEvent<CounterSettings>
			| DialDownEvent<CounterSettings>
	): Promise<void> {
		const { settings } = ev.payload;
		settings.count = 0;
		await ev.action.setSettings(settings);
		this.updateDisplay(this.currentTitle, 0, ev);
		await this.sendVolumeUpdate(0, settings, ev);
		console.log("Long press detected: reset count to 0");
	}

	/**
	 * Update the visual display with SVG.
	 */
	protected updateDisplay(
		title: string,
		dbValue: number,
		ev:
			| TitleParametersDidChangeEvent<CounterSettings>
			| KeyDownEvent<CounterSettings>
			| KeyUpEvent<CounterSettings>
			| DialDownEvent<CounterSettings>
			| DialRotateEvent<CounterSettings>
			| DialUpEvent<CounterSettings>
			| WillAppearEvent<CounterSettings>
	): void {
		const svg = this.createDisplaySVG(title, dbValue);
		ev.action.setImage(svg);
	}

	/**
	 * Create SVG display for dB value.
	 */
	protected createDisplaySVG(title: string, dbValue: number): string {
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
	 * Update dial feedback indicator.
	 */
	protected updateDialFeedback(
		ev:
			| KeyDownEvent<CounterSettings>
			| KeyUpEvent<CounterSettings>
			| DialDownEvent<CounterSettings>
			| DialRotateEvent<CounterSettings>
			| DialUpEvent<CounterSettings>,
		dbValue: number,
		defaultTitle: string
	): void {
		if (ev.action.isDial()) {
			// Convert db value range (-40 to 40) to percentage (0 to 100)
			const indicatorValue = ((dbValue + 40) / 80) * 100;
			ev.action.setFeedback({
				title: this.currentTitle || defaultTitle,
				value: `${dbValue}dB`,
				indicator: {
					value: Math.round(indicatorValue),
				},
			});
		}
	}

	/**
	 * Send volume update to API. Subclasses must implement.
	 */
	protected abstract sendVolumeUpdate(
		newCount: number,
		settings: CounterSettings,
		ev:
			| KeyDownEvent<CounterSettings>
			| KeyUpEvent<CounterSettings>
			| DialDownEvent<CounterSettings>
			| DialRotateEvent<CounterSettings>
			| DialUpEvent<CounterSettings>
	): Promise<void>;

	/**
	 * Fetch with timeout support.
	 */
	protected async fetchWithTimeout(
		url: string,
		options: RequestInit
	): Promise<Response> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.apiTimeout);

		try {
			return await fetch(url, {
				...options,
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timeout);
		}
	}

	/**
	 * Parse TX/RX pair string "0,1" into two integers.
	 */
	protected parsePair(pairStr: string): [number, number] {
		const [first, second] = pairStr.split(",").map((v) => parseInt(v.trim(), 10));
		if (isNaN(first) || isNaN(second)) {
			console.error(`Invalid pair format: ${pairStr}`);
			throw new Error(`Invalid pair format: ${pairStr}`);
		}
		return [first, second];
	}

	/**
	 * Validate API response for errors.
	 */
	protected validateApiResponse(data: ApiResponse): boolean {
		if (data.status === 27 && data.code === "OutOfRange") {
			console.warn("OutOfRange error: count change stopped");
			return false;
		}

		if (data.status && data.status !== 0) {
			console.error("API error:", data);
			return false;
		}

		return true;
	}
}
