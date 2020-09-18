(function() {
  /*
  if (!window.isWebGLAvailable()) {
    return;
  }
  */
  const WORLD_KEY = 'OWID_WRL';
  const range = n => [...Array(n).keys()];
  fetch('./data/data.json', { method: 'GET' })
    .then(res => res.json())
    .then(res => {
      const { data, locations, meta } = res;
      const { cases_index } = meta;
      const sortedDates = Object.keys(data).sort(
        (a, b) => new Date(a) - new Date(b),
      );
      const chartData = sortedDates.reduce(
        (acc, cur) => [
          ...acc,
          [
            moment(cur)
              .utc()
              .format('YYYY-MM-DD'),
            new Map(
              Object.keys(locations)
                .map(countryIsoCode => [
                  locations[countryIsoCode].name,
                  data[cur][countryIsoCode]?.[cases_index] || 0,
                ]),
            ),
          ],
        ],
        [],
      );
      const globeData = sortedDates.map(cur => {
        const max = Object.keys(locations)
          .filter(key => key !== WORLD_KEY)
          .reduce(
            (maxValue, countryIsoCode) =>
              Math.max(maxValue, data[cur][countryIsoCode]?.[cases_index] || 0),
            0,
          );
        return Object.keys(locations)
          .sort()
          .filter(key => key !== WORLD_KEY)
          .map(countryIsoCode => [
            locations[countryIsoCode].lat,
            locations[countryIsoCode].lng,
            (data[cur][countryIsoCode]?.[cases_index] || 0) / max,
          ])
          .reduce((flatArr, arr) => [...flatArr, ...arr], []);
      });
      const countryNames = Object.keys(locations)
        .filter(key => key !== WORLD_KEY)
        .map(key => locations[key].name);

      globe.initialize();
      globe.loadAnimationData(globeData);
      globe.run();

      raceChart.initialize();
      raceChart.loadAnimationData(countryNames, chartData);
      raceChart.run();

      animationPlayer.addItem(globe);
      animationPlayer.addItem(raceChart);
      animationPlayer.play(globeData.length);

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
