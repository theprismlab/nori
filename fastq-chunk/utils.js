const csvToNdjson = require('csv-to-ndjson');
const {BigQuery} = require('@google-cloud/bigquery');
const {Storage} = require('@google-cloud/storage');
const util = require("node:util");
const fs = require("fs");
const _ = require("underscore")
const execPromise = util.promisify(require('node:child_process').exec);
const { exec } = require('node:child_process')
// Instantiate clients
const storage = new Storage();
const bigquery = new BigQuery();
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
let batch = null



function runExec(cmd, options) {
    return new Promise((resolve, reject) => {
        exec(cmd, options, (error, stdout, stderr) => {
            if (error) return reject(error)
            if (stderr) return reject(stderr)
            resolve({stdout, stderr})
        })
    })
}


const self = module.exports = {
    basename: function (fullPath) {
        return require('path').basename(fullPath);
    },
    dirname: function (fullPath) {
        return require('path').dirname(fullPath);
    },
    fetchSampleSheet: async function (s3_path, bucket="data-share.theprismlab.org") {
        const params = {
            Bucket: bucket,
            Key: s3_path,
        };

        const result = await s3.getObject(params).promise()
        const fileContent = result.Body.toString('utf-8'); // Assuming the file is UTF-8 encoded
        const dataSectionIndex = fileContent.indexOf('[Data]');
        const dataSection = fileContent.substring(dataSectionIndex);
        const linesArray = dataSection.split('\n').slice(1); // Skipping the '[Data]' line itself
        if (dataSectionIndex === -1) {
            throw new Error("No [Data] section found in the file.");
        }
        const payload = [];
        const headers = _.compact(linesArray[0].split(","))
        const jsonData = linesArray.slice(1).map( line => {
            const values = line.split(",")
            const obj = {}
            headers.forEach( (header,index)=> {
                obj[header] = values[index]
            })
            return obj
        })
        return jsonData;
    },
    getSampleSheetPaths: async function(s3_bucket, walkup_path) {
        const s3_list_cmd = `aws s3 ls s3://${s3_bucket}/${walkup_path}/ --recursive | grep "SampleSheet.csv"`
        const {stdout, stderr} = await execPromise(s3_list_cmd);
        if (stderr) {
            console.log(stderr);
        }
        const sampleSheetPaths = _.compact(stdout.split("\n")).map(match => {
            return match.split(/\s+/)[3] //split by whitespace to get path
        });
        return sampleSheetPaths
    },
    getAllFastqFiles: async function(s3_bucket, fastq_path) {
        const s3_list_cmd = `aws s3 ls s3://${s3_bucket}/${fastq_path} --recursive | grep ".fastq.gz"`
        const {stdout, stderr} = await runExec(s3_list_cmd, {maxBuffer: 1024 * 10000})
        if (stderr) {
            console.log(stderr);
        }
        const sampleSheetPaths = _.compact(stdout.split("\n")).map(match => {
            return match.split(/\s+/)[3] //split by whitespace to get path
        });
        return sampleSheetPaths
    },
    getFastqFileList: async function (sampleSheetPaths) {
        const fastq_dirs = sampleSheetPaths.map( (sampleSheetPath) => { return sampleSheetPath.split("fastq")[0] + "fastq/"})
        const promises = fastq_dirs.map( (fastq_dir) => {
            return self.getAllFastqFiles("data-share.theprismlab.org", fastq_dir)
        })
        const fastqFiles = await Promise.all(promises);
        const allFastqFiles = []
        fastqFiles.forEach( file_list => {
            console.log(file_list.length);
            allFastqFiles.push(...file_list)
        })
        console.log(allFastqFiles.length);
        return allFastqFiles
    },
    getSampleList: async function (sampleSheetPaths) {
        const promises = sampleSheetPaths.map( (sampleSheetPath) => { return self.fetchSampleSheet(sampleSheetPath)});
        const sampleSheets = await Promise.all(promises);
        const samplesList = []
        sampleSheets.forEach( sampleSheet => {
            samplesList.push(...sampleSheet)
        })
        samplesList.sort()
        return samplesList
    },
    getBatchInstance: function () {
        if (batch) {
            return batch;
        } else {
            AWS.config.update({region: 'us-east-1'});
            batch = new AWS.Batch();
        }
        return batch;
    },
    submitJob: async function (data) {
        if (process.env.DEBUG) {
            return batch.submitJob(data);
        } else {
            return batch.submitJob(data.params).promise();
        }
    }
}
module.exports = self;
