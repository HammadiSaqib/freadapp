
import fs from 'fs';

// Mock the extractThreeBureauData function from Scraper class
function extractThreeBureauData(text, startLabel, endLabel) {
    if (!text) return ['', '', ''];
    try {
      // Find start index
      const startIdx = text.indexOf(startLabel);
      if (startIdx === -1) {
          console.log(`[DEBUG] Label '${startLabel}' not found.`);
          return ['', '', ''];
      }

      // Find end index (next label or end of string)
      let endIdx = text.length;
      if (endLabel) {
        const nextLabelIdx = text.indexOf(endLabel, startIdx + startLabel.length);
        if (nextLabelIdx !== -1) endIdx = nextLabelIdx;
      }

      // Extract the chunk
      let chunk = text.substring(startIdx + startLabel.length, endIdx).trim();
      console.log(`[DEBUG] Chunk for '${startLabel}':`, JSON.stringify(chunk));
      
      const parts = chunk.split('\t');
      console.log(`[DEBUG] Split parts for '${startLabel}':`, parts.map(p => JSON.stringify(p)));
      
      let values = [];
      for (let i = 0; i < parts.length && values.length < 3; i++) {
        let val = parts[i].trim();
        // Current logic: take everything, even if empty
        values.push(val);
      }
      
      // Pad if missing
      while (values.length < 3) values.push('');
      
      return values;
    } catch (e) {
      console.error(e);
      return ['', '', ''];
    }
}

const sectionsPath = 'e:\\ScoreMachineV2RawCode-master\\scraper-output\\client_unknown_myscoreiq_sections_2025-12-09T13-28-19-744Z.json';
const sections = JSON.parse(fs.readFileSync(sectionsPath, 'utf8'));
const fullText = Object.values(sections || {}).join('\n');

console.log("--- DEBUG START ---");

// Test DOB
const dobs = extractThreeBureauData(fullText, 'Date of Birth:', 'Current Address(es):');
console.log('DOBs:', dobs);

// Test Address
const currAddrs = extractThreeBureauData(fullText, 'Current Address(es):', 'Previous Address(es):');
console.log('Current Addrs:', currAddrs);

const prevAddrs = extractThreeBureauData(fullText, 'Previous Address(es):', 'Employers:');
console.log('Previous Addrs:', prevAddrs);

