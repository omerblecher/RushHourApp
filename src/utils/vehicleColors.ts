export interface VehicleColor {
  bg: string;
  border: string;
  shadow: string;
}

const colorMap: Record<string, VehicleColor> = {
  X: { bg: '#e53935', border: '#b71c1c', shadow: 'rgba(229,57,53,0.5)' },
  A: { bg: '#1e88e5', border: '#1565c0', shadow: 'rgba(30,136,229,0.4)' },
  B: { bg: '#43a047', border: '#2e7d32', shadow: 'rgba(67,160,71,0.4)' },
  C: { bg: '#fdd835', border: '#f9a825', shadow: 'rgba(253,216,53,0.4)' },
  D: { bg: '#8e24aa', border: '#6a1b9a', shadow: 'rgba(142,36,170,0.4)' },
  E: { bg: '#fb8c00', border: '#e65100', shadow: 'rgba(251,140,0,0.4)' },
  F: { bg: '#00897b', border: '#00695c', shadow: 'rgba(0,137,123,0.4)' },
  G: { bg: '#d81b60', border: '#ad1457', shadow: 'rgba(216,27,96,0.4)' },
  H: { bg: '#3949ab', border: '#283593', shadow: 'rgba(57,73,171,0.4)' },
  I: { bg: '#7cb342', border: '#558b2f', shadow: 'rgba(124,179,66,0.4)' },
  J: { bg: '#00acc1', border: '#00838f', shadow: 'rgba(0,172,193,0.4)' },
  K: { bg: '#6d4c41', border: '#4e342e', shadow: 'rgba(109,76,65,0.4)' },
  L: { bg: '#ffb300', border: '#ff8f00', shadow: 'rgba(255,179,0,0.4)' },
  M: { bg: '#546e7a', border: '#37474f', shadow: 'rgba(84,110,122,0.4)' },
  N: { bg: '#e040fb', border: '#aa00ff', shadow: 'rgba(224,64,251,0.4)' },
  O: { bg: '#26a69a', border: '#00796b', shadow: 'rgba(38,166,154,0.4)' },
  P: { bg: '#ef5350', border: '#c62828', shadow: 'rgba(239,83,80,0.4)' },
  Q: { bg: '#5c6bc0', border: '#3949ab', shadow: 'rgba(92,107,192,0.4)' },
  R: { bg: '#26c6da', border: '#0097a7', shadow: 'rgba(38,198,218,0.4)' },
};

const fallback: VehicleColor = {
  bg: '#90a4ae',
  border: '#607d8b',
  shadow: 'rgba(144,164,174,0.4)',
};

export function getVehicleColor(id: string): VehicleColor {
  return colorMap[id] ?? fallback;
}
