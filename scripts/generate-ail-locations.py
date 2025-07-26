import pandas as pd
import json
import os

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

# Convert to list of dicts
ail_data = df.to_dict(orient="records")

# Ensure the output folder exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# Write to JSON
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(ail_data, f, ensure_ascii=False, indent=2)

print(f"✅ AIL data updated: {output_path}")
