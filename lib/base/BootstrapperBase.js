/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = BootstrapperBase;

var util = require('util'),
	moduleHelper = require('../helpers/moduleHelper'),
	hrTimeHelper = require('../helpers/hrTimeHelper'),
	uhr = require('catberry-uhr'),
	Promise = require('promise'),
	StateProvider = require('../providers/StateProvider'),
	StoreLoader = require('../loaders/StoreLoader'),
	ComponentLoader = require('../loaders/ComponentLoader'),
	DocumentRenderer = require('../DocumentRenderer'),
	RequestRouter = require('../RequestRouter'),
	ModuleApiProviderBase = require('../base/ModuleApiProviderBase'),
	ContextFactory = require('../ContextFactory'),
	EventEmitter = require('events').EventEmitter;

var INFO_COMPONENT_LOADED = 'Component "%s" loaded',
	INFO_STORE_LOADED = 'Store "%s" loaded',
	INFO_ALL_STORES_LOADED = 'All stores loaded',
	INFO_ALL_COMPONENTS_LOADED = 'All components loaded',
	INFO_DOCUMENT_RENDERED = 'Document rendered for URI %s',
	TRACE_RENDER_COMPONENT = 'Component "%s%s" is being rendered...',
	TRACE_COMPONENT_RENDERED = 'Component "%s%s" rendered%s';

/**
 * Creates new instance of base Catberry bootstrapper.
 * @param {Function} catberryConstructor Constructor
 * of the Catberry's main module.
 * @constructor
 */
function BootstrapperBase(catberryConstructor) {
	this._catberryConstructor = catberryConstructor;
}

/**
 * Current constructor of the Catberry's main module.
 * @type {Function}
 * @private
 */
BootstrapperBase.prototype._catberryConstructor = null;

/**
 * Creates new full-configured instance of the Catberry application.
 * @param {Object?} configObject Configuration object.
 * @returns {Catberry} Catberry application instance.
 */
BootstrapperBase.prototype.create = function (configObject) {
	var currentConfig = configObject || {},
		catberry = new this._catberryConstructor();

	this.configure(currentConfig, catberry.locator);
	catberry.events = catberry.locator.resolveInstance(ModuleApiProviderBase);
	return catberry;
};

/**
 * Configures locator with all required type registrations.
 * @param {Object} configObject Configuration object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
BootstrapperBase.prototype.configure = function (configObject, locator) {
	var eventBus = new EventEmitter();
	eventBus.setMaxListeners(0);
	locator.registerInstance('promise', Promise);
	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('config', configObject);
	locator.register('stateProvider', StateProvider, configObject, true);
	locator.register('contextFactory', ContextFactory, configObject, true);
	locator.register('storeLoader', StoreLoader, configObject, true);
	locator.register('componentLoader', ComponentLoader, configObject, true);
	locator.register('documentRenderer', DocumentRenderer, configObject, true);
	locator.register('requestRouter', RequestRouter, configObject, true);

	uhr.register(locator);
};

/**
 * Wraps event bus with log messages.
 * @param {EventEmitter} eventBus Event emitter that implements event bus.
 * @param {Logger} logger Logger to write messages.
 * @protected
 */
BootstrapperBase.prototype._wrapEventsWithLogger = function (eventBus, logger) {
	eventBus
		.on('componentLoaded', function (args) {
			logger.info(util.format(INFO_COMPONENT_LOADED, args.name));
		})
		.on('storeLoaded', function (args) {
			logger.info(util.format(INFO_STORE_LOADED, args.name));
		})
		.on('allStoresLoaded', function () {
			logger.info(INFO_ALL_STORES_LOADED);
		})
		.on('allComponentsLoaded', function () {
			logger.info(INFO_ALL_COMPONENTS_LOADED);
		})
		.on('componentRender', function (args) {
			var id = args.context.
					attributes[moduleHelper.ATTRIBUTE_ID];
			logger.trace(util.format(TRACE_RENDER_COMPONENT,
				moduleHelper.getTagNameForComponentName(args.name),
				id ? '#' + id : ''
			));
		})
		.on('componentRendered', function (args) {
			var id = args.context.
					attributes[moduleHelper.ATTRIBUTE_ID];
			logger.trace(util.format(
				TRACE_COMPONENT_RENDERED,
				moduleHelper.getTagNameForComponentName(args.name),
				id ? '#' + id : '',
				util.isArray(args.hrTime) ?
					' (' + hrTimeHelper.toMessage(args.hrTime) + ')' : ''
			));
		})
		.on('documentRendered', function (args) {
			logger.info(util.format(
				INFO_DOCUMENT_RENDERED, args.location.toString()
			));
		})
		.on('error', function (error) {
			logger.error(error);
		});
};