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
const fs = require('fs');

const metadataFileEnding = '.monstermeta';
const lineEnding = '_line';
const colorEnding = '_color';


// class that stores our file metadata, including original PSD name, folder location, layer names etc
class FileMetadata {

	constructor(filename) {
		this.filename = filename;
		this.layerNames = [];
		this.partInfo = { };
		this.bodyPartNames = [];
	}
	
	getMonsterName() {
		return this.filename.split('/')[this.filename.split('/').length - 1].replace('.psd', '');
	}

	// the metadata file is like
	// { "monster_name": "whatever", "parts":{ "part_name": { "file_name":filename, "width":w, "height":h, etc }}}
	getFileMetadata() {
		var totalData = {};
		totalData['monster_name'] = this.getMonsterName();

		// TODO: finish this part
		totalData['parts'] = this.partInfo;
		return JSON.stringify(totalData, null, '\t');
	}
}

String.prototype.endsWith = function (s) {
	return this.length >= s.length && this.substr(this.length - s.length) == s;
}

// TODO: add a flag for recursion
// TODO: add a flag for location to store the [psd_name] folder at
program
	.version('0.1.0')
	.option('-f, --folder <location>', 'Folder location to use.')
	.option('-p, --psd <file>', 'Specific file to parse.')
	.parse(process.argv);

// here we decide which action to take based on command parameters
if (program.folder !== undefined) {

	// exports to a folder named "finals" inside the targeted folder
	processFolder(program.folder);
} else if (program.psd !== undefined) {

	// exports to a file named file_name
	var fileMetadata = new FileMetadata(program.psd);
	// console.log()
	processFile(fileMetadata);
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
function processFile(fileMetadata) {
	console.log(`Caligula processing file ${fileMetadata.filename}`);

	// get the layer names from the PSD file
	fileMetadata.layerNames = getLayerNames(fileMetadata.filename);
	console.log(`got ${JSON.stringify(fileMetadata.layerNames)} layers`);

	// compress layer pairs to start building out the CLI
	
	// call the CLI to perform layer merging and exporting to PNG

	// create a folder (in . for now) that's the PSD name
	// TODO: ugh, just append this to the target directory when that's included in the params too...
	var folderName = fileMetadata.filename.split('/')[fileMetadata.filename.split('/').length - 1].split('.')[0];
	console.log(`Creating folder ${folderName}`);
	
	try {
		fs.mkdirSync(folderName);
	} catch (err) {
		if (err.code != 'EEXIST') {
			console.log(`got an error ${err} creating the folder ${folderName}, stopping here`);
		}
	}

	var pairIndexes = []; // indexes of each pair, in pairs
	var nonPairedLayerNames = []; // layers that we didn't detect a pair for
	var foundBodyPartNames = []; // the base name of every pair of layers we find, these are assumed to be monster body parts

	var lineIndex = 0;
	var colorIndex = 0;

	// iterate through the layer names to figure out pairs and their indexes
	for (var potPairLine of fileMetadata.layerNames) {
		if (potPairLine.endsWith('_line')) {
			var line = potPairLine.split('_line')[0];
			var paired = false;

			for (var potPairColor of fileMetadata.layerNames) {
				if (potPairColor.endsWith('_color')) {
					console.log(`checking ${potPairColor}==${line + '_color'}`);
					if (potPairColor == (line + '_color')) {
						console.log(`paired layers ${line}`);
						paired = true;
						pairIndexes.push(lineIndex, colorIndex);
						foundBodyPartNames.push(line);
						break;
					}
				}
				colorIndex++;
			}

			colorIndex = 0;
			if (!paired) {
				nonPairedLayerNames.push(potPairLine);
			}
		} else {
			if (potPairLine.endsWith('_color'))
			nonPairedLayerNames.push(potPairLine);
		}

		lineIndex++;
	}

	fileMetadata.bodyPartNames = foundBodyPartNames;

	// for each pair (each set that is the same except for _line and _color at the end), call the compositing function
	for (var pairIndex = 0; pairIndex < pairIndexes.length - 1; pairIndex += 2) {

		var bodyPartName = foundBodyPartNames[pairIndex / 2];
		var partFilename = bodyPartName + '.png';
		var imageSize = exportCompositeLayerAsPNG2(fileMetadata, `${folderName}/${partFilename}`, pairIndexes[pairIndex], pairIndexes[pairIndex + 1]);

		var partInfo = { 'file_name':partFilename, 'width': imageSize.split(' ')[0], 'height': imageSize.split(' ')[1] };
		fileMetadata.partInfo[bodyPartName] = partInfo; // store as [width, height]
	}

	// track non-pair layers so we can store them to a file in the root 
	// console.log(`Non-paired layers: ${JSON.stringify(nonPairedLayerNames)}`);

	// save a metadata file with the sizes of each PNG in it
	// the metadata file is like
	// { "monster_name": "whatever", "parts":{ "part_name": { "file_name":filename, "width":w, "height":h, etc }}}
	fs.writeFile(`${folderName}/metadata.json`, fileMetadata.getFileMetadata(), function(err) {
		if (err) {
			console.log(`Error saving metadata file: ${err.message}`);
		}
		console.log(`Monster ${fileMetadata.getMonsterName()} composed.`);
	});
}

// returns an ordered array of layers in the passed PSD location 
function getLayerNames(file) {
	// the layer names come in from the command convert test/tank_sketch.psd -verbose info: | grep "label:" 
	var cliReturn = execSync(`convert ${file} -verbose info: | grep "label:" `);
	
	var layersArray = cliReturn.toString().trim().split('label:');
	for (index in layersArray) {
		layersArray[index] = layersArray[index].trim();
	}

	return layersArray;
}

// exports the passed layer indexes as a single PNG 
// returns the size of that PNG as the format "x y" so the calling function can split it on ' ' and save it in the metadata
function exportCompositeLayerAsPng(fileMetadata, targetFilename, layer1Index, layer2Index) {
	// this composites layers:
	// magick composite -gravity center 'test/hair_1.psd[2]' 'test/hair_1.psd[1]' hair.png 
	
	console.log(`Exporting '${fileMetadata.filename}[${layer1Index}]' '${fileMetadata.filename}[${layer2Index}]' to ${targetFilename}`);
	console.log(`CLI call is: magick composite -compose Dst_Over -gravity center '${fileMetadata.filename}[${layer2Index}]' '${fileMetadata.filename}[${layer1Index}]' ${targetFilename}`);
	var cliReturn = execSync(`magick composite -compose Dst_Over -gravity center '${fileMetadata.filename}[${layer2Index}]' '${fileMetadata.filename}[${layer1Index}]' ${targetFilename}`);
	cliReturn = execSync(`magick identify -format "%[fx:w] %[fx:h]" ${targetFilename}`);

	return cliReturn.toString();
}

// does the same as the above method but does it in such a way that the image ends up better
// this might be the way to do it instead of the above, although this is expensive
function exportCompositeLayerAsPNG2(fileMetadata, targetFilename, layer1Index, layer2Index) {

	console.log(`Exporting '${fileMetadata.filename}[${layer1Index}]' '${fileMetadata.filename}[${layer2Index}]' to ${targetFilename}`);
	console.log(`CLI call is: magick composite -gravity center '${fileMetadata.filename}[${layer1Index}]' '${fileMetadata.filename}[${layer2Index}]' ${targetFilename}`);
	
	// composite the layers together, this results in an image with a transparent background (despite what the doc says for
	// ImageMagick, you can just do -background transparent _in front of_ the -layers merge and it works :/ )
	var cliReturn = execSync(`convert \
    '${fileMetadata.filename}[${layer2Index}]' \
    '${fileMetadata.filename}[${layer1Index}]' \
    -background transparent \
    -layers merge \
	${targetFilename}`);
	
	// return the size of the resulting image 
	cliReturn = execSync(`magick identify -format "%[fx:w] %[fx:h]" ${targetFilename}`);
	return cliReturn.toString();
}