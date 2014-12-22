/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

/**
 * implements classes
 * creating, inheriting, adding properties, etc.
 *
 * @param {Object} [parent class]
 * @returns {Object} new class
 */
exports.create = function(parent){
    var klass = function(){
        this.init.apply(this, arguments);
    };

    // Change klass' prototype
    if (parent) {
        var subclass = function() {};
        subclass.prototype = parent.prototype;
        klass.prototype = new subclass;
    };

    klass.prototype.init = function(){};

    // Shortcuts
    klass.fn = klass.prototype;
    klass.fn.parent = klass;
    //klass._super = klass.__proto__;

    // Adding class properties
    klass.extend = function(obj){
        var extended = obj.extended;
        for(var i in obj){
            klass[i] = obj[i];
        }
        if (extended) extended(klass)
    };

    // Adding instance properties
    klass.include = function(obj){
        var included = obj.included;
        for(var i in obj){
            klass.fn[i] = obj[i];
        }
        if (included) included(klass)
    };

    // Adding a proxy function
    klass.proxy = function(func){
        var self = this;
        return(function(){
            return func.apply(self, arguments);
        });
    }

    // Add the function on instances too
    klass.fn.proxy = klass.proxy;

    return klass;
};
