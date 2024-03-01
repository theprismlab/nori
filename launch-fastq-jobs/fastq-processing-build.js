const utils = require("./utils.js");

(async function () {
    try {
        const envData = {};
        console.log("process.env.DOCKER_CMD", process.env.DOCKER_CMD);
        console.log("process.env.AWS_BATCH_JOB_ARRAY_INDEX", process.env.AWS_BATCH_JOB_ARRAY_INDEX)

        let errorMessages = [];
        const processToRun = process.env.DOCKER_CMD; //For all commands
        const sampleSheetData = await utils.fetchSampleSheetforCombination("genomics-platform/WALKUP-16118/240207_SL-NXA_0007_AHKJHHBGXV/1707403946/SampleSheet_hsa.csv");

        if (errorMessages.length > 0) {
            throw errorMessages.join(",");
        }
        process.exit(0)
    } catch (err) {
        console.log("Error", err)
        process.exit(1)
    }
})();

