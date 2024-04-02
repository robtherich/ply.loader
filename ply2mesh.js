autowatch = 1;
inlets = 1;
outlets = 5;

function attr2matrix(attrs, attrname) {
	var attr = attrs[attrname].array;
	var planes = attrs[attrname].itemSize;
	var vcount = attr.length / planes;
	post("attriubute " + attrname + " size " + attr.length + "\n");

	var mat = new JitterMatrix(planes, "float32", vcount);

	for(i = 0; i < vcount; i++) {
		var base = i * planes;
		var vals = Array();
		for(k = 0; k < planes; k++) {
			vals.push(attr[base + k]);
		}
		mat.setcell(i, "val", vals);
	}
	return mat;
}

function dictionary(ply) {

	var d = new Dict(ply);
	var plydict = JSON.parse(d.stringify());
	var bsphere = plydict.data.boundingSphere;
	//post("Bounding sphere center: " + bsphere.center + ". radius: " + bsphere.radius +"\n");
	outlet(4, "center", bsphere.center);
	outlet(4, "radius", bsphere.radius);
	
	var attrs = plydict.data.attributes;
	if(attrs.color) {
		var cmat = attr2matrix(attrs, "color");
		outlet(3, "jit_matrix", cmat.name);
	}
	
	if(attrs.normal) {
		var nmat = attr2matrix(attrs, "normal");
		outlet(2, "jit_matrix", nmat.name);
	}

	if(attrs.uv) {
		var uvmat = attr2matrix(attrs, "uv");
		outlet(1, "jit_matrix", uvmat.name);
	}

	if(attrs.position) {
		var pmat = attr2matrix(attrs, "position");
		outlet(0, "jit_matrix", pmat.name);
	}	
}