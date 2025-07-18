#!/bin/bash

# Local runner script for FASTQ processing pipeline
# This script mimics the AWS Batch environment for local testing

set -e

# Default values
FASTQ_DIR=""
OUTPUT_DIR=""
SEQ_TYPE="DRAGEN"
BC_LENGTHS="8,8,24"
CHUNK_FILE=""
INDEX_1=""
INDEX_2=""
BARCODE_SUFFIX=""
WRITE_INTERVAL=500
VERBOSE=true

# Help function
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Local runner for FASTQ processing pipeline

OPTIONS:
    -f, --fastq DIR         Directory containing FASTQ files
    -o, --output DIR        Output directory for results
    -c, --chunk-file FILE   File containing list of FASTQ files to process
    -s, --seq-type TYPE     Sequence type: DRAGEN (default) or STANDARD
    -l, --bc-lengths STR    Barcode lengths as comma-separated string (default: 8,8,24)
    -i1, --index1 STR       Index 1 pattern for STANDARD mode
    -i2, --index2 STR       Index 2 pattern for STANDARD mode
    -b, --barcode STR       Barcode suffix pattern for STANDARD mode
    -w, --write-interval N  Write interval for temp files (default: 500)
    -v, --verbose           Enable verbose output (default: true)
    -h, --help             Show this help message

EXAMPLES:
    # Process DRAGEN files from a directory
    $0 -f /path/to/fastq -o /path/to/output -s DRAGEN

    # Process STANDARD files with specific patterns
    $0 -f /path/to/fastq -o /path/to/output -s STANDARD -i1 "I1" -i2 "I2" -b "R1"

    # Process files listed in a chunk file
    $0 -c /path/to/chunk_file.txt -o /path/to/output

    # Custom barcode lengths (plate=6, well=6, cell=20)
    $0 -f /path/to/fastq -o /path/to/output -l "6,6,20"

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--fastq)
            FASTQ_DIR="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -c|--chunk-file)
            CHUNK_FILE="$2"
            shift 2
            ;;
        -s|--seq-type)
            SEQ_TYPE="$2"
            shift 2
            ;;
        -l|--bc-lengths)
            BC_LENGTHS="$2"
            shift 2
            ;;
        -i1|--index1)
            INDEX_1="$2"
            shift 2
            ;;
        -i2|--index2)
            INDEX_2="$2"
            shift 2
            ;;
        -b|--barcode)
            BARCODE_SUFFIX="$2"
            shift 2
            ;;
        -w|--write-interval)
            WRITE_INTERVAL="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$OUTPUT_DIR" ]]; then
    echo "Error: Output directory (-o/--output) is required"
    exit 1
fi

if [[ -z "$FASTQ_DIR" && -z "$CHUNK_FILE" ]]; then
    echo "Error: Either FASTQ directory (-f/--fastq) or chunk file (-c/--chunk-file) is required"
    exit 1
fi

# Check if Python script exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/fastq2readcount.py"

if [[ ! -f "$PYTHON_SCRIPT" ]]; then
    echo "Error: Python script not found at $PYTHON_SCRIPT"
    exit 1
fi

# Check Python dependencies
echo "Checking Python dependencies..."
python3 -c "import polars, pyarrow" 2>/dev/null || {
    echo "Error: Required Python packages not found. Please install:"
    echo "pip install polars pyarrow"
    exit 1
}

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build command arguments
ARGS=()
ARGS+=("--out" "$OUTPUT_DIR")
ARGS+=("--seq_type" "$SEQ_TYPE")
ARGS+=("--barcode_lengths" "$BC_LENGTHS")
ARGS+=("--write_interval" "$WRITE_INTERVAL")

if [[ "$VERBOSE" == "true" ]]; then
    ARGS+=("--verbose")
fi

if [[ -n "$CHUNK_FILE" ]]; then
    if [[ ! -f "$CHUNK_FILE" ]]; then
        echo "Error: Chunk file not found: $CHUNK_FILE"
        exit 1
    fi
    ARGS+=("--fastq_chunk_file" "$CHUNK_FILE")
elif [[ -n "$FASTQ_DIR" ]]; then
    if [[ ! -d "$FASTQ_DIR" ]]; then
        echo "Error: FASTQ directory not found: $FASTQ_DIR"
        exit 1
    fi
    ARGS+=("--fastq" "$FASTQ_DIR")
fi

# Add STANDARD mode specific arguments
if [[ "$SEQ_TYPE" == "STANDARD" ]]; then
    if [[ -n "$INDEX_1" ]]; then
        ARGS+=("--index_1" "$INDEX_1")
    fi
    if [[ -n "$INDEX_2" ]]; then
        ARGS+=("--index_2" "$INDEX_2")
    fi
    if [[ -n "$BARCODE_SUFFIX" ]]; then
        ARGS+=("--barcode_suffix" "$BARCODE_SUFFIX")
    fi
fi

# Print configuration
echo "=== FASTQ Processing Configuration ==="
echo "Python script: $PYTHON_SCRIPT"
echo "Output directory: $OUTPUT_DIR"
echo "Sequence type: $SEQ_TYPE"
echo "Barcode lengths: $BC_LENGTHS"
echo "Write interval: $WRITE_INTERVAL"

if [[ -n "$CHUNK_FILE" ]]; then
    echo "Chunk file: $CHUNK_FILE"
    echo "Files in chunk: $(wc -l < "$CHUNK_FILE")"
elif [[ -n "$FASTQ_DIR" ]]; then
    echo "FASTQ directory: $FASTQ_DIR"
    echo "Files in directory: $(find "$FASTQ_DIR" -name "*.fastq*" | wc -l)"
fi

if [[ "$SEQ_TYPE" == "STANDARD" ]]; then
    echo "Index 1 pattern: $INDEX_1"
    echo "Index 2 pattern: $INDEX_2"
    echo "Barcode suffix: $BARCODE_SUFFIX"
fi

echo "======================================="
echo

# Run the Python script
echo "Starting FASTQ processing..."
echo "Command: python3 $PYTHON_SCRIPT ${ARGS[*]}"
echo

python3 "$PYTHON_SCRIPT" "${ARGS[@]}"

# Check if processing was successful
if [[ $? -eq 0 ]]; then
    echo
    echo "=== Processing completed successfully! ==="
    echo "Output files:"
    find "$OUTPUT_DIR" -type f -name "*.csv*" -o -name "*.parquet" -o -name "config.txt" | sort
    echo
    
    # Show summary of results
    if [[ -f "$OUTPUT_DIR/raw_counts_uncollapsed.csv.gz" ]]; then
        echo "Final output: $OUTPUT_DIR/raw_counts_uncollapsed.csv.gz"
        echo "File size: $(du -h "$OUTPUT_DIR/raw_counts_uncollapsed.csv.gz" | cut -f1)"
    elif [[ -f "$OUTPUT_DIR/raw_counts_uncollapsed.csv" ]]; then
        echo "Final output: $OUTPUT_DIR/raw_counts_uncollapsed.csv"
        echo "File size: $(du -h "$OUTPUT_DIR/raw_counts_uncollapsed.csv" | cut -f1)"
    fi
else
    echo "Error: Processing failed with exit code $?"
    exit 1
fi
