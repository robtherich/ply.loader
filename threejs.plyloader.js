const max = require('max-api');
const fs = require("fs");
const THREE = require("three");

const mode = 1;

const VERBOSE = false;

if(VERBOSE) max.post("hello plyloader");

function fourchar(code) 
{
	return Buffer.from(code).readInt32BE(0)
}

function writeJSONToMatrix(json) 
{
	let attrs = json.data.attributes;
	if(attrs.color) {
		//var cmat = attr2matrix(attrs, "color");
		//outlet(3, "jit_matrix", cmat.name);
	}

	if(attrs.normal) {
		//var nmat = attr2matrix(attrs, "normal");
		//outlet(2, "jit_matrix", nmat.name);
	}

	if(attrs.uv) {
		//var uvmat = attr2matrix(attrs, "uv");
		//outlet(1, "jit_matrix", uvmat.name);
	}

	let vcount = 0;
	if(attrs.position) {
		let attrname = "position";
		let attr = attrs[attrname].array;
		let planes = attrs[attrname].itemSize;
		vcount = attr.length / planes;
	}

	const SIZE_INT32 = 4;
	const SIZE_FLOAT32 = 4;
	const JIT_BIN_HEADER_SIZE = 6 * SIZE_INT32;

	// matrix info, adjust as needed
	const typeID = fourchar('FL32');
	const typesize = SIZE_FLOAT32;
	const planecount = 3;
	const dimcount = 1;

	const datasize = vcount * planecount * typesize;

	// 2 headers + dim count + data
	const bufferSize = (JIT_BIN_HEADER_SIZE * 2) + (SIZE_INT32 * dimcount) + datasize
	const buffer = Buffer.alloc(bufferSize);

	// file header
	const fileHeader = [
		fourchar('FORM'), 
		bufferSize, 
		fourchar('JIT!'),
		fourchar('FVER'), 
		12, 
		0x3C93DC80
	];
	
	let offset = 0;
	fileHeader.forEach((value) => {
		buffer.writeInt32BE(value, offset);
		offset += SIZE_INT32;
	});

	let cksize = JIT_BIN_HEADER_SIZE;
	for (i = 0; i < dimcount; i++) {
		cksize += SIZE_INT32;
	}
	
	let dataoffset = cksize;
	cksize += vcount * planecount * SIZE_FLOAT32;

	const matrixHeader = [fourchar('MTRX'), cksize, dataoffset, typeID, planecount, dimcount];
	
	if(offset != JIT_BIN_HEADER_SIZE) {
		max.post("something screwy");
	}
	matrixHeader.forEach((value) => {
		buffer.writeInt32BE(value, offset);
		offset += SIZE_INT32;
	});		

	if(offset != (JIT_BIN_HEADER_SIZE*2)) {
		max.post("something screwy");
	}
	for (i = 0; i < dimcount; i++) {
		// adjust for multiple dims
		buffer.writeInt32BE(vcount, offset);
		offset += SIZE_INT32;
	}

	if(attrs.position) {
		let attrname = "position";
		let attr = attrs[attrname].array;
		for(i = 0; i < vcount; i++) {
			buffer.writeFloatBE(attr[i], offset);
			offset += typesize;
		}
	}

	const filePath = 'writematrix.jxf';
	fs.writeFile(filePath, buffer, (err) => {
		if (err) {
			max.post('Error writing file:', err);
			return;
		}
		max.post('Matrix file has been written successfully!');
	});
}

const handlers = {

read: async (path, dname) => {
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

	let json = geometry.toJSON();

	if(mode === 0) {
		try {
			await max.setDict(dname, json);
			max.outlet("read", 1);
		} 
		catch (error) {
			max.post("Error occurred during ply loading:", error);
			max.outlet("read", 0);
		}
	}
	else {
		writeJSONToMatrix(json);
	}
}
};

max.addHandlers(handlers);
