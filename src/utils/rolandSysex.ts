/**
 * Roland SysEx Utilities for SC-88 Pro
 * 
 * Roland SysEx Structure:
 * F0 41 <Device ID> <Model ID> <Command ID> <Address> <Data> <Checksum> F7
 * 
 * Model IDs:
 * - 42H: GS Standard
 * - 45H: SC-88 Pro specific
 */

export const ROLAND_ID = 0x41;
export const DEFAULT_DEVICE_ID = 0x10; // Default is 17 (10H), but WebMidi uses 0-indexed or specific bytes.
export const MODEL_ID_GS = 0x42;
export const MODEL_ID_SC88PRO = 0x45;
export const COMMAND_DT1 = 0x12; // Data set 1

/**
 * Calculates the Roland checksum.
 * The checksum is calculated from the address and data bytes.
 * 
 * Logic:
 * 1. Sum the bytes.
 * 2. Remainder = Sum % 128.
 * 3. Checksum = 128 - Remainder.
 * 4. If Checksum === 128, Checksum = 0.
 */
export function calculateChecksum(address: number[], data: number[]): number {
  const allBytes = [...address, ...data];
  const sum = allBytes.reduce((acc, byte) => acc + byte, 0);
  const remainder = sum % 128;
  const checksum = 128 - remainder;
  return checksum === 128 ? 0 : checksum;
}

/**
 * Builds a Roland DT1 SysEx message body (excluding F0 and F7).
 * WebMidi.js's sendSysex method often expects the manufacturer ID and the data bytes.
 */
export function buildRolandSysex(
  address: number[],
  data: number[],
  deviceId: number = DEFAULT_DEVICE_ID,
  modelId: number = MODEL_ID_GS
): number[] {
  const checksum = calculateChecksum(address, data);
  // Roland Manufacturer ID (0x41) is usually handled by the library or passed as the first argument
  // Here we return the body: [DeviceID, ModelID, CommandID, ...Address, ...Data, Checksum]
  return [
    deviceId,
    modelId,
    COMMAND_DT1,
    ...address,
    ...data,
    checksum
  ];
}

/**
 * Common SC-88 Pro Address Helpers
 */
export const SC88_ADDRESSES = {
  // System Parameters
  GS_RESET: [0x40, 0x00, 0x7F],
  MASTER_VOLUME: [0x40, 0x00, 0x04],
  MIDI_IN_B_SELECT: [0x00, 0x00, 0x1A], // 00: Rear, 01: Front

  // Part parameters (Group A: 40 1x 00)
  // partIndex: 0-15 (for A01-A16)
  partLevel: (partIndex: number) => {
    const partAddr = getPartAddressOffset(partIndex);
    return [0x40, partAddr, 0x07];
  },
  
  partPan: (partIndex: number) => [0x40, getPartAddressOffset(partIndex), 0x0E],
  partReverb: (partIndex: number) => [0x40, getPartAddressOffset(partIndex), 0x10],
  partSwitch: (partIndex: number) => [0x40, getPartAddressOffset(partIndex), 0x02], // 0: Off, 1: On

  // EFX Parameters (Model ID: 0x45 usually required for deep SC-88 Pro features)
  EFX_TYPE: [0x40, 0x03, 0x00],
  EFX_PARAMETER_1: [0x40, 0x03, 0x03],
  EFX_SWITCH: [0x40, 0x03, 0x02], // 0: Off, 1: On

  // Part EFX Send (Model ID: 0x45)
  // Native SC-88 Pro part addresses are 40 4x xx for some parameters
  sc88PartEfxSend: (partIndex: number) => {
    const offset = [0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x10, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F][partIndex];
    return [0x40, offset + 0x30, 0x22]; // 40 4x 22
  },

  // LCD Display (Model ID: 0x45)
  // Max 16 characters for the main display line
  LCD_DISPLAY: [0x10, 0x00, 0x00],
};

export const EFX_TYPES = [
  "Thru", "Stereo EQ", "Overdrive", "Distortion", "Phaser", "Spectrum", "Enhancer", "Auto Wah",
  "Rotary", "Compressor", "Limiter", "Hexa-Chorus", "Tremolo Chorus", "Space-D", "Stereo Chorus", "Stereo Flanger",
  "Step Flanger", "Stereo Delay", "Modulation Delay", "3 Tap Delay", "4 Tap Delay", "Time Ctrl Delay", "2 Voice Pitch Shifter", "FB Pitch Shifter",
  "Reverb", "Gated Reverb", "Overdrive -> Chorus", "Overdrive -> Flanger", "Overdrive -> Delay", "Distortion -> Chorus", "Distortion -> Flanger", "Distortion -> Delay",
  "Enhancer -> Chorus", "Enhancer -> Flanger", "Enhancer -> Delay", "Chorus -> Delay", "Flanger -> Delay", "Chorus -> Flanger", "Chorus / Delay", "Flanger / Delay",
  "Chorus / Flanger", "Stereo Chorus (Type 2)", "Stereo Flanger (Type 2)", "Stereo Delay (Type 2)", "Modulation Delay (Type 2)", "Time Ctrl Delay (Type 2)", "2 Voice Pitch Shifter (Type 2)", "FB Pitch Shifter (Type 2)",
  "Reverb (Type 2)", "Gated Reverb (Type 2)", "Step Flanger (Type 2)", "Step Phaser", "Step Pan", "Large Hall", "Small Hall", "Large Room",
  "Small Room", "Plate", "Delay", "Panning Delay", "Rotary Multi", "Chorus Multi", "Lofi Multi", "Guitar Multi"
];

function getPartAddressOffset(partIndex: number): number {
  // Roland SC series Part mapping for Group A:
  // Part 1: 0x11, Part 2: 0x12, ..., Part 9: 0x19, Part 10: 0x10, Part 11: 0x1A ... Part 16: 0x1F
  if (partIndex === 9) return 0x10; // MIDI Ch 10
  if (partIndex < 9) return 0x11 + partIndex; 
  return 0x10 + partIndex; // Index 10 (Part 11) -> 0x1A, Index 11 (Part 12) -> 0x1B, etc.
}
