// Utilities for downloading and extracting Retrosheet event files
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

/**
 * Download a Retrosheet event ZIP file for a given season (default: most recent available, e.g., 2024).
 * @param {number} season - MLB season year
 * @param {string} outDir - Directory to save the extracted files
 */
export async function downloadAndExtractRetrosheetEvents(season = 2024, outDir = './data/retrosheet') {
  const url = `https://www.retrosheet.org/events/${season}eve.zip`;
  const zipPath = path.join(outDir, `${season}eve.zip`);
  const extractPath = path.join(outDir, `${season}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });

  // Download ZIP if not already present
  if (!fs.existsSync(zipPath)) {
    console.log(`Downloading Retrosheet event ZIP for ${season}...`);
    const resp = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(zipPath, resp.data);
  } else {
    console.log(`ZIP for ${season} already downloaded.`);
  }

  // Extract ZIP
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractPath, true);
  console.log(`Extracted to ${extractPath}`);
  return extractPath;
}
