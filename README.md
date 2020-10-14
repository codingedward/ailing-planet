# Ailing Planet

![](https://github.com/codingedward/ailing-planet/blob/master/screenshot.png)

The goal of this project is to provide an interactive timelapse of the COVID-19
pandemic as it has occurred. 

At every point in the time of the visualisation, the red bars represent the impact
of the virus on countries relative to the most impacted country.

You can view it [here](http://covid-live.com).



### Credits

This project would not have been possible without:
*   [Our World In Data](https://ourworldindata.org/) (OWID) which has a [project](https://ourworldindata.org/coronavirus) to collect, clean and make public COVID-19 data. All the data used for this visualisation is sourced from OWID.
*   [Experiments with Google](https://experiments.withgoogle.com/chrome/globe) for inspiration and providing the base code for the globe used on this project.
*   [ObservableHQ](https://observablehq.com/@d3/bar-chart-race-explained)'s resource on creating a data race chart.

### Attributions

*   Kawaii Coffee icon by [Icons8](https://icons8.com/icon/120078/kawaii-coffee).
*   Ulukai's Space Skyboxes by [Calinou](https://opengameart.org/content/ulukais-space-skyboxes).

### Running Locally

To run this locally, 

1. First clone this repo
```
$ git clone https://codingedward/ailing-planet.git
```

2. Install the dependancies:
```
$ npm install
```

3. To start a local server, and for hot module reloading, you can run:
```
$ npm run watch
```

4. Once you have built everything and you are ready to make a production build, run:
```
$ npm run production
```

### Deployment

This app is currently being deployed to GitHub Pages and deployment is easily done by running:
```
$ ./deploy.sh
```
after having made a production build. For now, only the repo owners can run this command.


### Contributions

Any contribution is most welcome. Some key key areas that may currently need refining:

1. Browser compatibility - this is only currently tested on Chrome, Firefox and Safari. If you identify any browser incompatibility issues, feel free to raise a PR.
2. Performance - while it is somewhat expected that the visualisation is CPU and GPU intensive, if you can identify any places we can improve performance, that would be awesome!
3. Any other issue really! Feel free to raise a PR to improve the code, UI/UX, etc.


### Developer

Built with <3 by [Edward Njoroge](https://github.com/codingedward) ([@codingedward](https://twitter.com/codingedward)). 

If you'd like to appreciate this work, you can:

[![](https://img.icons8.com/ios/38/ff0000/kawaii-coffee.png) Buy me a Coffee](https://www.buymeacoffee.com/codingedward)
