import streamDeck from "@elgato/streamdeck";

import { IncrementCounter } from "./actions/txgain";
import { CrosspointGain } from "./actions/crosspointgain";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

// Register the increment action.
streamDeck.actions.registerAction(new IncrementCounter());

// Register the CrosspointGain action.
streamDeck.actions.registerAction(new CrosspointGain());

// Finally, connect to the Stream Deck.
streamDeck.connect();
