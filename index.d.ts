/// <reference types="node" />

import NATS from "nats"
import AVVIO from "avvio"
import PINO from "pino"
import BeanifyPlugin from "beanify-plugin"
import {EventEmitter} from "events"

declare namespace Beanify {

    type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'

    interface LogOptions {
        usePretty?: boolean
        level?: LogLevel,
        useChild?: boolean
    }

    interface ErrioOptions {
        recursives?: boolean,
        inherited?: boolean,
        stack?: boolean,
        private?: boolean,
        exclude?: Array<any>,
        include?: Array<any>
    }

    interface Options {
        nats: NATS.ClientOpts
        name: string,
        log?: LogOptions,
        errio?: ErrioOptions,
    }

    interface DoneCallback {
        (
            error?: Error | null | undefined,
            success?: any
        ): void
    }

    interface Transport extends EventEmitter{
        $options: NATS.ClientOpts,
        $connected: boolean,
        subscribe(topic: string, cb: Function): number
        subscribe(topic: string, opts: NATS.SubscribeOptions, cb: Function): number

        publish(topic: string, cb: Function): void
        publish(topic: string, msg: any, cb: Function): void
        publish(topic: string, msg: any, reply: string, cb: Function): void
        
        request(topic:string,cb:Function):{confId:number,inbox:string}
        request(topic:string,msg:any,cb:Function):{confId:number,inbox:string}
        request(topic:string,msg:any,options:NATS.SubscribeOptions,cb:Function):{confId:number,inbox:string}
        
        timeout(sid: number, timeout: number, expected: number, cb: (sid: number) => void):void

        flush(cb?: Function): void
    }


    type ProcessChainType = 'onClose'
        | 'onRoute'
        | 'onBeforeInject'
        | 'onInject'
        | 'onAfterInject'
        | 'onRequest'
        | 'onBeforeHandler'
        | 'onHandler'
        | 'onReposed'
        | 'onAfterHandler'
        | 'onError'

    interface ProcessChainAddHook {
        (
            type: ProcessChainType,
            handler: Function
        ): void
    }

    interface ProcessChainRunHook {
        (
            type: ProcessChainType,
            state: any,
            done: Function
        ): void
    }

    interface ProcessChain {
        $types: Array<string>,
        AddHook: ProcessChainAddHook
        RunHook: ProcessChainRunHook
    }

    interface RouterRoute {
        (
            opts: {
                url: string,
                $pubsub?: boolean
                $max?: number,
                $timeout?: number
            },
            cb: (req: { body: object }, res: (err: Error, res: any) => void) => void
        ): Router


    }

    interface RouterInject {
        (opts: {
            url: string,
            body?: object | string,
            $pubsub?: boolean,
            $max?: number,
            $expected?: number,
            $timeout?: number
        }, cb: (err: Error, response: any) => void): Beanify

        (opts: {
            url: string,
            body?: object | string,
            $pubsub?: boolean,
            $max?: number,
            $expected?: number,
            $timeout?: number
        }): Promise<any>
    }


    interface Router {
        route: RouterRoute,
        inject: RouterInject
    }
}

declare class Beanify {
    constructor(options: Beanify.Options)

    decorate(
        name: string,
        decoration: any,
        dependencies?: Array<string>
    ): Beanify
    hasDecorator(name: string): Boolean

    register(
        plugin: BeanifyPlugin.BeanifyFunction,
        opts?: object
    ): Beanify

    ready(): Promise<Beanify>
    ready(cb: (err: Error) => void): void
    ready(cb: (err: Error, done: Function) => void): void
    ready(cb: (err: Error, context: Beanify, done: Function) => void): void

    close(cb: (err: Error) => void): void
    close(cb: (err: Error, done: Function) => void): void
    close(cb: (err: Error, context: Beanify, done: Function) => void): void

    onClose(cb: (context: Beanify, done: Function) => void): Beanify

    after(cb: (err: Error) => void): Beanify
    after(cb: (err: Error, done: Function) => void): Beanify
    after(db: (err: Error, context: Beanify, done: Function) => void): Beanify

    $options: Beanify.Options
    $avvio: AVVIO.Avvio<Beanify>
    $log: PINO.Logger
    $plugins: Array<string>

    //beanify-nats
    $transport: Beanify.Transport


    //beanify-chain
    $chain: Beanify.ProcessChain
    addHook: Beanify.ProcessChainAddHook

    //beanify-router
    $router: Beanify.Router
    route: Beanify.RouterRoute
    inject: Beanify.RouterInject
}

export = Beanify