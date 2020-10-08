(function() {

  if (!window.isWebGLAvailable()) {
    console.log(
      "%c Here's a nickel kid, go buy yourself a decent browser", 
      'color: #00ff00; font-size: 20px; font-weight: bold; font-family: monospace'
    );
    return;
  }

  let activeDataIndex = 1;
  const WORLD_ISO_CODE = 'OWID_WRL';
  const [contentElement] = document.getElementsByClassName('content');
  const [chartElement] = document.getElementsByClassName('chart');
  const [countryStatElement] = document.getElementsByClassName(
    'country-stats',
  );
  const [controllerElement] = document.getElementsByClassName('controller');

  function computeDataSets(networkData) {
    let { data, locations } = networkData;
    const locationIsoCodes = Object.keys(locations);
    const countryIsoCodes = locationIsoCodes.filter(key => key !== WORLD_ISO_CODE);
    let sortedDates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
    let cleanedData = sortedDates.reduce(
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
    const locationIsoCodeToNameMap = new Map(
      locationIsoCodes.map(isoCode => [isoCode, locations[isoCode].name]),
    );
    [0, 1].map((dataIndex) => {
      const { locations } = networkData;
      const statsData = sortedDates.reduce(
        (datesData, date) => [
          ...datesData,
          [
            new Date(`${date}T00:00:00Z`),
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
      return {
        dataSetName: dataIndex === 0 ? 'Total Cases' : 'Total Deaths',
        statsData,
        globeData,
      }
    })
      .forEach((dataSet, dataIndex) => {
        const { dataSetName, globeData, statsData } = dataSet;
        globe.loadAnimationData({
          globeData,
          dataSetName,
          dataSetKey: dataIndex,
        });
        stats.loadAnimationData({
          statsData, 
          dataSetName,
          dataSetKey: dataIndex,
          locationIsoCodeToNameMap,
        });
      });
    delete data;
    delete cleanedData;
    delete sortedDates;
  }

  function setActiveDataSet(dataIndex) {
    animationPlayer.pause();
    contentElement.classList.add('blurred');
    setTimeout(() => {
      activeDataIndex = dataIndex;
      globe.setActiveDataSet(dataIndex);
      stats.setActiveDataSet(dataIndex);
      document.body.style.backgroundImage = 'none';
      contentElement.classList.remove('blurred');
      chartElement.classList.remove('hidden');
      controllerElement.classList.remove('hidden');
      countryStatElement.classList.remove('hidden');

      animationPlayer.play();
    }, 50);
  }

  function initialize() {
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
          if (value !== activeDataIndex) {
            activeDataIndex = value;
            setActiveDataSet(value);
            dataSelectItems.forEach(elem => {
              elem.classList.toggle('active');
            });
          }
        },
        false,
      );
    });
    globe.initialize();
    stats.initialize();
    animationPlayer.initialize();
    animationPlayer.addItem(globe);
    animationPlayer.addItem(stats);
  }


  fetch('./data/data.json', { method: 'GET' })
    .then(res => res.json())
    .then(res => {
      initialize();
      computeDataSets(res);
      setActiveDataSet(0);
      res = null;
    });

  console.log(
    `%c
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
'color: #ff0000; font-size:12px;'
  );
})();
