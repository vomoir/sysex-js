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
  
  const [instrumentIndex, setInstrumentIndex] = useState(0);
  const [volume, setVolume] = useState(100);
  const [pan, setPan] = useState(64);
  const [reverb, setReverb] = useState(40);
  
  const [lcdText, setLcdText] = useState("HELLO SC-88 PRO");
  const [useSysex] = useState(true);
  const [sysexLog, setSysexLog] = useState<{ id: number, data: string, timestamp: string }[]>([]);
  
  const playerRef = React.useRef<MidiFilePlayerRef>(null);

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

  // Correcting the addresses for SC-88 Pro Part 1
  // Part 1 Address for Variation Bank: 40 11 00
  // Part 1 Address for Program Change: 40 11 01
  const part1Address = [0x40, 0x11, 0x00];

  // 1. Generate SysEx for Bank Select (Variation Bank 8)
  const bankSysexBody = buildRolandSysex(part1Address, [0x08], deviceId - 1, MODEL_ID_GS);
  
  // 2. Generate SysEx for Program Change (Instrument 110)
  // Program change address is 40 11 01
  const progAddress = [0x40, 0x11, 0x01];
  const programSysexBody = buildRolandSysex(progAddress, [0x6D], deviceId - 1, MODEL_ID_GS); // 110 is 0x6E, but PC is often 0-indexed in sysex too? Actually 0x6E is 110. Let's use 0x6E for PC 110.

  console.log("Sending Didgeridoo SysEx messages...");
  selectedOutput.sendSysex(ROLAND_ID, bankSysexBody);
  selectedOutput.sendSysex(ROLAND_ID, programSysexBody);
  
  addToLog([0xF0, ROLAND_ID, ...bankSysexBody, 0xF7]);
  addToLog([0xF0, ROLAND_ID, ...programSysexBody, 0xF7]);

  console.log("Didgeridoo SysEx messages sent successfully!");
};
	
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    sendParameter(SC88_ADDRESSES.partLevel(partIndex), val);
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setPan(val);
    sendParameter(SC88_ADDRESSES.partPan(partIndex), val);
  };

  const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setReverb(val);
    sendParameter(SC88_ADDRESSES.partReverb(partIndex), val);
  };

  const handleInstrumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    setInstrumentIndex(idx);
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
            {Array.from({ length: 16 }).map((_, i) => <option key={i} value={i}>Part {i + 1}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>Instrument: </label>
          <select value={instrumentIndex} onChange={handleInstrumentChange} style={{ width: "100%", padding: "4px" }}>
            {SC88PRO_INSTRUMENTS.map((inst, i) => <option key={i} value={i}>{inst.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Volume ({volume})</label>
          <input type="range" min="0" max="127" value={volume} onChange={handleVolumeChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Pan ({pan})</label>
          <input type="range" min="1" max="127" value={pan} onChange={handlePanChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Reverb ({reverb})</label>
          <input type="range" min="0" max="127" value={reverb} onChange={handleReverbChange} style={{ width: "100%" }} />
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

        <MidiFilePlayer ref={playerRef} selectedOutput={selectedOutput} onMidiEvent={addToLog} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px", border: "1px solid #444", borderRadius: "8px", backgroundColor: "#000", color: "#0f0", fontFamily: "monospace", overflow: "hidden" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#eee" }}>Monitor</h3>
          <div style={{ flex: 1, overflowY: "auto", fontSize: "0.85em", display: "flex", flexDirection: "column-reverse" }}>
            {sysexLog.map((log) => (
              <div key={log.id} style={{ marginBottom: "2px" }}>
                <span style={{ color: "#666" }}>[{log.timestamp}]</span> {log.data}
              </div>
            ))}
          </div>
          <button onClick={() => setSysexLog([])} style={{ marginTop: "10px", padding: "5px", backgroundColor: "#333", color: "#ccc", border: "none", borderRadius: "4px" }}>Clear</button>
        </div>
      </div>
    </div>
  );
};

export default PartEditor;
