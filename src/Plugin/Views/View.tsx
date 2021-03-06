﻿/*
 * Copyright (c) 2016 David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

namespace LiteMol.Plugin.Views {
    "use strict";
    
    const shallowEqual = Bootstrap.Utils.shallowEqual;   
    export abstract class PureView<State, Props, ViewState> extends React.Component<{
        state: State
        onChange: (s: State) => void
    } & Props, ViewState> {
        
        protected update(s: State) {
            let ns = Bootstrap.Utils.merge(this.props.state, s);
            if (ns !== this.props.state) this.props.onChange(ns);
        }
        
        shouldComponentUpdate(nextProps: any, nextState: any) {
            return !shallowEqual(this.props, nextProps) || !shallowEqual(this.state, nextState);
        }
    }
    
    export abstract class Component<Props> extends React.Component<{ context: Bootstrap.Context } & Props, {}> {
        
        // shouldComponentUpdate(nextProps: any, nextState: any) {
        //     return !shallowEqual(this.props, nextProps);
        // }
        
        private subs:Bootstrap.Rx.IDisposable[] = [];
        protected subscribe<T>(stream: Bootstrap.Rx.Observable<T>, obs: (n: T) => void) {
            let sub = stream.subscribe(obs);
            this.subs.push(sub);
            return sub;
        } 
        
        protected unsubscribe(sub: Bootstrap.Rx.IDisposable) {
            let idx = this.subs.indexOf(sub);
            for (let i = idx; i < this.subs.length - 1; i++) {
                this.subs[i] = this.subs[i + 1];                
            }
            sub.dispose();
            this.subs.pop();
        }
        
        componentWillUnmount() {
            for (let s of this.subs) s.dispose();
            this.subs = [];
        }        
    }
    
    export abstract class ObserverView<P, S> extends React.Component<P, S> {        
        private subs:Bootstrap.Rx.IDisposable[] = [];
                
        protected subscribe<T>(stream: Bootstrap.Rx.Observable<T>, obs: (n: T) => void) {
            let sub = stream.subscribe(obs);
            this.subs.push(sub);
            return sub;
        } 
        
        protected unsubscribe(sub: Bootstrap.Rx.IDisposable) {
            let idx = this.subs.indexOf(sub);
            for (let i = idx; i < this.subs.length - 1; i++) {
                this.subs[i] = this.subs[i + 1];                
            }
            sub.dispose();
            this.subs.pop();
        }
        
        componentWillUnmount() {
            for (let s of this.subs) s.dispose();
            this.subs = [];
        }
    }

    export abstract class View<Controller extends Bootstrap.Components.Component<any>, State, CustomProps> 
        extends ObserverView<{ controller: Controller } & CustomProps, State> {
        
        // protected get latestState() {
        //     return this.props.controller.latestState;
        // }
        
        protected get controller() {
            return this.props.controller;
        }
                                
        componentWillMount() {
            this.subscribe(this.controller.state, (s) => {
                this.forceUpdate()
            });    
        }        
    }
        
    // export abstract class ControlView<Controller extends Bootstrap.Components.Control<any>, CustomProps> 
    //     extends View<Controller, {}, CustomProps> implements IControlView {
                
    //     header = '';
    //     panelType = 'default';
        
    //     // shouldComponentUpdate(nextProps: { controller: Controller }, nextState: {}, nextContext: any) {
    //     //     return this.props.controller !== nextProps.controller;
    //     // }
               
    //     render() {
    //         let state = this.controller.latestState;
            
    //         if (state.isActive) {
    //             return <Controls.Panel header={this.header} className={'lm-control lm-panel-' + this.panelType} key={state.currentEntity.id}>
    //                 {this.renderControl()}
    //             </Controls.Panel>;                
    //         } 
            
    //         return <div className='lm-empty-control' />;
    //     }
        
    //     protected abstract renderControl(): React.ReactElement<any>;
    // }
}