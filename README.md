# 3D Point Cloud & GeoJSON Viewer

A web-based application for visualizing and interacting with 3D point cloud data (PCD/XYZ) and GeoJSON files. Built with React, Three.js, and Material-UI.

## Features

- **File Support**:
  - Point Cloud Data (.pcd)
  - XYZ Point Cloud (.xyz)
  - GeoJSON (.geojson, .json)

- **3D Visualization**:
  - Interactive point cloud viewing
  - Dynamic point size and scale controls
  - Color and opacity adjustments
  - Height-based vertex coloring
  - Camera position presets

- **2D Visualization**:
  - GeoJSON map viewing
  - Interactive map controls

## Project Structure 

## Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v10.0.0 or higher)

## Setup Instructions

1. Clone the repository:

```bash
git clone [https://github.com/yourusername/3d-viewer.git](https://github.com/leo-suo/3D-Viewer-Project.git)
cd 3d-viewer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Mapbox token:
```
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
```

4. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Building for Production

To create a production build:
```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Dependencies

Main dependencies include:
- react
- @react-three/fiber
- @react-three/drei
- three
- @mui/material
- leva
- react-map-gl
- react-dropzone

## Usage

1. Launch the application
2. Use the file uploader to load your point cloud or GeoJSON files
3. Switch between 3D and 2D views using the toggle switch
4. Use the control panel to adjust visualization parameters
5. Navigate the 3D view using:
   - Left mouse button: Rotate
   - Right mouse button: Pan
   - Mouse wheel: Zoom
   - Control buttons: Preset views

## Supported File Formats

- **Point Cloud Files**:
  - .pcd (Point Cloud Data)
  - .xyz (Plain text point cloud)
  
- **GeoJSON Files**:
  - .geojson
  - .json (with valid GeoJSON content)

## License

This project is licensed under the MIT License. 