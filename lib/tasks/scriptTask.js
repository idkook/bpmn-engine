'use strict';

const debug = require('debug')('bpmn-engine:activity:scriptTask');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const vm = require('vm');

const internals = {};

module.exports = internals.Activity = function(activity, parent) {
  debug('init', activity.id);

  this.activity = activity;
  this.inbound = parent.getInboundSequenceFlows(activity.id);
  this.outbound = parent.getOutboundSequenceFlows(activity.id);

  this.script = new vm.Script(this.activity.script, {
    filename: `${this.activity.id}.script`,
    displayErrors: true
  });
};

util.inherits(internals.Activity, EventEmitter);

internals.Activity.prototype.run = function(variables) {
  debug('take', this.activity.id);
  this.taken = true;
  this.emit('start', this);

  this.executeScript(variables, (err) => {
    if (err) return this.emit('error', err);

    this.emit('end', this);
    takeAll.call(this, this.outbound, variables);
  });
};

internals.Activity.prototype.executeScript = function(variables, callback) {
  const context = new vm.createContext({
    context: variables,
    next: function(err) {
      if (err) return callback(new Error(err.message));
      callback();
    }
  });

  this.script.runInContext(context);
};

internals.Activity.prototype.cancel = function() {
  this.canceled = true;
};

function takeAll(outbound, variables) {
  debug(`take all ${this.activity.id} ${outbound.length} sequence flows`);
  outbound.forEach(take.bind(this, variables));
}

function take(variables, outboundSequenceFlow) {
  if (this.canceled) return;
  outboundSequenceFlow.take(variables);
}