import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import MidiPlayer from "midi-player-js";
import { Output } from "webmidi";

interface MidiFilePlayerProps {
  selectedOutput: Output | null;
  onMidiEvent?: (bytes: number[]) => void;
  partStates?: { muted: boolean; soloed: boolean }[];
}

export interface MidiFilePlayerRef {
  stop: () => void;
}

interface MidiEvent {
  channel?: number;
  name?: string;
  noteNumber?: number;
  velocity?: number;
  number?: number;
  controllerType?: number;
  value?: number;
  programNumber?: number;
}

const MidiFilePlayer = forwardRef<MidiFilePlayerRef, MidiFilePlayerProps>(({ selectedOutput, onMidiEvent, partStates }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileLoadStatus, setFileLoadStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [fileLoadError, setFileLoadError] = useState<string | null>(null);
  const playerRef = useRef<MidiPlayer.Player | null>(null);
  const songDataRef = useRef<ArrayBuffer | null>(null);
  
  // Use refs for values needed in the player callback to avoid re-creating the player
  const selectedOutputRef = useRef(selectedOutput);
  const onMidiEventRef = useRef(onMidiEvent);
  const partStatesRef = useRef(partStates);
  const lastProgressUpdateRef = useRef(0);

  // Keep the current output and callback available synchronously in the player callback.
  selectedOutputRef.current = selectedOutput;
  onMidiEventRef.current = onMidiEvent;

  useImperativeHandle(ref, () => ({
    stop: stopPlayback
  }));

  // Track partStates changes to handle immediate muting of active channels
  useEffect(() => {
    const prevStates = partStatesRef.current;
    partStatesRef.current = partStates;
    
    if (!selectedOutput || !partStates || !prevStates) return;

    // Helper to check if a channel IS ACTIVE
    const isActive = (states: { muted: boolean, soloed: boolean }[], idx: number) => {
      const hasSolo = states.some(s => s.soloed);
      if (hasSolo) return states[idx].soloed;
      return !states[idx].muted;
    };

    // If a channel was active and is now inactive, send "All Notes Off"
    for (let i = 0; i < 16; i++) {
      const wasActive = isActive(prevStates, i);
      const isNowActive = isActive(partStates, i);
      
      if (wasActive && !isNowActive) {
        selectedOutput.sendControlChange(123, 0, { channels: i + 1 });
        selectedOutput.sendControlChange(120, 0, { channels: i + 1 });
      }
    }
  }, [partStates, selectedOutput]);

  useEffect(() => {
    // Initialize the player once
    playerRef.current = new MidiPlayer.Player((event: MidiEvent) => {
      const output = selectedOutputRef.current;
      if (!output) return;

      try {
        const channel = Math.max(1, Math.min(16, event.channel || 1));
        const channelIdx = channel - 1;
        
        // Mute/Solo Logic
        const states = partStatesRef.current;
        if (states) {
          const hasSolo = states.some(s => s.soloed);
          const isSoloed = states[channelIdx].soloed;
          const isMuted = states[channelIdx].muted;
          
          const shouldPlay = hasSolo ? isSoloed : !isMuted;
          if (!shouldPlay) {
            // Special case: still allow Note Off, Program Change, etc? 
            // Usually, we filter EVERYTHING except perhaps essential system messages.
            // For now, filter everything if inactive.
            return;
          }
        }

        const eventName = (event.name || "").toLowerCase();
        
        // --- NOTE ON ---
        if (eventName === "note on") {
          const note = event.noteNumber || 60;
          const velocity = event.velocity || 0;
          
          if (velocity > 0) {
            output.playNote(note, { channels: channel, attack: velocity / 127 });
            onMidiEventRef.current?.([0x90 + channel - 1, note, velocity]);
          } else {
            output.stopNote(note, { channels: channel });
            onMidiEventRef.current?.([0x80 + channel - 1, note, 0]);
          }
        } 
        // --- NOTE OFF ---
        else if (eventName === "note off") {
          const note = event.noteNumber || 60;
          output.stopNote(note, { channels: channel });
          onMidiEventRef.current?.([0x80 + channel - 1, note, 0]);
        } 
        // --- CONTROL CHANGE ---
        else if (eventName === "controller change") {
          const num = event.number !== undefined ? event.number : event.controllerType;
          const val = event.value !== undefined ? event.value : 0;
          if (typeof num === 'number') {
            output.sendControlChange(num, val, { channels: channel });
            onMidiEventRef.current?.([0xB0 + channel - 1, num, val]);
          }
        } 
        // --- PROGRAM CHANGE ---
        else if (eventName === "program change") {
          const prog = event.value !== undefined ? event.value : event.programNumber;
          if (typeof prog === 'number') {
            output.sendProgramChange(prog, { channels: channel });
            onMidiEventRef.current?.([0xC0 + channel - 1, prog]);
          }
        } 
        // --- PITCH BEND ---
        else if (eventName === "pitch bend") {
          const val = event.value !== undefined ? event.value : 8192;
          output.sendPitchBend((val - 8192) / 8192, { channels: channel });
          onMidiEventRef.current?.([0xE0 + channel - 1, val & 0x7F, (val >> 7) & 0x7F]);
        }
      } catch (err) {
        console.error("[Player] Event Error:", err, event);
      }
    });

    playerRef.current.on("playing", () => {
      if (!playerRef.current) return;
      const totalTicks = playerRef.current.getTotalTicks() || 1;
      const currentTick = playerRef.current.getCurrentTick();
      const newProgress = (currentTick / totalTicks) * 100;
      
      // Throttle progress updates to ~10fps to avoid UI lag
      const now = Date.now();
      if (now - lastProgressUpdateRef.current > 100) {
        setProgress(newProgress);
        lastProgressUpdateRef.current = now;
      }
    });

    playerRef.current.on("endOfFile", () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, []); // Only run once on mount

  // Handle re-loading data if it changes (though songDataRef is used)
  useEffect(() => {
    if (playerRef.current && songDataRef.current) {
       // playerRef.current.loadArrayBuffer(songDataRef.current);
       // This might be redundant if handleFileChange already loads it
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Stop current playback immediately
      if (playerRef.current) {
        playerRef.current.stop();
      }
      setIsPlaying(false);
      setFileName(file.name);
      setProgress(0);

      const reader = new FileReader();
      setFileLoadStatus("loading");
      setFileLoadError(null);
      songDataRef.current = null;

      reader.onload = () => {
        const result = reader.result;
        if (result instanceof ArrayBuffer) {
          songDataRef.current = result;
          if (playerRef.current) {
            try {
              playerRef.current.loadArrayBuffer(result);
              setFileLoadStatus("loaded");
            } catch (err) {
              console.error("[Player] Load Error:", err);
              setFileLoadError("Failed to parse MIDI file.");
              setFileLoadStatus("error");
              setFileName(null);
            }
          }
        } else {
          console.error("[Player] Unexpected FileReader result type:", typeof result, result);
          setFileLoadError("Invalid MIDI file format.");
          setFileLoadStatus("error");
          setFileName(null);
        }
      };

      reader.onerror = () => {
        console.error("[Player] File Read Error", reader.error);
        setFileLoadError(reader.error?.message || "Failed to load MIDI file.");
        setFileLoadStatus("error");
        setFileName(null);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const stopPlayback = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      if (selectedOutput) {
        for (let i = 1; i <= 16; i++) {
          selectedOutput.sendControlChange(123, 0, { channels: i });
        }
      }
    }
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #444", borderRadius: "8px", backgroundColor: "#1e1e1e" }}>
      <h4 style={{ margin: "0 0 10px 0" }}>MIDI File Player</h4>
      <div style={{ marginBottom: "15px" }}>
        <input type="file" accept=".mid,.midi" onChange={handleFileChange} style={{ display: "none" }} id="midi-file-input" />
        <label htmlFor="midi-file-input" style={{ display: "inline-block", padding: "8px 12px", backgroundColor: "#444", color: "#eee", borderRadius: "4px", cursor: "pointer", fontSize: "0.9em" }}>
          {fileName ? `File: ${fileName}` : "Choose MIDI File"}
        </label>
      </div>

      {fileName && (
        <>
          <div style={{ width: "100%", height: "6px", backgroundColor: "#333", borderRadius: "3px", marginBottom: "15px", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#4CAF50", transition: "width 0.1s linear" }} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={togglePlay} disabled={!selectedOutput || !songDataRef.current} style={{ flex: 1, padding: "10px", backgroundColor: isPlaying ? "#f39c12" : "#27ae60", color: "white", border: "none", borderRadius: "4px", cursor: selectedOutput && songDataRef.current ? "pointer" : "not-allowed", fontWeight: "bold" }}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button onClick={stopPlayback} disabled={!selectedOutput || !songDataRef.current} style={{ padding: "10px 20px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "4px", cursor: selectedOutput && songDataRef.current ? "pointer" : "not-allowed", fontWeight: "bold" }}>
              ⏹ Stop
            </button>
          </div>
          {(!selectedOutput || !songDataRef.current || fileLoadStatus !== "loaded") && (
            <p style={{ marginTop: "10px", color: "#f39c12", fontSize: "0.85em" }}>
              {selectedOutput ? (
                fileLoadStatus === "loading" ? "Loading MIDI file..." :
                fileLoadStatus === "error" ? `Error: ${fileLoadError || "Unable to load file."}` :
                "Waiting for MIDI file to finish loading..."
              ) : "Select a MIDI output to enable playback."}
            </p>
          )}
        </>
      )}
    </div>
  );
});

export default MidiFilePlayer;
