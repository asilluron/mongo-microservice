'use strict';

import { Mongoose } from "mongoose";

const mongoose = require('mongoose');
const jackrabbit = require('jackrabbit');
const logger = require('logfmt');
const EventEmitter = require('events').EventEmitter;
const TOTAL_CONNECTION_COUNT = 2;

class Connector extends EventEmitter {
  constructor (mongoUrl:string, rabbitUrl:string) {
    super();
    this.readyCount = 0;

    mongoose.connect(mongoUrl, {useNewUrlParser: true});

    var db = mongoose.connection;
    db.on('error', (err:string) => {
      logger.log({ type: 'error', msg: err, service: 'mongodb' });
    });
    db.once('open', () => {
      logger.log({ type: 'info', msg: 'connected', service: 'mongodb' });
      this._ready();
    });

    this.queue = jackrabbit(rabbitUrl);
    this.queue.once('connected', () => {
        logger.log({ type: 'info', msg: 'connected', service: 'rabbitmq' });
        this._ready();
      })
      .on('error', (err:string) => {
        logger.log({ type: 'error', msg: err, service: 'rabbitmq' });
      })
      .once('disconnected', () => {
        logger.log({ type: 'error', msg: 'disconnected', service: 'rabbitmq' });
        this._lost();
      });

    this.exchange = this.queue.default();
  }

  getMongooseReference () : Mongoose{
    return mongoose;
  }

  _ready () {
    if (++this.readyCount === TOTAL_CONNECTION_COUNT) {
      this.emit('ready');
    }
  }

  _lost () {
    this.emit('lost');
  }
}

module.exports = Connector;
