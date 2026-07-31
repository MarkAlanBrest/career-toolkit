const GEOCODE_URL = 'https://nominatim.openstreetmap.org/search';

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

function resolveStateName(state: string) {
  const code = state.trim().toUpperCase();
  return US_STATE_NAMES[code] || state.trim();
}

export function buildGeocodeUrl(query: string) {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'us',
  });

  const zipMatch = query.trim().match(/^\d{5}(-\d{4})?$/);
  const cityStateMatch = query.match(/^(.+?),\s*([A-Za-z .]{2,})$/);

  if (zipMatch) {
    params.set('postalcode', zipMatch[0].slice(0, 5));
  } else if (cityStateMatch) {
    params.set('city', cityStateMatch[1].trim());
    params.set('state', resolveStateName(cityStateMatch[2]));
  } else {
    params.set('q', query);
  }

  return `${GEOCODE_URL}?${params.toString()}`;
}
