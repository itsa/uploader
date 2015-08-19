
// TODO: streamupload doesn't work


/**
 * Provides core Upload-functionality.
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module uploader
 * @class Uploader
*/

"use strict";

require('polyfill/polyfill-base.js');
require('./css/uploader.css');

var NAME = '[uploader]: ',
    jsext = require('js-ext/js-ext.js'), // we need the full version
    Classes = jsext.Classes,
    createHashMap = jsext.createHashMap,
    TEMPLATE = '<input class="uploader-hidden-input" type="file">';

module.exports = function (window) {
    var Event = require('event-dom')(window),
        Uploader;

    // to prevent multiple Uploader instances
    // (which might happen: http://nodejs.org/docs/latest/api/modules.html#modules_module_caching_caveats)
    // we make sure Uploader is defined only once. Therefore we bind it to `window` and return it if created before
    // We need a singleton Uploader, because submodules might merge in. You can't have them merging
    // into some other Uploader-instance than which is used.

    window._ITSAmodules || Object.protectedProp(window, '_ITSAmodules', createHashMap());
/*jshint boss:true */
    if (Uploader=window._ITSAmodules.Uploader) {
/*jshint boss:false */
        return Uploader; // Uploader was already created
    }

    Uploader = Classes.createClass(function(config) {
        var instance = this,
            inputNode;
        config || (config={});
        instance._inputNode = inputNode = window.document.body.addSystemElement(TEMPLATE);
        instance.setDefaults(config.url, config.params, config.options);
        instance._lastfiles = [];
        instance.defineEvent('send').defaultFn(instance._defFnSend);
        instance.defineEvent('selectfiles').defaultFn(instance._defFnSelectFiles);
        instance.defineEvent('fileschanged').defaultFn(function(e) {
            var self = e.target;
            self._inputNode.getData('autoSend') && self.send();
        });
        instance.after('change', function() {
            instance.emit('fileschanged', instance._selectedPayload);
        }, function(e) {
            return (e.target===inputNode);
        });
    },
    {
        /**
         * @params [payload] {Object}
         *     @params [payload.autoSend] {Boolean}
        */
        selectFile: function(payload) {
            var instance = this;
            instance._selectedPayload = payload ? payload.deepClone() : {};
            instance.emit('selectfiles', instance._selectedPayload);
        },
        /**
         * @params [payload] {Object}
         *     @params [payload.autoSend] {Boolean}
        */
        selectFiles: function(payload) {
            var instance = this;
            instance._selectedPayload = payload ? payload.deepClone() : {};
            instance._selectedPayload.multiple = true;
            instance.emit('selectfiles', instance._selectedPayload);
        },
        _defFnSend: function(e) {
            var instance = this,
                inputNode = instance._inputNode,
                url = e.url,
                params = e.params,
                options = e.options,
                sendOptions, originalProgressFn;
            if (!inputNode || inputNode.files.length===0) {
                return Promise.reject('no file selected');
            }
            sendOptions = options ? options.deepClone() : instance.defaultOptions.deepClone();
            sendOptions.emptyFiles = true;
            // redefine the argument of the progress-callback:
            if (sendOptions.progressfn) {
                originalProgressFn = sendOptions.progressfn;
                sendOptions.progressfn = function(data) {
                    e.ioPromise = data.target;
                    e.total = data.total;
                    e.loaded = data.loaded;
                    originalProgressFn(e);
                };
            }
            instance._storeLastSent();
            return inputNode.sendFiles(url || instance.defaultURL, params || instance.defaultParams, sendOptions);
        },
        _storeLastSent: function() {
            var instance = this,
                lastFiles = instance._lastfiles,
                files = instance._inputNode.files,
                len = files.length,
                i, file;
            lastFiles.length = 0;
            for (i=0; i<len; i++) {
                file = files[i];
                lastFiles.push({
                    name: file.name,
                    size: file.size
                });
            }
        },
        setDefaults: function(url, params, options) {
            var instance = this;
            instance.defaultURL = url;
            instance.defaultParams = params ? params.deepClone() : {};
            instance.defaultOptions = options ? options.deepClone() : {};
        },
        clearDefaults: function() {
            var instance = this;
            instance.defaultURL = null;
            instance.defaultParams = {};
            instance.defaultOptions = {};
        },
        /**
         * @params [payload] {Object}
         *     @params [payload.url] {String}
         *     @params [payload.params] {Object}
         *     @params [payload.options] {Object}
        */
        send: function(payload) {
            this.emit('send', payload && payload.deepClone());
        },
        hasFiles: function() {
            return (this.count()>0);
        },
        getFiles: function() {
            return this._inputNode.files;
        },
        getLastSent: function() {
            return this._lastfiles;
        },
        count: function() {
            return this._inputNode.files.length;
        },
        getDomNode: function() {
            return this._inputNode;
        },
        _defFnSelectFiles: function(e) {
            var instance = e.target,
                inputNode = instance._inputNode,
                autoSend = e.autoSend,
                eMultiple = e.multiple,
                multiple = (typeof eMultiple === 'boolean') ? eMultiple : false;
            inputNode.toggleAttr('multiple', 'true', multiple);
            inputNode.setData('autoSend', autoSend);
            inputNode.showFileSelect();
        },
        destroy: function() {
            this._inputNode.remove();
        }
    });

    Uploader.mergePrototypes(Event.Listener);
    Uploader.mergePrototypes(Event.Emitter('uploader'));

    window._ITSAmodules.Uploader = Uploader;

    return Uploader;
};