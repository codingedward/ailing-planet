(function() {
  const range = n => [...Array(n).keys()];
  const DATA = {
    deaths: {
      url:
        'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv',
      countryNameIndex: 1,
      latIndex: 2,
      lngIndex: 3,
      dataStartIndex: 4,
      dateFormat: 'M/D/YY',
    },
  };
  const SOURCE = DATA.deaths;
  fetch(SOURCE.url, { method: 'GET' })
    .then(res => res.text())
    .then(res => {
      const rows = res.split('\n');
      const headers = rows[0].split(',');
      const firstDate = moment(
        headers[SOURCE.dataStartIndex],
        SOURCE.dateFormat,
        true,
      ).utc();
      const latLngCountryData = rows
        .splice(1)
        .reduce((processedRows, rowStr) => {
          const row = rowStr.split(',');
          const lat = parseFloat(row[SOURCE.latIndex]);
          const lng = parseFloat(row[SOURCE.lngIndex]);
          const name = row[SOURCE.countryNameIndex];
          return [
            ...processedRows,
            ...(isNaN(lat) || isNaN(lng) || !name
              ? []
              : [
                  {
                    lat,
                    lng,
                    name,
                    values: row
                      .splice(SOURCE.dataStartIndex)
                      .map(val => parseFloat(val) || 0),
                  },
                ]),
          ];
        }, []);
      const availableDays = latLngCountryData[0].values.length;
      const countryDailyData = latLngCountryData.reduce(
        (countryValuesKeyedByName, { name, values }) => ({
          ...countryValuesKeyedByName,
          [name]: (() => {
            const dayValues = countryValuesKeyedByName[name];
            if (dayValues) {
              return values.map((val, dayOffset) => val + dayValues[dayOffset]);
            }
            return values;
          })(),
        }),
        {},
      );
      const countryNames = Object.keys(countryDailyData);
      const chartData = range(availableDays).reduce(
        (dates, dayOffset) => [
          ...dates,
          [
            firstDate
              .clone()
              .add(dayOffset, 'days')
              .format('YYYY-MM-DD'),
            new Map(
              countryNames.map(name => [
                name,
                countryDailyData[name][dayOffset],
              ]),
            ),
          ],
        ],
        [],
      );
      const globeData = range(availableDays).map(index => {
        const max = latLngCountryData.reduce(
          (acc, cur) => Math.max(acc, cur.values[index]),
          0,
        );
        return latLngCountryData.reduce(
          (acc, cur) => [...acc, cur.lat, cur.lng, cur.values[index] / max],
          [],
        );
      });

      globe.initialize();
      globe.loadAnimationData(globeData);
      globe.run();

      raceChart.initialize();
      raceChart.loadAnimationData(countryNames, chartData);
      raceChart.run();

      animationPlayer.addItem(globe);
      animationPlayer.addItem(raceChart);
      animationPlayer.play(globeData.length);
      document.body.style.backgroundImage = 'none';
    });

  console.log(
`
 @@@@@@  @@@ @@@      @@@ @@@  @@@  @@@@@@@          
@@!  @@@ @@! @@!      @@! @@!@!@@@ !@@               
@!@!@!@! !!@ @!!      !!@ @!@@!!@! !@! @!@!@         
!!:  !!! !!: !!:      !!: !!:  !!! :!!   !!:         
 :   : : :   : ::.: : :   ::    :   :: :: :          
                                                     
                                                     
@@@@@@@  @@@       @@@@@@  @@@  @@@ @@@@@@@@ @@@@@@@ 
@@!  @@@ @@!      @@!  @@@ @@!@!@@@ @@!        @!!   
@!@@!@!  @!!      @!@!@!@! @!@@!!@! @!!!:!     @!!   
!!:      !!:      !!:  !!! !!:  !!! !!:        !!:   
 :       : ::.: :  :   : : ::    :  : :: ::     :

By Edward Njoroge

Find the source code here: https://github.com/codingedward/ailing-planet 
`
  );
})();
