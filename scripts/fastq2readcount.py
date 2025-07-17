#!/usr/bin/env python3

import argparse
import gzip
import os
import sys
from pathlib import Path
from typing import List, Iterator, Tuple
import polars as pl
from collections import defaultdict
import tempfile

def print_args(args):
    """Print configuration to file"""
    config_data = []
    for key, value in vars(args).items():
        config_data.append({"args": key, "values": str(value)})
    
    config_df = pl.DataFrame(config_data)
    config_path = Path(args.out) / "config.txt"
    print(f"Saving config.txt file in: {config_path}")
    
    with open(config_path, 'w') as f:
        for row in config_df.iter_rows():
            f.write(f"{row[0]}: {row[1]}\n")

def read_fastq_chunk(file_path: str, chunk_size: int = 1000000) -> Iterator[List[Tuple[str, str]]]:
    """Stream FASTQ file in chunks"""
    def open_file(path):
        if path.endswith('.gz'):
            return gzip.open(path, 'rt')
        return open(path, 'r')
    
    with open_file(file_path) as f:
        chunk = []
        while True:
            header = f.readline()
            if not header:
                if chunk:
                    yield chunk
                break
            
            sequence = f.readline().strip()
            plus = f.readline()
            quality = f.readline()
            
            chunk.append((header.strip(), sequence))
            
            if len(chunk) >= chunk_size:
                yield chunk
                chunk = []

def process_fastq_standard(forward_files: List[str], index1_files: List[str], index2_files: List[str],
                          plate_bc_len: int, well_bc_len: int, cl_bc_len: int, 
                          out_dir: str, write_interval: int = None) -> pl.DataFrame:
    """Process standard FASTQ files (non-DRAGEN)"""
    
    all_counts = []
    temp_files = []
    
    for i, (forward_file, index1_file, index2_file) in enumerate(zip(forward_files, index1_files, index2_files)):
        print(f"Processing file {i+1}/{len(forward_files)}")
        print(f"Forward: {forward_file}")
        print(f"Index1: {index1_file}")  
        print(f"Index2: {index2_file}")
        
        # Process files in chunks
        forward_chunks = read_fastq_chunk(forward_file)
        index1_chunks = read_fastq_chunk(index1_file)
        index2_chunks = read_fastq_chunk(index2_file)
        
        chunk_num = 0
        for forward_chunk, index1_chunk, index2_chunk in zip(forward_chunks, index1_chunks, index2_chunks):
            print(f"Processing chunk {chunk_num} from file {i+1}")
            
            # Extract barcodes
            data = []
            for (f_header, f_seq), (i1_header, i1_seq), (i2_header, i2_seq) in zip(forward_chunk, index1_chunk, index2_chunk):
                forward_bc = f_seq[:cl_bc_len]
                index1_bc = i1_seq[:plate_bc_len]
                index2_bc = i2_seq[:well_bc_len]
                
                data.append({
                    'forward_read_barcode': forward_bc,
                    'index_1': index1_bc,
                    'index_2': index2_bc
                })
            
            # Count occurrences in this chunk
            if data:
                chunk_df = pl.DataFrame(data)
                chunk_counts = chunk_df.group_by(['index_1', 'index_2', 'forward_read_barcode']).len().rename({'len': 'n'})
                all_counts.append(chunk_counts)
            
            chunk_num += 1
        
        # Save intermediate results if write_interval specified
        if write_interval and (i + 1) % write_interval == 0:
            print(f"Saving intermediate results at file {i+1}")
            if all_counts:
                temp_df = pl.concat(all_counts).group_by(['index_1', 'index_2', 'forward_read_barcode']).agg(pl.col('n').sum())
                temp_file = Path(out_dir) / f'temporary_cumulative_count_df_{i+1}.parquet'
                temp_df.write_parquet(temp_file)
                temp_files.append(temp_file)
                all_counts = []
    
    # Combine all counts
    if all_counts:
        final_df = pl.concat(all_counts).group_by(['index_1', 'index_2', 'forward_read_barcode']).agg(pl.col('n').sum())
    else:
        # Load from temp files
        temp_dfs = [pl.read_parquet(f) for f in temp_files]
        if temp_dfs:
            final_df = pl.concat(temp_dfs).group_by(['index_1', 'index_2', 'forward_read_barcode']).agg(pl.col('n').sum())
        else:
            final_df = pl.DataFrame({'index_1': [], 'index_2': [], 'forward_read_barcode': [], 'n': []})
    
    # Save final cumulative count
    final_file = Path(out_dir) / 'cumulative_count_df.parquet'
    final_df.write_parquet(final_file)
    
    # Clean up temp files
    for temp_file in temp_files:
        temp_file.unlink(missing_ok=True)
    
    return final_df

def process_fastq_dragen(forward_files: List[str], plate_bc_len: int, well_bc_len: int, 
                        cl_bc_len: int, out_dir: str) -> pl.DataFrame:
    """Process DRAGEN-formatted FASTQ files"""
    
    all_counts = []
    
    for i, forward_file in enumerate(forward_files):
        print(f"Processing DRAGEN file {i+1}/{len(forward_files)}: {forward_file}")
        
        # Extract flowcell info from filename
        filename = Path(forward_file).name
        parts = filename.split('_')
        flow_cell = parts[0] if len(parts) > 0 else 'unknown'
        flow_lane = parts[1] if len(parts) > 1 else 'unknown'
        
        # Process file in chunks
        chunk_num = 0
        for chunk in read_fastq_chunk(forward_file):
            print(f"Processing chunk {chunk_num} from DRAGEN file {i+1}")
            
            data = []
            for header, sequence in chunk:
                # Extract barcode from sequence
                forward_bc = sequence[:cl_bc_len]
                
                # Extract indices from header (last part after splitting by spaces/colons)
                header_parts = header.split()
                if len(header_parts) > 0:
                    # Look for index information in header - typically at the end
                    header_str = header_parts[0]
                    # Extract indices from end of header (format varies)
                    if '+' in header_str:
                        # Format like: @instrument:run:flowcell:lane:tile:x:y index1+index2
                        index_part = header_str.split()[-1] if ' ' in header_str else header_str.split(':')[-1]
                        if '+' in index_part:
                            indices = index_part.split('+')
                            index1_bc = indices[0][-plate_bc_len:] if len(indices) > 0 else ''
                            index2_bc = indices[1][-well_bc_len:] if len(indices) > 1 else ''
                        else:
                            # Fallback: extract from end of header string
                            total_index_len = plate_bc_len + well_bc_len
                            index_str = header_str[-total_index_len:] if len(header_str) >= total_index_len else header_str
                            index1_bc = index_str[:plate_bc_len] if len(index_str) >= plate_bc_len else ''
                            index2_bc = index_str[plate_bc_len:plate_bc_len+well_bc_len] if len(index_str) >= plate_bc_len + well_bc_len else ''
                    else:
                        # Extract from end of header
                        total_index_len = plate_bc_len + well_bc_len
                        index_str = header_str[-total_index_len:] if len(header_str) >= total_index_len else header_str
                        index1_bc = index_str[:plate_bc_len] if len(index_str) >= plate_bc_len else ''
                        index2_bc = index_str[plate_bc_len:plate_bc_len+well_bc_len] if len(index_str) >= plate_bc_len + well_bc_len else ''
                else:
                    index1_bc = ''
                    index2_bc = ''
                
                data.append({
                    'forward_read_barcode': forward_bc,
                    'index_1': index1_bc,
                    'index_2': index2_bc,
                    'flowcell_name': flow_cell,
                    'flowcell_lane': flow_lane
                })
            
            # Count occurrences in this chunk
            if data:
                chunk_df = pl.DataFrame(data)
                chunk_counts = chunk_df.group_by(['index_1', 'index_2', 'forward_read_barcode', 'flowcell_name', 'flowcell_lane']).len().rename({'len': 'n'})
                all_counts.append(chunk_counts)
            
            chunk_num += 1
    
    # Combine all counts (uncollapsed - by flowcell/lane)
    if all_counts:
        uncollapsed_df = pl.concat(all_counts).group_by(['index_1', 'index_2', 'forward_read_barcode', 'flowcell_name', 'flowcell_lane']).agg(pl.col('n').sum())
        
        # Save uncollapsed counts
        uncollapsed_file = Path(out_dir) / 'raw_counts_uncollapsed.csv'
        uncollapsed_df.write_csv(uncollapsed_file)
        
        # Create collapsed version (sum across flowcells/lanes)
        collapsed_df = uncollapsed_df.group_by(['index_1', 'index_2', 'forward_read_barcode']).agg(pl.col('n').sum())
        
        print(f"Collapsed across {uncollapsed_df['flowcell_name'].n_unique()} flowcells")
        
        return collapsed_df
    else:
        return pl.DataFrame({'index_1': [], 'index_2': [], 'forward_read_barcode': [], 'n': []})

def main():
    parser = argparse.ArgumentParser(description='Process FASTQ files to count barcodes')
    parser.add_argument('-v', '--verbose', action='store_true', default=True,
                       help='Print extra output [default]')
    parser.add_argument('-c', '--fastq_chunk_file', default='',
                       help='File containing fastq files to process')
    parser.add_argument('-s', '--seq_type', default='DRAGEN',
                       help='Designate DRAGEN if from DRAGEN')
    parser.add_argument('-f', '--fastq', default='fastq/',
                       help='Path to directory containing fastq files')
    parser.add_argument('-i1', '--index_1', default='',
                       help='Index 1 code')
    parser.add_argument('-i2', '--index_2', default='',
                       help='Index 2 code')
    parser.add_argument('-b', '--barcode_suffix', default='',
                       help='Barcode Read Files code')
    parser.add_argument('-o', '--out', default='',
                       help='Output path. Default is working directory')
    parser.add_argument('-w', '--write_interval', type=int, default=500,
                       help='Integer for how often a temp count file is written')
    parser.add_argument('-l', '--barcode_lengths', default='8,8,24',
                       help='Three number, comma-separated string that denotes PLATE_BC_LEN,WELL_BC_LEN,CELL_BC_LEN')
    
    args = parser.parse_args()
    
    # Set output directory
    if not args.out:
        args.out = os.getcwd()
    
    # Create output directory if it doesn't exist
    Path(args.out).mkdir(parents=True, exist_ok=True)
    
    # Print configuration to file (matching R version behavior)
    print_args(args)
    
    # Parse barcode lengths
    bc_lengths = [int(x) for x in args.barcode_lengths.split(',')]
    plate_bc_len, well_bc_len, cl_bc_len = bc_lengths
    
    # Get file list
    if args.fastq_chunk_file:
        with open(args.fastq_chunk_file, 'r') as f:
            file_list = [line.strip() for line in f if line.strip()]
        print(f"Files in chunk_file: {len(file_list)}")
    else:
        fastq_dir = Path(args.fastq)
        file_list = [str(f) for f in fastq_dir.glob('*') if f.is_file()]
    
    if args.seq_type == 'DRAGEN':
        # Filter for DRAGEN R1 files
        barcode_files = [f for f in file_list if '_R1_001.fastq' in f or '_R1_001.fastq.gz' in f]
        
        if not barcode_files:
            print("No barcode read files found")
            sys.exit(0)
        
        print(f"Number of barcode files: {len(barcode_files)}")
        
        # Process DRAGEN files
        result_df = process_fastq_dragen(barcode_files, plate_bc_len, well_bc_len, cl_bc_len, args.out)
        
    else:
        # Standard processing
        barcode_files = [f for f in file_list if args.barcode_suffix in f]
        index1_files = [f for f in file_list if args.index_1 in f]
        index2_files = [f for f in file_list if args.index_2 in f]
        
        barcode_files.sort()
        index1_files.sort()
        index2_files.sort()
        
        print(f"Number of index_1 files: {len(index1_files)}")
        print(f"Number of index_2 files: {len(index2_files)}")
        print(f"Number of barcode files: {len(barcode_files)}")
        
        if not barcode_files:
            print("No barcode read files found")
            sys.exit(0)
        
        # Process standard files
        result_df = process_fastq_standard(barcode_files, index1_files, index2_files,
                                         plate_bc_len, well_bc_len, cl_bc_len, 
                                         args.out, args.write_interval)
    
    # Save final results (matching R version output format)
    if not result_df.is_empty():
        final_output = Path(args.out) / 'raw_counts_uncollapsed.csv.gz'
        result_df.write_csv(final_output, separator=',')
        print(f"Final results saved to: {final_output}")
    
    print("Processing completed successfully")

if __name__ == '__main__':
    main()
