import { FRSHideScrollbar } from 'frs-hide-scrollbar';

import globe from './globe';
import stats from './stats';
import player from './player';
import isWebGLAvailable from './webgl-check';
import '../scss/app.scss';

let activeDataIndex = 1;
const WORLD_ISO_CODE = 'OWID_WRL';
const [contentElement] = document.getElementsByClassName('content');
const [chartElement] = document.getElementsByClassName('chart');
const [countryStatElement] = document.getElementsByClassName(
  'country-stats',
);
const [controllerElement] = document.getElementsByClassName('controller');

function computeDataSets(networkData) {
  const { data, locations } = networkData;
  const locationIsoCodes = Object.keys(locations);
  const countryIsoCodes = locationIsoCodes.filter((key) => key !== WORLD_ISO_CODE);
  const sortedDates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
  const cleanedData = sortedDates.reduce(
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
    locationIsoCodes.map((isoCode) => [isoCode, locations[isoCode].name]),
  );
  [0, 1].map((dataIndex) => {
    const statsData = sortedDates.reduce(
      (datesData, date) => [
        ...datesData,
        [
          new Date(`${date}T00:00:00Z`),
          new Map(
            locationIsoCodes.map((isoCode) => [
              isoCode,
              cleanedData[date][isoCode][dataIndex],
            ]),
          ),
        ],
      ],
      [],
    );
    const globeData = sortedDates.map((date) => {
      const max = countryIsoCodes.reduce(
        (maxValue, isoCode) => Math.max(maxValue, cleanedData[date][isoCode][dataIndex]),
        1,
      );
      return countryIsoCodes
        .map((isoCode) => [
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
    };
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
}

function setActiveDataSet(dataIndex) {
  player.pause();
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

    player.play();
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
    (e) => {
      e.stopPropagation();
      dataSelectList.classList.toggle('invisible');
    },
    false,
  );
  document.addEventListener('click', (e) => {
    if (
      !dataSelectList.classList.contains('invisible')
        && !e.target.classList.contains('dataset-select-list')
    ) {
      e.stopPropagation();
      dataSelectList.classList.toggle('invisible');
    }
  });
  const dataSelectItems = Array.from(
    document.getElementsByClassName('dataset-select-list-item'),
  );
  dataSelectItems.forEach((item) => {
    item.addEventListener(
      'click',
      (e) => {
        const value = parseInt(e.target.getAttribute('data-value'), 10);
        if (value !== activeDataIndex) {
          activeDataIndex = value;
          setActiveDataSet(value);
          dataSelectItems.forEach((elem) => {
            elem.classList.toggle('active');
          });
        }
      },
      false,
    );
  });
  globe.initialize();
  stats.initialize();
  player.initialize();
  player.addItem(globe);
  player.addItem(stats);
}

window.addEventListener('load', () => {
  if (!isWebGLAvailable()) {
    console.log(
      "%c Here's a nickel kid, go buy yourself a decent browser",
      'color: #00ff00; font-size: 20px; font-weight: bold; font-family: monospace',
    );
  } else {
    window.fetch('./data.json')
      .then((res) => res.json())
      .then((res) => {
        initialize();
        computeDataSets(res);
        const interval = setInterval(() => {
          if (globe.isReady()) {
            clearInterval(interval);
            setActiveDataSet(0);
          }
        }, 500);
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
      'color: #ff0000; font-size:12px;',
    );
  }
});
