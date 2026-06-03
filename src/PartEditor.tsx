import React, { useEffect, useState } from "react";
import { Output } from "webmidi";
import { buildRolandSysex, SC88_ADDRESSES, ROLAND_ID, EFX_TYPES, MODEL_ID_SC88PRO, MODEL_ID_GS } from "./utils/rolandSysex";
import { midiManager } from "./utils/midiManager";
import { SC88PRO_INSTRUMENTS } from "./utils/instruments";
import MidiFilePlayer from "./MidiFilePlayer";

const PartEditor: React.FC = () => {
  const [status, setStatus] = useState<"uninitialized" | "initializing" | "ready" | "error">("uninitialized");
  const [errorMessage, setErrorMessage] = useState("");
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);
  const [deviceId, setDeviceId] = useState(17); 
  const [partIndex, setPartIndex] = useState(0); 
  
  const [instrumentIndex, setInstrumentIndex] = useState(0);
  const [volume, setVolume] = useState(100);
  const [pan, setPan] = useState(64);
  const [reverb, setReverb] = useState(40);
  const [efxSend, setEfxSend] = useState(0);
  
  const [lcdText, setLcdText] = useState("HELLO SC-88 PRO");
  const [isFlashing, setIsFlashing] = useState(false);
  const [useSysex, setUseSysex] = useState(true);
  const [sysexLog, setSysexLog] = useState<{ id: number, data: string, timestamp: string }[]>([]);

  const flashIndicator = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 100);
  };

  const addToLog = (bytes: number[]) => {
    const hex = bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
    const entry = {
      id: Date.now() + Math.random(),
      data: bytes[0] === 0xF0 ? hex : `[MIDI] ${hex}`,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };
    setSysexLog(prev => [entry, ...prev].slice(0, 50));
  };

  const handleInit = async () => {
    setStatus("initializing");
    try {
      await midiManager.enable(useSysex);
      setStatus("ready");
      const availableOutputs = midiManager.getOutputs();
      setOutputs(availableOutputs);
      if (availableOutputs.length > 0) setSelectedOutput(availableOutputs[0]);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to enable MIDI.");
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
    flashIndicator();
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

  const handleEfxSendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setEfxSend(val);
    sendParameter((SC88_ADDRESSES as any).sc88PartEfxSend(partIndex), val, MODEL_ID_GS);
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
      flashIndicator();
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
    console.log("[TestNote] Clicked. Output:", selectedOutput?.name, "Channel:", partIndex + 1);
    if (!selectedOutput) {
      console.warn("[TestNote] No output selected!");
      return;
    }
    const channel = partIndex + 1;
    try {
      // 1. Send standard MIDI Note On
      selectedOutput.playNote("C4", { channels: channel, duration: 500, attack: 0.8 });
      
      // 2. Also send a Volume 100 CC just in case it was at 0
      selectedOutput.sendControlChange(7, 100, { channels: channel });
      selectedOutput.sendControlChange(11, 127, { channels: channel });

      addToLog([0x90 + channel - 1, 0x3C, 0x66]); 
      flashIndicator();
      console.log("[TestNote] Command sent successfully.");
    } catch (err) {
      console.error("[TestNote] Failed to send:", err);
    }
  };

  const sendPanic = () => {
    if (!selectedOutput) return;
    console.log("[Panic] Sending All Notes Off to all 16 channels...");
    for (let i = 1; i <= 16; i++) {
      selectedOutput.sendControlChange(123, 0, { channels: i }); // All Notes Off
      selectedOutput.sendControlChange(120, 0, { channels: i }); // All Sound Off
      selectedOutput.sendControlChange(7, 100, { channels: i });  // Reset Volume to 100
    }
    // Also send a GS Reset SysEx
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

        <button onClick={playTestNote} style={{ marginTop: "15px", width: "100%", padding: "12px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold" }}>
          🎵 Play Test Note (C4)
        </button>

        <MidiFilePlayer selectedOutput={selectedOutput} onMidiEvent={addToLog} />
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
