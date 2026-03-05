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
    
    # Extract state name from the file
    state_match = re.search(r'<b>State:([^<]+)</b>', content, re.IGNORECASE)
    state_name = state_match.group(1).strip() if state_match else "Unknown"
    
    # Fix malformed HTML - close Phase rows properly
    # Pattern: <tr><td colspan='29'>Phase I</td><tr> -> <tr><td colspan='29'>Phase I</td></tr><tr>
    content = re.sub(r"(<tr><td colspan='29'>Phase [IVX]+</td>)\s*(<tr>)", r"\1</tr>\2", content)
    content = re.sub(r"(<tr><td colspan='29'>Phase [IVX]+</td</td>)\s*(<tr>)", r"\1></tr>\2", content)
    
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
            cell_text = cell_text.replace('&nbsp;', '').strip()
            # Remove special characters and normalize
            cell_text = cell_text.replace('\n', ' ').replace('\r', '').strip()
            cells.append(cell_text)
        
        if cells:
            rows.append(cells)
    
    return rows, state_name

def extract_data_rows(rows, state_name):
    """Extract only data rows with state name, skip headers and totals"""
    data_rows = []
    
    for row in rows:
        # Skip empty rows or rows with too few cells
        if not row or len(row) < 10:
            continue
        
        # Skip header rows and phase markers
        first_cell = row[0].strip()
        
        # Skip if first cell is empty
        if not first_cell:
            continue
        
        # Skip phase headers
        if 'Phase' in first_cell:
            continue
        
        # Check if second column exists and has district name (not header text)
        if len(row) < 2:
            continue
        
        second_cell = row[1].strip()
        
        # Skip header rows - check if second column contains header keywords
        if not second_cell or 'District' in second_cell or second_cell in ['2', 'S.No']:
            continue
        
        # Skip if first cell is 'S.No' literal
        if first_cell == 'S.No':
            continue
        
        # Skip total rows
        if 'Total' in second_cell or 'total' in second_cell.lower():
            continue
        
        # Only keep rows that have a numeric S.No. in first column
        try:
            int(first_cell)
            # Add state name as first column
            data_row = [state_name] + row
            data_rows.append(data_row)
        except (ValueError, IndexError):
            continue
    
    return data_rows

def combine_all_files():
    """Combine all XLS files into one CSV"""
    fin_dir = Path(__file__).parent / 'fin'
    
    # Get all XLS files
    xls_files = list(fin_dir.glob('Excelview*.xls'))
    xls_files.sort()
    
    print(f"Found {len(xls_files)} files to process")
    
    all_data = []
    
    for file_path in xls_files:
        print(f"Processing {file_path.name}...")
        rows, state_name = parse_xls_file(file_path)
        
        if rows:
            data_rows = extract_data_rows(rows, state_name)
            all_data.extend(data_rows)
            print(f"  -> Extracted {len(data_rows)} data rows from state: {state_name}")
    
    # Column names based on the financial structure
    # These are simplified column names
    columns = [
        'State',
        'S_No',
        'District',
        'Opening_Balance_Empty',
        'Opening_Balance_Entered',
        'Release_LastFY_Centre',
        'Release_LastFY_State',
        'Release_State_Fund_to_Districts',
        'Authorisation_EFMS',
        'Misc_Receipt',
        'Borrowed_Fund_From_Other',
        'Borrowed_Fund_Refunded',
        'Inter_District_Transfer_Out',
        'Inter_District_Transfer_In',
        'Total_Availability',
        'Cumulative_LB_Estimation',
        'Actual_Exp_Unskilled_Wage',
        'Actual_Exp_Semi_Skilled_Wage',
        'Actual_Exp_Material',
        'Actual_Exp_Tax',
        'Admin_Exp_Rec',
        'Admin_Exp_Non_Rec',
        'Admin_Exp_Total',
        'Total_Expenditure',
        'Percentage_Utilization',
        'Balance',
        'Payment_Due_Unskilled_Wage',
        'Payment_Due_Semi_Skilled_Wage',
        'Payment_Due_Material',
        'Payment_Due_Tax',
        'Payment_Due_Total'
    ]
    
    # Save to CSV
    output_file = Path(__file__).parent / 'financial_data.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        
        # Write all data rows
        for row in all_data:
            # Ensure row has correct number of columns (pad or trim)
            if len(row) < len(columns):
                row.extend([''] * (len(columns) - len(row)))
            elif len(row) > len(columns):
                row = row[:len(columns)]
            writer.writerow(row)
    
    print(f"\nSuccessfully combined {len(all_data)} rows into {output_file.name}")
    print(f"Output saved to: {output_file}")
    
    # Display first few rows
    print("\nFirst 5 rows:")
    for i, row in enumerate(all_data[:5], start=1):
        print(f"{i}: {row[0]} - {row[2]}")  # State - District
    
    print(f"\nTotal rows: {len(all_data)}")
    
    return all_data

if __name__ == "__main__":
    combine_all_files()
