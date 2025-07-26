import pandas as pd
import json
import os
import numpy as np

# Google Sheet CSV export URL
sheet_url = "https://docs.google.com/spreadsheets/d/1q4SFo83xPIysakFXTwIRFq0vDGIib3d0ZqEEP6vQdEs/export?format=csv"

# Output path (make sure this folder exists in your repo)
output_path = "data/ail-locations.json"

# Columns to extract and rename
columns = {
    "AIL #": "id",
    "Company": "name",
    "Business Address Line 1": "address",
    "Suburb": "suburb",
    "State": "state",
    "Postcode": "postcode",
    "Licensed Inspector": "inspector",
    "Phone": "phone",
    "Latitude": "lat",
    "Longitude": "lng"
}

# Load CSV from Google Sheets
df = pd.read_csv(sheet_url)

# Drop rows with no coordinates
df = df.dropna(subset=["Latitude", "Longitude"])

# Keep only the desired columns and rename them
df = df[list(columns.keys())].rename(columns=columns)

# Clean the data to handle NaN values properly
def clean_value(value):
    if pd.isna(value) or value is None:
        return None
    if isinstance(value, str) and value.strip() == '':
        return None
    return value

# Apply cleaning to all string columns
string_columns = ['address', 'suburb', 'inspector']
for col in string_columns:
    if col in df.columns:
        df[col] = df[col].apply(clean_value)

# Convert to list of dicts with proper null handling
ail_data = []
for _, row in df.iterrows():
    location = {}
    for key, value in row.items():
        if pd.isna(value):
            location[key] = None
        elif isinstance(value, (np.integer, np.floating)):
            location[key] = float(value) if key in ['lat', 'lng'] else int(value)
        else:
            location[key] = str(value) if value is not None else None
    ail_data.append(location)

# Ensure the output folder exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# Write to JSON with proper null handling
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(ail_data, f, ensure_ascii=False, indent=2, default=str)

print(f"✅ AIL data updated: {output_path}")
print(f"📊 Total locations: {len(ail_data)}")

# Validate the JSON we just created
try:
    with open(output_path, "r", encoding="utf-8") as f:
        test_data = json.load(f)
    print(f"✅ JSON validation successful: {len(test_data)} locations")
except Exception as e:
    print(f"❌ JSON validation failed: {e}")
