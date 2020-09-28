(function() {
  if (!window.isWebGLAvailable()) {
    return;
  }

  let networkData;
  let cleanedData;
  let sortedDates;
  let countryIsoCodes;
  let locationIsoCodes;
  let activeDataSet = 0;
  const WORLD_ISO_CODE = 'OWID_WRL';
  const [contentElement] = document.getElementsByClassName('content');

  function initialize() {
    const { data, locations } = networkData;
    locationIsoCodes = Object.keys(locations);
    countryIsoCodes = locationIsoCodes.filter(key => key !== WORLD_ISO_CODE);
    sortedDates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
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
    const [chartElement] = document.getElementsByClassName('chart');
    const [countryStatElement] = document.getElementsByClassName(
      'country-stats',
    );
    const [dataSelectButton] = document.getElementsByClassName(
      'dataset-select-button',
    );
    const [dataSelectList] = document.getElementsByClassName(
      'dataset-select-list',
    );
    dataSelectButton.addEventListener(
      'click',
      e => {
        e.stopPropagation();
        dataSelectList.classList.toggle('invisible');
      },
      false,
    );
    document.addEventListener('click', e => {
      if (
        !dataSelectList.classList.contains('invisible') &&
        !e.target.classList.contains('dataset-select-list')
      ) {
        e.stopPropagation();
        dataSelectList.classList.toggle('invisible');
      }
    });
    const dataSelectItems = Array.from(
      document.getElementsByClassName('dataset-select-list-item'),
    );
    dataSelectItems.forEach(item => {
      item.addEventListener(
        'click',
        e => {
          const value = parseInt(e.target.getAttribute('data-value'), 10);
          if (value !== activeDataSet) {
            activeDataSet = value;
            setActiveDataSet(value);
            dataSelectItems.forEach(elem => {
              elem.classList.toggle('active');
            });
          }
        },
        false,
      );
    });
    const [controllerElement] = document.getElementsByClassName('controller');
    chartElement.classList.remove('hidden');
    controllerElement.classList.remove('hidden');
    countryStatElement.classList.remove('hidden');

    globe.initialize();
    stats.initialize();
    animationPlayer.initialize();
    animationPlayer.addItem(globe);
    animationPlayer.addItem(stats);

    setActiveDataSet(activeDataSet);
  }

  function setActiveDataSet(dataIndex) {
    animationPlayer.pause();
    contentElement.classList.add('blurred');

    setTimeout(() => {
      const { locations } = networkData;
      const statsData = sortedDates.reduce(
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
          1,
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
      globe.loadAnimationData(globeData);
      stats.loadAnimationData({
        statsData, 
        locationIsoCodeToNameMap,
        dataSetName: activeDataSet === 0 ? 'Cases' : 'Deaths',
      });

      document.body.style.backgroundImage = 'none';
      contentElement.classList.remove('blurred');
      animationPlayer.play();
    }, 50);
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
