import * as d3 from 'd3';

import globe from './globe';
import player from './player';
import debounce from './utils/debounce';

const WORLD_ISO_CODE = 'OWID_WRL';
const k = 4;
const n = window.innerWidth >= 1024 ? 10 : 5;
let width = getChartWidth();
const barSize = 48;
const duration = 250;
const margin = {
  top: 16, right: 6, bottom: 6, left: 0,
};
const height = margin.top + barSize * n + margin.bottom;
const defaultActiveLocation = { name: 'World', isoCode: WORLD_ISO_CODE };

let svg;
let dateSvg;
let countrySvg;
const dataSetKeyFrames = {};
let activeDataSetName = '';
let activeKeyframes;
let currentKeyFrameIndex;
let updateBars;
let updateLabels;
let updateTitleAndDate;
let updateCountryStats;
let activeLocation = defaultActiveLocation;

const formatNumber = d3.format(',d');
const formatDate = d3.utcFormat('%d %B %Y');
let x = d3.scaleLinear([0, 1], [margin.left, width - margin.right]);
const y = d3
  .scaleBand()
  .domain(d3.range(n + 1))
  .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
  .padding(0.1);

function getChartWidth() {
  if (window.innerWidth >= 1024) {
    return 600;
  } if (window.innerWidth >= 800) {
    return 500;
  }
  return 400;
}

function initialize() {
  svg = d3
    .select('.chart')
    .append('svg')
    .attr('preserveAspectRatio', 'none')
    .attr('viewBox', `0 0 ${width} ${height}`);

  dateSvg = d3
    .select('.date')
    .append('svg')
    .attr('width', 300)
    .attr('height', 100);

  countrySvg = d3
    .select('.country-stats')
    .append('svg')
    .attr('width', 400)
    .attr('height', 100);

  window.addEventListener('resize', () => {
    width = getChartWidth();
    x = d3.scaleLinear([0, 1], [margin.left, width - margin.right]);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
  });
}

function loadAnimationData({
  statsData,
  dataSetKey,
  dataSetName,
  locationIsoCodeToNameMap,
}) {
  const rank = (value) => {
    const data = Array.from(locationIsoCodeToNameMap.keys(), (isoCode) => ({
      isoCode,
      value: value(isoCode),
      name: locationIsoCodeToNameMap.get(isoCode),
    }));
    data.sort((a, b) => {
      if (a.isoCode === WORLD_ISO_CODE) {
        return 1;
      }
      if (b.isoCode === WORLD_ISO_CODE) {
        return -1;
      }
      return b.value - a.value;
    });
    for (let i = 0; i < data.length; ++i) {
      if (data[i].isoCode === WORLD_ISO_CODE) {
        data[i].rank = n;
      } else {
        data[i].rank = Math.min(n, i);
      }
    }
    return data;
  };

  const keyframes = [];
  let ka;
  let a;
  let kb;
  let b;
  for ([[ka, a], [kb, b]] of d3.pairs(statsData)) {
    for (let i = 0; i < k; ++i) {
      const t = i / k;
      keyframes.push([
        new Date(ka * (1 - t) + kb * t),
        rank((name) => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t),
      ]);
    }
  }
  keyframes.push([new Date(kb), rank((name) => b.get(name) || 0)]);
  const keyframesStartIndex = keyframes.findIndex(
    (keyframe) => keyframe[1].some(({ value }) => value > 0),
  ) || 0;

  const nameframes = d3.groups(
    keyframes.flatMap(([, data]) => data),
    (d) => d.name,
  );
  const prev = new Map(
    nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a])),
  );
  const next = new Map(nameframes.flatMap(([, data]) => d3.pairs(data)));
  dataSetKeyFrames[dataSetKey] = {
    dataSetName,
    prev,
    next,
    keyframes,
    keyframesStartIndex,
  };
}

const createDebouncedSetFocusOnCountry = (scope) => debounce((_, d) => {
  globe.setFocusOnCountryByIsoCode({
    scope,
    isoCode: d.isoCode,
    shouldFlyToCountry: true,
  });
}, 100, true);

function setActiveDataSet(dataSetKey) {
  const {
    dataSetName,
    prev,
    next,
    keyframes,
    keyframesStartIndex,
  } = dataSetKeyFrames[dataSetKey];

  activeDataSetName = dataSetName;
  activeKeyframes = keyframes;

  function bars(theSvg) {
    let bar = theSvg
      .append('g')
      .attr('fill-opacity', 0.6)
      .selectAll('rect');
    const onClick = createDebouncedSetFocusOnCountry('clicked');
    return ([, data], transition) => {
      if (currentKeyFrameIndex < keyframesStartIndex) {
        bar = bar.attr('display', 'none');
      } else {
        bar = bar
          .attr('display', 'block')
          .data(data.slice(0, n), (d) => d.name)
          .join(
            (enter) => enter
              .append('rect')
              .attr('pointer-events', 'all')
              .attr('cursor', 'pointer')
              .on('click', onClick)
              .attr('fill', '#ff0000')
              .attr('height', y.bandwidth())
              .attr('x', x(0))
              .attr('y', (d) => y((prev.get(d) || d).rank))
              .attr('width', (d) => x((prev.get(d) || d).value) - x(0)),
            (update) => update,
            (exit) => exit
              .transition(transition)
              .remove()
              .attr('y', (d) => y((next.get(d) || d).rank))
              .attr('width', (d) => x((next.get(d) || d).value) - x(0)),
          )
          .call((theBar) => theBar
            .transition(transition)
            .attr('y', (d) => y(d.rank))
            .attr('width', (d) => x(d.value) - x(0)));
      }
      return bar;
    };
  }

  function labels(theSvg) {
    let label = theSvg
      .append('g')
      .attr('text-anchor', 'end')
      .selectAll('text');
    return ([, data], transition) => {
      if (currentKeyFrameIndex < keyframesStartIndex) {
        label = label.attr('display', 'none');
      } else {
        label = label
          .attr('display', 'block')
          .data(data.slice(0, n), (d) => d.name)
          .join(
            (enter) => enter
              .append('text')
              .attr(
                'transform',
                (d) => `translate(${x((prev.get(d) || d).value)},${y(
                  (prev.get(d) || d).rank,
                )})`,
              )
              .attr('y', y.bandwidth() / 2)
              .attr('x', -6)
              .attr('dy', '-0.25em')
              .text((d) => d.name)
              .call((text) => text
                .append('tspan')
                .attr('fill-opacity', 0.7)
                .attr('font-weight', 'normal')
                .attr('x', -6)
                .attr('dy', '1.15em')),
            (update) => update,
            (exit) => exit
              .transition(transition)
              .remove()
              .attr(
                'transform',
                (d) => `translate(${x((next.get(d) || d).value)},${y(
                  (next.get(d) || d).rank,
                )})`,
              )
              .call((g) => g
                .select('tspan')
                .tween('text', (d) => textTween(
                  d.value, (next.get(d) || d).value,
                ))),
          )
          .call((bar) => bar
            .transition(transition)
            .attr('transform', (d) => `translate(${x(d.value)},${y(d.rank)})`)
            .call((g) => g
              .select('tspan')
              .tween('text', (d) => textTween(
                (prev.get(d) || d).value, d.value,
              ))));
      }
      return label;
    };
  }

  function titleAndDate(theSvg) {
    const label = theSvg
      .append('text')
      .attr('fill', '#999999')
      .attr('text-anchor', 'middle')
      .call((text) => text
        .append('tspan')
        .attr('y', 35)
        .attr('x', 150)
        .attr('font-size', '1.45rem')
        .attr('class', 'title')
        .text(`COVID-19 ${activeDataSetName.toUpperCase()}`))
      .call((text) => text
        .append('tspan')
        .attr('y', 65)
        .attr('x', 150)
        .attr('font-size', '1rem')
        .attr('class', 'date')
        .text(formatDate(keyframes[0][0])));
    return ([date]) => {
      label
        .call((text) => text
          .select('.title')
          .text(`COVID-19 ${activeDataSetName.toUpperCase()}`))
        .call((text) => text
          .select('.date')
          .text(formatDate(date)));
    };
  }

  function countryStats(theSvg) {
    let stats = theSvg
      .append('g')
      .style('font', 'bold 12px var(--sans-serif)')
      .style('font-variant-numeric', 'tabular-nums')
      .selectAll('text');
    return ([, data], transition) => {
      stats = stats
        .data(
          data.filter(({ isoCode }) => isoCode === activeLocation.isoCode),
          (d) => d,
        )
        .join(
          (enter) => enter
            .append('text')
            .attr('fill', '#999999')
            .attr('y', 35)
            .attr('x', 0)
            .call((text) => text
              .append('tspan')
              .attr('class', 'countryName')
              .attr('font-size', '1.25rem')
              .text((d) => d.name))
            .call((text) => text
              .append('tspan')
              .attr('class', 'countryStatValue')
              .attr('font-size', '1rem')
              .attr('x', 0)
              .attr('y', 60)),
          (update) => update,
          (exit) => exit
            .transition(transition)
            .remove()
            .call((g) => g.select('.countryName').text((d) => d.name))
            .call((g) => g
              .select('.countryStatValue')
              .tween('text', (d) => textTween(
                d.value,
                (next.get(d) || d).value,
                `${activeDataSetName}: ' '`,
              ))),
        )
        .call((text) => text
          .transition(transition)
          .call((g) => g.select('.countryName').text((d) => d.name))
          .call((g) => g
            .select('.countryStatValue')
            .tween('text', (d) => textTween(
              (prev.get(d) || d).value,
              d.value,
              `${activeDataSetName}: `,
            ))));
      return stats;
    };
  }

  function textTween(a, b, prefix = '') {
    const i = d3.interpolateNumber(a, b);
    return function(t) {
      this.textContent = `${prefix}${formatNumber(i(t))}`;
    };
  }

  svg.selectAll('*').remove();
  dateSvg.selectAll('*').remove();
  countrySvg.selectAll('*').remove();
  updateBars = bars(svg);
  updateLabels = labels(svg);
  updateTitleAndDate = titleAndDate(dateSvg);
  updateCountryStats = countryStats(countrySvg);
}

function setActiveCountry(country) {
  if (country) {
    const { isoCode, name } = country;
    activeLocation = { isoCode, name };
  } else {
    activeLocation = defaultActiveLocation;
  }
  if (
    currentKeyFrameIndex
    && (!player.checkIsAnimationPlaying() || player.checkIsFinished())
  ) {
    const keyframe = activeKeyframes[currentKeyFrameIndex];
    updateCountryStats(keyframe, countrySvg.transition().duration(0));
  }
}

export default {
  initialize,
  loadAnimationData,
  setActiveDataSet,
  setActiveCountry,
  setTime: (time, shouldRender) => {
    const last = activeKeyframes.length - 1;
    const scaledTime = time * last + 1;
    const newIndex = Math.min(Math.floor(scaledTime), last);
    if (!shouldRender && newIndex === currentKeyFrameIndex) {
      return;
    }
    currentKeyFrameIndex = newIndex;
    const keyframe = activeKeyframes[currentKeyFrameIndex];
    const createTransition = (theSvg) => theSvg
      .transition()
      .duration(duration)
      .ease(d3.easeLinear);
    x.domain([0, keyframe[1][0].value]);
    const chartTransition = createTransition(svg);
    updateBars(keyframe, chartTransition);
    updateLabels(keyframe, chartTransition);
    updateTitleAndDate(keyframe);
    const countryStatsTransition = createTransition(countrySvg);
    updateCountryStats(keyframe, countryStatsTransition);
  },
};
