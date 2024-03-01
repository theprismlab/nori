const utils = require("./utils.js");
const fs = require("fs");

/**
 * Needs following environment variables:
 * S3_BUCKET
 * WALKUP_PATH
 * CHUNK_SIZE
 */
(async function () {
    try {
        const s3_bucket = process.env.S3_BUCKET
        const walkup_path = process.env.WALKUP_PATH
        const walkup_order = walkup_path.split("/")[1]
        const WORK_DIR = process.env.WORK_DIR + `/${walkup_order}/`

        const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE)

        const sampleSheetPaths = await utils.getSampleSheetPaths(s3_bucket, walkup_path)

        const samplesList = await utils.getSampleList(sampleSheetPaths)

        //get all fastq files
        const allFastqFiles = await utils.getFastqFileList(sampleSheetPaths)

        fs.mkdirSync(WORK_DIR, {recursive: true});
        const nChunks = Math.ceil(samplesList.length / CHUNK_SIZE)
        let cursor=0,part = 0;
        while (part < nChunks) {
            const chunk = samplesList.slice(cursor, cursor + CHUNK_SIZE)
            const chunkFiles = []
            chunk.forEach( (sample) => {
                const fastqFiles = allFastqFiles.filter( (file) => {
                    return file.includes(sample.Sample_ID)
                })
                chunkFiles.push(...fastqFiles)
            })
            const dataString = chunkFiles.join("\n");
            fs.writeFileSync(WORK_DIR + `fastq-chunk-${part}.csv`, dataString)
            cursor += CHUNK_SIZE
            part += 1
        }

        process.exit(0)
    } catch (err) {
        console.log("Error", err)
        process.exit(1)
    }
})();
