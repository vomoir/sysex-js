import React, { useState, useRef, useEffect } from "react";
import MidiPlayer from "midi-player-js";
import { Output } from "webmidi";

interface MidiFilePlayerProps {
  selectedOutput: Output | null;
  onMidiEvent?: (bytes: number[]) => void;
}

const MidiFilePlayer: React.FC<MidiFilePlayerProps> = ({ selectedOutput, onMidiEvent }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef<MidiPlayer.Player | null>(null);
  const songDataRef = useRef<ArrayBuffer | null>(null);

  useEffect(() => {
    // Initialize the player
    playerRef.current = new MidiPlayer.Player((event: any) => {
      if (!selectedOutput) return;

      try {
        const channel = event.channel || 1;
        // console.log("[MidiFilePlayer] Event:", event.name, "Ch:", channel);
        
        if (event.name === "Note on" && event.velocity > 0) {
          selectedOutput.playNote(event.noteNumber || event.noteName, {
            channels: channel,
            attack: event.velocity / 127
          });
          onMidiEvent?.([0x90 + channel - 1, event.noteNumber || 60, event.velocity]);
        } else if (event.name === "Note off" || (event.name === "Note on" && event.velocity === 0)) {
          selectedOutput.stopNote(event.noteNumber || event.noteName, {
            channels: channel
          });
          onMidiEvent?.([0x80 + channel - 1, event.noteNumber || 60, 0]);
        } else if (event.name === "Controller Change") {
          selectedOutput.sendControlChange(event.number || event.controllerType, event.value, {
            channels: channel
          });
          onMidiEvent?.([0xB0 + channel - 1, event.number || event.controllerType, event.value]);
        } else if (event.name === "Program Change") {
          selectedOutput.sendProgramChange(event.value || event.programNumber, {
            channels: channel
          });
          onMidiEvent?.([0xC0 + channel - 1, event.value || event.programNumber]);
        } else if (event.name === "Pitch Bend") {
          selectedOutput.sendPitchBend((event.value - 8192) / 8192, {
            channels: channel
          });
          onMidiEvent?.([0xE0 + channel - 1, event.value & 0x7F, (event.value >> 7) & 0x7F]);
        }
      } catch (err) {
        console.warn("Error sending MIDI event:", err);
      }
    });

    if (songDataRef.current) {
      playerRef.current.loadArrayBuffer(songDataRef.current);
    }

    playerRef.current.on("playing", () => {
      if (!playerRef.current) return;
      const totalTicks = playerRef.current.getTotalTicks() || 1;
      const currentTick = playerRef.current.getCurrentTick();
      setProgress((currentTick / totalTicks) * 100);
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
  }, [selectedOutput, onMidiEvent]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          songDataRef.current = event.target.result;
          if (playerRef.current) {
            playerRef.current.loadArrayBuffer(event.target.result);
            setProgress(0);
            setIsPlaying(false);
          }
        }
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
};

export default MidiFilePlayer;
