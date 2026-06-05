export interface GSInstrument {
  name: string;
  program: number; // 0-127
  bankMSB: number; // Variation
  bankLSB: number; // Map (0: Native, 1: SC-88, 2: SC-55)
}

// A selection of popular SC-88 Pro specific variations
// Usually LSB 0 for Native Map
export const SC88PRO_INSTRUMENTS: GSInstrument[] = [
  // --- Pianos ---
  { name: "Piano 1", program: 0, bankMSB: 0, bankLSB: 0 },
  { name: "Piano 1w", program: 0, bankMSB: 8, bankLSB: 0 },
  { name: "Piano 1d", program: 0, bankMSB: 16, bankLSB: 0 },
  { name: "St.Piano", program: 0, bankMSB: 24, bankLSB: 0 },
  { name: "European Pf", program: 0, bankMSB: 32, bankLSB: 0 },
  { name: "Piano 2", program: 1, bankMSB: 0, bankLSB: 0 },
  { name: "Piano 2w", program: 1, bankMSB: 8, bankLSB: 0 },
  { name: "Piano 3", program: 2, bankMSB: 0, bankLSB: 0 },
  { name: "Piano 3w", program: 2, bankMSB: 8, bankLSB: 0 },
  { name: "Honky-tonk", program: 3, bankMSB: 0, bankLSB: 0 },
  { name: "Honky-tonk w", program: 3, bankMSB: 8, bankLSB: 0 },
  { name: "E.Piano 1", program: 4, bankMSB: 0, bankLSB: 0 },
  { name: "St.Soft EP", program: 4, bankMSB: 8, bankLSB: 0 },
  { name: "E.Piano 1v", program: 4, bankMSB: 16, bankLSB: 0 },
  { name: "60's E.Piano", program: 4, bankMSB: 24, bankLSB: 0 },
  { name: "Hard E.Piano", program: 4, bankMSB: 32, bankLSB: 0 },
  { name: "E.Piano 2", program: 5, bankMSB: 0, bankLSB: 0 },
  { name: "St.Hard EP", program: 5, bankMSB: 8, bankLSB: 0 },
  { name: "E.Piano 2v", program: 5, bankMSB: 16, bankLSB: 0 },
  { name: "Harpsichord", program: 6, bankMSB: 0, bankLSB: 0 },
  { name: "Harpsichord w", program: 6, bankMSB: 8, bankLSB: 0 },
  { name: "Harpsichord o", program: 6, bankMSB: 16, bankLSB: 0 },
  { name: "Clav.", program: 7, bankMSB: 0, bankLSB: 0 },
  { name: "Pulse Clav", program: 7, bankMSB: 8, bankLSB: 0 },
  
  // --- Organs ---
  { name: "Organ 1", program: 16, bankMSB: 0, bankLSB: 0 },
  { name: "Trem.Organ 1", program: 16, bankMSB: 8, bankLSB: 0 },
  { name: "60's Organ 1", program: 16, bankMSB: 16, bankLSB: 0 },
  { name: "Organ 2", program: 17, bankMSB: 0, bankLSB: 0 },
  { name: "Chorus Or.2", program: 17, bankMSB: 8, bankLSB: 0 },
  { name: "Organ 3", program: 18, bankMSB: 0, bankLSB: 0 },
  { name: "Rotary Org.", program: 18, bankMSB: 8, bankLSB: 0 },
  { name: "Church Org.1", program: 19, bankMSB: 0, bankLSB: 0 },
  { name: "Church Org.2", program: 19, bankMSB: 8, bankLSB: 0 },
  { name: "Reed Organ", program: 20, bankMSB: 0, bankLSB: 0 },
  { name: "Accordion Fr", program: 21, bankMSB: 0, bankLSB: 0 },
  { name: "Accordion It", program: 21, bankMSB: 8, bankLSB: 0 },
  { name: "Harmonica", program: 22, bankMSB: 0, bankLSB: 0 },
  { name: "Bandoneon", program: 23, bankMSB: 0, bankLSB: 0 },

  // --- Guitars ---
  { name: "Nylon-str.Gt", program: 24, bankMSB: 0, bankLSB: 0 },
  { name: "Ukulele", program: 24, bankMSB: 8, bankLSB: 0 },
  { name: "Steel-str.Gt", program: 25, bankMSB: 0, bankLSB: 0 },
  { name: "12-str.Gt", program: 25, bankMSB: 8, bankLSB: 0 },
  { name: "Mandolin", program: 25, bankMSB: 16, bankLSB: 0 },
  { name: "Jazz Guitar", program: 26, bankMSB: 0, bankLSB: 0 },
  { name: "Pedal Steel", program: 26, bankMSB: 8, bankLSB: 0 },
  { name: "Clean Guitar", program: 27, bankMSB: 0, bankLSB: 0 },
  { name: "Chorus Gt.", program: 27, bankMSB: 8, bankLSB: 0 },
  { name: "Muted Guitar", program: 28, bankMSB: 0, bankLSB: 0 },
  { name: "Funk Gt.", program: 28, bankMSB: 8, bankLSB: 0 },
  { name: "Overdrive Gt", program: 29, bankMSB: 0, bankLSB: 0 },
  { name: "Distortion Gt", program: 30, bankMSB: 0, bankLSB: 0 },
  { name: "Feedback Gt.", program: 30, bankMSB: 8, bankLSB: 0 },

  // --- Strings ---
  { name: "Violin", program: 40, bankMSB: 0, bankLSB: 0 },
  { name: "Slow Violin", program: 40, bankMSB: 8, bankLSB: 0 },
  { name: "Strings", program: 48, bankMSB: 0, bankLSB: 0 },
  { name: "Orchestra", program: 48, bankMSB: 8, bankLSB: 0 },
  { name: "Slow Strings", program: 49, bankMSB: 0, bankLSB: 0 },
  { name: "St.Strings", program: 49, bankMSB: 8, bankLSB: 0 },
  { name: "Syn.Strings 1", program: 50, bankMSB: 0, bankLSB: 0 },
  { name: "Syn.Strings 3", program: 50, bankMSB: 8, bankLSB: 0 },

  // --- Brass & Winds ---
  { name: "Trumpet", program: 56, bankMSB: 0, bankLSB: 0 },
  { name: "Flugel Horn", program: 56, bankMSB: 8, bankLSB: 0 },
  { name: "Brass 1", program: 61, bankMSB: 0, bankLSB: 0 },
  { name: "Brass 2", program: 61, bankMSB: 8, bankLSB: 0 },
  { name: "Alto Sax", program: 65, bankMSB: 0, bankLSB: 0 },
  { name: "Tenor Sax", program: 66, bankMSB: 0, bankLSB: 0 },
  { name: "Flute", program: 73, bankMSB: 0, bankLSB: 0 },

  // --- Synth Leads & Pads ---
  { name: "Square Lead", program: 80, bankMSB: 0, bankLSB: 0 },
  { name: "Sine Lead", program: 80, bankMSB: 8, bankLSB: 0 },
  { name: "Saw Lead", program: 81, bankMSB: 0, bankLSB: 0 },
  { name: "Doctor Solo", program: 81, bankMSB: 8, bankLSB: 0 },
  { name: "Fantasia", program: 88, bankMSB: 0, bankLSB: 0 },
  { name: "New Age Pad", program: 88, bankMSB: 8, bankLSB: 0 },
  { name: "Ice Rain", program: 96, bankMSB: 0, bankLSB: 0 },
  
  // --- Ethnic ---
  { name: "Sitar", program: 104, bankMSB: 0, bankLSB: 0 },
  { name: "Sitar 2", program: 104, bankMSB: 8, bankLSB: 0 },

  // --- Drums ---
  { name: "Standard Set", program: 0, bankMSB: 120, bankLSB: 0 },
  { name: "Room Set", program: 8, bankMSB: 120, bankLSB: 0 },
  { name: "Power Set", program: 16, bankMSB: 120, bankLSB: 0 },
  { name: "Electronic Set", program: 24, bankMSB: 120, bankLSB: 0 },
  { name: "Analog Set", program: 25, bankMSB: 120, bankLSB: 0 },
  { name: "Jazz Set", program: 32, bankMSB: 120, bankLSB: 0 },
  { name: "Brush Set", program: 40, bankMSB: 120, bankLSB: 0 },
  { name: "Orchestra Set", program: 48, bankMSB: 120, bankLSB: 0 },
  { name: "SFX Set", program: 56, bankMSB: 120, bankLSB: 0 },
];

export const SC88PRO_DRUM_KITS: GSInstrument[] = [
  { name: "Standard Set", program: 0, bankMSB: 0, bankLSB: 0 },
  { name: "Room Set", program: 8, bankMSB: 0, bankLSB: 0 },
  { name: "Power Set", program: 16, bankMSB: 0, bankLSB: 0 },
  { name: "Electronic Set", program: 24, bankMSB: 0, bankLSB: 0 },
  { name: "Analog Set (TR-808)", program: 25, bankMSB: 0, bankLSB: 0 },
  { name: "Jazz Set", program: 32, bankMSB: 0, bankLSB: 0 },
  { name: "Brush Set", program: 40, bankMSB: 0, bankLSB: 0 },
  { name: "Orchestra Set", program: 48, bankMSB: 0, bankLSB: 0 },
  { name: "SFX Set", program: 56, bankMSB: 0, bankLSB: 0 },
  { name: "Hip Hop Set", program: 1, bankMSB: 0, bankLSB: 0 },
  { name: "Jungle Set", program: 2, bankMSB: 0, bankLSB: 0 },
  { name: "Techno Set", program: 3, bankMSB: 0, bankLSB: 0 },
  { name: "TR-909 Set", program: 4, bankMSB: 0, bankLSB: 0 },
  { name: "House Set", program: 9, bankMSB: 0, bankLSB: 0 },
];

export const GM_INSTRUMENT_NAMES: Record<number, string> = {
  0: "Acoustic Grand Piano", 1: "Bright Acoustic Piano", 2: "Electric Grand Piano", 3: "Honky-tonk Piano", 4: "Electric Piano 1", 5: "Electric Piano 2", 6: "Harpsichord", 7: "Clavi",
  8: "Celesta", 9: "Glockenspiel", 10: "Music Box", 11: "Vibraphone", 12: "Marimba", 13: "Xylophone", 14: "Tubular Bells", 15: "Dulcimer",
  16: "Drawbar Organ", 17: "Percussive Organ", 18: "Rock Organ", 19: "Church Organ", 20: "Reed Organ", 21: "Accordion", 22: "Harmonica", 23: "Tango Accordion",
  24: "Acoustic Guitar (nylon)", 25: "Acoustic Guitar (steel)", 26: "Electric Guitar (jazz)", 27: "Electric Guitar (clean)", 28: "Electric Guitar (muted)", 29: "Overdriven Guitar", 30: "Distortion Guitar", 31: "Guitar harmonics",
  32: "Acoustic Bass", 33: "Electric Bass (finger)", 34: "Electric Bass (pick)", 35: "Fretless Bass", 36: "Slap Bass 1", 37: "Slap Bass 2", 38: "Synth Bass 1", 39: "Synth Bass 2",
  40: "Violin", 41: "Viola", 42: "Cello", 43: "Contrabass", 44: "Tremolo Strings", 45: "Pizzicato Strings", 46: "Orchestral Harp", 47: "Timpani",
  48: "String Ensemble 1", 49: "String Ensemble 2", 50: "SynthStrings 1", 51: "SynthStrings 2", 52: "Choir Aahs", 53: "Voice Oohs", 54: "Synth Voice", 55: "Orchestra Hit",
  56: "Trumpet", 57: "Trombone", 58: "Tuba", 59: "Muted Trumpet", 60: "French Horn", 61: "Brass Section", 62: "SynthBrass 1", 63: "SynthBrass 2",
  64: "Soprano Sax", 65: "Alto Sax", 66: "Tenor Sax", 67: "Baritone Sax", 68: "Oboe", 69: "English Horn", 70: "Bassoon", 71: "Clarinet",
  72: "Piccolo", 73: "Flute", 74: "Recorder", 75: "Pan Flute", 76: "Blown Bottle", 77: "Shakuhachi", 78: "Whistle", 79: "Ocarina",
  80: "Lead 1 (square)", 81: "Lead 2 (sawtooth)", 82: "Lead 3 (calliope)", 83: "Lead 4 (chiff)", 84: "Lead 5 (charang)", 85: "Lead 6 (voice)", 86: "Lead 7 (fifths)", 87: "Lead 8 (bass + lead)",
  88: "Pad 1 (new age)", 89: "Pad 2 (warm)", 90: "Pad 3 (polysynth)", 91: "Pad 4 (choir)", 92: "Pad 5 (bowed)", 93: "Pad 6 (metallic)", 94: "Pad 7 (halo)", 95: "Pad 8 (sweep)",
  96: "FX 1 (rain)", 97: "FX 2 (soundtrack)", 98: "FX 3 (crystal)", 99: "FX 4 (atmosphere)", 100: "FX 5 (brightness)", 101: "FX 6 (goblins)", 102: "FX 7 (echoes)", 103: "FX 8 (sci-fi)",
  104: "Sitar", 105: "Banjo", 106: "Shamisen", 107: "Koto", 108: "Kalimba", 109: "Bag pipe", 110: "Fiddle", 111: "Shanai",
  112: "Tinkle Bell", 113: "Agogo", 114: "Steel Drums", 115: "Woodblock", 116: "Taiko Drum", 117: "Melodic Tom", 118: "Synth Drum", 119: "Reverse Cymbal",
  120: "Guitar Fret Noise", 121: "Breath Noise", 122: "Seashore", 123: "Bird Tweet", 124: "Telephone Ring", 125: "Helicopter", 126: "Applause", 127: "Gunshot"
};
