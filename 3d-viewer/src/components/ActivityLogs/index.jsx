import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

function ActivityLogs({ logs }) {
    return (
        <Box
            sx={{
                borderTop: 1,
                borderColor: 'divider',
                p: { xs: 1, sm: 1.5 },
                height: { xs: '30vh', md: '25vh' },
                minHeight: { xs: 120, md: 150 }
            }}
        >
            <Typography 
                variant="subtitle2" 
                sx={{ 
                    mb: 0.5,
                    px: 1,
                    color: 'text.secondary',
                    fontSize: { xs: '0.75rem', sm: '0.8rem' }
                }}
            >
                Activity Logs
            </Typography>
            <Box
                sx={{
                    height: 'calc(100% - 25px)',
                    bgcolor: '#1E1E1E',
                    p: 1.5,
                    overflowY: 'auto',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider'
                }}
            >
                {logs.map((log, index) => (
                    <Typography
                        key={index}
                        variant="body2"
                        sx={{
                            color: '#E0E0E0',
                            fontFamily: 'monospace',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            mb: 0.25,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            lineHeight: 1.4
                        }}
                    >
                        {log}
                    </Typography>
                ))}
            </Box>
        </Box>
    );
}

ActivityLogs.propTypes = {
    logs: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default ActivityLogs; 