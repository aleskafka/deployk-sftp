

var Client = require('ssh2').Client;
var Stat = require('deployk-utils').Stat;


module.exports = function(options) {
	return function(cb) {
		return new SFTP(options, cb);
	};
};


/**
 * @param {Object}
 * @param {function}
 */
function SFTP(options, cb)
{
	/** @var {Client} */
	this.ssh = new Client();

	/** @var {sftp} */
	this.sftp = null;

	/** @var {function} */
	this.ready = false;

	var self = this;
	this.ssh.on('ready', function() {
		if (self.ready === false) {
			self.ready = true;

			self.ssh.sftp(function(err, sftp) {
				if (err) {

				} else {
					self.sftp = sftp;

					if (typeof cb === 'function') {
						cb.call(self, self);
					}
				}
			});
		}
	});

	options.tryKeyboard = true;
	this.ssh.on('keyboard-interactive', function(name, instructions, instructionsLang, prompts, finish) {
	  finish([options.password]);
	});

	this.ssh.connect(options);
};


/**
 * @param {string}
 * @param {function}
 */
SFTP.prototype.readdir = function(path, cb)
{
	this.sftp.readdir(path, function(err, files) {
		if (files && !err) {
			var _files = {};
			files.forEach(function(stat) {
				if (stat.filename!=='.' && stat.filename!=='..') {
					_files[stat.filename] = new Stat(
						stat.longname.substr(0, 1)==='d' ? 'directory' : (stat.longname.substr(0, 1)==='l' ? 'symlink' : 'file'),
						stat.attrs.mtime, stat.attrs.size, stat.longname.substr(0, 10)
					);
				}
			});

			files = _files;
		}

		cb(err, files);
	});

};


/**
 * @param {string}
 * @param {function}
 */
SFTP.prototype.stat = function(path, cb)
{
	this.sftp.stat(path, function(err, stat) {
		if (stat && !err) {
			stat = Stat.fromFS(stat);
		}

		cb(err, stat);
	});
};


SFTP.prototype.putSymlink = function(dest, source, cb)
{
	this.sftp.symlink(source, dest, cb || function(err) {});
};


SFTP.prototype.putDir = function(path, chmod, cb)
{
	var self = this;
	this.sftp.mkdir(path, function(err) {
		if (err) {
			cb && cb(err);

		} else {
			self.chmod(path, chmod, cb);
		}
	});
};


SFTP.prototype.putFile = function(dest, source, chmod, cb)
{
	var self = this;
	this.sftp.fastPut(source.getAbsolutePath(), dest, function(err) {
		if (err) {
			cb && cb(err);

		} else {
			self.chmod(dest, chmod, cb);
		}
	});
};


SFTP.prototype.putContent = function(dest, source, chmod, cb)
{
	var self = this;
	var writeStream = this.sftp.createWriteStream(dest);

	writeStream.on('close', function() {
		self.chmod(dest, chmod, cb);
	});

	source.createReadStream().pipe(writeStream);
};


SFTP.prototype.deleteDir = function(path, cb)
{
	this.sftp.rmdir(path, cb || function(err) {});
};


SFTP.prototype.deleteFile = function(path, cb)
{
	this.sftp.unlink(path, cb || function(err) {});
};


SFTP.prototype.chmod = function(path, chmod, cb)
{
	this.sftp.chmod(path, '0'+chmod.toString(), cb|| function(err) {});
};


SFTP.prototype.rename = function(oldPath, newPath, cb)
{
	this.sftp.rename(oldPath, newPath, cb || function(err) {});
}
