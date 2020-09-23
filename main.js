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
      const { cases_index: dataIndex } = meta;
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
            new Date(`${date} 00:00z`),
            new Map(
              locationIsoCodes.map(isoCode => [
                isoCode,
                data[date][isoCode][dataIndex],
              ]),
            ),
          ],
        ],
        [],
      );
      const globeData = sortedDates.map(date => {
        const max = locationIsoCodes.reduce(
          (maxValue, isoCode) =>
            Math.max(maxValue, data[date][isoCode][dataIndex]),
          0,
        );
        return locationIsoCodes
          .map(isoCode => [
            locations[isoCode].lat,
            locations[isoCode].lng,
            data[date][isoCode][dataIndex] / max,
          ])
          .reduce((flatArr, arr) => [...flatArr, ...arr], []);
      });
      const countriesIsoCodeToNameMap = new Map(
        locationIsoCodes.map(isoCode => [
          isoCode,
          locations[isoCode].name,
        ])
      );

      globe.initialize();
      globe.loadAnimationData(globeData);

      raceChart.initialize();
      raceChart.loadAnimationData({
        chartData,
        countriesIsoCodeToNameMap,
      });
      animationPlayer.addItem(globe);
      animationPlayer.addItem(raceChart);
      animationPlayer.play();

      const { body } = document;
      body.style.backgroundImage = 'none';
      body.style.height = '100%';
      const chartElement = document.getElementsByClassName('chart')[0];
      const countryStatElement = document.getElementsByClassName(
        'country-stats',
      )[0];
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
