import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import Map from 'react-map-gl';
import { Box, Typography } from '@mui/material';

// You'll need to get a Mapbox token from https://www.mapbox.com/
const MAPBOX_TOKEN = 'pk.eyJ1IjoibGVvc3VvIiwiYSI6ImNtNmJhbzhxMDA2bmkyam84ejh3dngyZWkifQ.GIxeZlnIerRey6wNUQmiCQ';

function MapViewer({ geoData }) {
    const deckRef = useRef(null);
    const mapRef = useRef(null);
    const [mapError, setMapError] = useState(false);
    
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

    // Only show data if it's GeoJSON
    const isValidFileType = geoData?.length > 0;
    const layers = [
        new ScatterplotLayer({
            id: 'scatter-plot',
            data: isValidFileType ? geoData : [],
            getPosition: d => d.coordinates,
            getFillColor: [255, 0, 0],
            getRadius: 5,
            opacity: 0.3,
            pickable: true,
            radiusMinPixels: 3,
            radiusMaxPixels: 30
        })
    ];

    return (
        <Box sx={{ 
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
                    ref={mapRef}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    mapStyle="mapbox://styles/mapbox/dark-v9"
                    reuseMaps={true}
                    onError={() => setMapError(true)}
                />
            </DeckGL>
        </Box>
    );
}

MapViewer.propTypes = {
    geoData: PropTypes.arrayOf(PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired
    })),
    fileType: PropTypes.string
};

export default MapViewer; 