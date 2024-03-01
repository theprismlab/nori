# Nori
FastQ processing pipeline for PRISM Sequencing data

## Process

A directory with the following structure will be on the s3 bucket: 

```    
    data-share.theprismlab.org/
    ├── genomics-platform
    │   ├── WALKUP-15118/
    │   │   ├── 240206_SL-NXA_0006_AHKJ35BGXV/
    │   │   ├── 240206_SL-NXA_0007_AHKJ35BGXV/
    │   │       ├──1707403946/
    │   │           ├── SampleSheet_hsa.csv
    │   │           ├── fastq/
    │   │               ├── HKJHHBGXV_1_0420698776_ACTAGCGT-AACAATGG_S1_L001_R1_001.fastq.gz 
    │   │               ├── HKJHHBGXV_1_0420698776_ACTAGCGT-AACAATGG_S1_L001_R2_001.fastq.gz
    │   │               ├── ...
    │   ├── WALKUP-15119/
    │   ├── ...
```

To Parallelize we will use the SampleSheet_hsa.csv file to create a list of samples to process, then split that 
list into chunks to be processed in parallel.

The format of the SampleSheet_hsa.csv file is as follows:

```

```
