const csvToNdjson = require('csv-to-ndjson');
const {BigQuery} = require('@google-cloud/bigquery');
const {Storage} = require('@google-cloud/storage');
const util = require("node:util");
const fs = require("fs");
const _ = require("underscore")
const exec = util.promisify(require('node:child_process').exec);
// Instantiate clients
const storage = new Storage();
const bigquery = new BigQuery();


const self = module.exports = {
    basename: function (fullPath) {
        return require('path').basename(fullPath);
    },
    dirname: function (fullPath) {
        return require('path').dirname(fullPath);
    },
    downloadFromS3: async function (options) {
        const s3_cmd = 'aws s3 sync ' + options.s3_src_dir + ' ' + options.local_dir; //move file on s3
        console.log(s3_cmd);
        const {stdout, stderr} = await exec(s3_cmd);

        if (stdout && stdout.trim()) {
        }
        if (stderr) {
            throw (stderr);
        }
        const check_cmd = 'ls -la ' + options.local_dir; //move file on s3
        console.log("check_cmd", check_cmd);
        await exec(check_cmd);
        return;
    },
    moveOnS3: async function (options) {
        const s3_cmd = 'aws s3 mv ' + options.S3_SRC_DIR + ' ' + options.S3_DEST_DIR + ' --recursive'; //move file on s3
        console.log(s3_cmd)
        const {stdout, stderr} = await exec(s3_cmd);

        if (stdout && stdout.trim()) {
            console.log(stdout);
        }
        if (stderr) {
            throw stderr;
        }
        return "done";
    },
    getSampleSheets: async function (walkup_order) {
        const s3_list_cmd = 'aws s3 ls s3://data-share.theprismlab.org/genomics-platform/' + 'WALKUP-16118/*/' + ' --recursive | grep ".csv\\|.json"'
    },
    listFiles: async function (screen) {
        const data2load = [];
        try {
            const s3_list_cmd = 'aws s3 ls s3://portal-data.prism.org/data-to-load/' + screen + ' --recursive | grep ".csv\\|.json"'
            const {stdout, stderr} = await exec(s3_list_cmd);
            if (stderr) {
                console.log(stderr);
            }
            const lines = stdout.split("\n");

            if (lines.length > 0) {
                for (let line of lines) {
                    const file = line.split("data-to-load")[1];
                    console.log("Found File: " + file)
                    if (file && file.trim()) {
                        const splits = file.split("/");g
                        if (splits.length === 7) {       //expected directory structure: data-to-load/screen/project/pert_plate/pert_id/table_name/csv-file
                            const table_id = splits[5];  //Compound Level Files
                            const file_name = splits[6];
                            //when done sync data to data-loaded
                            const full_path = "s3://portal-data.prism.org/data-to-load" + file;
                            const srcDir = full_path.replace(file_name, "");
                            const destDir = srcDir.replace("data-to-load", "data-loaded");
                            data2load.push({
                                table_id: table_id,
                                file: file,
                                src: srcDir,
                                dest: destDir
                            });
                        } else if (splits.length === 5){  // expected directory structure: data-to-load/screen/project/table_name/csv-file
                            const table_id = splits[3]    // For Project Level files
                            const file_name = splits[4]
                            const full_path = "s3://portal-data.prism.org/data-to-load" + file;
                            const srcDir = full_path.replace(file_name, "");
                            const destDir = srcDir.replace("data-to-load", "data-loaded");
                            data2load.push({
                                table_id: table_id,
                                file: file,
                                src: srcDir,
                                dest: destDir
                            });
                        } else if (splits.length === 4){  // expected directory structure: data-to-load/screen/table_name/csv-file
                            const table_id = splits[2]    //For Screen Level files
                            const file_name = splits[3]
                            const full_path = "s3://portal-data.prism.org/data-to-load" + file;
                            const srcDir = full_path.replace(file_name, "");
                            const destDir = srcDir.replace("data-to-load", "data-loaded");
                            data2load.push({
                                table_id: table_id,
                                file: file,
                                src: srcDir,
                                dest: destDir
                            });
                        }
                    }
                }
            }
            if (data2load.length === 0) {
                console.log("No files to process");
            }
        } catch (error) {
            //Ignore errors
            console.log(error);
        }
        return data2load;
    },
    /**
     * converts csv to json
     * Saves file in same directory as csv but with json extension
     *
     * @param csvFile
     */
    convertToJSON: async function (csvFile) {
        let jsonFile = "";
        if (csvFile.endsWith(".csv")) {
            jsonFile = csvFile.replace(".csv", ".json");
        }else{
            jsonFile = csvFile.replace(".json", "-ND.json");
        }
        return await self.convertToJSONArgs(csvFile, jsonFile);
    },
    /**
     * Convert csv to JSON
     * json directory should already exist
     * @param csvFile
     * @param jsonFile
     */
    convertToJSONArgs: async function (csvFile, jsonFile) {
        if(csvFile.endsWith(".csv")){
            await csvToNdjson(csvFile, {
                delimiter: ',',
                destination: jsonFile,
            });
        } else if(csvFile.endsWith(".json")){
            const jsonData = require(csvFile)
            const data = jsonData.map(JSON.stringify).join('\n');
            fs.writeFileSync(jsonFile, data);
        }
        return jsonFile
    },
    populateTables: async function (data) {
        const jsonFile = fs.readFileSync(data.json, "UTF-8");
        const rows = _.map(jsonFile.split(/\r?\n/), function(row) {
                try{
                    if (row.trim()) {
                        return JSON.parse(row)
                    }
                } catch (e) {
                    console.log("failed to parse JSON row")
                    console.log("printing row:", row)
                }
            }
        )

        const screens = _.compact(_.uniq(_.pluck(rows, "screen")))
        const projects = _.compact(_.uniq(_.pluck(rows, "project")))
        const pert_plates = _.compact(_.uniq(_.pluck(rows, "pert_plate")))
        const pert_ids = _.compact(_.uniq(_.pluck(rows, "pert_id")))
        console.log(screens)
        console.log(projects)
        console.log(pert_plates)
        console.log(pert_ids)

        const WHERE_DATA = {
            screen: screens
        }
        if (projects.length > 0){
            WHERE_DATA.project = projects;
        }
        if (pert_plates.length > 0){
            WHERE_DATA.pert_plate = pert_plates
        }
        if (pert_ids.length > 0){
            WHERE_DATA.pert_id = pert_ids;
        }
        console.log("Deleting rows")
        await self.deleteRows(data, WHERE_DATA);
        console.log("Inserting Rows")
        await self.uploadToGC(data.GOOGLE_STORAGE_BUCKET_NAME, data.BQ_DATASET_ID, data.BQ_TABLE_ID, data.json);
        return "done";
    },
    deleteRows: async function (data, where_data) {
        // const WHERE_CLAUSES = "WHERE project = '" + where_data.project +
        //     "' and pert_plate='" + where_data.pert_plate +
        //     "' and screen='" + where_data.screen + "' and pert_id='" + where_data.pert_id + "'";
        const WHERE_CLAUSES = []
        for (const key in where_data){
            WHERE_CLAUSES.push(key + " in ('" + where_data[key].join("','") + "')")
        }
        const query = "DELETE FROM " + "`" + data.BQ_DATASET_ID + "." + data.BQ_TABLE_ID + "` WHERE " + WHERE_CLAUSES.join(" and ");
        const options = {
            // Specify a job configuration to set optional job resource properties.
            configuration: {
                query: {
                    query: query,
                    useLegacySql: false,
                    location: 'US',
                }
            },
        };
        // Make API request.
        const response = await bigquery.createJob(options);
        const job = response[0];
        // Wait for the query to finish
        await job.getQueryResults(job);
        return "done"
    },
    insertRows: async function (data) {
        await self.uploadToGC(data.GOOGLE_STORAGE_BUCKET_NAME, data.BQ_DATASET_ID, data.BQ_TABLE_ID, data.json);
        return "done"
    },
    getBQTimeStamp: function () {
        return bigquery.timestamp(new Date(Date.now()));
    },
    /**
     *
     * @param bucketName
     * @param datasetId
     * @param tableId
     * @param filename
     * @returns {Promise<string>}
     */
    uploadToGC: async function (bucketName, datasetId, tableId, filename) {
        let isLocalUpload = true;
        const fs = require("fs"); //Load the filesystem module
        const stats = fs.statSync(filename);
        const fileSizeInBytes = stats["size"];
        //Convert the file size to megabytes (optional)
        const fileSizeInMegabytes = fileSizeInBytes / 1000000.0;

        if (fileSizeInMegabytes > 200) {
            isLocalUpload = false;
        }
        console.log("Local Upload: ", isLocalUpload)
        if (!isLocalUpload) {
            await storage.bucket(bucketName).upload(filename, {
                // Support for HTTP requests made with `Accept-Encoding: gzip`
                gzip: true,
                // By setting the option `destination`, you can change the name of the
                // object you are uploading to a bucket.
                metadata: {
                    // Enable long-lived HTTP caching headers
                    // Use only if the contents of the file will never change
                    // (If the contents will change, use cacheControl: 'no-cache')
                    cacheControl: 'public, max-age=31536000',
                },
            });
            console.log(`${filename} uploaded to ${bucketName}.`);
        }
        await self.uploadToBQ(datasetId, tableId, filename, isLocalUpload, bucketName);
        return "done";
    },

    /**
     *
     * @param datasetId
     * @param tableId
     * @param filename
     * @param isLocalUpload true if loading from a local file, false if loading from GC bucket (in that case the bucketname should not be null)
     * @param bucketName the name of the GCS bucket (Example 'clue')
     * @returns {Promise<string>}
     */
    uploadToBQ: async function (datasetId, tableId, filename, isLocalUpload, bucketName) {
        /**
         * Imports a GCS file into a table and overwrite
         * table data if table already exists.
         */
            // Configure the load job. For full list of options, see:
            // https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#JobConfigurationLoad
        const metadata = {
                sourceFormat: 'NEWLINE_DELIMITED_JSON',
                writeDisposition: 'WRITE_APPEND',
            };

        const [job] = await self.handleJob(datasetId, tableId, filename, isLocalUpload, bucketName, metadata);
        // load() waits for the job to finish
        console.log(`Job ${job.id} completed.`);

        // Check the job's status for errors
        const errors = job.status.errors;
        if (errors && errors.length > 0) {
            throw errors;
        }
        return "done";
    },
    handleJob: async function (datasetId, tableId, filename, isLocal, bucketName, metadata) {
        if (isLocal) {
            console.log("Table ID ", tableId)
            return await bigquery
                .dataset(datasetId)
                .table(tableId)
                .load(filename, metadata);
        } else {
            return await bigquery
                .dataset(datasetId)
                .table(tableId)
                .load(storage.bucket(bucketName).file(filename), metadata);
        }
    }

}
module.exports = self;
