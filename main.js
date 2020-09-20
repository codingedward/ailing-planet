(function() {
  if (!window.isWebGLAvailable()) {
    return;
  }
  const WORLD_KEY = 'OWID_WRL';
  fetch('./data/data.json', { method: 'GET' })
    .then(res => res.json())
    .then(res => {
      const { data: dataArg, locations, meta } = res;
      const locationIsoCodes = Object.keys(locations).filter(
        key => key && key !== WORLD_KEY,
      );
      const sortedDates = Object.keys(dataArg).sort(
        (a, b) => new Date(a) - new Date(b),
      );
      const { cases_index } = meta;
      const data = sortedDates.reduce(
        (datesData, date) => ({
          ...datesData,
          [date]: locationIsoCodes.reduce(
            (dateData, isoCode) => ({
              ...dateData,
              [isoCode]: dataArg[date][isoCode] || [0, 0],
            }),
            {},
          ),
        }),
        {},
      );
      const chartData = sortedDates.reduce(
        (acc, cur) => [
          ...acc,
          [
            cur,
            new Map(
              locationIsoCodes.map(countryIsoCode => [
                locations[countryIsoCode].name,
                data[cur][countryIsoCode][cases_index],
              ]),
            ),
          ],
        ],
        [],
      );
      const previousValues = {};
      const globeData = sortedDates.map((cur, i) => {
        const max = locationIsoCodes.reduce(
          (maxValue, countryIsoCode) =>
            Math.max(maxValue, data[cur][countryIsoCode][cases_index]),
          0,
        );
        return locationIsoCodes
          .map(countryIsoCode => {
            const value = (data[cur][countryIsoCode][cases_index]) / max;
            if (i > 0 && previousValues[countryIsoCode] > 0 &&  value === 0) {
              console.log({
                date: cur,
                countryIsoCode,
                name: locations[countryIsoCode].name,
                prev: previousValues[countryIsoCode],
                cases: data[cur][countryIsoCode][cases_index],
                prevDate: moment.utc(cur).subtract(1, 'days').format('YYYY-MM-DD'),
                prevCases: data[moment.utc(cur).subtract(1, 'days').format('YYYY-MM-DD')][countryIsoCode][cases_index]
              });
            }
            previousValues[countryIsoCode] = value;
            return [
              locations[countryIsoCode].lat,
              locations[countryIsoCode].lng,
              value,
            ];
          })
          .reduce((flatArr, arr) => [...flatArr, ...arr], []);
      });
      const countryNames = locationIsoCodes.map(key => locations[key].name);

      globe.initialize();
      globe.loadAnimationData(globeData);
      globe.animate();

      raceChart.initialize();
      raceChart.loadAnimationData(countryNames, chartData);
      raceChart.run();

      animationPlayer.addItem(globe);
      animationPlayer.addItem(raceChart);
      animationPlayer.play();

      const { body } = document;
      body.style.backgroundImage = 'none';
      body.style.height = '100%';
      const chartElement = document.getElementsByClassName('chart')[0];
      const controllerElement = document.getElementsByClassName(
        'controller',
      )[0];
      chartElement.classList.remove('hidden');
      controllerElement.classList.remove('hidden');
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
`,
  );
})();
