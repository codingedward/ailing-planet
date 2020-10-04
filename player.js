(function() {
  const PLAYBACK_TIME = 1000 * 60 * 5;

  let items = [];
  let slider;
  let playbackButton;
  let replayButton;
  let pausePlayAnimation;
  let playbackFraction = 0;
  let previousAnimationTime;
  let isInitialized = false;
  let isSliderDragging = false;
  let isReplayEnabled = false;
  let isAnimationPlaying = false;
  window.isPlaybackFinished = false;
  window.isAnimationPlaying = isAnimationPlaying;
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
    const sliderChange = values => {
      playbackFraction = parseFloat(values[0]);
      window.isPlaybackFinished = playbackFraction === 1.0;
      items.forEach(item => {
        if (item !== slider) {
          item.setTime(playbackFraction);
        }
      });
    };
    slider.noUiSlider.on('start', () => (isSliderDragging = true));
    slider.noUiSlider.on('end', () => (isSliderDragging = false));
    slider.noUiSlider.on('slide', sliderChange);
    slider.setTime = time => {
      if (shouldAllowUpdate) {
        slider.noUiSlider.set(time);
      }
    };
    items.push(slider);
    pausePlayAnimation = document.getElementById('animation');
    [playbackButton] = document.getElementsByClassName(
      'playback-button-wrapper',
    );
    playbackButton.addEventListener(
      'click',
      e => {
        e.stopPropagation();
        toggleIsAnimationPlaying();
      },
      false,
    );
    [replayButton] = document.getElementsByClassName('replay-button');
    replayButton.addEventListener(
      'click',
      e => {
        e.stopPropagation();
        toggleReplayEnabled();
      },
      false,
    );
    const [aboutCard] = document.getElementsByClassName('about-card');
    const [aboutButton] = document.getElementsByClassName('about');
    const [aboutCardClose] = document.getElementsByClassName('about-card-close');
    const [contentElement] = document.getElementsByClassName('content');
    aboutButton.addEventListener(
    'click',
      e => {
        e.stopPropagation();
        contentElement.classList.add('blurred');
        aboutCard.classList.remove('hidden');
      }
    );
    aboutCardClose.addEventListener(
      'click',
      e => {
        e.stopPropagation();
        contentElement.classList.remove('blurred');
        aboutCard.classList.add('hidden');
      }
    )
  }

  function toggleIsAnimationPlaying() {
    const pause =
      'M11,10 L18,13.74 18,22.28 11,26 M18,13.74 L26,18 26,18 18,22.28';
    const play = 'M11,10 L17,10 17,26 11,26 M20,10 L26,10 26,26 20,26';
    window.isAnimationPlaying = isAnimationPlaying = !isAnimationPlaying;
    if (isAnimationPlaying) {
      pausePlayAnimation.setAttribute('from', pause);
      pausePlayAnimation.setAttribute('to', play);
    } else {
      pausePlayAnimation.setAttribute('from', play);
      pausePlayAnimation.setAttribute('to', pause);
    }
    pausePlayAnimation.beginElement();
  }

  function toggleReplayEnabled() {
    isReplayEnabled = !isReplayEnabled;
    replayButton.classList.toggle('enabled');
  }

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    if (
      isSliderDragging ||
      !isAnimationPlaying ||
      (playbackFraction === 1.0 && !isReplayEnabled)
    ) {
      previousAnimationTime = now;
      return;
    }
    const elapsedTime = now - previousAnimationTime;
    playbackFraction += elapsedTime / PLAYBACK_TIME;
    playbackFraction = Math.min(playbackFraction, 1.0);
    window.isPlaybackFinished = playbackFraction === 1.0;
    if (playbackFraction === 1.0 && isReplayEnabled) {
      playbackFraction = 0;
    } else {
      items.forEach(item => {
        item.setTime(playbackFraction);
      });
    }
    previousAnimationTime = now;
  }

  const player = {
    initialize: () => {
      items = [];
    },
    addItem: item => items.push(item),
    pause: () => {
      if (isAnimationPlaying) {
        toggleIsAnimationPlaying();
      }
    },
    play: () => {
      if (!isInitialized) {
        isInitialized = true;
        initialize();
        animate();
      }
      if (!isAnimationPlaying) {
        toggleIsAnimationPlaying();
      }
      items.forEach(item => {
        item.setTime(playbackFraction);
      });
    },
  };

  window.animationPlayer = player;
})();
