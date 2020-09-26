#!/usr/bin/python3
# -*- coding: utf-8 -*-
import csv
import json

from datetime import datetime

# data columns...
# iso_code, continent, location, date, total_cases, new_cases, ...

cols_index = {
    'iso_code': 0,
    'location': 2,
    'date': 3,
    'total_cases': 4,
    'total_deaths': 7,
}

if __name__ == '__main__':
    with open('countries-lat-lng.json', 'r') as fp:
        countries_lat_lng = json.load(fp)
    data_dict = {'data': {}, 'locations': {},
                 'meta': {'cases_index': 0, 'deaths_index': 1}}
    with open('owid-covid-data.csv', 'r') as fp:
        covid_data = csv.reader(fp)
        next(covid_data)
        covid_data = sorted(covid_data, key=lambda row: \
                            datetime.strptime(row[cols_index['date']],
                            '%Y-%m-%d'))
        previous_cases = {}
        previous_deaths = {}
        for (line, row) in enumerate(covid_data):
            iso_code = row[cols_index['iso_code']]
            if iso_code == '':
                continue
            date = row[cols_index['date']]
            for previous_iso_code in previous_cases.keys():
                country_data = \
                    {previous_iso_code: [previous_cases[previous_iso_code],
                     previous_deaths[previous_iso_code]]}
                if data_dict['data'].get(date) is None:
                    data_dict['data'][date] = country_data
                else:
                    data_dict['data'][date].update(country_data)
            location = row[cols_index['location']]
            total_cases = previous_cases.get(iso_code) or 0
            total_deaths = previous_deaths.get(iso_code) or 0
            try:
                total_cases = max(total_cases,
                                  int(float(row[cols_index['total_cases'
                                  ]])))
            except:
                pass
            try:
                total_deaths = max(total_deaths,
                                   int(float(row[cols_index['total_deaths'
                                   ]])))
            except:
                pass
            previous_cases[iso_code] = total_cases
            previous_deaths[iso_code] = total_deaths
            if iso_code != 'OWID_WRL':
                lat_lng = [x for x in countries_lat_lng if x.get('country')
                           == iso_code]
            else:
                lat_lng = [{'lat': -1.0, 'lng': -1.0}]
            data_dict['locations'].update({iso_code: {'name': location,
                    'lat': lat_lng[0]['lat'], 'lng': lat_lng[0]['lng'
                    ]}})
            country_data = {iso_code: [total_cases, total_deaths]}
            if data_dict['data'].get(date) is None:
                data_dict['data'][date] = country_data
            else:
                data_dict['data'][date].update(country_data)
    with open('data.json', 'w') as fp:
        json.dump(data_dict, fp, sort_keys=True)
