#!/usr/bin/env node
/**
 * Command line parse utility.
 * Read from STDIN, write to STDOUT.
 */
'use strict';
require('../lib/core-upgrade.js');

var ParserEnv = require('../lib/mediawiki.parser.environment.js').MWParserEnvironment;
var ParsoidConfig = require('../lib/mediawiki.ParsoidConfig.js').ParsoidConfig;
var TemplateRequest = require('../lib/mediawiki.ApiRequest.js').TemplateRequest;
var Util = require('../lib/mediawiki.Util.js').Util;
var DU = require('../lib/mediawiki.DOMUtils.js').DOMUtils;
var yargs = require('yargs');
var fs = require('fs');
var path = require('path');
var parse = require('../lib/parse').parse;
var standardOpts = require('../lib/parse').standardOpts;

process.on('SIGUSR2', function() {
	var heapdump = require('heapdump');
	console.error('SIGUSR2 received! Writing snapshot.');
	process.chdir('/tmp');
	heapdump.writeSnapshot();
});


if (require.main === module) {
	(function() {
		var defaultModeStr = "Default conversion mode : --wt2html";

		var opts = yargs.usage(
			'Usage: echo wikitext | $0 [options]\n\n' + defaultModeStr,
			standardOpts
		).check(Util.checkUnknownArgs.bind(null, standardOpts));

		var argv = opts.argv;

		if (Util.booleanOption(argv.help)) {
			opts.showHelp();
			return;
		}

		// Because selser builds on html2wt serialization,
		// the html2wt flag should be automatically set when selser is set.
		if (argv.selser) {
			argv.html2wt = true;
		}

		// Default conversion mode
		if (!argv.html2wt && !argv.wt2wt && !argv.html2html) {
			argv.wt2html = true;
		}

		// Offline shortcut
		if (argv.offline) {
			argv.fetchConfig = false;
			argv.fetchTemplates = false;
			argv.fetchImageInfo = false;
			argv.usephppreprocessor = false;
		}

		var prefix = argv.prefix || null;

		if (argv.apiURL) {
			prefix = 'customwiki';
		}

		var local = null;
		if (Util.booleanOption(argv.config)) {
			var p = (typeof (argv.config) === 'string') ?
				path.resolve('.', argv.config) :
				path.resolve(__dirname, '../api/localsettings.js');
			local = require(p);
		}

		var setup = function(parsoidConfig) {
			if (local && local.setup) {
				local.setup(parsoidConfig);
			}
			Util.setTemplatingAndProcessingFlags(parsoidConfig, argv);
			Util.setDebuggingFlags(parsoidConfig, argv);
		};

		var parsoidConfig = new ParsoidConfig(
			{ setup: setup },
			{ defaultWiki: prefix }
		);

		return parse(null, argv, parsoidConfig, prefix).then(function(res) {
			var stdout = process.stdout;
			stdout.write(res.out);
			if (res.trailingNL && stdout.isTTY) {
				stdout.write('\n');
			}
		}).done();
	}());
}
