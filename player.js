(function() {
  const PLAYBACK_TIME = 1000 * 60 * 5;

  let items = [];
  let slider;
  let playbackButton;
  let replayButton;
  let playbackFraction = 0;
  let previousAnimationTime;
  let isSliderDragging = false;
  let isReplayEnabled = false;
  let isAnimationPlaying = true;
  window.isPlaybackFinished = false;
  window.isAnimationPlaying = isAnimationPlaying;
  const shouldAllowUpdate = true;

  function init() {
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
    let pause = "M11,10 L18,13.74 18,22.28 11,26 M18,13.74 L26,18 26,18 18,22.28";
    let play = "M11,10 L17,10 17,26 11,26 M20,10 L26,10 26,26 20,26";
    let animation = document.getElementById('animation');
    [playbackButton] = document.getElementsByClassName('playback-button-wrapper');
    playbackButton
      .addEventListener(
        'click',
        e => {
          e.stopPropagation();
          window.isAnimationPlaying = isAnimationPlaying = !isAnimationPlaying;
          if (isAnimationPlaying) {
            animation.setAttribute("from", pause);
            animation.setAttribute("to", play);
          } else {
            animation.setAttribute("from", play);
            animation.setAttribute("to", pause);
          }
          animation.beginElement();
        },
        false,
      );
    [replayButton] = document.getElementsByClassName('replay-button');
    replayButton
      .addEventListener(
        'click',
        e => {
          e.stopPropagation();
          isReplayEnabled = !isReplayEnabled;
          replayButton.classList.toggle('enabled');
        },
        false,
      );
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
    play: () => {
      init();
      items.forEach(item => {
        if (item !== slider) {
          item.animate()
        }
      });
      animate();
    },
  };

  window.animationPlayer = player;
})();
