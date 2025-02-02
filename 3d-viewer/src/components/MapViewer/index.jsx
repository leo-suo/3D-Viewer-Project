import { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import Map from 'react-map-gl';
import { Box, Typography } from '@mui/material';

// Mapbox API Key
const MAPBOX_TOKEN = 'pk.eyJ1IjoibGVvc3VvIiwiYSI6ImNtNmJhbzhxMDA2bmkyam84ejh3dngyZWkifQ.GIxeZlnIerRey6wNUQmiCQ';

function MapViewer({ geoData }) {
    const deckRef = useRef(null);
    const mapRef = useRef(null);
    const [mapError, setMapError] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    
    const [viewState, setViewState] = useState({
        longitude: 0,
        latitude: 0,
        zoom: 2,
        pitch: 0,
        bearing: 0
    });

    useEffect(() => {
        if (geoData && geoData.features.length > 0) {
            const coordinates = geoData.features.flatMap(feature => {
                if (feature.geometry.type === "Point") {
                    return [feature.geometry.coordinates];
                }
                if (feature.geometry.type === "LineString") {
                    return feature.geometry.coordinates;
                }
                if (feature.geometry.type === "Polygon") {
                    return feature.geometry.coordinates.flat();
                }
                return [];
            });

            if (coordinates.length > 0) {
                const lons = coordinates.map(coord => coord[0]);
                const lats = coordinates.map(coord => coord[1]);

                const minLon = Math.min(...lons);
                const maxLon = Math.max(...lons);
                const minLat = Math.min(...lats);
                const maxLat = Math.max(...lats);

                setViewState({
                    longitude: (minLon + maxLon) / 2,
                    latitude: (minLat + maxLat) / 2,
                    zoom: Math.max(1, Math.min(15, Math.log2(360 / Math.max(maxLon - minLon, maxLat - minLat)))),
                    pitch: 0,
                    bearing: 0
                });
            }
        }
    }, [geoData]);

    const layers = useMemo(() => {
        if (!geoData || !geoData.features || geoData.features.length === 0) {
            return [];
        }
        return [
            new GeoJsonLayer({
                id: 'geojson-layer',
                data: geoData,
                getFillColor: f => {
                  if (f.geometry.type === "Polygon") return [0, 150, 255, 100]; // Semi-transparent blue
                  return [0, 0, 255, 255]; // Blue for other types
                },
                getLineColor: [255, 0, 0], // Red lines
                lineWidthUnits: 'pixels',  // <--- use pixels instead of meters
                lineWidthScale: 2,         // <--- increase scale
                lineWidthMinPixels: 2,     // <--- minimum number of pixels wide
                getLineWidth: 1,
                getPointRadius: f => (f.geometry.type === "Point" ? 10 : 5),
                opacity: 0.6,
                pickable: true,
                pointRadiusMinPixels: 4,
                pointRadiusMaxPixels: 10,
                onClick: ({ object, x, y }) => {
                    if (object) {
                        // Get coordinates based on geometry type
                        let coordStr = '';
                        if (object.geometry.type === 'Point') {
                            const [lon, lat] = object.geometry.coordinates;
                            coordStr = `[${lon.toFixed(3)}, ${lat.toFixed(3)}]`;
                        } else if (object.geometry.type === 'LineString') {
                            coordStr = object.geometry.coordinates
                                .map(([lon, lat]) => `[${lon.toFixed(3)}, ${lat.toFixed(3)}]`)
                                .join('\n' + ' '.repeat(20) + ' | ');  // Align additional lines with first coordinate
                        } else if (object.geometry.type === 'Polygon') {
                            coordStr = object.geometry.coordinates[0]  // First ring (outer boundary)
                                .map(([lon, lat]) => `[${lon.toFixed(3)}, ${lat.toFixed(3)}]`)
                                .join('\n' + ' '.repeat(20) + ' | ');  // Align additional lines with first coordinate
                        }

                        // Combine geometry info with properties
                        const allProperties = {
                            'Geometry Type': object.geometry.type,
                            'Coordinates': coordStr,
                            ...object.properties
                        };

                        const formattedContent = Object.entries(allProperties)
                            .map(([key, value]) => {
                                const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
                                return `${key.padEnd(20)} | ${valueStr}`;
                            })
                            .join('\n');
                        
                        setTooltip({ tooltip: formattedContent, x, y });
                    } else {
                        setTooltip(null);
                    }
                }
            })
              
        ];
    }, [geoData]);

    return (
        <Box className='map-viewer' sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {mapError && (
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    textAlign: 'center',
                    bgcolor: 'rgba(255,255,255,0.9)',
                    p: 2,
                    borderRadius: 1
                }}>
                    <Typography color="error">
                        Map failed to load. Please check if you have an ad blocker enabled.
                    </Typography>
                </Box>
            )}

            <DeckGL
                className="map-viewer__deck"
                ref={deckRef}
                initialViewState={viewState}
                controller={true}
                layers={layers}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
                style={{ position: 'relative', width: '100%', height: '100%' }}
                getCursor={({isDragging, isHovering}) => {
                    if (isHovering) return 'default'
                    if (isDragging) return 'grabbing'
                    return 'grab'
                }}
            >
                <Map
                    className="map-viewer__mapbox"
                    ref={mapRef}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle="mapbox://styles/mapbox/dark-v9"
                    reuseMaps={true}
                    onError={() => setMapError(true)}
                />
            </DeckGL>

            {tooltip && (
                <div
                    className="map-viewer__tooltip"
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#fff',
                        padding: '5px',
                        borderRadius: '3px',
                        pointerEvents: 'auto'
                    }}
                >
                    <div style={{ 
                        position: 'relative',
                        paddingRight: '20px'
                    }}>
                        <button
                            onClick={() => setTooltip(null)}
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '5px'
                            }}
                        >
                            ×
                        </button>
                        <pre>{tooltip.tooltip}</pre>
                    </div>
                </div>
            )}
        </Box>
    );
}

MapViewer.propTypes = {
    geoData: PropTypes.shape({
        type: PropTypes.string.isRequired,
        features: PropTypes.arrayOf(
            PropTypes.shape({
                type: PropTypes.string.isRequired,
                geometry: PropTypes.shape({
                    type: PropTypes.string.isRequired,
                    coordinates: PropTypes.oneOfType([
                        PropTypes.arrayOf(PropTypes.number), // For Point
                        PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)), // For LineString
                        PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))) // For Polygon
                    ]).isRequired
                }).isRequired,
                properties: PropTypes.object.isRequired
            })
        ).isRequired
    }).isRequired
};

export default MapViewer;
