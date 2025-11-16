'use client';

import { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { useVisaFinder } from '@/store/useVisaFinder';
import type { VisaType } from '@/types/visa';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO 3166-1 alpha-3 to alpha-2 mapping for common countries
const alpha3ToAlpha2: Record<string, string> = {
  AFG: 'AF', ALB: 'AL', DZA: 'DZ', AND: 'AD', AGO: 'AO',
  ARG: 'AR', ARM: 'AM', AUS: 'AU', AUT: 'AT', AZE: 'AZ',
  BHS: 'BS', BHR: 'BH', BGD: 'BD', BRB: 'BB', BLR: 'BY',
  BEL: 'BE', BLZ: 'BZ', BEN: 'BJ', BTN: 'BT', BOL: 'BO',
  BIH: 'BA', BWA: 'BW', BRA: 'BR', BRN: 'BN', BGR: 'BG',
  BFA: 'BF', BDI: 'BI', KHM: 'KH', CMR: 'CM', CAN: 'CA',
  CPV: 'CV', CAF: 'CF', TCD: 'TD', CHL: 'CL', CHN: 'CN',
  COL: 'CO', COM: 'KM', COG: 'CG', COD: 'CD', CRI: 'CR',
  CIV: 'CI', HRV: 'HR', CUB: 'CU', CYP: 'CY', CZE: 'CZ',
  DNK: 'DK', DJI: 'DJ', DMA: 'DM', DOM: 'DO', ECU: 'EC',
  EGY: 'EG', SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE',
  SWZ: 'SZ', ETH: 'ET', FJI: 'FJ', FIN: 'FI', FRA: 'FR',
  GAB: 'GA', GMB: 'GM', GEO: 'GE', DEU: 'DE', GHA: 'GH',
  GRC: 'GR', GRD: 'GD', GTM: 'GT', GIN: 'GN', GNB: 'GW',
  GUY: 'GY', HTI: 'HT', HND: 'HN', HUN: 'HU', ISL: 'IS',
  IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', IRL: 'IE',
  ISR: 'IL', ITA: 'IT', JAM: 'JM', JPN: 'JP', JOR: 'JO',
  KAZ: 'KZ', KEN: 'KE', KIR: 'KI', PRK: 'KP', KOR: 'KR',
  KWT: 'KW', KGZ: 'KG', LAO: 'LA', LVA: 'LV', LBN: 'LB',
  LSO: 'LS', LBR: 'LR', LBY: 'LY', LIE: 'LI', LTU: 'LT',
  LUX: 'LU', MDG: 'MG', MWI: 'MW', MYS: 'MY', MDV: 'MV',
  MLI: 'ML', MLT: 'MT', MHL: 'MH', MRT: 'MR', MUS: 'MU',
  MEX: 'MX', FSM: 'FM', MDA: 'MD', MCO: 'MC', MNG: 'MN',
  MNE: 'ME', MAR: 'MA', MOZ: 'MZ', MMR: 'MM', NAM: 'NA',
  NRU: 'NR', NPL: 'NP', NLD: 'NL', NZL: 'NZ', NIC: 'NI',
  NER: 'NE', NGA: 'NG', MKD: 'MK', NOR: 'NO', OMN: 'OM',
  PAK: 'PK', PLW: 'PW', PSE: 'PS', PAN: 'PA', PNG: 'PG',
  PRY: 'PY', PER: 'PE', PHL: 'PH', POL: 'PL', PRT: 'PT',
  QAT: 'QA', ROU: 'RO', RUS: 'RU', RWA: 'RW', KNA: 'KN',
  LCA: 'LC', VCT: 'VC', WSM: 'WS', SMR: 'SM', STP: 'ST',
  SAU: 'SA', SEN: 'SN', SRB: 'RS', SYC: 'SC', SLE: 'SL',
  SGP: 'SG', SVK: 'SK', SVN: 'SI', SLB: 'SB', SOM: 'SO',
  ZAF: 'ZA', SSD: 'SS', ESP: 'ES', LKA: 'LK', SDN: 'SD',
  SUR: 'SR', SWE: 'SE', CHE: 'CH', SYR: 'SY', TWN: 'TW',
  TJK: 'TJ', TZA: 'TZ', THA: 'TH', TLS: 'TL', TGO: 'TG',
  TON: 'TO', TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM',
  TUV: 'TV', UGA: 'UG', UKR: 'UA', ARE: 'AE', GBR: 'GB',
  USA: 'US', URY: 'UY', UZB: 'UZ', VUT: 'VU', VAT: 'VA',
  VEN: 'VE', VNM: 'VN', YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW',
};

// Color scheme for visa types
const visaColors: Record<VisaType | 'default', string> = {
  'visa-free': '#10b981', // Green
  'e-visa': '#3b82f6', // Blue
  'visa-on-arrival': '#f59e0b', // Amber
  'visa-required': '#ef4444', // Red
  'default': '#e5e7eb', // Gray
};

export default function VisaAccessMap() {
  const { destinations, getStatistics } = useVisaFinder();
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const stats = getStatistics();

  // Create a map of country codes to visa types
  const countryVisaMap = useMemo(() => {
    const map: Record<string, VisaType> = {};
    destinations.forEach((dest) => {
      map[dest.destinationCountry.code] = dest.visaType;
    });
    return map;
  }, [destinations]);

  const getCountryColor = (countryCode: string): string => {
    const visaType = countryVisaMap[countryCode];
    return visaType ? visaColors[visaType] : visaColors.default;
  };

  const handleMouseEnter = (geo: any, event: React.MouseEvent) => {
    const alpha3 = geo.id;
    const alpha2 = alpha3ToAlpha2[alpha3];

    if (alpha2 && countryVisaMap[alpha2]) {
      const destination = destinations.find(d => d.destinationCountry.code === alpha2);
      if (destination) {
        setTooltipContent(
          `${destination.destinationCountry.flag} ${destination.destinationCountry.name}\n${destination.visaType.replace('-', ' ').toUpperCase()} • ${destination.duration}`
        );
        setTooltipPosition({ x: event.clientX, y: event.clientY });
      }
    } else {
      setTooltipContent(geo.properties.name || '');
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseLeave = () => {
    setTooltipContent('');
  };

  if (destinations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Your Travel Access Map
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Interactive map showing visa requirements for {stats.total} destinations
        </p>
      </div>

      {/* Map */}
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 147,
          }}
          className="w-full h-[400px] md:h-[500px]"
        >
          <ZoomableGroup>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const alpha3 = geo.id;
                  const alpha2 = alpha3ToAlpha2[alpha3];
                  const fillColor = alpha2 ? getCountryColor(alpha2) : visaColors.default;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillColor}
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      onMouseEnter={(event) => handleMouseEnter(geo, event)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: alpha2 && countryVisaMap[alpha2] ? fillColor : '#9ca3af',
                          outline: 'none',
                          opacity: 0.8,
                        },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltipContent && (
          <div
            className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg pointer-events-none whitespace-pre-line"
            style={{
              left: `${tooltipPosition.x + 10}px`,
              top: `${tooltipPosition.y + 10}px`,
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: visaColors['visa-free'] }} />
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-white">Visa-Free</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{stats.visaFree} countries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: visaColors['e-visa'] }} />
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-white">E-Visa</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{stats.eVisa} countries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: visaColors['visa-on-arrival'] }} />
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-white">Visa on Arrival</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{stats.visaOnArrival} countries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: visaColors['visa-required'] }} />
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-white">Visa Required</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{stats.visaRequired} countries</p>
          </div>
        </div>
      </div>
    </div>
  );
}
