#!/usr/bin/env node

// plan is you pass like node caligula.js -f a_folder
// this iterates through every psd in the folder, breaks the layers in
// that PSD into pairs of *_line and *_color layers, merges them w/
// imagemagick and saves the separated limbs to a folder like [psd_name]
// with the limb images and a .monstermeta file that contains the images
// in that folder as well as the sizes of all of the images and whatever
// other metadata there needs to be at this level

const program = require('commander');
const execSync = require('child_process').execSync;

const metadataFileEnding = '.monstermeta';
const lineEnding = '_line';
const colorEnding = '_color';

// TODO: add a flag for recursion
// TODO: add a flag for location to store the [psd_name] folder at
program
	.version('0.1.0')
	.option('-f, --folder <location>', 'Folder location to use.')
	.option('-p, --psd <file>', 'Specific file to parse.')
	.parse(process.argv);

// here we decide which action to take based on command parameters
if (program.folder !== undefined) {
	processFolder(program.folder);
} else if (program.psd !== undefined) {
	processFile(program.psd);
} else {
	console.log('fell through');
	processFolder('.');
}

// processes an entire folder's PSDs
// first iterates through all the folder's children (isn't recursive TODO: should it be?)
// and calls processFile() on each one
function processFolder(folder) {
	console.log(`Caligula working with folder ${folder}`);
}

// processes the passed file location
// separates the layers out, compresses layer pairs (*_line and *_color) together and saves them
// in a subfolder with the PSD name, with a metadata file
function processFile(file) {
	console.log(`Caligula processing file ${file}`);

	// get the layer names from the PSD file
	var layerNames = getLayerNames(file);
	console.log(`got ${JSON.stringify(layerNames)} layers`);

	// compress layer pairs to start building out the CLI
	
	// call the CLI to perform layer merging and exporting to PNG

	// create a folder (in . for now) that's the PSD name

	// export the PNGs to that folder

	// save a metadata file with the sizes of each PNG in it
}

// returns an ordered array of layers in the passed PSD location 
function getLayerNames(file) {
	// the layer names come in from the command convert test/tank_sketch.psd -verbose info: | grep "label:" 
	var cliReturn = execSync(`convert test/tank_sketch.psd -verbose info: | grep "label:" `);
	
	var tempLayersArray = cliReturn.toString().trim().split('label:');
	var layersArray = [];

	// because of CLI formatting we get an extraneous item and there's still some string cleanup to do here
	for (item in tempLayersArray) {
		if (item == 0) {
			continue;
		}
		layersArray[item - 1] = tempLayersArray[item].trim();
	}

	return layersArray;
}