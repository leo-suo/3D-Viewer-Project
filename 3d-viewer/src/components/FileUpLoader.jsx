import React from 'react';
import decompressLZF from '../utils/decompress-lzf';

function FileUploader({ onFileUpload }) {
    // Handle file selection and parsing
    const handleFileChange = (event) => {
        const file = event.target.files[0];

        if (file) {
            const fileExtension = file.name.split('.').pop().toLowerCase();

            if (fileExtension === 'json') {
                parseJSONFile(file);
            } else if (fileExtension === 'xyz') {
                parseXYZFile(file);
            } else if (fileExtension === 'pcd') {
                parsePCDFile(file);
            } else {
                alert("Unsupported file type. Please upload a .json, .xyz, or .pcd file.");
            }
        }
    };

    // Parse JSON file
    const parseJSONFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);

                if (Array.isArray(jsonData) && jsonData.every(point => 'x' in point && 'y' in point && 'z' in point)) {
                    onFileUpload(jsonData);
                } else {
                    alert("Invalid JSON format. Expected an array of { x, y, z } objects.");
                }
            } catch (error) {
                console.error("Error parsing JSON file:", error);
                alert("Error parsing JSON file.");
            }
        };
        reader.readAsText(file);
    };

    // Parse XYZ file (space-separated values: x y z)
    const parseXYZFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.trim().split('\n');
            const points = lines.map(line => {
                const [x, y, z] = line.trim().split(/\s+/).map(Number);
                return { x, y, z };
            });

            if (points.length > 0 && !isNaN(points[0].x)) {
                onFileUpload(points);
            } else {
                alert("Invalid XYZ file format. Expected space-separated x y z values.");
            }
        };
        reader.readAsText(file);
    };

    // Parse PCD file (ASCII and binary compressed)
    const parsePCDFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.trim().split('\n');
            let pointDataStart = false;
            const points = [];

            for (let line of lines) {
                if (line.startsWith("DATA ascii")) {
                    pointDataStart = true;
                    continue;
                }
                if (pointDataStart && line.trim() !== '') {
                    const [x, y, z] = line.trim().split(/\s+/).map(Number);
                    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                        points.push({ x, y, z });
                    }
                }
            }

            console.log("Parsed Points:", points.slice(0, 5)); // Log first 5 points for verification
            console.log(`Total points loaded: ${points.length}`);

            if (points.length > 0) {
                onFileUpload(points);
            } else {
                alert("No valid points found in the PCD file.");
            }
        };
        reader.readAsText(file);
    };



    return (
        <div style={{ margin: '10px', padding: '5px' }}>
            <input
                type="file"
                accept=".json,.xyz,.pcd"
                onChange={handleFileChange}
            />
            <p>Supported formats: .json, .xyz, .pcd</p>
        </div>
    );
}

export default FileUploader;
