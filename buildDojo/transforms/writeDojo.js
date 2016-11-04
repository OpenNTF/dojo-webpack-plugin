define([
	"util/build/buildControl",
	"util/build/fileUtils",
	"util/build/fs",
	"util/build/transforms/writeAmd",

], function(bc, fileUtils, fs, writeAmd){
	return function(resource, callback){
		var
			waitCount = 1, // matches *1*

			errors = [],

			onWriteComplete = function(err){
				if(err){
					errors.push(err);
				}
				if(--waitCount==0){
					callback(resource, errors.length && errors);
				}
			},

			doWrite = function(filename, text){
				fileUtils.ensureDirectoryByFilename(filename);
				waitCount++;
				fs.writeFile(filename, bc.newlineFilter(text, resource, "writeDojo"), "utf8", onWriteComplete);
			};

		// the writeDojo transform...
		try{
			// assemble and write the dojo layer
			resource.uncompressedText = "module.exports = " + resource.getText() + ";";
			doWrite(writeAmd.getDestFilename(resource), resource.uncompressedText);

			onWriteComplete(0); // matches *1*
		}catch(e){
			if(waitCount){
				// can't return the error since there are async processes already going
				errors.push(e);
				return 0;
			}else{
				return e;
			}
		}
		return callback;
	};
});
