import * as d3 from 'd3';
import noUiSlider from 'nouislider';

const PLAYBACK_TIME = 1000 * 60 * 5;

let items = [];
let slider;
let playButton;
let playButtonPath;
let replayButton;
let playbackFraction = 0;
let previousAnimationTime;
let isInitialized = false;
let isSliderDragging = false;
let isReplayEnabled = false;
let isFinished = false;
let isAnimationPlaying = false;
const shouldAllowUpdate = true;

function initialize() {
  previousAnimationTime = performance.now();

  [slider] = document.getElementsByClassName('progress');
  noUiSlider.create(slider, {
    range: { min: 0, max: 1 },
    connect: 'lower',
    step: 0.0001,
    start: 0,
    animate: false,
    animationDuration: 100,
  });
  const sliderChange = (values) => {
    playbackFraction = parseFloat(values[0]);
    isFinished = playbackFraction === 1.0;
    items.forEach((item) => {
      if (item !== slider) {
        item.setTime(playbackFraction);
      }
    });
  };
  slider.noUiSlider.on('start', () => {
    isSliderDragging = true;
  });
  slider.noUiSlider.on('end', () => {
    isSliderDragging = false;
  });
  slider.noUiSlider.on('slide', sliderChange);
  slider.setTime = (time) => {
    if (shouldAllowUpdate) {
      slider.noUiSlider.set(time);
    }
  };
  items.push(slider);
  [replayButton] = document.getElementsByClassName('replay-button');
  replayButton.addEventListener(
    'click',
    (e) => {
      e.stopPropagation();
      toggleReplayEnabled();
    },
    false,
  );

  {
    playButton = document.querySelector('.playback-button');
    const useEl = playButton.querySelector('use');
    const iconEl = playButton.querySelector(useEl.getAttribute('xlink:href'));
    const nextState = iconEl.getAttribute('data-next-state');
    const iconPath = iconEl.getAttribute('d');
    playButtonPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    playButtonPath.setAttribute('data-next-state', nextState);
    playButtonPath.setAttribute('d', iconPath);
    const svgEl = playButton.querySelector('svg');
    svgEl.replaceChild(playButtonPath, useEl);
    playButton.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        toggleIsAnimationPlaying();
      },
    );
  }
  const [aboutCard] = document.getElementsByClassName('about-card');
  const [aboutButton] = document.getElementsByClassName('about');
  const [aboutCardClose] = document.getElementsByClassName('about-card-close');
  const [contentElement] = document.getElementsByClassName('content');
  aboutButton.addEventListener(
    'click',
    (e) => {
      e.stopPropagation();
      contentElement.classList.add('blurred');
      aboutCard.classList.remove('hidden');
    },
  );
  aboutCardClose.addEventListener(
    'click',
    (e) => {
      e.stopPropagation();
      contentElement.classList.remove('blurred');
      aboutCard.classList.add('hidden');
    },
  );
}

function toggleIsAnimationPlaying() {
  isAnimationPlaying = !isAnimationPlaying;
  const nextIconEl = playButton.querySelector(
    `[data-state="${playButtonPath.getAttribute('data-next-state')}"]`,
  );
  const iconPath = nextIconEl.getAttribute('d');
  const nextState = nextIconEl.getAttribute('data-next-state');
  d3.select(playButtonPath)
    .attr('data-next-state', nextState)
    .transition()
    .duration(100)
    .attr('d', iconPath);
}

function toggleReplayEnabled() {
  isReplayEnabled = !isReplayEnabled;
  replayButton.classList.toggle('enabled');
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  if (
    isSliderDragging
      || !isAnimationPlaying
      || (playbackFraction === 1.0 && !isReplayEnabled)
  ) {
    previousAnimationTime = now;
    return;
  }
  const elapsedTime = now - previousAnimationTime;
  playbackFraction += elapsedTime / PLAYBACK_TIME;
  playbackFraction = Math.min(playbackFraction, 1.0);
  isFinished = playbackFraction === 1.0;
  if (playbackFraction === 1.0 && isReplayEnabled) {
    playbackFraction = 0;
  } else {
    items.forEach((item) => {
      item.setTime(playbackFraction);
    });
  }
  previousAnimationTime = now;
}

export default {
  initialize: () => {
    items = [];
  },
  addItem: (item) => items.push(item),
  pause: () => {
    if (isAnimationPlaying) {
      toggleIsAnimationPlaying();
    }
  },
  checkIsAnimationPlaying: () => isAnimationPlaying,
  checkIsFinished: () => isFinished,
  play: () => {
    if (!isInitialized) {
      isInitialized = true;
      initialize();
      animate();
    }
    if (!isAnimationPlaying) {
      toggleIsAnimationPlaying();
    }
    items.forEach((item) => {
      item.setTime(playbackFraction, true);
    });
  },
};
