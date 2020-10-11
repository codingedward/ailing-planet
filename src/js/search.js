import globe from './globe';
import countries from './countries';

let isSearchShown = false;
let currentSearchFirstCountryIsoCode = null;
const [searchElement] = document.getElementsByClassName('search');
const [contentElement] = document.getElementsByClassName('content');
const [searchInput] = document.getElementsByClassName('search-input');
const [searchButton] = document.getElementsByClassName('search-button');
const [closeSearchButton] = document.getElementsByClassName('search-close');
const [searchList] = document.getElementsByClassName('search-suggestions-list');

const countryNameToIsoCodeMap = new Map(
  countries.features.reduce(
    (allCountries, country) => [
      ...allCountries,
      [country.properties.name, country.properties.isoCode],
    ], [],
  ),
);
const countryNames = Array.from(countryNameToIsoCodeMap.keys()).sort();

function setFocusOnCountry(isoCode) {
  globe.setFocusOnCountryByIsoCode({
    isoCode,
    scope: 'clicked',
    shouldFlyToCountry: true,
  });
}

function createCountryListItem(countryName) {
  return `
    <li 
      class="search-suggestions-list-item" 
      data-value=${countryNameToIsoCodeMap.get(countryName)}
    >
      ${countryName}
    </li>
  `;
}

function toggleIsSearchShown() {
  isSearchShown = !isSearchShown;
  if (isSearchShown) {
    contentElement.classList.add('blurred');
    searchElement.classList.remove('hidden');
    searchInput.focus();
    searchInput.select();
  } else {
    contentElement.classList.remove('blurred');
    searchElement.classList.add('hidden');
  }
}

function initialize() {
  searchList.innerHTML = countryNames.map(createCountryListItem).join('');
  searchInput.addEventListener(
    'input',
    (e) => {
      const value = e.target.value.trim().toLowerCase();
      if (!value) {
        currentSearchFirstCountryIsoCode = null;
        return;
      }
      const matches = countryNames
        .filter(
          (name) => name.toLowerCase().indexOf(value) !== -1,
        )
        .sort((a, b) => {
          /*
           * Move names starting with term to the top otherwise sort
           * alphabetically...
           */
          const aStartsWithTerm = a.toLowerCase().startsWith(value);
          const bStartsWithTerm = b.toLowerCase().startsWith(value);
          if (aStartsWithTerm && !bStartsWithTerm) {
            return -1;
          }
          if (!aStartsWithTerm && bStartsWithTerm) {
            return 1;
          }
          const aHasWordStartingWithTerm = a.split(' ').some((word) => word.toLowerCase().startsWith(value));
          const bHasWordStartingWithTerm = b.split(' ').some((word) => word.toLowerCase().startsWith(value));
          if (aHasWordStartingWithTerm && !bHasWordStartingWithTerm) {
            return -1;
          }
          if (!aHasWordStartingWithTerm && bHasWordStartingWithTerm) {
            return 1;
          }
          return a > b;
        });
      currentSearchFirstCountryIsoCode = matches.length > 0
        ? countryNameToIsoCodeMap.get(matches[0])
        : null;
      searchList.innerHTML = matches
        .map(createCountryListItem)
        .join('');
      Array.from(document.getElementsByClassName('search-suggestions-list-item'))
        .forEach(
          (el) => {
            el.addEventListener(
              'click',
              (elEvt) => {
                const isoCode = elEvt.target.getAttribute('data-value');
                if (isoCode) {
                  toggleIsSearchShown();
                  setFocusOnCountry(isoCode);
                }
              },
            );
          },
        );
    },
  );
  searchButton.addEventListener(
    'click',
    () => {
      if (!isSearchShown) {
        toggleIsSearchShown();
      }
    },
  );
  closeSearchButton.addEventListener(
    'click',
    () => {
      if (isSearchShown) {
        toggleIsSearchShown();
      }
    },
  );
  document.addEventListener(
    'keydown',
    (e) => {
      switch (e.keyCode) {
        case 27: /* escape */
          if (isSearchShown) {
            toggleIsSearchShown();
            e.preventDefault();
          }
          break;
        case 13: /* enter */
          if (isSearchShown && currentSearchFirstCountryIsoCode) {
            toggleIsSearchShown();
            setFocusOnCountry(currentSearchFirstCountryIsoCode);
          }
          break;
        case 114: /* F3 */
        case 70: /* Ctrl+F */
          e.preventDefault();
          if (!isSearchShown) {
            toggleIsSearchShown();
          }
          break;
        default:
          break;
      }
    },
  );
}

export default {
  initialize,
};
