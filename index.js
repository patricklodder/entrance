var url = require('url')
	, qs = require('querystring')
	, util = require('util')
	, events = require('events');

var REQUEST_METHODS = {GET: true, POST: true, DELETE: true};

function Transaction (req, res, cb) {
	this.req = req;
	this.res = res;
	this.callback = cb;
	
	this.ready = false;
	
	this.ee = new events.EventEmitter;
	
	this.matches = null;
	this.body = {};
	this.chunks = [];
	
	this.setReqData = function(chunks, body) {
		this.chunks = chunks;
		this.body = body;
		this.ready = true;
		this.ee.emit('ready', this);
	};
	
	this.handle = function (func) {
		if (!this.ready) {
		
			this.ee.once('ready', function(that) { that.handle(func); });
		
		} else {
		
			var err = false;
			try {
				func.call(this);
			} catch (e) {
				err = e;
			}
			cb(err);
		}
	};
};

function Route (method, route, controller) {
	this.route = route;
	this.isRegExp = (typeof(route) === 'object' && route instanceof RegExp);
	this.method = method;
	this.controller = controller;
	
	this.key = function() {
		return (this.isRegExp) ? route.toString() : route;
	};
	
	this.match = function(path) {
		return (this.isRegExp) ? this.route.exec(path) : (path === this.route);
	};
}

function Entrance (options) {
	this.options = options;
	this.routes = {all: {}};
	this.callback = function(){};
}

util.inherits(Entrance, events.EventEmitter);

Entrance.prototype.add = function (method, route, controller, strict) {
	var r = new Route(method, route, controller);
	method = method.toLowerCase();
	if (!this.routes.hasOwnProperty(method)) this.routes[method] = {};
	
	var key = r.key();
	
	if (strict && this.routes[method].hasOwnProperty(key)) {
		throw 'Route "' + key + '" already exists.';
	} else this.routes[method][key] = r;
};

Entrance.prototype.dispatch = function (req, res, cb) {
	var chunks = [], transaction = new Transaction(req, res, this.callback);
	req.on('data', function (c) { 
		chunks.push(c);
	});
	req.on('end', function () {
		transaction.setReqData(chunks, (chunks.length > 0) ? qs.parse(chunks.join('')) : {});
	});
	
	if (cb) this.callback = cb;
	
	var methods = ['all', req.method.toLowerCase()];
	var path = url.parse(req.url).pathname;
	var i = 2;
	
	while (i--) {
		if (this.routes.hasOwnProperty(methods[i]) && typeof(this.routes[methods[i]]) === 'object') {
			for (var k in this.routes[methods[i]]) {
				var r = this.routes[methods[i]][k], match;
				
				if (match = r.match(path)) {
					if (match !== true) transaction.matches = match;
					transaction.handle(r.controller);
					return;
				}
			}
		}
	}
	
	this.callback('No route could be matched');	
	
};

//make request method prototypes
Entrance.createMethod  = function (method) {
		Entrance.prototype[method] = function(route, controller, strict) {
			this.add(method, route, controller, strict);
		};
};

for (var m in REQUEST_METHODS) {Entrance.createMethod(m.toLowerCase());}

module.exports = Entrance;