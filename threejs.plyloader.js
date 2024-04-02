const max = require('max-api');
const fs = require("fs");
const THREE = require("three");

const VERBOSE = false;

if(VERBOSE) max.post("hello plyloader");

const handlers = {
read: async (path ) => {
	//import * as THREE from 'three';

	const { PLYLoaderFactory } = await import("threejs-ply-loader");
	// Initialize PLYLoader Class
	const PLYLoader = PLYLoaderFactory(THREE);
	// Instantiate PLYLoader object
	const plyLoader = new PLYLoader();
	// read file
	const fileBuffer = fs.readFileSync(path);
	// Convert node file Buffer to ArrayBuffer
	const fileArrayBuffer = plyLoader.bufferToArrayBuffer(fileBuffer);
	// Parse 3D model into THREE geometry
	const geometry = plyLoader.parse(fileArrayBuffer);
	
	if(VERBOSE) max.post("plyloader got geometry type: " + geometry.type);

	var json = geometry.toJSON();
	try {
		await max.setDict("threejs.plyloader.dict", json);
		max.outlet("read", 1);
	} 
	catch (error) {
		max.post("Error occurred during ply loading:", error);
		max.outlet("read", 0);
	}
}
};

max.addHandlers(handlers);
