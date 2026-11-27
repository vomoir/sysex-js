import React, { useEffect, useState, useCallback } from "react";
import { Output } from "webmidi";
import { buildRolandSysex, SC88_ADDRESSES, ROLAND_ID, MODEL_ID_SC88PRO, MODEL_ID_GS, EFX_TYPES } from "./utils/rolandSysex";
import { midiManager } from "./utils/midiManager";
import { SC88PRO_INSTRUMENTS, SC88PRO_DRUM_KITS, GM_INSTRUMENT_NAMES } from "./utils/instruments";
import MidiFilePlayer from "./MidiFilePlayer";
import type { MidiFilePlayerRef } from "./MidiFilePlayer";

interface PartState {
  instrumentIndex: number;
  drumKitIndex: number;
  program: number;
  bankMSB: number;
  bankLSB: number;
  volume: number;
  pan: number;
  reverb: number;
  chorus: number;
  delay: number;
  muted: boolean;
  soloed: boolean;
  // Part Parameters
  partCutoff: number;
  partResonance: number;
  partAttack: number;
  partDecay: number;
  partRelease: number;
  partVibratoRate: number;
  partVibratoDepth: number;
  partVibratoDelay: number;
}

interface Snapshot {
  name: string;
  data: {
    partStates: PartState[];
    efxTypeIndex: number;
    efxSource: number;
    efxParams: number[];
    lcdText: string;
  };
}

const PartEditor: React.FC = () => {
  const [status, setStatus] = useState<"uninitialized" | "initializing" | "ready" | "error">("uninitialized");
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<Output | null>(null);
  const [deviceId, setDeviceId] = useState(17); 
  const [partIndex, setPartIndex] = useState(0); 
  
  // Manage state for all 16 parts
  const [partStates, setPartStates] = useState<PartState[]>(
    Array.from({ length: 16 }, () => ({
      instrumentIndex: 0,
      drumKitIndex: 0,
      program: 0,
      bankMSB: 0,
      bankLSB: 0,
      volume: 100,
      pan: 64,
      reverb: 40,
      chorus: 0,
      delay: 0,
      muted: false,
      soloed: false,
      partCutoff: 64,
      partResonance: 64,
      partAttack: 64,
      partDecay: 64,
      partRelease: 64,
      partVibratoRate: 64,
      partVibratoDepth: 64,
      partVibratoDelay: 64
    }))
  );

  const handleManualToneChange = (updates: Partial<{ program: number, bankMSB: number, bankLSB: number }>) => {
    const nextProgram = updates.program !== undefined ? updates.program : currentPart.program;
    const nextBankMSB = updates.bankMSB !== undefined ? updates.bankMSB : currentPart.bankMSB;
    const nextBankLSB = updates.bankLSB !== undefined ? updates.bankLSB : currentPart.bankLSB;

    updateCurrentPart({ program: nextProgram, bankMSB: nextBankMSB, bankLSB: nextBankLSB });

    if (selectedOutput) {
      const channel = partIndex + 1;
      selectedOutput.sendControlChange(0, nextBankMSB, { channels: channel });
      selectedOutput.sendControlChange(32, nextBankLSB, { channels: channel });
      selectedOutput.sendProgramChange(nextProgram, { channels: channel });
      
      addToLog([0xB0 + channel - 1, 0x00, nextBankMSB]);
      addToLog([0xB0 + channel - 1, 0x20, nextBankLSB]);
      addToLog([0xC0 + channel - 1, nextProgram]);
    }
  };
  
  const [lcdText, setLcdText] = useState("HELLO SC-88 PRO");
  const [selectedParamKey, setSelectedParamKey] = useState<string>("partCutoff");
  
  // EFX State
  const [efxTypeIndex, setEfxTypeIndex] = useState(0);
  const [efxSource, setEfxSource] = useState(0); // 0-15 for Part 1-16
  const [efxParams, setEfxParams] = useState<number[]>(Array(20).fill(64));

  // Drum Setup State
  const [selectedDrumNote, setSelectedDrumNote] = useState(36); // Default to Kick Drum
  const drumSetupIndex = 0; // Setup 1 or 2

  // Snapshots State
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    const saved = localStorage.getItem("sc88_snapshots");
    return saved ? JSON.parse(saved) : [];
  });
  const [snapshotName, setSnapshotName] = useState("");

  const [useSysex] = useState(true);
  const [sysexLog, setSysexLog] = useState<{ id: number, data: string, timestamp: string }[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const isMonitoringRef = React.useRef(true);

  // Sync ref with state
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);
  
  const playerRef = React.useRef<MidiFilePlayerRef>(null);

  const DRUM_NOTE_NAMES: Record<number, string> = {
    27: "High Q", 28: "Slap", 29: "Scratch Push", 30: "Scratch Pull", 31: "Sticks", 32: "Square Click", 
    33: "Metronome Click", 34: "Metronome Bell", 35: "Kick Drum 2", 36: "Kick Drum 1", 37: "Side Stick", 
    38: "Snare Drum 1", 39: "Hand Clap", 40: "Snare Drum 2", 41: "Low Tom 2", 42: "Closed Hi-hat", 
    43: "Low Tom 1", 44: "Pedal Hi-hat", 45: "Mid Tom 2", 46: "Open Hi-hat", 47: "Mid Tom 1", 
    48: "High Tom 2", 49: "Crash Cymbal 1", 50: "High Tom 1", 51: "Ride Cymbal 1", 52: "Chinese Cymbal", 
    53: "Ride Bell", 54: "Tambourine", 55: "Splash Cymbal", 56: "Cowbell", 57: "Crash Cymbal 2", 
    58: "Vibraslap", 59: "Ride Cymbal 2", 60: "High Bongo", 61: "Low Bongo", 62: "Mute High Conga", 
    63: "Open High Conga", 64: "Low Conga", 65: "High Timbale", 66: "Low Timbale", 67: "High Agogo", 
    68: "Low Agogo", 69: "Cabasa", 70: "Maracas", 71: "Short Whistle", 72: "Long Whistle", 
    73: "Short Guiro", 74: "Long Guiro", 75: "Claves", 76: "High Wood Block", 77: "Low Wood Block", 
    78: "Mute Cuica", 79: "Open Cuica", 80: "Mute Triangle", 81: "Open Triangle", 82: "Shaker", 
    83: "Jingle Bell", 84: "Bell Tree", 85: "Castanets", 86: "Mute Surdo", 87: "Open Surdo"
  };

  const handleDrumParamChange = (paramAddrFunc: (ds: number, note: number) => number[], val: number) => {
    sendParameter(paramAddrFunc(drumSetupIndex, selectedDrumNote), val, MODEL_ID_GS);
  };

  const playSelectedDrumNote = () => {
    if (!selectedOutput) return;
    const channel = 10; // Drums are always Ch 10
    try {
      // Trigger the note at velocity 100 for 200ms
      selectedOutput.playNote(selectedDrumNote, { channels: channel, duration: 200, attack: 100 / 127 });
      addToLog([0x90 + channel - 1, selectedDrumNote, 0x64]); 
    } catch (err) {
      console.error("[DrumTrigger] Error:", err);
    }
  };

  const handleEfxTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    setEfxTypeIndex(idx);
    // EFX Type is MSB/LSB. Most SC-88 Pro EFX are in MSB=0, LSB=idx
    sendParameter(SC88_ADDRESSES.EFX_TYPE_MSB, 0, MODEL_ID_SC88PRO);
    sendParameter(SC88_ADDRESSES.EFX_TYPE_LSB, idx, MODEL_ID_SC88PRO);
  };

  const handleEfxSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const src = parseInt(e.target.value);
    setEfxSource(src);
    sendParameter(SC88_ADDRESSES.EFX_SOURCE, src, MODEL_ID_SC88PRO);
  };

  const handleEfxParamChange = (index: number, val: number) => {
    const next = [...efxParams];
    next[index] = val;
    setEfxParams(next);
    sendParameter(SC88_ADDRESSES.efxParameter(index), val, MODEL_ID_SC88PRO);
  };

  const saveSnapshot = () => {
    if (!snapshotName.trim()) return;
    const newSnapshot = {
      name: snapshotName,
      data: {
        partStates,
        efxTypeIndex,
        efxSource,
        efxParams,
        lcdText
      }
    };
    const nextSnapshots = [...snapshots, newSnapshot];
    setSnapshots(nextSnapshots);
    localStorage.setItem("sc88_snapshots", JSON.stringify(nextSnapshots));
    setSnapshotName("");
  };

  const loadSnapshot = (snapshot: Snapshot) => {
    const { data } = snapshot;
    setPartStates(data.partStates);
    setEfxTypeIndex(data.efxTypeIndex);
    setEfxSource(data.efxSource);
    setEfxParams(data.efxParams);
    setLcdText(data.lcdText);

    if (!selectedOutput) return;

    // Restore Hardware State
    // 1. Restore Parts
    data.partStates.forEach((part: PartState, i: number) => {
      const channel = i + 1;
      const inst = SC88PRO_INSTRUMENTS[part.instrumentIndex];
      const kit = SC88PRO_DRUM_KITS[part.drumKitIndex];

      // Volume, Pan, Effects
      sendParameter(SC88_ADDRESSES.partLevel(i), part.volume);
      sendParameter(SC88_ADDRESSES.partPan(i), part.pan);
      sendParameter(SC88_ADDRESSES.partReverb(i), part.reverb);
      sendParameter(SC88_ADDRESSES.partChorus(i), part.chorus);
      sendParameter(SC88_ADDRESSES.partDelay(i), part.delay, MODEL_ID_SC88PRO);

      // Instruments / Kits
      if (i === 9) {
        selectedOutput.sendControlChange(0, kit.bankMSB, { channels: channel });
        selectedOutput.sendControlChange(32, kit.bankLSB, { channels: channel });
        selectedOutput.sendProgramChange(kit.program, { channels: channel });
      } else {
        selectedOutput.sendControlChange(0, inst.bankMSB, { channels: channel });
        selectedOutput.sendControlChange(32, inst.bankLSB, { channels: channel });
        selectedOutput.sendProgramChange(inst.program, { channels: channel });
      }
    });

    // 2. Restore EFX
    sendParameter(SC88_ADDRESSES.EFX_TYPE_MSB, 0, MODEL_ID_SC88PRO);
    sendParameter(SC88_ADDRESSES.EFX_TYPE_LSB, data.efxTypeIndex, MODEL_ID_SC88PRO);
    sendParameter(SC88_ADDRESSES.EFX_SOURCE, data.efxSource, MODEL_ID_SC88PRO);
    data.efxParams.forEach((val: number, i: number) => {
      sendParameter(SC88_ADDRESSES.efxParameter(i), val, MODEL_ID_SC88PRO);
    });

    // 3. Restore LCD
    const asciiBytes = data.lcdText.toUpperCase().split("").map((char: string) => char.charCodeAt(0));
    while (asciiBytes.length < 16) asciiBytes.push(32);
    sendParameter(SC88_ADDRESSES.LCD_DISPLAY, asciiBytes, MODEL_ID_SC88PRO);

    addToLog(["[System] Loaded Snapshot:", snapshot.name]);
  };

  const deleteSnapshot = (index: number) => {
    const next = snapshots.filter((_, i) => i !== index);
    setSnapshots(next);
    localStorage.setItem("sc88_snapshots", JSON.stringify(next));
  };

  const SC88_ADDRESS_MAP: Record<string, { label: string, addr: (idx: number) => number[], min: number, max: number, def: number }> = {
    partCutoff: { label: "Cutoff Frequency", addr: SC88_ADDRESSES.partCutoff, min: 0, max: 127, def: 64 },
    partResonance: { label: "Resonance", addr: SC88_ADDRESSES.partResonance, min: 0, max: 127, def: 64 },
    partAttack: { label: "Attack Time", addr: SC88_ADDRESSES.partAttack, min: 0, max: 127, def: 64 },
    partDecay: { label: "Decay Time", addr: SC88_ADDRESSES.partDecay, min: 0, max: 127, def: 64 },
    partRelease: { label: "Release Time", addr: SC88_ADDRESSES.partRelease, min: 0, max: 127, def: 64 },
    partChorus: { label: "Chorus Send", addr: SC88_ADDRESSES.partChorus, min: 0, max: 127, def: 0 },
    partDelay: { label: "Delay Send", addr: SC88_ADDRESSES.partDelay, min: 0, max: 127, def: 0 },
    partVibratoRate: { label: "Vibrato Rate", addr: SC88_ADDRESSES.partVibratoRate, min: 0, max: 127, def: 64 },
    partVibratoDepth: { label: "Vibrato Depth", addr: SC88_ADDRESSES.partVibratoDepth, min: 0, max: 127, def: 64 },
    partVibratoDelay: { label: "Vibrato Delay", addr: SC88_ADDRESSES.partVibratoDelay, min: 0, max: 127, def: 64 },
  };

  const currentPart = partStates[partIndex];
  const currentParamValue = (currentPart[selectedParamKey as keyof PartState] as number) ?? (SC88_ADDRESS_MAP[selectedParamKey] ? SC88_ADDRESS_MAP[selectedParamKey].def : 0);

  const updateCurrentPart = (updates: Partial<PartState>) => {
    setPartStates(prev => {
      const next = [...prev];
      next[partIndex] = { ...next[partIndex], ...updates };
      return next;
    });
  };

  const addToLog = useCallback((bytes: (number | string | undefined)[]) => {
    if (!isMonitoringRef.current) return;
    
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

  const handleChorusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    updateCurrentPart({ chorus: val });
    sendParameter(SC88_ADDRESSES.partChorus(partIndex), val);
  };

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    updateCurrentPart({ delay: val });
    sendParameter(SC88_ADDRESSES.partDelay(partIndex), val, MODEL_ID_SC88PRO);
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

  const handleDrumKitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    updateCurrentPart({ drumKitIndex: idx });
    const kit = SC88PRO_DRUM_KITS[idx];
    if (selectedOutput && kit) {
      const channel = 10; // Drums are always Ch 10
      selectedOutput.sendControlChange(0, kit.bankMSB, { channels: channel });
      selectedOutput.sendControlChange(32, kit.bankLSB, { channels: channel });
      selectedOutput.sendProgramChange(kit.program, { channels: channel });
      addToLog([0xB0 + channel - 1, 0x00, kit.bankMSB]);
      addToLog([0xB0 + channel - 1, 0x20, kit.bankLSB]);
      addToLog([0xC0 + channel - 1, kit.program]);
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

  const clearLog = () => {
    console.log("[Monitor] Clearing log...");
    setSysexLog([]);
  };

  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    const param = SC88_ADDRESS_MAP[selectedParamKey];
    updateCurrentPart({ [selectedParamKey]: val });
    sendParameter(param.addr(partIndex), val);
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
          <label>{partIndex === 9 ? "Drum Kit (Quick Select): " : "Instrument (Quick Select): "}</label>
          <select
            value={partIndex === 9 ? currentPart.drumKitIndex : currentPart.instrumentIndex}
            onChange={partIndex === 9 ? handleDrumKitChange : handleInstrumentChange}
            style={{ width: "100%", padding: "4px" }}
          >
            {(partIndex === 9 ? SC88PRO_DRUM_KITS : SC88PRO_INSTRUMENTS).map((inst, i) => (
              <option key={i} value={i}>{inst.name}</option>
            ))}
          </select>
        </div>

        {/* DEEP TONE SELECTION */}
        <div style={{ padding: "10px", backgroundColor: "#333", borderRadius: "4px", marginBottom: "15px", border: "1px solid #444" }}>
          <h5 style={{ margin: "0 0 8px 0", color: "#aaa" }}>Deep Tone Selection</h5>
          <div style={{ marginBottom: "8px" }}>
            <label style={{ fontSize: "0.75em", display: "block" }}>Program (1-128)</label>
            <select 
              value={currentPart.program} 
              onChange={(e) => handleManualToneChange({ program: parseInt(e.target.value) })}
              style={{ width: "100%", padding: "2px", fontSize: "0.85em" }}
            >
              {Array.from({ length: 128 }).map((_, i) => (
                <option key={i} value={i}>{i + 1}: {GM_INSTRUMENT_NAMES[i] || "Unknown"}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.75em", display: "block" }}>Variation (CC 0)</label>
              <input 
                type="number" min="0" max="127" 
                value={currentPart.bankMSB} 
                onChange={(e) => handleManualToneChange({ bankMSB: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", padding: "2px" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.75em", display: "block" }}>Map (CC 32)</label>
              <select 
                value={currentPart.bankLSB} 
                onChange={(e) => handleManualToneChange({ bankLSB: parseInt(e.target.value) })}
                style={{ width: "100%", padding: "2px" }}
              >
                <option value={0}>0: Native</option>
                <option value={1}>1: SC-88</option>
                <option value={2}>2: SC-55</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={playTestNote} style={{ flex: 1, padding: "8px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85em" }}>🎵 Test Note</button>
            <button onClick={sendPanic} style={{ flex: 1, padding: "8px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "0.85em" }}>🚫 Panic</button>
          </div>
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

        <div style={{ marginBottom: "10px" }}>
          <label>Chorus ({currentPart.chorus})</label>
          <input type="range" min="0" max="127" value={currentPart.chorus} onChange={handleChorusChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>Delay ({currentPart.delay})</label>
          <input type="range" min="0" max="127" value={currentPart.delay} onChange={handleDelayChange} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>EFX Send (SC-88 Pro Mode)</label>
          <input 
            type="range" 
            min="0" 
            max="127" 
            defaultValue={0} 
            onChange={(e) => sendParameter(SC88_ADDRESSES.sc88PartEfxSend(partIndex), parseInt(e.target.value), MODEL_ID_SC88PRO)} 
            style={{ width: "100%" }} 
          />
        </div>

        <div style={{ padding: "10px", backgroundColor: "#333", borderRadius: "4px", marginBottom: "15px" }}>
          <h5 style={{ margin: "0 0 8px 0" }}>Part Parameter Editor</h5>
          <select 
            value={selectedParamKey} 
            onChange={(e) => setSelectedParamKey(e.target.value)}
            style={{ width: "100%", marginBottom: "8px", padding: "4px" }}
          >
            {Object.entries(SC88_ADDRESS_MAP).map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input 
              type="range" 
              min={SC88_ADDRESS_MAP[selectedParamKey].min} 
              max={SC88_ADDRESS_MAP[selectedParamKey].max} 
              value={currentParamValue} 
              onChange={handleParamChange} 
              style={{ flex: 1 }} 
            />
            <span style={{ minWidth: "30px", textAlign: "right" }}>{currentParamValue}</span>
          </div>
        </div>

        {/* DRUM NOTE EDITOR (Only for Part 10) */}
        {partIndex === 9 && (
          <div style={{ padding: "15px", backgroundColor: "#2c3e50", borderRadius: "8px", border: "1px solid #34495e", marginBottom: "15px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#ecf0f1" }}>🥁 Drum Note Editor</h4>
            
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "0.8em", color: "#bdc3c7" }}>Select Drum Instrument</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <select 
                  value={selectedDrumNote} 
                  onChange={(e) => setSelectedDrumNote(parseInt(e.target.value))}
                  style={{ flex: 1, padding: "4px", backgroundColor: "#34495e", color: "white", border: "none" }}
                >
                  {Object.entries(DRUM_NOTE_NAMES).map(([note, name]) => (
                    <option key={note} value={note}>{note}: {name}</option>
                  ))}
                </select>
                <button 
                  onClick={playSelectedDrumNote}
                  style={{ padding: "4px 10px", backgroundColor: "#e67e22", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                >
                  🔊 Trigger
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Level", func: SC88_ADDRESSES.drumNoteLevel },
                { label: "Pan", func: SC88_ADDRESSES.drumNotePan },
                { label: "Reverb", func: SC88_ADDRESSES.drumNoteReverb },
                { label: "Chorus", func: SC88_ADDRESSES.drumNoteChorus },
                { label: "Delay", func: SC88_ADDRESSES.drumNoteDelay },
              ].map((param) => (
                <div key={param.label} style={{ fontSize: "0.75em" }}>
                  <label style={{ display: "block", marginBottom: "2px" }}>{param.label}</label>
                  <input 
                    type="range" 
                    min="0" max="127" 
                    defaultValue={64}
                    onChange={(e) => handleDrumParamChange(param.func, parseInt(e.target.value))} 
                    style={{ width: "100%" }}
                  />
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.65em", color: "#95a5a6", marginTop: "10px" }}>Changes apply to the individual drum sound in the current kit.</p>
          </div>
        )}

        <hr style={{ borderColor: "#444" }} />
        <h4 style={{ margin: "10px 0" }}>LCD Display</h4>
        <input type="text" value={lcdText} onChange={handleLcdChange} maxLength={16} style={{ width: "100%", padding: "8px", backgroundColor: "#333", color: "#0f0", border: "1px solid #555", fontFamily: "monospace" }} />

        <MidiFilePlayer ref={playerRef} selectedOutput={selectedOutput} onMidiEvent={addToLog} partStates={partStates} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
        <div style={{ padding: "20px", border: "1px solid #444", borderRadius: "8px", backgroundColor: "#222", color: "#eee" }}>
          <h3 style={{ margin: "0 0 15px 0" }}>EFX (Multi-Effects) Editor</h3>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>EFX Type</label>
            <select value={efxTypeIndex} onChange={handleEfxTypeChange} style={{ width: "100%", padding: "4px" }}>
              {EFX_TYPES.map((name, i) => <option key={i} value={i}>{i}: {name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>EFX Source (Routing)</label>
            <select value={efxSource} onChange={handleEfxSourceChange} style={{ width: "100%", padding: "4px" }}>
              {Array.from({ length: 16 }).map((_, i) => <option key={i} value={i}>Part {i + 1}</option>)}
              <option key={16} value={16}>OFF</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ fontSize: "0.8em" }}>
                <label style={{ display: "block" }}>Param {i + 1} ({efxParams[i]})</label>
                <input 
                  type="range" 
                  min="0" max="127" 
                  value={efxParams[i]} 
                  onChange={(e) => handleEfxParamChange(i, parseInt(e.target.value))} 
                  style={{ width: "100%" }}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.7em", color: "#888", marginTop: "10px" }}>Note: Each EFX type uses these 20 generic parameters differently. Consult the SC-88 Pro manual for specific mappings.</p>
        </div>

        <div style={{ 
          height: "400px", 
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
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button 
              onClick={() => setIsMonitoring(!isMonitoring)} 
              style={{ 
                flex: 1, 
                padding: "5px", 
                backgroundColor: isMonitoring ? "#27ae60" : "#c0392b", 
                color: "white", 
                border: "none", 
                borderRadius: "4px", 
                cursor: "pointer",
                fontSize: "0.8em",
                fontWeight: "bold"
              }}
            >
              {isMonitoring ? "🟢 Monitoring ON" : "🔴 Monitoring OFF"}
            </button>
            <button onClick={clearLog} style={{ flex: 1, padding: "5px", backgroundColor: "#333", color: "#ccc", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8em" }}>Clear</button>
          </div>
        </div>

        {/* SNAPSHOTS & SCENES */}
        <div style={{ padding: "20px", border: "1px solid #444", borderRadius: "8px", backgroundColor: "#222", color: "#eee" }}>
          <h3 style={{ margin: "0 0 15px 0" }}>Snapshots & Scenes</h3>
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <input 
              type="text" 
              placeholder="Snapshot Name..." 
              value={snapshotName} 
              onChange={(e) => setSnapshotName(e.target.value)}
              style={{ flex: 1, padding: "8px", backgroundColor: "#333", color: "white", border: "1px solid #555", borderRadius: "4px" }}
            />
            <button 
              onClick={saveSnapshot}
              style={{ padding: "8px 15px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            >
              💾 Save
            </button>
          </div>

          <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px" }}>
            {snapshots.length === 0 && <p style={{ fontSize: "0.8em", color: "#666", textAlign: "center" }}>No snapshots saved yet.</p>}
            {snapshots.map((snap, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", backgroundColor: "#333", borderRadius: "4px" }}>
                <span style={{ flex: 1, fontSize: "0.9em" }}>{snap.name}</span>
                <button 
                  onClick={() => loadSnapshot(snap)}
                  style={{ padding: "4px 10px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8em" }}
                >
                  📂 Load
                </button>
                <button 
                  onClick={() => deleteSnapshot(i)}
                  style={{ padding: "4px 8px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8em" }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.7em", color: "#888", marginTop: "10px" }}>Snapshots are saved to your browser's local storage.</p>
        </div>
      </div>
    </div>
  );
};

export default PartEditor;
