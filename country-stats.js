(function() {
  const countryStatsElement = document.getElementsByClassName('country-stats')[0];
  const nameElement = document.getElementsByClassName('country-name')[0];
  const firstCaseElement = document.getElementsByClassName('first-case-stat')[0];
  const daysCountDownElement = document.getElementsByClassName('days-count-down-stat')[0];
  const activeStat = document.getElementsByClassName('active-stat')[0];


  function setActiveCountry(country) {
    console.log(country);
    if (country) {
      countryStatsElement.classList.remove('hidden');
    } else {
      countryStatsElement.classList.add('hidden');
    }
    nameElement.innerText = country.NAME || '';
  }
  

  const countryStats = {
    setActiveCountry,
  }

  window.countryStats = countryStats;
})()
