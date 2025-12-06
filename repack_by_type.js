#!/usr/bin/env node
/**
 * Built by "Richard F Avery aka AIZEN" and "Steven M. Jeppson"
 * with help from "Echo" @ ChatGPT, for NighthawkFS @ https://www.nighthawkfs.com/
 * © NIGHTHAWK FLIGHT SYSTEMS, INC. 2025
 *
 * INSTALL DEPENDENCIES:
 *   npm init -y
 *   npm install archiver
 *
 * DEPLOY_REPACKING:
 *   Dry-run first (recommended):
 *     node repack_by_type.js "C:\\Users\\ravery\\Desktop\\SoCal_31m_GRID" --dry-run
 *   If the classification looks sane, create the archive (keep originals):
 *     node repack_by_type.js "C:\\Users\\ravery\\Desktop\\SoCal_31m_GRID"
 *   To delete files after archiving (DANGEROUS):
 *     node repack_by_type.js "C:\\Users\\ravery\\Desktop\\SoCal_31m_GRID" --move
 *   (Use on a copy first. Seriously.)
 */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const Archiver = require("archiver");

// --- CONFIG SECTION ----------------------------------------------------

// Extensions that usually compress WELL in archives
const COMPRESSIBLE_EXT = new Set([
  ".tif", ".tiff", ".vrt", ".dem", ".asc",
  ".csv", ".txt", ".json", ".xml", ".ini",
  ".cfg", ".log",
  ".js", ".ts", ".py", ".ps1", ".bat", ".sh", ".md",
  ".yaml", ".yml",
  ".psd", ".psb" // these are often compressible too
]);

// Extensions that are already compressed (zip-like or media)
const ALREADY_COMPRESSED_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp",
  ".mp4", ".mov", ".avi", ".mkv",
  ".mp3", ".aac", ".ogg", ".wav", ".flac",
  ".zip", ".7z", ".rar", ".gz", ".xz", ".zst", ".tgz",
  ".sqlite", ".db"
]);

// Archives that will be created for each group
// (relative to the root directory you run against)
const ARCHIVE_LAYOUT = {
  compressible: "compressible_payload.zip",
  // you could add other groups later, e.g. "rasters_only.zip"
};

// ----------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(`
Usage: node repack_by_type.js <rootDir> [--dry-run] [--move]

  <rootDir>   Root directory to scan.
  --dry-run   Only print what would happen, don't create archives.
  --move      After archiving, delete original files (DANGEROUS).

Examples:
  node repack_by_type.js "C:\\Users\\ravery\\Desktop\\SoCal_31m_GRID" --dry-run
  node repack_by_type.js "/Users/richavery/Desktop/test" --move
`);
    process.exit(0);
  }

  const rootDir = path.resolve(args[0]);
  const dryRun = args.includes("--dry-run");
  const moveMode = args.includes("--move");

  return { rootDir, dryRun, moveMode };
}

async function walkDir(rootDir) {
  const queue = [rootDir];
  const files = [];

  while (queue.length > 0) {
    const dir = queue.pop();
    const entries = await fsp.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // skip node_modules / .git by default
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        queue.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function classifyFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (COMPRESSIBLE_EXT.has(ext)) {
    return "compressible";
  }
  if (ALREADY_COMPRESSED_EXT.has(ext)) {
    return "alreadyCompressed";
  }
  return "unknown";
}

async function createZipArchive(rootDir, archiveName, fileList, moveMode, dryRun) {
  if (!fileList.length) return;

  const archivePath = path.join(rootDir, archiveName);

  if (dryRun) {
    console.log(`[DRY RUN] Would create archive: ${archivePath}`);
    fileList.forEach(f =>
      console.log(`  - include: ${path.relative(rootDir, f)}`)
    );
    return;
  }

  console.log(`Creating archive: ${archivePath}`);
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = Archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);

    for (const file of fileList) {
      const rel = path.relative(rootDir, file);
      archive.file(file, { name: rel });
    }

    archive.finalize();
  });

  console.log(`Archive created: ${archivePath}`);

  if (moveMode) {
    console.log(`Deleting original files for archive: ${archivePath}`);
    for (const file of fileList) {
      try {
        await fsp.unlink(file);
      } catch (err) {
        console.warn(`  [WARN] Failed to delete ${file}: ${err.message}`);
      }
    }
  }
}

async function main() {
  const { rootDir, dryRun, moveMode } = parseArgs();

  try {
    const stat = await fsp.stat(rootDir);
    if (!stat.isDirectory()) {
      console.error(`ERROR: ${rootDir} is not a directory.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`ERROR: Cannot access ${rootDir}: ${err.message}`);
    process.exit(1);
  }

  console.log(`=== NighthawkFS Repacker ===`);
  console.log(`Root dir : ${rootDir}`);
  console.log(`Dry run  : ${dryRun ? "YES" : "NO"}`);
  console.log(`Move mode: ${moveMode ? "YES (files will be deleted)" : "NO (files kept)"}`);
  console.log("");

  const allFiles = await walkDir(rootDir);

  const groups = {
    compressible: [],
    alreadyCompressed: [],
    unknown: []
  };

  for (const file of allFiles) {
    // Skip archives we will create ourselves to avoid recursion
    const base = path.basename(file);
    if (Object.values(ARCHIVE_LAYOUT).includes(base)) {
      continue;
    }

    const group = classifyFile(file);
    groups[group].push(file);
  }

  const countSummary = {
    compressible: groups.compressible.length,
    alreadyCompressed: groups.alreadyCompressed.length,
    unknown: groups.unknown.length
  };

  console.log("File classification:");
  console.log(`  Compressible       : ${countSummary.compressible}`);
  console.log(`  Already compressed : ${countSummary.alreadyCompressed}`);
  console.log(`  Unknown            : ${countSummary.unknown}`);
  console.log("");

  // Build archives per layout
  if (groups.compressible.length && ARCHIVE_LAYOUT.compressible) {
    await createZipArchive(
      rootDir,
      ARCHIVE_LAYOUT.compressible,
      groups.compressible,
      moveMode,
      dryRun
    );
  }

  // You can add more archive logic here later,
  // e.g. separate raster-only vs text-only.

  // Print unknowns for tweaking your config
  if (groups.unknown.length) {
    console.log("\nUnknown file types encountered (first 50):");
    const shown = groups.unknown.slice(0, 50);
    for (const file of shown) {
      console.log(
        `  ${path.relative(rootDir, file)}  [${path.extname(file).toLowerCase()}]`
      );
    }
    if (groups.unknown.length > shown.length) {
      console.log(`  ... and ${groups.unknown.length - shown.length} more.`);
    }
    console.log("\nAdd any extensions you care about into COMPRESSIBLE_EXT or ALREADY_COMPRESSED_EXT in the config section.");
  }

  console.log("\nDone.");
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
