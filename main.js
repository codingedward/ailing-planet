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
        (datesData, date) => [
          ...datesData,
          [
            new Date(date),
            new Map(
              locationIsoCodes.map(countryIsoCode => [
                locations[countryIsoCode].name,
                data[date][countryIsoCode][cases_index],
              ]),
            ),
          ],
        ],
        [],
      );
      const globeData = sortedDates.map(date => {
        const max = locationIsoCodes.reduce(
          (maxValue, countryIsoCode) =>
            Math.max(maxValue, data[date][countryIsoCode][cases_index]),
          0,
        );
        return locationIsoCodes
          .map(countryIsoCode => [
              locations[countryIsoCode].lat,
              locations[countryIsoCode].lng,
              (data[date][countryIsoCode][cases_index]) / max,
          ])
          .reduce((flatArr, arr) => [...flatArr, ...arr], []);
      });
      const countryNames = locationIsoCodes.map(key => locations[key].name);

      globe.initialize();
      globe.loadAnimationData(globeData);

      raceChart.initialize();
      raceChart.loadAnimationData({
        chartData,
        countryNames, 
        countriesData: data,
        activeIndex: cases_index
      });

      animationPlayer.addItem(globe);
      animationPlayer.addItem(raceChart);
      animationPlayer.play();

      const { body } = document;
      body.style.backgroundImage = 'none';
      body.style.height = '100%';
      const chartElement = document.getElementsByClassName('chart')[0];
      const countryStatElement = document.getElementsByClassName('country-stats')[0];
      const controllerElement = document.getElementsByClassName(
        'controller',
      )[0];
      chartElement.classList.remove('hidden');
      controllerElement.classList.remove('hidden');
      countryStatElement.classList.remove('hidden');
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
