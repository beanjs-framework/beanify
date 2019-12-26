const AVVIO = require('avvio')
// const FastQ = require('fastq')
// const Errio = require('errio')

const beanifyPlugin = require('beanify-plugin')

const errors = require('./errors')
const defaultOptions = require('./default-options')
const { sPluginNames, sChildren } = require('./symbols')

class Beanify {
  constructor (options) {
    this._self = this
    this._options = defaultOptions(options)
    this._current = null

    this._avvio = AVVIO(this, {
      expose: {
        use: '_use',
        ready: '_ready'
      },
      autostart: true,
      timeout: 5000
    })

    this[sPluginNames] = []
    this[sChildren] = []

    this._avvio.override = (beanify, plugin, opts) => {
      const meta = plugin[beanifyPlugin.pluginMeta]
      const pluginPrefix = plugin[beanifyPlugin.pluginPrefix]
      const beanifyPrefix = beanify[beanifyPlugin.pluginPrefix]

      if (meta) {
        beanify._checkPluginDependencies(plugin)
        beanify._checkPluginDecorators(plugin)
        this._self[sPluginNames].push(meta.name)
      } else {
        throw new errors.BeanifyError('Encapsulation error, need to encapsulate the plugin with beanify-plugin')
      }

      if (plugin[beanifyPlugin.pluginScoped] === false) {
        if (beanifyPrefix && pluginPrefix !== '' && beanifyPrefix !== pluginPrefix) {
          throw new errors.BeanifyError(`has prefix:${beanifyPrefix} in this scoped,new prefix:${pluginPrefix}`)
        }

        beanify[beanifyPlugin.pluginPrefix] = pluginPrefix
        this._current = beanify
        return beanify
      }

      const scopedInstance = Object.create(beanify)
      this._current = scopedInstance

      beanify[sChildren].push(scopedInstance)
      scopedInstance[sChildren] = []
      scopedInstance[beanifyPlugin.pluginPrefix] = pluginPrefix

      // add hook

      scopedInstance.decorate = function decorate () {
        beanify.decorate.apply(this._self, arguments)
        return scopedInstance
      }

      return scopedInstance
    }

    this._avvio.once('preReady', () => {
      this._current = null
    })

    this._registerPlugins()
  }

  get $options () {
    return this._options
  }

  get $avvio () {
    return this._avvio
  }

  get $plugins () {
    return this._self[sPluginNames]
  }

  decorate (prop, value, deps) {
    if (prop in this) {
      throw new errors.BeanifyError('Decoration has been already added')
    }

    if (deps) {
      this._checkDecorateDependencies(deps)
    }

    this[prop] = value

    return this
  }

  hasDecorator (prop) {
    return prop in this
  }

  register (plugin, opts) {
    const pluginMeta = plugin[beanifyPlugin.pluginMeta]
    let pluginOpts = pluginMeta ? pluginMeta.options : {}

    pluginOpts = Object.assign({}, pluginOpts, opts)
    this._use(plugin, pluginOpts)
    return this
  }

  ready (callback) {
    const _readyCaller = (err) => {
      callback.bind(this.$injectDomain)(err)
    }
    this._ready(_readyCaller)
    return this
  }

  _checkDecorateDependencies (deps) {
    for (let i = 0; i < deps.length; i++) {
      if (!(deps[i] in this)) {
        throw new errors.BeanifyError(`Missing member dependency '${deps[i]}'`)
      }
    }
  }

  _checkPluginDependencies (plugin) {
    const meta = plugin[beanifyPlugin.pluginMeta]

    const { dependencies } = meta
    if (!dependencies) {
      return
    }

    if (!Array.isArray(dependencies)) {
      throw new errors.BeanifyError('Plugin dependencies must be an array of strings')
    }

    dependencies.forEach((dependency) => {
      if (this._self[sPluginNames].indexOf(dependency) === -1) {
        throw new errors.BeanifyError(`The dependency '${dependency}' is not registered`)
      }
    })
  }

  _checkPluginDecorators (plugin) {
    const meta = plugin[beanifyPlugin.pluginMeta]

    const { decorators } = meta
    if (!decorators) {
      return
    }

    if (!Array.isArray(decorators)) {
      throw new errors.BeanifyError('Plugin decorators must be an array of strings')
    }

    decorators.forEach((decorate) => {
      if (!this.hasDecorator(decorate)) {
        throw new errors.BeanifyError(`The decorator dependency '${decorate}' is not registered`)
      }
    })
  }

  _registerPlugins () {
    this.register(require('./plugins/beanify-logger'), {
      ...this._options.pino,
      name: this._options.name
    })

    this.register(require('./plugins/beanify-errio'), {
      ...this._options.errio
    })

    this.register(require('./plugins/beanify-chain'))
    this.register(require('./plugins/beanify-nats'), {
      ...this._options.nats
    })
    this.register(require('./plugins/beanify-router'), { main: this })
  }
}

module.exports = Beanify
