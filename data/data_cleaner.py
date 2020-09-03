import csv

# iso_code, continent, location, date, total_cases, new_cases, new_cases_smoothed, total_deaths, new_deaths, new_deaths_smoothed, total_cases_per_million, new_cases_per_million, new_cases_smoothed_per_million, total_deaths_per_million, new_deaths_per_million, new_deaths_smoothed_per_million, new_tests, total_tests, total_tests_per_thousand, new_tests_per_thousand, new_tests_smoothed, new_tests_smoothed_per_thousand, tests_per_case, positive_rate, tests_units, stringency_index, population, population_density, median_age, aged_65_older, aged_70_older, gdp_per_capita, extreme_poverty, cardiovasc_death_rate, diabetes_prevalence, female_smokers, male_smokers, handwashing_facilities, hospital_beds_per_thousand, life_expectancy

if __name__ == '__main__':
    with open('owid-covid-data.csv') as data_file:
        covid_data = csv.reader(data_file)
        cols_index = {
            'iso_code': 0,
            'location': 2,
            'date': 3,
            'total_cases': 4,
            'total_deaths': 6
        }
        line = 0
        data_dict = {}
        for row in covid_data:
            if line == 0: 
                continue
            iso_code = row[cols_index['iso_code']]
            location = row[cols_index['location']]
            date = row[cols_index['date']]
            total_cases = row[cols_index['total_cases']]
            total_deaths = row[cols_index['total_deaths']]
            if data_dict.get(date) is not None:
                pass
            else:
                countries_dict = {}
                countries_dict[iso_code] = 
                data_dict[date] = 
