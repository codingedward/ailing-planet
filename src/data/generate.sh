#!/bin/sh
echo "Fetching data..."
curl https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv --output owid-covid-data.csv
echo "Cleaning and generating JSON..."
python3 ./data_cleaner.py
rm owid-covid-data.csv
echo "Done!"
