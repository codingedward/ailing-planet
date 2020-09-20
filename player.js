(function() {
  const PLAYBACK_TIME = 1000 * 60 * 5;

  const items = [];
  let slider;
  let playbackFraction = 0;
  let previousAnimationTime;
  let isSliderDragging = false;
  const allowUpdate = true;

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
      if (allowUpdate) {
        slider.noUiSlider.set(time);
      }
    };
    items.push(slider);
    document
      .getElementsByClassName('playback-button-wrapper')[0]
      .addEventListener(
        'click',
        e => {
          e.stopPropagation();
          const target = document.getElementsByClassName('playback-button')[0];
          target.classList.toggle('pause');
          target.classList.toggle('play');
        },
        false,
      );
  }

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    if (isSliderDragging) {
      previousAnimationTime = now;
      return;
    }
    const elapsedTime = now - previousAnimationTime;
    playbackFraction += elapsedTime / PLAYBACK_TIME;
    if (playbackFraction > 1) {
      playbackFraction = 0;
    } else {
      items.forEach(item => {
        item.setTime(playbackFraction);
      });
    }
    previousAnimationTime = now;
  }

  const player = {
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
