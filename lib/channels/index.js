/*
 This notice must be untouched at all times.

 DreamFace DFX
 Version: 1.0
 Author: DreamFace Interactive

 Copyright (c) 2014, DreamFace Interactive. All rights reserved.

 LICENSE: Apache License, Version 2.0
 */

var PUBSUB = require('./event.js');


exports.channels = {
    root   : new PUBSUB.EventManager({debug: true}),
    logger : new PUBSUB.EventManager()
}
