import React, { useEffect, useState, useCallback } from "react";
import { Output } from "webmidi";
import { buildRolandSysex, SC88_ADDRESSES, ROLAND_ID, MODEL_ID_SC88PRO, MODEL_ID_GS } from "./utils/rolandSysex";
import { midiManager } from "./utils/midiManager";
import { SC88PRO_INSTRUMENTS } from "./utils/instruments";
import MidiFilePlayer from "./MidiFilePlayer";
import type { MidiFilePlayerRef } from "./MidiFilePlayer";

const PartEditor: React.FC = () => {
  const [status, setStatus] = useState<"uninitialized" | "initializing" | "ready" | "error">("uninitialized");
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);
  const [deviceId, setDeviceId] = useState(17); 
  const [partIndex, setPartIndex] = useState(0); 
  
  // Manage state for all 16 parts
  const [partStates, setPartStates] = useState(
    Array.from({ length: 16 }, () => ({
      instrumentIndex: 0,
      volume: 100,
      pan: 64,
      reverb: 40,
      muted: false,
      soloed: false
    }))
  );
  
  const [lcdText, setLcdText] = useState("HELLO SC-88 PRO");
  const [useSysex] = useState(true);
  const [sysexLog, setSysexLog] = useState<{ id: number, data: string, timestamp: string }[]>([]);
  
  const playerRef = React.useRef<MidiFilePlayerRef>(null);

  const currentPart = partStates[partIndex];

  const updateCurrentPart = (updates: Partial<typeof currentPart>) => {
    setPartStates(prev => {
      const next = [...prev];
      next[partIndex] = { ...next[partIndex], ...updates };
      return next;
    });
  };

  const addToLog = useCallback((bytes: (number | string | undefined)[]) => {
    // Filter and convert bytes to hex
    const validBytes = bytes.filter((b): b is number | string => b !== undefined);
    const hex = validBytes.map(b => {
      if (typeof b === 'number') return b.toString(16).toUpperCase().padStart(2, "0");
      return b.toString(); // Keep strings as is
    }).join(" ");

    const entry = {
      id: Date.now() + Math.random(),
      data: validBytes[0] === 0xF0 ? hex : `[MIDI] ${hex}`,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };
    setSysexLog(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const handleInit = async () => {
    setStatus("initializing");
    try {
      await midiManager.enable(useSysex);
      setStatus("ready");
      const availableOutputs = midiManager.getOutputs();
      setOutputs(availableOutputs);
      if (availableOutputs.length > 0) setSelectedOutput(availableOutputs[0]);
    } catch (err: unknown) {
      setStatus("error");
      console.error("MIDI Init Error:", err);
    }
  };

  useEffect(() => {
    const checkMidi = () => {
      if (midiManager.isReady) {
        setStatus("ready");
        const availableOutputs = midiManager.getOutputs();
        setOutputs(availableOutputs);
        if (availableOutputs.length > 0 && !selectedOutput) setSelectedOutput(availableOutputs[0]);
      }
    };
    checkMidi();
    const t = setTimeout(checkMidi, 500);
    return () => clearTimeout(t);
  }, [selectedOutput]);

  const sendParameter = (address: number[], value: number | number[], modelId: number = MODEL_ID_GS) => {
    if (!selectedOutput) return;
    const data = Array.isArray(value) ? value : [value];
    const sysexBody = buildRolandSysex(address, data, deviceId - 1, modelId);
    selectedOutput.sendSysex(ROLAND_ID, sysexBody);
    addToLog([0xF0, ROLAND_ID, ...sysexBody, 0xF7]);
  };
  
// Sending the command via WebMidi (targeting Part 1 / MIDI Ch 1)
const setDidgeridooOnPart1 = () => {
  if (!selectedOutput) return;

  const channel = 1; // Targeting Part 1
  const statusCC = 0xB0 + (channel - 1);
  const statusPC = 0xC0 + (channel - 1);

  console.log(`Executing multi-layer hardware reset & CC Map force on Channel ${channel}...`);

  // LAYER A: Universal Master GS Engine Reset SysEx
  const resetBody = buildRolandSysex(SC88_ADDRESSES.GS_RESET, [0x00], deviceId - 1, MODEL_ID_GS);
  selectedOutput.sendSysex(ROLAND_ID, resetBody);
  addToLog([0xF0, ROLAND_ID, ...resetBody, 0xF7]);

  // LAYER B: Force Bank Variables using Standard MIDI Control Changes after 150ms
  setTimeout(() => {
    console.log("Injecting Bank Selection controllers...");
    
    // 1. Bank Select MSB (CC 00) = 8 (This isolates Bank 8)
    selectedOutput.send([statusCC, 0x00, 0x08]); 
    addToLog([statusCC, 0x00, 0x08]);
    
    // 2. Bank Select LSB (CC 32) = 3 (CRITICAL: 3 explicitly forces the SC-88 Pro Tone Map)
    selectedOutput.send([statusCC, 0x20, 0x03]); 
    addToLog([statusCC, 0x20, 0x03]);
  }, 150);

  // LAYER C: Execute the Instrument Change instruction after 300ms
  setTimeout(() => {
    console.log("Injecting Program Change...");
    
    // Program Change (PC) = 110 (Mizmar base register containing the Didgeridoo patch)
    // 110 is 0x6D in Hexadecimal (zero based)
    selectedOutput.send([statusPC, 0x6D]);
    addToLog([statusPC, 0x6D]);
    
    console.log("Didgeridoo engine command loop fully dispatched.");
  }, 300);
};
	
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    updateCurrentPart({ volume: val });
    sendParameter(SC88_ADDRESSES.partLevel(partIndex), val);
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    updateCurrentPart({ pan: val });
    sendParameter(SC88_ADDRESSES.partPan(partIndex), val);
  };

  const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    updateCurrentPart({ reverb: val });
    sendParameter(SC88_ADDRESSES.partReverb(partIndex), val);
  };

  const handleInstrumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    updateCurrentPart({ instrumentIndex: idx });
    const inst = SC88PRO_INSTRUMENTS[idx];
    if (selectedOutput && inst) {
      const channel = partIndex + 1;
      selectedOutput.sendControlChange(0, inst.bankMSB, { channels: channel });
      selectedOutput.sendControlChange(32, inst.bankLSB, { channels: channel });
      selectedOutput.sendProgramChange(inst.program, { channels: channel });
      addToLog([0xB0 + channel - 1, 0x00, inst.bankMSB]);
      addToLog([0xB0 + channel - 1, 0x20, inst.bankLSB]);
      addToLog([0xC0 + channel - 1, inst.program]);
    }
  };

  const toggleMute = () => {
    updateCurrentPart({ muted: !currentPart.muted });
  };

  const toggleSolo = () => {
    updateCurrentPart({ soloed: !currentPart.soloed });
  };

  const resetAllMuteSolo = () => {
    setPartStates(prev => prev.map(p => ({ ...p, muted: false, soloed: false })));
  };

  const handleLcdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.toUpperCase().substring(0, 16);
    setLcdText(text);
    const asciiBytes = text.split("").map(char => char.charCodeAt(0));
    while (asciiBytes.length < 16) asciiBytes.push(32);
    sendParameter(SC88_ADDRESSES.LCD_DISPLAY, asciiBytes, MODEL_ID_SC88PRO);
  };

  const playTestNote = () => {
    if (!selectedOutput) return;
    const channel = partIndex + 1;
    try {
      selectedOutput.playNote("C4", { channels: channel, duration: 500, attack: 0.8 });
      selectedOutput.sendControlChange(7, 100, { channels: channel });
      selectedOutput.sendControlChange(11, 127, { channels: channel });
      addToLog([0x90 + channel - 1, 0x3C, 0x66]); 
    } catch (err) {
      console.error("[TestNote] Error:", err);
    }
  };

  const sendPanic = () => {
    playerRef.current?.stop();
    if (!selectedOutput) return;
    for (let i = 1; i <= 16; i++) {
      selectedOutput.sendControlChange(123, 0, { channels: i });
      selectedOutput.sendControlChange(120, 0, { channels: i });
      selectedOutput.sendControlChange(7, 100, { channels: i });
    }
    const resetBody = buildRolandSysex(SC88_ADDRESSES.GS_RESET, [0x00], deviceId - 1, MODEL_ID_GS);
    selectedOutput.sendSysex(ROLAND_ID, resetBody);
    addToLog([0xF0, ROLAND_ID, ...resetBody, 0xF7]);
  };

  if (status === "uninitialized" || status === "initializing") return (
    <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#222", color: "#eee", borderRadius: "8px", border: "1px solid #444" }}>
      <h2>Roland SC-88 Pro Editor</h2>
      <button onClick={handleInit} style={{ padding: "15px 30px", fontSize: "1.2rem", cursor: "pointer", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px" }}>
        Connect MIDI Devices
      </button>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "20px", padding: "20px", maxWidth: "1200px", margin: "0 auto", backgroundColor: "#1a1a1a", minHeight: "80vh" }}>
      <div style={{ padding: "20px", border: "1px solid #444", borderRadius: "8px", backgroundColor: "#222", color: "#eee" }}>
        <h3 style={{ margin: "0 0 15px 0" }}>SC-88 Pro Part Editor</h3>
        <div style={{ marginBottom: "15px", display: "flex", gap: "10px" }}>
          <select onChange={(e) => setSelectedOutput(outputs.find(o => o.id === e.target.value) || null)} value={selectedOutput?.id || ""} style={{ flex: 2, padding: "4px" }}>
            {outputs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input type="number" min="1" max="32" value={deviceId} onChange={(e) => setDeviceId(parseInt(e.target.value))} style={{ flex: 1, padding: "3px" }} />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Part: </label>
          <select value={partIndex} onChange={(e) => setPartIndex(parseInt(e.target.value))} style={{ width: "100%", padding: "4px" }}>
            {Array.from({ length: 16 }).map((_, i) => <option key={i} value={i}>Part {i + 1} {partStates[i].muted ? "(M)" : ""} {partStates[i].soloed ? "(S)" : ""}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Instrument: </label>
          <select value={currentPart.instrumentIndex} onChange={handleInstrumentChange} style={{ width: "100%", padding: "4px" }}>
            {SC88PRO_INSTRUMENTS.map((inst, i) => <option key={i} value={i}>{inst.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button 
            onClick={toggleMute} 
            style={{ 
              flex: 1, 
              padding: "8px", 
              backgroundColor: currentPart.muted ? "#e74c3c" : "#444", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {currentPart.muted ? "🔇 MUTED" : "🔈 MUTE"}
          </button>
          <button 
            onClick={toggleSolo} 
            style={{ 
              flex: 1, 
              padding: "8px", 
              backgroundColor: currentPart.soloed ? "#f1c40f" : "#444", 
              color: currentPart.soloed ? "black" : "white", 
              border: "none", 
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {currentPart.soloed ? "⭐ SOLOED" : "✨ SOLO"}
          </button>
        </div>

        <button 
          onClick={resetAllMuteSolo} 
          style={{ 
            width: "100%", 
            marginBottom: "15px", 
            padding: "8px", 
            backgroundColor: "#2980b9", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          🔄 Reset Mute/Solo
        </button>

        <div style={{ marginBottom: "10px" }}>
          <label>Volume ({currentPart.volume})</label>
          <input type="range" min="0" max="127" value={currentPart.volume} onChange={handleVolumeChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Pan ({currentPart.pan})</label>
          <input type="range" min="1" max="127" value={currentPart.pan} onChange={handlePanChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Reverb ({currentPart.reverb})</label>
          <input type="range" min="0" max="127" value={currentPart.reverb} onChange={handleReverbChange} style={{ width: "100%" }} />
        </div>

        <hr style={{ borderColor: "#444" }} />
        <h4 style={{ margin: "10px 0" }}>LCD Display</h4>
        <input type="text" value={lcdText} onChange={handleLcdChange} maxLength={16} style={{ width: "100%", padding: "8px", backgroundColor: "#333", color: "#0f0", border: "1px solid #555", fontFamily: "monospace" }} />

        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button onClick={playTestNote} style={{ flex: 2, padding: "12px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>🎵 Play Test Note</button>
          <button onClick={sendPanic} style={{ flex: 1, padding: "12px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>🚫 PANIC</button>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button onClick={setDidgeridooOnPart1} style={{ flex: 2, padding: "12px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>🎵 Set Didgeridoo on Part 1</button>          
        </div>

        <MidiFilePlayer ref={playerRef} selectedOutput={selectedOutput} onMidiEvent={addToLog} partStates={partStates} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
        <div style={{ 
          height: "600px", 
          display: "flex", 
          flexDirection: "column", 
          padding: "20px", 
          border: "1px solid #444", 
          borderRadius: "8px", 
          backgroundColor: "#000", 
          color: "#0f0", 
          fontFamily: "monospace", 
          overflow: "hidden" 
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#eee" }}>Monitor</h3>
          <div style={{ 
            flex: 1, 
            overflowY: "auto", 
            fontSize: "0.85em", 
            display: "flex", 
            flexDirection: "column-reverse",
            paddingRight: "5px"
          }}>
            {sysexLog.map((log) => (
              <div key={log.id} style={{ marginBottom: "2px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                <span style={{ color: "#666" }}>[{log.timestamp}]</span> {log.data}
              </div>
            ))}
          </div>
          <button onClick={() => setSysexLog([])} style={{ marginTop: "10px", padding: "5px", backgroundColor: "#333", color: "#ccc", border: "none", borderRadius: "4px", cursor: "pointer" }}>Clear</button>
        </div>
      </div>
    </div>
  );
};

export default PartEditor;
