(function() {
  const countryStatsElement = document.getElementsByClassName('country-stats')[0];
  const nameElement = document.getElementsByClassName('country-name')[0];
  const firstCaseElement = document.getElementsByClassName('first-case-stat')[0];
  const daysCountDownElement = document.getElementsByClassName('days-count-down-stat')[0];
  const activeStat = document.getElementsByClassName('active-stat')[0];


  function setActiveCountry(country) {
    if (country) {
      countryStatsElement.classList.remove('hidden');
      nameElement.innerText = country.NAME || '';
    } else {
      nameElement.innerText = 'World';
      //countryStatsElement.classList.add('hidden');
    }
  }
  

  const countryStats = {
    setActiveCountry,
  }

  window.countryStats = countryStats;
})()
