import pandas as pd
import json

def convert_sheet_to_json(csv_url, output_file='ail-locations.json'):
    df = pd.read_csv(csv_url)

    column_mapping = {
        'AIL #': 'id',
        'Company': 'company',
        'Combined Address': 'address',
        'Phone': 'phone',
        'Latitude': 'lat',
        'Longitude': 'lng',
        'State': 'state'
    }

    df = df[list(column_mapping.keys())].rename(columns=column_mapping)
    df = df.dropna(subset=['lat', 'lng', 'address'])

    df['id'] = df['id'].astype(int)
    df['lat'] = df['lat'].astype(float)
    df['lng'] = df['lng'].astype(float)
    df['company'] = df['company'].fillna('')
    df['phone'] = df['phone'].fillna('')
    df['state'] = df['state'].fillna('')

    data = df.to_dict(orient='records')

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ JSON file written with {len(data)} records to {output_file}")

# Example usage:
convert_sheet_to_json("https://docs.google.com/spreadsheets/d/1q4SFo83xPIysakFXTwIRFq0vDGIib3d0ZqEEP6vQdEs/export?format=csv")
