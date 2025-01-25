import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, FormControlLabel, Switch } from '@mui/material';
import FileUploader from '../FileUploader';
import ThreeDViewer from '../ThreeDViewer';
import MapViewer from '../MapViewer';
import FileInfo from '../FileInfo';
import ActivityLogs from '../ActivityLogs';
import './styles.css';

function DashboardLayout({ pointCloudData, userLogs, onFileUpload }) {
    const [viewMode, setViewMode] = React.useState('3D');

    const handleViewModeChange = (event) => {
        setViewMode(event.target.checked ? '2D' : '3D');
    };

    const handleFileUpload = (fileData) => {
        // Automatically switch view mode based on file type
        const fileExtension = fileData.file.name.split('.').pop().toLowerCase();
        if (fileExtension === 'geojson') {
            setViewMode('2D');
        } else if (['xyz', 'pcd'].includes(fileExtension)) {
            setViewMode('3D');
        }
        
        // Pass the file data to parent
        onFileUpload(fileData);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                height: '100vh',
                overflow: 'hidden',
                bgcolor: 'background.default'
            }}
        >
            {/* Left Sidebar */}
            <Box
                sx={{
                    width: { xs: '100%', md: 220 },
                    bgcolor: 'background.paper',
                    p: { xs: 1, md: 2 },
                    display: 'flex',
                    flexDirection: { xs: 'row', md: 'column' },
                    gap: { xs: 1, md: 2 },
                    height: { xs: '10%', md: '100%' },
                    maxHeight: { xs: '10%', md: '100%' },
                    borderRight: { md: 1 },
                    borderBottom: { xs: 1, md: 0 },
                    borderColor: 'divider',
                    overflow: 'auto'
                }}
            >
                <Box sx={{ 
                    flexShrink: 0,
                    width: { xs: '50%', md: '100%' }
                }}>
                    <FileUploader onFileUpload={handleFileUpload} />
                </Box>
                
                {/* View Mode Switch - disabled for GeoJSON files */}
                <Box sx={{ 
                    my: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: { xs: '50%', md: '100%' }
                }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={viewMode === '2D'}
                                onChange={handleViewModeChange}
                                color="primary"
                            />
                        }
                        label={
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    fontSize: { xs: '0.7rem', md: '0.8rem' },
                                    color: 'text.secondary'
                                }}
                            >
                                {viewMode === '3D' ? '3D View' : '2D Map'}
                            </Typography>
                        }
                    />
                </Box>
                
                {pointCloudData && (
                    <Box sx={{ 
                        flex: 1,
                        overflow: 'auto',
                        width: { xs: '50%', md: '100%' }
                    }}>
                        <Typography 
                            variant="subtitle2" 
                            sx={{ 
                                mb: 1,
                                color: 'text.secondary',
                                fontSize: { xs: '0.7rem', md: '0.8rem' }
                            }}
                        >
                            File Information
                        </Typography>
                        <FileInfo fileData={pointCloudData} />
                    </Box>
                )}
            </Box>

            {/* Main Content Area */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: { xs: '90%', md: '100%' },
                    overflow: 'hidden'
                }}
            >
                {/* Viewer */}
                <Box
                    sx={{
                        flex: 1,
                        p: { xs: 1, sm: 2 },
                        minHeight: 0
                    }}
                >
                    <Box
                        sx={{
                            height: '100%',
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            overflow: 'hidden',
                            boxShadow: 1,
                            transition: 'box-shadow 0.2s',
                            '&:hover': {
                                boxShadow: 3
                            }
                        }}
                    >
                        {viewMode === '3D' ? (
                            <ThreeDViewer 
                                key="3d" 
                                pointCloudData={pointCloudData?.pointCloud} 
                            />
                        ) : (
                            <MapViewer 
                                key="2d" 
                                geoData={pointCloudData?.geoJson}
                            />
                        )}
                    </Box>
                </Box>

                {/* Activity Logs */}
                <ActivityLogs logs={userLogs} />
            </Box>
        </Box>
    );
}

DashboardLayout.propTypes = {
    pointCloudData: PropTypes.shape({
        file: PropTypes.shape({
            name: PropTypes.string.isRequired,
            size: PropTypes.number.isRequired
        }).isRequired,
        pointCloud: PropTypes.oneOfType([
            PropTypes.arrayOf(PropTypes.shape({
                x: PropTypes.number.isRequired,
                y: PropTypes.number.isRequired,
                z: PropTypes.number.isRequired
            })),
            PropTypes.object
        ]),
        geoJson: PropTypes.any
    }),
    userLogs: PropTypes.arrayOf(PropTypes.string).isRequired,
    onFileUpload: PropTypes.func.isRequired
};

export default DashboardLayout;