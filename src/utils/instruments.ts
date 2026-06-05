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
