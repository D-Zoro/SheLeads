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
        # Skip empty rows or rows with too few cells
        if not row or len(row) < 20:
            continue
        
        # Skip header rows
        first_cell = row[0].strip()
        second_cell = row[1].strip() if len(row) > 1 else ""
        
        # Skip rows that are headers (contain S.No, District, numbers like 1,2,3, or letters)
        if first_cell in ['S.No', '1', 'a', ''] or 'S.No' in first_cell:
            continue
        
        # Skip rows where second column contains header text or "Total"
        if 'District' in second_cell or 'Total' in second_cell:
            continue
        
        # Only keep rows that have a numeric S.No. in first column
        try:
            int(first_cell)
            # Make sure we have at least 24 columns (the expected number)
            if len(row) >= 24:
                data_rows.append(row[:24])  # Take first 24 columns
        except (ValueError, IndexError):
            continue
    
    return data_rows

def combine_all_files():
    """Combine all XLS files into one CSV"""
    emp_dir = Path(__file__).parent / 'emp'
    
    # Get all XLS files
    xls_files = list(emp_dir.glob('empstatusnewall_scst*.xls'))
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
    
    # Column names based on the structure
    columns = [
        'S_No',
        'District',
        'HH_Issued_Jobcards_SCs',
        'HH_Issued_Jobcards_STs',
        'HH_Issued_Jobcards_Others',
        'HH_Issued_Jobcards_Total',
        'HH_Provided_Employment_SCs',
        'HH_Provided_Employment_STs',
        'HH_Provided_Employment_Others',
        'HH_Provided_Employment_Total',
        'Employment_Provided_No_of_Women',
        'Workers_Provided_Employment_SCs',
        'Workers_Provided_Employment_STs',
        'Workers_Provided_Employment_Others',
        'Workers_Provided_Employment_Total',
        'Persondays_Generated_SCs',
        'Persondays_Generated_STs',
        'Persondays_Generated_Others',
        'Persondays_Generated_Total',
        'Persondays_Generated_Women',
        'Families_Completed_100_Days_SCs',
        'Families_Completed_100_Days_STs',
        'Families_Completed_100_Days_Others',
        'Families_Completed_100_Days_Total'
    ]
    
    # Save to CSV
    output_file = Path(__file__).parent / 'employment_status.csv'
    
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
    print("\nFirst 5 rows:")
    for i, row in enumerate(all_data[:5], start=1):
        print(f"{i}: {row[1]}")  # Just show district name
    
    print(f"\nTotal rows: {len(all_data)}")
    
    return all_data

if __name__ == "__main__":
    combine_all_files()
