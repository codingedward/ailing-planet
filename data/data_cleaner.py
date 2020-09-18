import csv
import json

# iso_code, continent, location, date, total_cases, new_cases, new_cases_smoothed, total_deaths, new_deaths, new_deaths_smoothed, total_cases_per_million, new_cases_per_million, new_cases_smoothed_per_million, total_deaths_per_million, new_deaths_per_million, new_deaths_smoothed_per_million, new_tests, total_tests, total_tests_per_thousand, new_tests_per_thousand, new_tests_smoothed, new_tests_smoothed_per_thousand, tests_per_case, positive_rate, tests_units, stringency_index, population, population_density, median_age, aged_65_older, aged_70_older, gdp_per_capita, extreme_poverty, cardiovasc_death_rate, diabetes_prevalence, female_smokers, male_smokers, handwashing_facilities, hospital_beds_per_thousand, life_expectancy

if __name__ == '__main__':
    with open('countries-lat-lng.json', 'r') as fp:
        countries_lat_lng = json.load(fp)
    data_dict = {
        'data': {}, 
        'locations': {},
        'meta': {'cases_index': 0, 'deaths_index': 1}
    }
    with open('owid-covid-data.csv', 'r') as data_file:
        covid_data = csv.reader(data_file)
        cols_index = {
            'iso_code': 0,
            'location': 2,
            'date': 3,
            'total_cases': 4,
            'total_deaths': 7
        }
        line = 0
        for row in covid_data:
            if line == 0: 
                line += 1
                continue
            iso_code = row[cols_index['iso_code']]
            location = row[cols_index['location']]
            date = row[cols_index['date']]
            total_cases = 0
            total_deaths = 0
            try:
                total_cases = int(float(row[cols_index['total_cases']]))
            except:
                pass
            try:
                total_deaths = int(float(row[cols_index['total_deaths']]))
            except:
                pass
            lat_lng = [x for x in countries_lat_lng if x.get('country') == iso_code]
            if len(lat_lng) == 0:
                continue
            data_dict['locations'].update({iso_code: {
                'name': location,
                'lat': lat_lng[0]['lat'] if len(lat_lng) > 0 else 0,
                'lng': lat_lng[0]['lng'] if len(lat_lng) > 0 else 0,
            }})
            if data_dict['data'].get(date) is not None:
                data_dict['data'][date].update({
                    iso_code: [total_cases, total_deaths]
                })
            else:
                data_dict['data'][date] = {
                    iso_code: [total_cases, total_deaths]
                }
            line += 1

    with open('data.json', 'w') as data_file:
        json.dump(data_dict, data_file, sort_keys=True)
