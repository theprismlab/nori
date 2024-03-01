const utils = require("./utils.js");
const fs = require("fs");

(async function () {
    try {
        const envData = {};
        let errorMessages = [];
        const processToRun = process.env.DOCKER_CMD; //For all commands

        const walkUpPath = "genomics-platform/WALKUP-16118"
        const sampleSheetPaths = await utils.getSampleSheetPaths("data-share.theprismlab.org", "genomics-platform/WALKUP-16118")

        //TODO: Should filter to only most recent timestamp for a given sequencer


        const samplesList = await utils.getSampleList(sampleSheetPaths)

        //get all fastq files
        const allFastqFiles = await utils.getFastqFileList(sampleSheetPaths)

        fs.mkdirSync(WORK_DIR, {recursive: true});
        const nChunks = 10
        const CHUNK_SIZE = 10
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
            console.log(chunkFiles)
            cursor += CHUNK_SIZE
            part += 1
        }
        // console.log(samplesList)

        if (errorMessages.length > 0) {
            throw errorMessages.join(",");
        }
        process.exit(0)
    } catch (err) {
        console.log("Error", err)
        process.exit(1)
    }
})();

