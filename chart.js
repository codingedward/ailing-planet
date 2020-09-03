// borrowed from: https://observablehq.com/@d3/bar-chart-race-explained
(function() {
  const k = 6;
  const n = 10;
  const width = 300;
  const duration = 250;
  const barSize = 48;
  const color = '#ff0000';
  const margin = { top: 16, right: 6, bottom: 6, left: 0 };
  const height = margin.top + barSize * n + margin.bottom;

  let xAxis;
  let svg;
  let d3Data;
  let d3Names;
  let keyframes;
  let updateBars;
  let updateLabels;

  function runChart() {
    const formatNumber = d3.format(',d');

    const x = d3.scaleLinear([0, 1], [margin.left, width - margin.right]);
    xAxis = x;
    const y = d3
      .scaleBand()
      .domain(d3.range(n + 1))
      .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
      .padding(0.1);

    svg = d3
      .select('.chart')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const rank = value => {
      const data = Array.from(d3Names, name => ({
        name,
        value: value(name),
      }));
      data.sort((a, b) => d3.descending(a.value, b.value));
      for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i);
      return data;
    };

    keyframes = [];
    let ka;
    let a;
    let kb;
    let b;
    for ([[ka, a], [kb, b]] of d3.pairs(d3Data)) {
      for (let i = 0; i < k; ++i) {
        const t = i / k;
        keyframes.push([
          new Date(ka * (1 - t) + kb * t),
          rank(name => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t),
        ]);
      }
    }
    keyframes.push([new Date(kb), rank(name => b.get(name) || 0)]);
    const nameframes = d3.groups(
      keyframes.flatMap(([, data]) => data),
      d => d.name,
    );
    const prev = new Map(
      nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a])),
    );
    const next = new Map(nameframes.flatMap(([, data]) => d3.pairs(data)));

    function bars(svg) {
      let bar = svg
        .append('g')
        .attr('fill-opacity', 0.6)
        .selectAll('rect');
      return ([, data], transition) =>
        (bar = bar
          .data(data.slice(0, n), d => d.name)
          .join(
            enter =>
              enter
                .append('rect')
                .attr('fill', color)
                .attr('height', y.bandwidth())
                .attr('x', x(0))
                .attr('y', d => y((prev.get(d) || d).rank))
                .attr('width', d => x((prev.get(d) || d).value) - x(0)),
            update => update,
            exit =>
              exit
                .transition(transition)
                .remove()
                .attr('y', d => y((next.get(d) || d).rank))
                .attr('width', d => x((next.get(d) || d).value) - x(0)),
          )
          .call(bar =>
            bar
              .transition(transition)
              .attr('y', d => y(d.rank))
              .attr('width', d => x(d.value) - x(0)),
          ));
    }

    function labels(svg) {
      let label = svg
        .append('g')
        .style('font', 'bold 12px var(--sans-serif)')
        .style('font-variant-numeric', 'tabular-nums')
        .attr('text-anchor', 'end')
        .selectAll('text');
      return ([, data], transition) =>
        (label = label
          .data(data.slice(0, n), d => d.name)
          .join(
            enter =>
              enter
                .append('text')
                .attr(
                  'transform',
                  d =>
                    `translate(${x((prev.get(d) || d).value)},${y(
                      (prev.get(d) || d).rank,
                    )})`,
                )
                .attr('y', y.bandwidth() / 2)
                .attr('x', -6)
                .attr('dy', '-0.25em')
                .text(d => d.name)
                .call(text =>
                  text
                    .append('tspan')
                    .attr('fill-opacity', 0.7)
                    .attr('font-weight', 'normal')
                    .attr('x', -6)
                    .attr('dy', '1.15em'),
                ),
            update => update,
            exit =>
              exit
                .transition(transition)
                .remove()
                .attr(
                  'transform',
                  d =>
                    `translate(${x((next.get(d) || d).value)},${y(
                      (next.get(d) || d).rank,
                    )})`,
                )
                .call(g =>
                  g
                    .select('tspan')
                    .tween('text', d =>
                      textTween(d.value, (next.get(d) || d).value),
                    ),
                ),
          )
          .call(bar =>
            bar
              .transition(transition)
              .attr('transform', d => `translate(${x(d.value)},${y(d.rank)})`)
              .call(g =>
                g
                  .select('tspan')
                  .tween('text', d =>
                    textTween((prev.get(d) || d).value, d.value),
                  ),
              ),
          ));
    }

    function textTween(a, b) {
      /*
      return function() {
        this.textContent = formatNumber(b);
      }
      */
      const i = d3.interpolateNumber(a, b);
      return function(t) {
        this.textContent = formatNumber(i(t));
      };
    }

    updateBars = bars(svg);
    updateLabels = labels(svg);
  }

  const chart = {
    initialize: () => {},
    loadAnimationData: (names, data) => {
      d3Names = names;
      d3Data = data;
    },
    run: () => {
      runChart();
    },
    setTime: time => {
      const last = keyframes.length - 1;
      const scaledTime = time * last + 1;
      const index = Math.min(Math.floor(scaledTime), last);
      const keyframe = keyframes[index];
      const transition = svg
        .transition()
        .duration(duration)
        .ease(d3.easeLinear);
      xAxis.domain([0, keyframe[1][0].value]);
      updateBars(keyframe, transition);
      updateLabels(keyframe, transition);
    }
  };

  window.raceChart = chart;
})();
