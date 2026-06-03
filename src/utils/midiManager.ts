import { WebMidi, Output } from "webmidi";

/**
 * Singleton MIDI Manager to handle WebMidi lifecycle outside of React.
 */
class MidiManager {
  private static instance: MidiManager;
  public isReady = false;
  public error: string | null = null;
  public sysexEnabled = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): MidiManager {
    if (!MidiManager.instance) {
      MidiManager.instance = new MidiManager();
    }
    return MidiManager.instance;
  }

  public async enable(useSysex: boolean = true): Promise<void> {
    if (this.isReady && this.sysexEnabled === useSysex) return Promise.resolve();
    
    if (this.isReady && this.sysexEnabled !== useSysex) {
      this.isReady = false;
      this.initPromise = null;
    }

    if (this.initPromise) return this.initPromise;

    console.log(`[MidiManager] Bypassing library for pre-flight check...`);
    
    this.initPromise = new Promise(async (resolve, reject) => {
      if (!navigator.requestMIDIAccess) {
        return reject(new Error("Web MIDI API not supported in this browser."));
      }

      const timeout = setTimeout(() => {
        reject(new Error("Raw navigator.requestMIDIAccess timed out after 10s. This usually means the OS MIDI driver is stuck or another app has exclusive control."));
      }, 10000);

      try {
        console.log(`[MidiManager] Requesting raw MIDI access (SysEx: ${useSysex})...`);
        const access = await navigator.requestMIDIAccess({ sysex: useSysex });
        clearTimeout(timeout);
        console.log("[MidiManager] Raw MIDI access granted.");
        console.log("[MidiManager] Raw Outputs found:", access.outputs.size);
        
        // Now that raw works, let WebMidi.js take over
        console.log("[MidiManager] Handing over to WebMidi.js...");
        await WebMidi.enable({ sysex: useSysex });
        
        this.isReady = true;
        this.sysexEnabled = useSysex;
        this.error = null;
        resolve();
      } catch (err: any) {
        clearTimeout(timeout);
        console.error("[MidiManager] MIDI Access Denied or Failed:", err);
        this.error = err.message || "MIDI Access Denied.";
        reject(err);
      }
    });

    return this.initPromise;
  }

  public getOutputs(): Output[] {
    return WebMidi.outputs;
  }

  public getInterface() {
    return WebMidi;
  }
}

export const midiManager = MidiManager.getInstance();
