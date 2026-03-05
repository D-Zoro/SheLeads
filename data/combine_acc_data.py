import csv
import re
from pathlib import Path

def parse_xls_file(file_path):
    """Parse XLS file (HTML table) and extract data rows"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        with open(file_path, 'r', encoding='latin-1') as f:
            content = f.read()
    
    # Simple HTML parsing without BeautifulSoup
    rows = []
    # Find all <tr> tags
    tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    td_pattern = re.compile(r'<t[dh][^>]*>(.*?)</t[dh]>', re.DOTALL | re.IGNORECASE)
    
    for tr_match in tr_pattern.finditer(content):
        tr_content = tr_match.group(1)
        cells = []
        
        for td_match in td_pattern.finditer(tr_content):
            cell_content = td_match.group(1)
            # Remove HTML tags and clean text
            cell_text = re.sub(r'<[^>]+>', '', cell_content)
            cell_text = cell_text.strip()
            cells.append(cell_text)
        
        if cells:
            rows.append(cells)
    
    return rows

def extract_data_rows(rows):
    """Extract only data rows, skip headers and totals"""
    data_rows = []
    
    for row in rows:
        # Skip empty rows
        if not row or len(row) < 6:
            continue
        
        # Skip header rows (containing column numbers or column names)
        first_cell = row[0].strip()
        if not first_cell or first_cell in ['S No.', '1'] or 'S No.' in str(row):
            continue
        
        # Skip rows where second column contains header text
        if 'Districts' in row[1] or 'Total' in row[1]:
            continue
        
        # Only keep rows that have a numeric S No. in first column
        try:
            int(first_cell)
            # Make sure we have 6 columns
            if len(row) >= 6:
                data_rows.append(row[:6])  # Take only first 6 columns
        except (ValueError, IndexError):
            continue
    
    return data_rows

def combine_all_files():
    """Combine all XLS files into one CSV"""
    acc_dir = Path(__file__).parent / 'acc'
    
    # Get all XLS files
    xls_files = list(acc_dir.glob('women_joint_acnt*.xls'))
    xls_files.sort()
    
    print(f"Found {len(xls_files)} files to process")
    
    all_data = []
    
    for file_path in xls_files:
        print(f"Processing {file_path.name}...")
        rows = parse_xls_file(file_path)
        
        if rows:
            data_rows = extract_data_rows(rows)
            all_data.extend(data_rows)
            print(f"  -> Extracted {len(data_rows)} data rows")
    
    # Column names
    columns = [
        'S_No',
        'District',
        'No_of_Joint_Account_of_Women',
        'No_of_Total_Account_of_Women',
        'No_of_Women_Beneficiary_Worker_with_Account',
        'No_of_Women_Beneficiary_Active_Worker_with_Account'
    ]
    
    # Save to CSV
    output_file = Path(__file__).parent / 'women_joint_acc.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        
        # Reset S_No to be sequential
        for idx, row in enumerate(all_data, start=1):
            row[0] = str(idx)  # Update S_No
            writer.writerow(row)
    
    print(f"\nSuccessfully combined {len(all_data)} rows into {output_file.name}")
    print(f"Output saved to: {output_file}")
    
    # Display first few rows
    print("\nFirst 10 rows:")
    for i, row in enumerate(all_data[:10], start=1):
        print(f"{i}: {row}")
    
    print(f"\nTotal rows: {len(all_data)}")
    
    return all_data

if __name__ == "__main__":
    combine_all_files()
