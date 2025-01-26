import { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import Map from 'react-map-gl';
import { Box, Typography } from '@mui/material';

// You'll need to get a Mapbox token from https://www.mapbox.com/
const MAPBOX_TOKEN = 'pk.eyJ1IjoibGVvc3VvIiwiYSI6ImNtNmJhbzhxMDA2bmkyam84ejh3dngyZWkifQ.GIxeZlnIerRey6wNUQmiCQ';

function MapViewer({ geoData }) {
    const deckRef = useRef(null);
    const mapRef = useRef(null);
    const [mapError, setMapError] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    
    const [viewState, setViewState] = useState({
        longitude: -122.41669,
        latitude: 37.7853,
        zoom: 13,
        pitch: 0,
        bearing: 0
    });

    useEffect(() => {
        // Cleanup function
        return () => {
            // Cleanup DeckGL
            if (deckRef.current?.deck) {
                deckRef.current.deck.finalize();
            }
            
            // Cleanup Mapbox
            if (mapRef.current) {
                const map = mapRef.current.getMap();
                if (map) {
                    map.remove();
                }
            }
        };
    }, []);

    useEffect(() => {
        console.log(geoData);
        if (geoData && geoData.features.length > 0) {
            const coordinates = geoData.features.map(f => f.geometry.coordinates);
            const lons = coordinates.map(coord => coord[0]);
            const lats = coordinates.map(coord => coord[1]);
    
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
    
            setViewState(prevState => {
                if (prevState.longitude !== (minLon + maxLon) / 2 || prevState.latitude !== (minLat + maxLat) / 2) {
                    return {
                        longitude: (minLon + maxLon) / 2,
                        latitude: (minLat + maxLat) / 2,
                        zoom: Math.max(
                            1,
                            Math.min(
                                15,
                                Math.log2(360 / Math.max(maxLon - minLon, maxLat - minLat))
                            )
                        ),
                        pitch: 0,
                        bearing: 0
                    };
                }
                return prevState;
            });
        }
    }, [geoData]);

    const layers = useMemo(() => {
        if (!geoData || !geoData.features || geoData.features.length === 0) {
            return [];
        }
        return [
            new GeoJsonLayer({
                id: 'scatter-plot',
                data: geoData,
                getFillColor: [255, 0, 0],
                getPointRadius: 10,
                opacity: 0.3,
                pickable: true,
                pointRadiusMinPixels: 4,
                pointRadiusMaxPixels: 4,
                onHover: ({ object, x, y }) => {
                    const tooltipContent = object ? `${object.properties.LANDMARK}, ${object.properties.CATEGORY}` : null;
                    setTooltip(tooltipContent ? { tooltip: tooltipContent, x, y } : '');
                }
            })
        ];
    }, [geoData]);

    return (
        <Box className='map-viewer' sx={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%',
            '& .mapboxgl-map': {
                position: 'absolute !important'
            }
        }}>
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
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%'
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
                        left: tooltip.x,
                        top: tooltip.y,
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#fff',
                        padding: '5px',
                        borderRadius: '3px',
                        pointerEvents: 'none'
                    }}
                >
                    {tooltip.tooltip}
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
                    coordinates: PropTypes.arrayOf(PropTypes.number).isRequired
                }).isRequired,
                properties: PropTypes.shape({
                    LANDMARK: PropTypes.string,
                    CATEGORY: PropTypes.string,
                    MUNICIPALITY: PropTypes.string
                }).isRequired
            })
        ).isRequired
    })
};

export default MapViewer; 