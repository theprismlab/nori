/* jshint esversion: 8 */
/* jshint node: true */

const utils = require("./utils.js");
const fs = require("fs");

/**
 * Needs following environment variables:
 * S3_BUCKET
 * WALKUP_PATH (can be a single path or multiple paths, comma-separated)
 * CHUNK_SIZE
 */
(async function () {
    try {
        const s3_bucket = process.env.S3_BUCKET;
        const walkup_paths_string = process.env.WALKUP_PATH;
        const WORK_DIR = process.env.WORK_DIR + `/chunk-files/`;

        if (!walkup_paths_string) {
            throw "WALKUP_PATH is not defined";
        }
        if (!process.env.CHUNK_SIZE) {
            throw "CHUNK_SIZE is not defined";
        }

        // --- CHANGE START ---
        // Split the comma-separated string into an array of paths and trim whitespace
        const walkup_paths = walkup_paths_string.split(',').map(p => p.trim());
        console.log(`Processing ${walkup_paths.length} walkup path(s):`, walkup_paths);

        // Concurrently fetch sample sheets from all provided paths
        const promises = walkup_paths.map(path => utils.getSampleSheetPaths(s3_bucket, path));
        const results = await Promise.all(promises);

        // Flatten the array of arrays into a single list of sample sheet paths
        const sampleSheetPaths = results.flat();
        // --- CHANGE END ---

        if (sampleSheetPaths.length === 0) {
            throw "No SampleSheet.csv files found in the provided paths.";
        }
        console.log(`Found ${sampleSheetPaths.length} total SampleSheet.csv file(s).`);

        const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE);
        const samplesList = await utils.getSampleList(sampleSheetPaths);
        const allFastqFiles = await utils.getFastqFileList(sampleSheetPaths);

        fs.mkdirSync(WORK_DIR, { recursive: true });
        const nChunks = Math.ceil(samplesList.length / CHUNK_SIZE);
        let cursor = 0, part = 0;
        while (part < nChunks) {
            const chunk = samplesList.slice(cursor, cursor + CHUNK_SIZE);
            let chunkFiles = [];
            chunk.forEach((sample) => {
                const fastqFiles = allFastqFiles.filter((file) => {
                    if (sample.Sample_ID) {
                        return file.includes(sample.Sample_ID);
                    } else {
                        return false;
                    }
                });
                if (fastqFiles.length > 2) {
                    // This warning can be useful for debugging paired-end reads
                    console.log(`Warning: Found ${fastqFiles.length} FASTQ files for sample:`, sample.Sample_ID);
                }
                chunkFiles.push(...fastqFiles);
            });
            chunkFiles = chunkFiles.map((file) => { return "/data/" + file; }); // bucket path
            console.log("Chunk: ", part, ", Samples:", chunk.length, ", Files:", chunkFiles.length);
            const dataString = chunkFiles.join("\n") + "\n";
            fs.writeFileSync(WORK_DIR + `fastq-chunk-${part}.txt`, dataString);
            cursor += CHUNK_SIZE;
            part += 1;
        }

        process.exit(0);
    } catch (err) {
        console.log("Error", err);
        process.exit(1);
    }
})();