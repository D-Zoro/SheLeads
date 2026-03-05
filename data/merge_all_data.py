import csv
import re
from pathlib import Path
from difflib import SequenceMatcher

def normalize_district_name(name):
    """Normalize district name for better matching"""
    if not name:
        return ""
    # Convert to uppercase, remove special characters, extra spaces
    name = str(name).upper().strip()
    name = re.sub(r'[^\w\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name)
    # Remove common suffixes that might differ
    name = re.sub(r'\s+(DISTRICT|DISTT|DT)$', '', name)
    return name

def fuzzy_match_score(str1, str2):
    """Calculate fuzzy match score between two strings"""
    return SequenceMatcher(None, normalize_district_name(str1), normalize_district_name(str2)).ratio()

def find_best_match(district, state, candidates, threshold=0.75):
    """Find best matching district from candidates list"""
    best_match = None
    best_score = threshold
    
    norm_district = normalize_district_name(district)
    norm_state = normalize_district_name(state) if state else ""
    
    for candidate in candidates:
        cand_district = candidate.get('district', '')
        cand_state = candidate.get('state', '')
        
        # Calculate district name match score
        district_score = fuzzy_match_score(district, cand_district)
        
        # Boost score if states match
        if norm_state and normalize_district_name(cand_state) == norm_state:
            district_score += 0.15
        
        if district_score > best_score:
            best_score = district_score
            best_match = candidate
    
    return best_match

def load_nfhs_data(file_path):
    """Load NFHS-5 data"""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({
                'district': row['District Names'].strip(),
                'state': row['State/UT'].strip(),
                'literacy_rate': row['Women (age 15-49) who are literate4 (%)'].strip()
            })
    return data

def load_employment_data(file_path):
    """Load employment status data"""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Calculate women_worked_pct if workers data available
            total_workers = safe_float(row.get('Workers_Provided_Employment_Total', '0'))
            women_workers = safe_float(row.get('Employment_Provided_No_of_Women', '0'))
            
            women_pct = (women_workers / total_workers * 100) if total_workers > 0 else 0
            
            data.append({
                'district': row['District'].strip(),
                'state': '',  # Employment data doesn't have state in the source
                'women_worked_pct': f"{women_pct:.2f}",
                'women_persondays': row.get('Persondays_Generated_Women', '0').strip(),
                'total_persondays': row.get('Persondays_Generated_Total', '0').strip()
            })
    return data

def load_financial_data(file_path):
    """Load financial performance data"""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({
                'district': row['District'].strip(),
                'state': row['State'].strip(),
                'total_exp_lakhs': row.get('Total_Expenditure', '0').strip(),
                'unskilled_wages_lakhs': row.get('Actual_Exp_Unskilled_Wage', '0').strip(),
                'balance_lakhs': row.get('Balance', '0').strip()
            })
    return data

def load_accounts_data(file_path):
    """Load women joint accounts data"""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({
                'district': row['District'].strip(),
                'state': '',  # Accounts data doesn't have state
                'individual_accounts': row.get('No_of_Joint_Account_of_Women', '0').strip(),
                'total_accounts': row.get('No_of_Total_Account_of_Women', '0').strip()
            })
    return data

def safe_float(value):
    """Safely convert value to float"""
    try:
        # Remove commas and other non-numeric characters except . and -
        value = str(value).replace(',', '').strip()
        if value in ['', 'NaN', '*', '(*)']:
            return 0.0
        return float(value)
    except:
        return 0.0

def merge_datasets():
    """Merge all datasets using fuzzy matching"""
    base_dir = Path(__file__).parent
    
    print("Loading datasets...")
    nfhs_data = load_nfhs_data(base_dir / 'final_data/nfhs-5.csv')
    employment_data = load_employment_data(base_dir / 'final_data/employment_status.csv')
    financial_data = load_financial_data(base_dir / 'final_data/financial_data.csv')
    accounts_data = load_accounts_data(base_dir / 'final_data/women_joint_acc.csv')
    
    print(f"Loaded {len(nfhs_data)} NFHS records")
    print(f"Loaded {len(employment_data)} employment records")
    print(f"Loaded {len(financial_data)} financial records")
    print(f"Loaded {len(accounts_data)} accounts records")
    
    merged_data = []
    matched_count = 0
    
    # Use NFHS as the base since it has the most comprehensive district-state mapping
    print("\nMerging datasets...")
    
    for nfhs_row in nfhs_data:
        district = nfhs_row['district']
        state = nfhs_row['state']
        
        # Start with NFHS data
        merged_row = {
            'district': district,
            'state': state,
            'literacy_rate': nfhs_row['literacy_rate'],
            'women_worked_pct': '',
            'total_exp_lakhs': '',
            'unskilled_wages_lakhs': '',
            'balance_lakhs': '',
            'women_persondays': '',
            'total_persondays': '',
            'individual_accounts': '',
            'total_accounts': ''
        }
        
        # Match with employment data
        emp_match = find_best_match(district, state, employment_data, threshold=0.7)
        if emp_match:
            merged_row['women_worked_pct'] = emp_match['women_worked_pct']
            merged_row['women_persondays'] = emp_match['women_persondays']
            merged_row['total_persondays'] = emp_match['total_persondays']
            matched_count += 1
        
        # Match with financial data
        fin_match = find_best_match(district, state, financial_data, threshold=0.7)
        if fin_match:
            merged_row['total_exp_lakhs'] = fin_match['total_exp_lakhs']
            merged_row['unskilled_wages_lakhs'] = fin_match['unskilled_wages_lakhs']
            merged_row['balance_lakhs'] = fin_match['balance_lakhs']
        
        # Match with accounts data
        acc_match = find_best_match(district, state, accounts_data, threshold=0.7)
        if acc_match:
            merged_row['individual_accounts'] = acc_match['individual_accounts']
            merged_row['total_accounts'] = acc_match['total_accounts']
        
        # Only include rows with complete data (no empty fields)
        is_complete = all(
            merged_row[col] and str(merged_row[col]).strip() != ''
            for col in ['literacy_rate', 'women_worked_pct', 'total_exp_lakhs', 
                        'unskilled_wages_lakhs', 'balance_lakhs', 'women_persondays',
                        'total_persondays', 'individual_accounts', 'total_accounts']
        )
        
        if is_complete:
            merged_data.append(merged_row)
    
    # Write merged data to CSV
    output_file = base_dir / 'raw_districts.csv'
    
    columns = [
        'district', 'state', 'literacy_rate', 'women_worked_pct',
        'total_exp_lakhs', 'unskilled_wages_lakhs', 'balance_lakhs',
        'women_persondays', 'total_persondays', 'individual_accounts',
        'total_accounts'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(merged_data)
    
    print(f"\n✓ Successfully merged {len(merged_data)} districts with complete data")
    print(f"✓ Filtered out {len(nfhs_data) - len(merged_data)} districts with partial/missing data")
    print(f"✓ Output saved to: {output_file}")
    
    # Print sample of merged data
    print("\nSample of merged data (first 5 rows):")
    for i, row in enumerate(merged_data[:5], 1):
        print(f"\n{i}. {row['district']}, {row['state']}")
        print(f"   Literacy: {row['literacy_rate']}%")
        print(f"   Women Worked: {row['women_worked_pct']}%")
        print(f"   Total Exp: ₹{row['total_exp_lakhs']} lakhs")
        print(f"   Accounts: {row['individual_accounts']}/{row['total_accounts']}")
    
    # Print statistics
    print("\n=== Clean Dataset Summary ===")
    print(f"Total districts with complete data: {len(merged_data)}")
    print(f"All fields are 100% populated (filtered for completeness)")
    
    return merged_data

if __name__ == "__main__":
    merge_datasets()
