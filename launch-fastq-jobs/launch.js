const utils = require("./utils.js");
const fs = require("fs");

const insertData = async function (envData) {

    //1. Download CSV file from S3
    await downloadFromS3(envData);

    //2. Convert CSV to JSON
    const jsonFile = await utils.convertToJSON(envData.LOCAL_CSV_FILE);
    envData.json = jsonFile;

    // Generate a random number between 3 and 60
    const randomDelay = Math.floor(Math.random() * (60 - 3 + 1)) + 3;

    // Wait for the random number of seconds
    await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));

    //3. Insert data into table
    await utils.populateTables(envData);

    //4. Move to S3
    // await utils.moveOnS3(envData);

    return "done"
};
/**
 *
 */
const moveOnS3 = async function (options) {
    await utils.moveOnS3(options);
    return "done";
};
const downloadFromS3 = async function (envData) {
    const options = {
        s3_src_dir: envData.S3_SRC_DIR,
        local_dir: utils.dirname(envData.LOCAL_CSV_FILE) + "/"
    };
    const promises = [];
    promises.push(utils.downloadFromS3(options));
    if (envData.S3_GOOGLE_CREDS) {
        const google_options = {
            s3_src_dir: envData.S3_GOOGLE_CREDS,
            local_dir: utils.dirname(envData.GOOGLE_APPLICATION_CREDENTIALS) + "/"
        };
        promises.push(utils.downloadFromS3(google_options));
    }
    await Promise.all(promises)
    return "done";
};
const updateENVData = function (envData) {
    const data_to_load = require(process.env.DATA_TO_LOAD_CONFIG_FILE);
    const index = process.env.AWS_BATCH_JOB_ARRAY_INDEX ? parseInt(process.env.AWS_BATCH_JOB_ARRAY_INDEX) : 0;
    const dataToProcess = data_to_load[index];

    envData.BQ_TABLE_ID = dataToProcess.table_id;       //Table to insert records into  - for insert
    envData.LOCAL_CSV_FILE = process.env.CSV_FILE_ROOT ? process.env.CSV_FILE_ROOT + dataToProcess.file : ""; //This should be the path on the local file system
    //The full path to the local csv file
    // - for insert records and delete
    envData.S3_SRC_DIR = dataToProcess.src;    //the directory on S3 where the src file is
    // located - for mv on S3_mv
    envData.S3_DEST_DIR = dataToProcess.dest;  //The directory on S3 where the file
}
const validateInsertJob = function (envData) {
    const errorMessages = [];
    if (process.env.AWS_BATCH_JOB_ARRAY_INDEX) {
        const ERROR_MESSAGE_1 = "For array jobs (i.e if process.env.AWS_BATCH_JOB_ARRAY_INDEX exists), there must " +
            "exist a data-to-load.json file on the EFS " +
            "and the 'DATA_TO_LOAD_FILE' environment variable must point to it.";

        const ERROR_MESSAGE_2 = "For array jobs (i.e if process.env.AWS_BATCH_JOB_ARRAY_INDEX exists), " +
            "process.env.CSV_FILE_ROOT environment variable must exist and it must point " +
            "to the volume where the csv file will be placed.";
        try {
            //The root of the CSV File. Will be appended to the file object in the json file
            if (!process.env.CSV_FILE_ROOT) {
                errorMessages.push(ERROR_MESSAGE_2);
            }

            if (!process.env.DATA_TO_LOAD_CONFIG_FILE ||
                !fs.existsSync(process.env.DATA_TO_LOAD_CONFIG_FILE)) {
                errorMessages.push(ERROR_MESSAGE_1);
            }
            if (errorMessages.length === 0) {
                updateENVData(envData);
            }
            console.log(envData)
        } catch (err) {
            console.log(err)
            errorMessages.push(err);
        }
    } else {
        if (process.env.DATA_TO_LOAD_CONFIG_FILE &&
            fs.existsSync(process.env.DATA_TO_LOAD_CONFIG_FILE)) {
            updateENVData(envData);
        } else {
            envData.BQ_TABLE_ID = process.env.BQ_TABLE_ID;   //Table to insert records into
            // - for insert
            envData.LOCAL_CSV_FILE = process.env.LOCAL_CSV_FILE; //The full path to the local csv file
                                                                 // - for insert records and delete
            envData.S3_SRC_DIR = process.env.S3_SRC_DIR;    //the directory on S3 where the src file is
                                                            // located - for mv on S3_mv
            envData.S3_DEST_DIR = process.env.S3_DEST_DIR;  //The directory on S3 where the file
        }
    }

    if (!envData.S3_SRC_DIR) {
        errorMessages.push("'S3_SRC_DIR' environment variable not set. " +
            "This must be the full path to the file on s3");
    }
    if (!envData.BQ_TABLE_ID) {
        errorMessages.push("'BQ_TABLE_ID' environment variable not set. " +
            "This must point to a table in BQ");
    }
    if (!envData.LOCAL_CSV_FILE) {
        errorMessages.push("'LOCAL_CSV_FILE' environment variable not set. " +
            "This must be the full path to the csv file to upload");
    }
    if (!envData.GOOGLE_STORAGE_BUCKET_NAME) {
        errorMessages.push("'GOOGLE_STORAGE_BUCKET_NAME' environment variable not set. " +
            "This must point to a bucket on google cloud storage");
    }
    if (!envData.BQ_DATASET_ID) {
        errorMessages.push("'BQ_DATASET_ID' environment variable not set. " +
            "This must point to a dataset in BQ");
    }

    if (!envData.S3_GOOGLE_CREDS) {
        errorMessages.push("'S3_GOOGLE_CREDS' environment variable not set. " +
            "This must be the full path to the google credentials file on S3");
    }
    if (!envData.GOOGLE_APPLICATION_CREDENTIALS) {
        errorMessages.push("'GOOGLE_APPLICATION_CREDENTIALS' environment variable not set. " +
            "This must be the full path to the google credential file on the " +
            "local file system");
    }
    return errorMessages;

};
/**
 *
 */
const validateS3MVJob = function (envData) {
    const errorMessages = [];
    if (process.env.AWS_BATCH_JOB_ARRAY_INDEX) {
        const ERROR_MESSAGE_1 = "For array jobs (i.e if process.env.AWS_BATCH_JOB_ARRAY_INDEX exists), there must " +
            "exist a data-to-load.json file on the EFS " +
            "and the 'DATA_TO_LOAD_FILE' environment variable must point to it.";
        if (!process.env.DATA_TO_LOAD_CONFIG_FILE ||
            !fs.existsSync(process.env.DATA_TO_LOAD_CONFIG_FILE)) {
            errorMessages.push(ERROR_MESSAGE_1);
        } else {
            // const data_to_load = require(process.env.DATA_TO_LOAD_CONFIG_FILE);
            // const index = parseInt(process.env.AWS_BATCH_JOB_ARRAY_INDEX);
            // const dataToProcess = data_to_load[index];
            // envData.S3_SRC_DIR = dataToProcess.src;
            // //the directory on S3 where the src file is
            // // located - for mv on S3_mv
            // envData.S3_DEST_DIR = dataToProcess.dest;
            updateENVData(envData);
        }
    } else {

        if (process.env.DATA_TO_LOAD_CONFIG_FILE &&
            fs.existsSync(process.env.DATA_TO_LOAD_CONFIG_FILE)) {
            updateENVData(envData);
        } else {
            envData.BQ_TABLE_ID = process.env.BQ_TABLE_ID;   //Table to insert records into
            // - for insert
            envData.LOCAL_CSV_FILE = process.env.LOCAL_CSV_FILE; //The full path to the local csv file
                                                                 // - for insert records and delete
            envData.S3_SRC_DIR = process.env.S3_SRC_DIR;    //the directory on S3 where the src file is
                                                            // located - for mv on S3_mv
            envData.S3_DEST_DIR = process.env.S3_DEST_DIR;  //The directory on S3 where the file
        }

    }
    if (!envData.S3_SRC_DIR) {
        errorMessages.push("'S3_SRC_DIR' environment variable not set. " +
            "This must be the full path to the file on s3");
    }
    if (!envData.S3_DEST_DIR) {
        errorMessages.push("'S3_DEST_DIR' environment variable not set. " +
            "This must be the full path on s3 where the file should be moved");
    }
    return errorMessages;
};

(async function () {
    try {
        const envData = {};
        console.log("process.env.DOCKER_CMD", process.env.DOCKER_CMD);
        console.log("process.env.AWS_BATCH_JOB_ARRAY_INDEX", process.env.AWS_BATCH_JOB_ARRAY_INDEX)

        let errorMessages = [];
        const processToRun = process.env.DOCKER_CMD; //For all commands

        if (errorMessages.length > 0) {
            throw errorMessages.join(",");
        }
        process.exit(0)
    } catch (err) {
        console.log("Error", err)
        process.exit(1)
    }
})();

