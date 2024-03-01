const utils = require("./utils.js");

FastqProcessingBuild = require("./fastq-processing-build.js");
const fs = require("fs");
N_CHUNKS = 10;


(async function () {
    try {
        const envData = {};
        let errorMessages = [];
        const processToRun = process.env.DOCKER_CMD; //For all commands

        const FastqBuild = new FastqProcessingBuild("genomics-platform/WALKUP-16118")
        await FastqBuild.runJobs()

        process.exit(0)
    } catch (err) {
        console.log("Error", err)
        process.exit(1)
    }
})();


(async function () {
    try {
        const envData = {};
        let errorMessages = [];
        const s3_bucket = process.env.S3_BUCKET
        const walkup_path = process.env.WALKUP_PATH
        const WORK_DIR = process.env.WORK_DIR
        const walkup_order = walkup_path.split("/")[1]

        const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE)

        const sampleSheetPaths = await this.getSampleSheetPaths(s3_bucket, walkup_path)
        const samplesList = []
        sampleSheetPaths.forEach( sampleSheetPath => {
            const sampleSheet = utils.fetchSampleSheet(sampleSheetPaths)
            samplesList.push(...sampleSheet)
        })
        samplesList.sort()

        const nChunks = Math.ceil(samplesList.length / CHUNK_SIZE)

        fs.mkdirSync(WORK_DIR, {recursive: true});
        let cursor,part = 0;
        while (cursor < nChunks) {
            const chunk = samplesList.slice(cursor, cursor + CHUNK_SIZE)

            const fileName = WORK_DIR + "fastq_chunk-" + part + ".csv"
            fs.writeFileSync(fileName, data);
            cursor += CHUNK_SIZE;
            part += 1;
        }

        fs.mkdirSync(utils.dirname(fileName), {recursive: true});
        fs.writeFileSync(fileName, data);



        if (errorMessages.length > 0) {
            throw errorMessages.join(",");
        }
        process.exit(0)
    } catch (err) {
        console.log("Error", err)
        process.exit(1)
    }
})();
