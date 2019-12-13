const beanifyPlugin = require('beanify-plugin')
const NATS = require('nats')

const connCodes = ['CONN_ERR', NATS.SECURE_CONN_REQ, NATS.NON_SECURE_CONN_REQ, NATS.CLIENT_CERT_REQ]

class Transport {
  constructor ({ beanify, opts, done }) {
    this._opts = Object.assign({}, opts)
    this._nats = NATS.connect(this._opts)
    this._parent = beanify
    this._done = done
    const _log = this._parent.$log

    this._nats.on('connect', () => {
      this._done && this._done()
      this._done = null

      _log.info('Connected!')
    })

    this._nats.on('error', (err) => {
      this._done && this._done(err)
      this._done = null

      _log.error(err, 'Could not connect to NATS!')
      _log.error("NATS Code: '%s', Message: %s", err.code, err.message)

      if (connCodes.indexOf(err.code) > -1) {
        this._parent.close()
      }
    })

    this._nats.on('unsubscribe', (sid, topic) => {
      this.emit(topic, sid)
    })

    this._parent.onClose((instance, done) => {
      this._nats.close()
      done()
    })
  }

  get $options () {
    return this._opts
  }

  get $connected () {
    return this._nats.connected
  }

  subscribe (topic, opts, cb) {
    return this._nats.subscribe(topic, opts, cb)
  }

  unsubscribe (sid) {
    return this._nats.unsubscribe(sid)
  }

  publish (topic, msg, reply, cb) {
    return this._nats.publish(topic, msg, reply, cb)
  }

  request (topic, msg, opts, cb) {
    return this._nats.request(topic, msg, opts, cb)
  }

  timeout (sid, timeout, expected, cb) {
    return this._nats.timeout(sid, timeout, expected, cb)
  }

  flush (cb) {
    this._nats.flush(cb)
  }

  onUnsubscribe (sid, cb) {
    const inbox = this._nats.getMuxRequestConfig(sid).inbox
    this._nats.on(inbox, cb)
  }
}

module.exports = beanifyPlugin((beanify, opts, done) => {
  const transport = new Transport({ beanify, opts, done })

  beanify.decorate('$transport', transport)
}, {
  name: 'beanify-nats',
  scoped: false
})
