import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import MidiPlayer from "midi-player-js";
import { Output } from "webmidi";

interface MidiFilePlayerProps {
  selectedOutput: Output | null;
  onMidiEvent?: (bytes: number[]) => void;
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

const MidiFilePlayer = forwardRef<MidiFilePlayerRef, MidiFilePlayerProps>(({ selectedOutput, onMidiEvent }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef<MidiPlayer.Player | null>(null);
  const songDataRef = useRef<ArrayBuffer | null>(null);
  
  // Use refs for values needed in the player callback to avoid re-creating the player
  const selectedOutputRef = useRef(selectedOutput);
  const onMidiEventRef = useRef(onMidiEvent);
  const lastProgressUpdateRef = useRef(0);

  useImperativeHandle(ref, () => ({
    stop: stopPlayback
  }));

  useEffect(() => {
    selectedOutputRef.current = selectedOutput;
  }, [selectedOutput]);

  useEffect(() => {
    onMidiEventRef.current = onMidiEvent;
  }, [onMidiEvent]);

  useEffect(() => {
    // Initialize the player once
    playerRef.current = new MidiPlayer.Player((event: MidiEvent) => {
      const output = selectedOutputRef.current;
      if (!output) return;

      try {
        const channel = Math.max(1, Math.min(16, event.channel || 1));
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
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          songDataRef.current = event.target.result;
          if (playerRef.current) {
            try {
              playerRef.current.loadArrayBuffer(event.target.result);
            } catch (err) {
              console.error("[Player] Load Error:", err);
              setFileName(null);
            }
          }
        }
      };
      reader.onerror = () => {
        console.error("[Player] File Read Error");
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
            <button onClick={togglePlay} disabled={!selectedOutput} style={{ flex: 1, padding: "10px", backgroundColor: isPlaying ? "#f39c12" : "#27ae60", color: "white", border: "none", borderRadius: "4px", cursor: selectedOutput ? "pointer" : "not-allowed", fontWeight: "bold" }}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button onClick={stopPlayback} disabled={!selectedOutput} style={{ padding: "10px 20px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "4px", cursor: selectedOutput ? "pointer" : "not-allowed", fontWeight: "bold" }}>
              ⏹ Stop
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default MidiFilePlayer;
