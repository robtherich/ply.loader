const max = require('max-api');
const fs = require("fs");

// use threejs ply loader
// could instead remove this dependency 
// and read data directly from ply file
const THREE = require("three");

// mode 0 - write and read from dictionary (slow)
// mode 1 - write and read from matrix binaries (fast)
const mode = 1;

const VERBOSE = false;

if(VERBOSE) max.post("hello plyloader");

const JIT_BIN_TYPE_CHAR =    'CHAR';
const JIT_BIN_TYPE_LONG =    'LONG';
const JIT_BIN_TYPE_FLOAT32 = 'FL32';
const JIT_BIN_TYPE_FLOAT64 = 'FL64';

// convert 4-char code to int for writing to buffer
function fourchar(code) 
{
	return Buffer.from(code).readInt32BE(0)
}

// prepare a buffer for writing out matrix data
// return buffer and offset where data should start writing
function matrixBufferFromInfo(info, typesize)
{
	const SIZE_INT32 = 4;
	const JIT_BIN_HEADER_SIZE = 6 * SIZE_INT32;

	// 2 headers + dim count + data
	const bufferSize = (JIT_BIN_HEADER_SIZE * 2) + (SIZE_INT32 * info.dimcount) + info.datasize
	const buffer = Buffer.alloc(bufferSize);

	// matrix binary file header, except for buffer size will always be the same
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

	// matrix data header 
	let cksize = JIT_BIN_HEADER_SIZE;
	for (i = 0; i < info.dimcount; i++) {
		cksize += SIZE_INT32;
	}
	let dataoffset = cksize;
	for (i = 0; i < info.dimcount; i++) {
		cksize += info.dim[i] * info.planecount * typesize;
	}	
	const matrixHeader = [fourchar('MTRX'), cksize, dataoffset, info.typeid, info.planecount, info.dimcount];
	matrixHeader.forEach((value) => {
		buffer.writeInt32BE(value, offset);
		offset += SIZE_INT32;
	});		

	// write out dim sizes
	for (i = 0; i < info.dimcount; i++) {
		buffer.writeInt32BE(info.dim[i], offset);
		offset += SIZE_INT32;
	}

	return { buffer: buffer, offset : offset };
}

// fill the buffer with threejs geometry attribute data,
// and save to a binary matrix file
function matrixFillAndSave(attr, buffer_offset, typesize, outname)
{
	const count = attr.array.length;
	const buffer = buffer_offset.buffer;
	let offset = buffer_offset.offset;

	for(i = 0; i < count; i++) {
		buffer.writeFloatBE(attr.array[i], offset);
		offset += typesize;
	}

	fs.writeFile(outname, buffer, (err) => {
		if (err) {
			max.post('Error writing file:', err);
			return;
		}
		max.outlet("write", outname);
	});
}

function writeXtraAttr(attr, info, typesize, outname)
{
	info.planecount = attr.itemSize;
	info.datasize = attr.array.length * typesize;
	let buf_off = matrixBufferFromInfo(info, typesize);
	matrixFillAndSave(attr, buf_off, typesize, outname);
}

function writeGeomToMatrix(geometry) 
{
	const SIZE_FLOAT32 = 4;
	const cattr = geometry.getAttribute("color");
	const nattr = geometry.getAttribute("normal");
	const uattr = geometry.getAttribute("uv");
	const pattr = geometry.getAttribute("position");

	let vcount = 0;
	if(pattr) {
		let center = geometry.boundingSphere.center;
		max.outlet("bounding_sphere", "center", center.x, center.y, center.z);
		max.outlet("bounding_sphere", "radius", geometry.boundingSphere.radius);

		// matrix info, adjust as needed
		let matrixInfo = {
			dim : [ pattr.array.length / pattr.itemSize ],
			dimcount : 1,
			planecount : pattr.itemSize,
			typeid : fourchar(JIT_BIN_TYPE_FLOAT32),
			datasize : pattr.array.length * SIZE_FLOAT32
		}

		let buf_off = matrixBufferFromInfo(matrixInfo, SIZE_FLOAT32);

		if(cattr) {
			writeXtraAttr(cattr, matrixInfo, SIZE_FLOAT32, 'colormatrix.jxf');
		}
		if(nattr) {
			writeXtraAttr(nattr, matrixInfo, SIZE_FLOAT32, 'normmatrix.jxf');
		}
		if(uattr) {
			writeXtraAttr(uattr, matrixInfo, SIZE_FLOAT32, 'uvmatrix.jxf');
		}

		matrixFillAndSave(pattr, buf_off, SIZE_FLOAT32, 'posmatrix.jxf');
	}
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

	if(mode === 0) {
		try {
			let json = geometry.toJSON();
			await max.setDict(dname, json);
			max.outlet("read", 1);
		} 
		catch (error) {
			max.post("Error occurred during ply loading:", error);
			max.outlet("read", 0);
		}
	}
	else {
		writeGeomToMatrix(geometry);
	}
}
};

max.addHandlers(handlers);
