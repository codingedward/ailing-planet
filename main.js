(function() {
  if (!window.isWebGLAvailable()) {
    return;
  }

  let networkData;
  let sortedDates;
  let countryIsoCodes;
  let locationIsoCodes;
  const WORLD_KEY = 'OWID_WRL';
  const CASES_DATA_SET_INDEX = 0;
  const DEATHS_DATA_SET_INDEX = 1;

  function setActiveDataSet(dataIndex) {
    const { locations } = networkData;
    const chartData = sortedDates.reduce(
      (datesData, date) => [
        ...datesData,
        [
          new Date(`${date} 00:00z`),
          new Map(
            locationIsoCodes.map(isoCode => [
              isoCode,
              cleanedData[date][isoCode][dataIndex],
            ]),
          ),
        ],
      ],
      [],
    );
    const globeData = sortedDates.map(date => {
      const max = countryIsoCodes.reduce(
        (maxValue, isoCode) =>
          Math.max(maxValue, cleanedData[date][isoCode][dataIndex]),
        0,
      );
      return countryIsoCodes
        .map(isoCode => [
          locations[isoCode].lat,
          locations[isoCode].lng,
          cleanedData[date][isoCode][dataIndex] / max,
        ])
        .reduce((flatArr, arr) => [...flatArr, ...arr], []);
    });
    const locationIsoCodeToNameMap = new Map(
      locationIsoCodes.map(isoCode => [isoCode, locations[isoCode].name]),
    );

    globe.initialize();
    globe.loadAnimationData(globeData);

    raceChart.initialize();
    raceChart.loadAnimationData({
      chartData,
      locationIsoCodeToNameMap,
    });

    animationPlayer.initialize();
    animationPlayer.addItem(globe);
    animationPlayer.addItem(raceChart);
    animationPlayer.play();
  }

  function initialize() {
    const { data, locations } = networkData;
    locationIsoCodes = Object.keys(locations);
    countryIsoCodes = locationIsoCodes.filter(
      key => key !== WORLD_KEY,
    );
    sortedDates = Object.keys(data).sort(
      (a, b) => new Date(a) - new Date(b),
    );
    cleanedData = sortedDates.reduce(
      (datesData, date) => ({
        ...datesData,
        [date]: locationIsoCodes.reduce(
          (dateData, isoCode) => ({
            ...dateData,
            [isoCode]: data[date][isoCode] || [0, 0],
          }),
          {},
        ),
      }),
      {},
    );

    const { body } = document;
    body.style.backgroundImage = 'none';
    body.style.height = '100%';
    const [chartElement] = document.getElementsByClassName('chart');
    const [countryStatElement] = document.getElementsByClassName(
      'country-stats',
    );
    const [controllerElement] = document.getElementsByClassName('controller');
    chartElement.classList.remove('hidden');
    controllerElement.classList.remove('hidden');
    countryStatElement.classList.remove('hidden');

    setActiveDataSet(CASES_DATA_SET_INDEX);
  }

  fetch('./data/data.json', { method: 'GET' })
    .then(res => res.json())
    .then(res => {
      networkData = res;
      initialize();
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
